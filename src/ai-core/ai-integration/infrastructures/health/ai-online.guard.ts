// src/ai-integration/infrastructures/health/ai-online.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiHealthService } from './ai-health.service';

@Injectable()
export class AiOnlineGuard implements CanActivate {
  private readonly logger = new Logger(AiOnlineGuard.name);

  constructor(private readonly aiHealthService: AiHealthService) {}

  canActivate(_context: ExecutionContext): boolean {
    const snapshot = this.aiHealthService.getCurrentStatus();

    if (snapshot.status === 'OFFLINE') {
      this.logger.warn(
        `[AiOnlineGuard] Request ditolak — AI OFFLINE. ` +
          `Alasan: ${snapshot.message}`,
      );
      throw new ServiceUnavailableException(
        'Model AI belum terhubung. Silakan coba beberapa saat lagi.',
      );
    }

    if (!snapshot.modelLoaded) {
      this.logger.warn(
        `[AiOnlineGuard] Request ditolak — AI online tapi model belum loaded. ` +
          `Alasan: ${snapshot.message}`,
      );
      throw new ServiceUnavailableException(
        'AI service online namun model belum siap memproses gambar. ' +
          'Silakan coba beberapa saat lagi.',
      );
    }

    return true;
  }
}
