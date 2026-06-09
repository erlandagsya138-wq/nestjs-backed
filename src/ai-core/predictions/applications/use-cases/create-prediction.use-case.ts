// src/ai-core/predictions/applications/use-cases/create-prediction.use-case.ts
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PredictionResponseDto } from '../dto/prediction-response.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import { PREDICTION_REPOSITORY_TOKEN } from '../../infrastructures/repositories/prediction.repository.interface';
import type { IPredictionRepository } from '../../infrastructures/repositories/prediction.repository.interface';
import { PredictionCreatedEvent } from '../../infrastructures/events/prediction-created.event';
import { AiIntegrationOrchestrator } from '../../../ai-integration/applications/orchestrator/ai-integration.orchestrator';
import { AiIntegrationDomainService } from '../../../ai-integration/domains/services/ai-integration-domain.service';
import { AiHealthService } from '../../../ai-integration/infrastructures/health/ai-health.service';
import { UploadFileUseCase } from '../../../../shared/storage/applications/use-cases/upload-file.use-case';
import type { IUploadedFile } from '../../../../shared/storage/domains/mappers/storage.mapper';

@Injectable()
export class CreatePredictionUseCase {
  private readonly logger = new Logger(CreatePredictionUseCase.name);

  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,

    private readonly mapper:       PredictionMapper,
    private readonly eventEmitter: EventEmitter2,

    // UploadFileUseCase di-inject agar upload + persist StoredFileEntity
    // terjadi di dalam 1 alur yang sama dengan pembuatan prediction.
    // StorageModule harus di-import di PredictionModule (lihat prediction.module.ts)
    private readonly uploadFileUseCase: UploadFileUseCase,

    @Inject(forwardRef(() => AiIntegrationOrchestrator))
    private readonly aiOrchestrator: AiIntegrationOrchestrator,

    @Inject(forwardRef(() => AiIntegrationDomainService))
    private readonly aiDomainService: AiIntegrationDomainService,

    @Inject(forwardRef(() => AiHealthService))
    private readonly aiHealthService: AiHealthService,
  ) {}

  /**
   * Execute menerima IUploadedFile (Multer file object) langsung dari controller.
   * Tidak ada lagi imageUrl di request body — file diterima sebagai multipart.
   *
   * Alur:
   *   1. Guard: validasi userId & AI status
   *   2. Upload file → StoredFileEntity di-persist → dapat storedFileId & imageUrl
   *   3. Buat PredictionEntity PENDING dengan storedFileId
   *   4. Kirim buffer ke AI
   *   5. Return hasil akhir
   */
  async execute(
    file:                IUploadedFile,
    authenticatedUserId: string,
  ): Promise<PredictionResponseDto> {

    // ── Guard: userId ────────────────────────────────────────────────────
    if (!authenticatedUserId?.trim()) {
      throw new InternalServerErrorException(
        'User ID tidak dapat diekstrak dari JWT. Coba logout dan login kembali.',
      );
    }

    // ── Guard: AI harus online ───────────────────────────────────────────
    const aiStatus = this.aiHealthService.getCurrentStatus();
    if (aiStatus.status === 'OFFLINE') {
      throw new InternalServerErrorException(
        `AI service sedang OFFLINE — ${aiStatus.message}. Coba lagi nanti.`,
      );
    }
    if (!aiStatus.modelLoaded) {
      throw new InternalServerErrorException(
        `AI model belum siap — ${aiStatus.message}. Coba lagi nanti.`,
      );
    }

    // ── Step 1: Upload file & persist StoredFileEntity ───────────────────
    // UploadFileUseCase menangani: validasi mime+size, upload ke disk/S3,
    // persist ke stored_files, dan return DTO dengan storedFileId & imageUrl.
    let storedFileId: string;
    let imageUrl:     string;
    let imageBuffer:  Buffer;
    let imageMimeType: string;

    try {
      const uploadResult = await this.uploadFileUseCase.execute(
        file,
        { context: 'predictions' },
        authenticatedUserId.trim(),
      );
      storedFileId  = uploadResult.storedFileId;
      imageUrl      = uploadResult.imageUrl;
      // Buffer dan mimeType diambil dari file Multer — sudah ada di memory,
      // tidak perlu baca ulang dari disk.
      imageBuffer   = file.buffer;
      imageMimeType = file.mimetype;
    } catch (err: unknown) {
      // Re-throw — UploadFileUseCase sudah menghasilkan HTTP exception yang tepat
      throw err;
    }

    if (!storedFileId) {
      throw new InternalServerErrorException(
        'Upload berhasil tapi storedFileId tidak tersedia. Hubungi administrator.',
      );
    }

    // ── Step 2: Buat PredictionEntity PENDING ────────────────────────────
    const prediction = await this.predictionRepo.create({
      userId:       authenticatedUserId.trim(),
      storedFileId,
      imageUrl,
    });

    this.logger.log(
      `[Create] Record dibuat → id=${prediction.id}, storedFileId=${storedFileId}`,
    );

    this.eventEmitter.emit(
      'prediction.created',
      new PredictionCreatedEvent(
        prediction.id,
        authenticatedUserId.trim(),
        imageUrl,
        new Date(),
      ),
    );

    // ── Step 3: Validasi MIME type ────────────────────────────────────────
    const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!ALLOWED_MIME_TYPES.has(imageMimeType)) {
      const reason = `MIME type '${imageMimeType}' tidak didukung`;
      await this.predictionRepo.markAsFailed(prediction.id, reason).catch(() => {});
      throw new UnprocessableEntityException(reason);
    }

    // ── Step 4: Kirim ke AI ───────────────────────────────────────────────
    this.logger.log(`[Create] Mengirim ke AI → id=${prediction.id}`);

    await this.aiOrchestrator.process({
      predictionId:     prediction.id,
      userId:           authenticatedUserId,
      imageBuffer,
      imageMimeType,
      originalFileName: this.aiDomainService.buildFileName(prediction.id, imageMimeType),
    });

    // ── Step 5: Fetch hasil akhir dari DB ─────────────────────────────────
    const final = await this.predictionRepo.findById(prediction.id);
    if (!final) {
      throw new InternalServerErrorException(
        `Prediction id=${prediction.id} tidak ditemukan setelah proses AI.`,
      );
    }

    this.logger.log(
      `[Create] DONE → id=${final.id}, status=${final.status}, ` +
      `variety=${final.varietyCode ?? 'N/A'}`,
    );

    return this.mapper.toResponseDto(final);
  }
}