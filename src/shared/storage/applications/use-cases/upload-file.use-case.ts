// src/shared/storage/applications/use-cases/upload-file.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UploadFileDto } from '../dto/upload-file.dto';
import { StorageResponseDto } from '../dto/storage-response.dto';
import { StorageDomainService } from '../../domains/services/storage-domain.service';
import { StorageMapper, type IUploadedFile } from '../../domains/mappers/storage.mapper';
import { FileValidator } from '../../domains/validators/file.validator';
import {
  type IStorageAdapter,
  STORAGE_ADAPTER_TOKEN,
} from '../../infrastructures/adapters/storage.adapter.interface';
import {
  type IStoredFileRepository,
  STORED_FILE_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/stored-file.repository.interface';
import { FileUploadedEvent } from '../../infrastructures/events/file-uploaded.event';

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,

    // Repository ditambahkan agar StoredFileEntity di-persist ke DB.
    // Sebelumnya use case ini hanya menyimpan file ke disk/S3 tapi
    // tidak pernah mencatat record-nya ke database — penyebab root bug.
    @Inject(STORED_FILE_REPOSITORY_TOKEN)
    private readonly storedFileRepo: IStoredFileRepository,

    private readonly domainService: StorageDomainService,
    private readonly validator:     FileValidator,
    private readonly mapper:        StorageMapper,
    private readonly eventEmitter:  EventEmitter2,
  ) {}

  async execute(
    file:   IUploadedFile | undefined | null,
    dto:    UploadFileDto,
    userId: string,
  ): Promise<StorageResponseDto> {
    // ── Step 1: Validasi file ─────────────────────────────────────────────
    this.validator.assertAll(file);

    // ── Step 2: Generate file key & upload ke storage ────────────────────
    const context = dto.context ?? 'general';
    const fileKey = this.domainService.generateFileKey(
      file.originalname,
      userId,
      context,
    );

    const rawFile    = this.mapper.toRawUploadedFile(file);
    const uploadResult = await this.storageAdapter.upload(rawFile, fileKey);

    // ── Step 3: Bangun entity & persist ke database ──────────────────────
    // Ini adalah langkah yang sebelumnya HILANG — file berhasil naik ke disk
    // tapi tidak ada record di tabel stored_files, sehingga FK dari predictions
    // tidak bisa dipenuhi.
    const fileEntity   = this.mapper.toEntity(uploadResult, userId);
    const savedEntity  = await this.storedFileRepo.save(fileEntity);

    // ── Step 4: Emit event (gunakan savedEntity bukan fileEntity mentah) ──
    // savedEntity sudah memiliki `id` dari DB, sedangkan fileEntity belum.
    this.eventEmitter.emit(
      'storage.file_uploaded',
      new FileUploadedEvent(
        savedEntity.fileKey,
        savedEntity.imageUrl,
        userId,
        context,
        new Date(),
      ),
    );

    // ── Step 5: Return DTO dari savedEntity ──────────────────────────────
    // toResponseDto menerima savedEntity (bukan uploadResult) agar
    // storedFileId (entity.id) bisa disertakan dalam response.
    return this.mapper.toResponseDto(savedEntity);
  }
}