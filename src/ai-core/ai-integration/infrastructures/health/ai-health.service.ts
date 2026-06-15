// src/ai-core/ai-integration/infrastructures/health/ai-health.service.ts
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  BehaviorSubject,
  Observable,
  catchError,
  firstValueFrom,
  map,
  of,
  timeout,
} from 'rxjs';

// ── Tipe Publik ───────────────────────────────────────────────────────────────

export type AiStatusCode = 'ONLINE' | 'OFFLINE';

export interface AiStatusSnapshot {
  status: AiStatusCode;
  checkedAt: string; // ISO 8601 UTC
  message: string;
  modelLoaded: boolean;
  uptimeSeconds: number | null;
}

// ── Tipe Internal ─────────────────────────────────────────────────────────────

interface FastApiHealthResponse {
  status: string; // 'healthy' | 'degraded'
  model_loaded: boolean;
  uptime_seconds: number | null;
}

// ── Konstanta ─────────────────────────────────────────────────────────────────

const HEALTH_ENDPOINT = '/api/v1/health';

/**
 * Timeout per request health check.
 * Harus lebih kecil dari interval cron (10 detik) agar tidak overlap.
 */
const HTTP_TIMEOUT_MS = 5_000;

const CRON_EVERY_10_SECONDS = '*/10 * * * * *';

// ── Helper Builder — dibuat di luar class agar aman dipanggil kapan saja ──────

function buildOfflineSnapshot(reason: string): AiStatusSnapshot {
  return {
    status: 'OFFLINE',
    checkedAt: new Date().toISOString(),
    message: reason,
    modelLoaded: false,
    uptimeSeconds: null,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class AiHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiHealthService.name);
  private readonly apiKey: string;
  private isDestroyed = false;
  private readonly statusSubject = new BehaviorSubject<AiStatusSnapshot>(
    buildOfflineSnapshot(
      'Service baru dimulai, menunggu health check pertama.',
    ),
  );

  readonly status$: Observable<AiStatusSnapshot> =
    this.statusSubject.asObservable();

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('FASTAPI_API_KEY');
  }

  onModuleInit(): void {
    setImmediate(() => {
      void this.runHealthCheck();
    });
  }

  onModuleDestroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.statusSubject.complete();
    this.logger.log('[HealthCheck] BehaviorSubject completed.');
  }

  // ── Cron Job ───────────────────────────────────────────────────────────────

  @Cron(CRON_EVERY_10_SECONDS, { name: 'ai-health-check' })
  async runHealthCheck(): Promise<void> {
    const snapshot = await this.pingAiService();
    this.publishSnapshot(snapshot);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getCurrentStatus(): AiStatusSnapshot {
    return this.statusSubject.getValue();
  }

  async forceCheck(): Promise<AiStatusSnapshot> {
    const snapshot = await this.pingAiService();
    this.publishSnapshot(snapshot);
    return snapshot;
  }

  // ── Private: HTTP Call ─────────────────────────────────────────────────────

  private async pingAiService(): Promise<AiStatusSnapshot> {
    const stream$ = this.httpService
      .get<FastApiHealthResponse>(HEALTH_ENDPOINT, {
        headers: { 'X-API-Key': this.apiKey },
      })
      .pipe(
        timeout(HTTP_TIMEOUT_MS),

        map((response): AiStatusSnapshot => {
          const body = response.data;

          const isModelReady =
            body.status === 'healthy' && body.model_loaded === true;

          return {
            status: 'ONLINE',
            checkedAt: new Date().toISOString(),
            message: isModelReady
              ? 'AI service online dan model siap.'
              : `AI service online tapi model belum siap (status: ${body.status}).`,
            modelLoaded: body.model_loaded,
            uptimeSeconds: body.uptime_seconds ?? null,
          };
        }),

        catchError((err: unknown): Observable<AiStatusSnapshot> => {
          const reason = this.extractErrorReason(err);
          this.logger.warn(`[HealthCheck] Ping gagal — ${reason}`);
          return of(buildOfflineSnapshot(reason));
        }),
      );

    try {
      return await firstValueFrom(stream$);
    } catch (err: unknown) {
      const reason = this.extractErrorReason(err);
      this.logger.error(
        `[HealthCheck] Unhandled error di firstValueFrom — ${reason}`,
      );
      return buildOfflineSnapshot(reason);
    }
  }

  // ── Private: State Management ──────────────────────────────────────────────

  private publishSnapshot(snapshot: AiStatusSnapshot): void {
    if (this.isDestroyed) return;

    const previous = this.statusSubject.getValue();
    const statusChanged = previous.status !== snapshot.status;
    const modelLoadedChanged = previous.modelLoaded !== snapshot.modelLoaded;

    if (statusChanged) {
      if (snapshot.status === 'ONLINE') {
        this.logger.log(
          `[HealthCheck] ✅ AI kembali ONLINE — ${snapshot.message}`,
        );
      } else {
        this.logger.warn(
          `[HealthCheck] ❌ AI menjadi OFFLINE — ${snapshot.message}`,
        );
      }
    } else if (modelLoadedChanged) {
      this.logger.log(
        `[HealthCheck] 🔄 Model status berubah: ` +
          `modelLoaded=${snapshot.modelLoaded} — ${snapshot.message}`,
      );
    } else {
      // Status stabil — hanya debug agar tidak spam log production
      this.logger.debug(
        `[HealthCheck] Status stabil: ${snapshot.status} | ` +
          `modelLoaded=${snapshot.modelLoaded} | ` +
          `uptime=${snapshot.uptimeSeconds ?? 'N/A'}s`,
      );
    }

    this.statusSubject.next(snapshot);
  }

  // ── Private: Error Handling ────────────────────────────────────────────────

  private extractErrorReason(err: unknown): string {
    if (!(err instanceof Error)) {
      return String(err);
    }

    // RxJS TimeoutError
    if (err.name === 'TimeoutError') {
      return `Timeout setelah ${HTTP_TIMEOUT_MS}ms — AI tidak merespons`;
    }

    // Axios error — gunakan type predicate bawaan axios (tidak perlu cast manual)
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const code = err.code;

      if (code === 'ECONNREFUSED') {
        return 'Connection refused — AI service tidak berjalan di port yang dikonfigurasi';
      }
      if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
        return `Request timeout (${HTTP_TIMEOUT_MS}ms)`;
      }
      if (status !== undefined) {
        return `HTTP ${status} dari AI service`;
      }
      return `Network error: ${err.message}`;
    }

    return err.message;
  }
}