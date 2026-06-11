// src/ai-integration/applications/use-cases/process-prediction.use-case.ts
import { Inject, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { AiPredictRequestDto } from '../dto/ai-predict-request.dto';
import { AiResponseMapper } from '../../domains/mappers/ai-response.mapper';
import { AiResponseValidator } from '../../domains/validators/ai-response.validator';
import {
  type IAiHttpAdapter,
  AI_HTTP_ADAPTER_TOKEN,
} from '../../infrastructures/repositories/ai-http.adapter.interface';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../../predictions/infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class ProcessPredictionUseCase {
  private readonly logger = new Logger(ProcessPredictionUseCase.name);

  constructor(
    @Inject(AI_HTTP_ADAPTER_TOKEN)
    private readonly aiAdapter: IAiHttpAdapter,

    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,

    private readonly validator: AiResponseValidator,
    private readonly mapper:    AiResponseMapper,
  ) {}

  async execute(request: AiPredictRequestDto): Promise<void> {
    const { predictionId } = request;

    this.logger.log(
      `[ProcessPrediction] START → id=${predictionId}, ` +
        `imageSize=${request.imageBuffer.length} bytes, ` +
        `mime=${request.imageMimeType}`,
    );

    try {
      // ── Step 1: Kirim ke FastAPI ─────────────────────────────────────────
      this.logger.debug(`[ProcessPrediction] Mengirim ke FastAPI → id=${predictionId}`);

      const rawResult = await this.aiAdapter.predict(request);

      this.logger.debug(
        `[ProcessPrediction] Respon FastAPI diterima → ` +
          `id=${predictionId}, ` +
          `variety=${rawResult.varietyCode}, ` +
          `confidence=${rawResult.confidenceScore}, ` +
          `enhanced=${rawResult.imageEnhanced}, ` +
          `inferenceMs=${rawResult.inferenceTimeMs}`,
      );

      // ── Step 2: Validasi response ────────────────────────────────────────
      this.validator.assertValidResult(rawResult);

      // ── Step 3: Map ke payload repository ───────────────────────────────
      const payload = this.mapper.toPredictionResultPayload(rawResult);

      // ── Step 4: Update prediction record → SUCCESS ───────────────────────
      await this.predictionRepo.updateResult(predictionId, payload);

      this.logger.log(
        `[ProcessPrediction] SUCCESS → id=${predictionId}, ` +
          `variety=${payload.varietyCode}, ` +
          `confidence=${payload.confidenceScore}, ` +
          `enhanced=${payload.imageEnhanced}`,
      );

    } catch (err: unknown) {
      const reason = err instanceof Error
        ? err.message
        : 'Unknown error dari AI service';

      if (err instanceof UnprocessableEntityException) {
        this.logger.warn(
          `[ProcessPrediction] FAILED → id=${predictionId}, reason=${reason}`
        );
      } else {
        this.logger.error(
          `[ProcessPrediction] SYSTEM ERROR → id=${predictionId}, reason=${reason}`,
          err instanceof Error ? err.stack : undefined,
        );
      }

      await this.predictionRepo
        .markAsFailed(predictionId, reason)
        .catch((markErr: unknown) => {
          const markErrMessage =
            markErr instanceof Error ? markErr.message : String(markErr);
          this.logger.error(
            `[ProcessPrediction] Gagal markAsFailed → id=${predictionId}, ` +
              `reason=${markErrMessage}`,
          );
        });
    }
  }
}