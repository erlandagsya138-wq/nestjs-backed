// src/ai-core/ai-integration/infrastructures/repositories/ai-http.adapter.ts

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AiPredictRequestDto } from '../../applications/dto/ai-predict-request.dto';
import {
  AiPredictResponseDto,
  AiPredictResultDto,
} from '../../applications/dto/ai-predict-response.dto';
import { IAiHttpAdapter } from './ai-http.adapter.interface';

const TIMEOUT_MS    = 15_000;
const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 1_000;

@Injectable()
export class AiHttpAdapter implements IAiHttpAdapter {
  private readonly logger = new Logger(AiHttpAdapter.name);
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.getOrThrow<string>('FASTAPI_BASE_URL');
    const apiKey  = this.config.getOrThrow<string>('FASTAPI_API_KEY');

    this.client = axios.create({
      baseURL,
      timeout: TIMEOUT_MS,
      headers: {
        'X-API-Key': apiKey,
      },
    });

    this.registerInterceptors();
  }

  async predict(request: AiPredictRequestDto): Promise<AiPredictResultDto> {
    const form = new FormData();
    form.append('file', request.imageBuffer, {
      filename:    request.originalFileName,
      contentType: request.imageMimeType,
    });

    this.logger.log(
      `[AI] Sending predict request → predictionId=${request.predictionId}`,
    );

    const response = await this.executeWithRetry<AiPredictResponseDto>(
      (): Promise<AxiosResponse<AiPredictResponseDto>> =>
        this.client.post<AiPredictResponseDto>('/api/v1/predict', form, {
          headers: form.getHeaders(),
        }),
      {
        maxRetries:   MAX_RETRIES,
        baseDelayMs:  BASE_DELAY_MS,
        predictionId: request.predictionId,
      },
    );

    this.validateFastApiResponse(response, request.predictionId);

    const { prediction } = response;

    this.logger.log(
      `[AI] Received response → predictionId=${request.predictionId}, ` +
        `variety=${prediction.variety_code}, ` +
        `confidence=${prediction.confidence_score}, ` +
        `enhanced=${response.image_enhanced}, ` +
        `inf_ms=${response.inference_time_ms}, ` +
        `preproc_ms=${response.preprocessing_time_ms}`,
    );

    return {
      predictionId:        request.predictionId,
      varietyCode:         prediction.variety_code,
      varietyName:         prediction.variety_name,
      localName:           prediction.local_name,
      origin:              prediction.origin,
      description:         prediction.description,
      confidenceScore:     prediction.confidence_score,
      imageEnhanced:       response.image_enhanced,
      inferenceTimeMs:     response.inference_time_ms,
      preprocessingTimeMs: response.preprocessing_time_ms ?? 0,
      allVarieties: (response.all_varieties ?? []).map((v) => ({
        varietyCode:     v.variety_code,
        varietyName:     v.variety_name,
        confidenceScore: v.confidence_score,
      })),
      modelVersion: response.model_version ?? null,
      aiRequestId:  response.request_id    ?? null,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private validateFastApiResponse(
    data: AiPredictResponseDto,
    predictionId: string,
  ): asserts data is AiPredictResponseDto & { prediction: NonNullable<AiPredictResponseDto['prediction']> } {
    // Cek 1: FastAPI mengembalikan success=false
    // Ini terjadi jika CLIP menolak gambar (bukan durian) atau error internal FastAPI.
    if (!data || data.success === false) {
      throw new InternalServerErrorException(
        `AI service mengembalikan success=false. predictionId=${predictionId}`,
      );
    }

    // Cek 2: Field prediction harus ada dan berupa object
    if (!data.prediction || typeof data.prediction !== 'object') {
      throw new InternalServerErrorException(
        `AI service mengembalikan response tanpa field 'prediction'. ` +
          `predictionId=${predictionId}`,
      );
    }

    // Cek 3: variety_code wajib tidak kosong
    if (!data.prediction.variety_code) {
      throw new InternalServerErrorException(
        `AI service mengembalikan 'variety_code' kosong. ` +
          `predictionId=${predictionId}`,
      );
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<AxiosResponse<T>>,
    options: {
      maxRetries:   number;
      baseDelayMs:  number;
      predictionId: string;
    },
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        const response = await fn();
        return response.data;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (!this.isRetryableError(err)) {
          this.logger.warn(
            `[AI] Non-retryable error pada attempt ${attempt}/${options.maxRetries} → ` +
              `predictionId=${options.predictionId}, reason=${lastError.message}`,
          );
          break;
        }

        this.logger.warn(
          `[AI] Retryable error pada attempt ${attempt}/${options.maxRetries} → ` +
            `predictionId=${options.predictionId}, reason=${lastError.message}`,
        );

        if (attempt < options.maxRetries) {
          await this.delay(options.baseDelayMs * attempt);
        }
      }
    }

    this.translateAndThrow(lastError);
  }

  private isRetryableError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) {
      return false;
    }

    if (!err.response) return true;

    return err.response.status === 503;
  }

  private translateAndThrow(err: Error): never {
    if (!axios.isAxiosError(err)) {
      throw new InternalServerErrorException(
        `AI service error tidak terduga: ${err.message}`,
      );
    }

    const code     = err.code;
    const response = err.response;

    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      throw new RequestTimeoutException(
        'AI service tidak merespons dalam batas waktu yang ditentukan.',
      );
    }

    if (!response) {
      throw new ServiceUnavailableException(
        'AI service tidak dapat dijangkau saat ini (network error).',
      );
    }

    // FastAPI mengembalikan { detail: string } untuk error
    const detail = (response.data as { detail?: string } | undefined)?.detail;
    const status = response.status;

    switch (status) {
      case 400:
        // FastAPI 400: gambar ditolak CLIP (bukan durian) atau file kosong
        throw new UnprocessableEntityException(
          detail ??
            'AI service menolak gambar: bukan gambar durian yang valid, ' +
            'atau file gambar rusak/kosong.',
        );

      case 413:
        throw new UnprocessableEntityException(
          detail ?? 'Ukuran file gambar melebihi batas maksimum yang diterima AI service.',
        );

      case 415:
        throw new UnprocessableEntityException(
          detail ??
            'Tipe file tidak didukung oleh AI service. ' +
            'Gunakan format JPG, PNG, atau WebP.',
        );

      case 422:
        throw new UnprocessableEntityException(
          detail ??
            'AI service gagal memproses gambar (preprocessing error). ' +
            'Pastikan file gambar tidak rusak.',
        );

      case 503:
        throw new ServiceUnavailableException(
          detail ?? 'AI service sedang tidak tersedia (model belum siap). Coba lagi nanti.',
        );

      default:
        throw new InternalServerErrorException(
          `AI service mengembalikan status tidak terduga: ${status}. ` +
            (detail ? `Detail: ${detail}` : ''),
        );
    }
  }

  private registerInterceptors(): void {
    this.client.interceptors.request.use((config) => {
      this.logger.debug(
        `[AI HTTP →] ${config.method?.toUpperCase() ?? 'UNKNOWN'} ` +
          `${config.baseURL ?? ''}${config.url ?? ''}`,
      );
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `[AI HTTP ←] ${response.status} ${response.config.url ?? ''}`,
        );
        return response;
      },
      (error: unknown) => {
        if (error instanceof Error) {
          return Promise.reject(error);
        }
        return Promise.reject(new Error(String(error)));
      },
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}