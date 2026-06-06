// src/storage/applications/use-cases/upload-file.use-case.ts
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
import { FileUploadedEvent } from '../../infrastructures/events/file-uploaded.event';

@Injectable()
export class UploadFileUseCase {
  constructor(
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    private readonly domainService:  StorageDomainService,
    private readonly validator:      FileValidator,
    private readonly mapper:         StorageMapper,
    private readonly eventEmitter:   EventEmitter2,
  ) {}

  /**
   * FIX [CRITICAL — IDOR]: userId tidak lagi berasal dari DTO (request body).
   * userId sekarang diterima sebagai parameter eksplisit yang sudah diverifikasi
   * dari JWT token oleh controller via @CurrentUser('sub').
   */
  async execute(
    file:    IUploadedFile | undefined | null,
    dto:     UploadFileDto,
    userId:  string,
  ): Promise<StorageResponseDto> {
    this.validator.assertAll(file);

    const context = dto.context ?? 'general';
    const fileKey = this.domainService.generateFileKey(
      file.originalname,
      userId,
      context,
    );

    const rawFile = this.mapper.toRawUploadedFile(file);
    const stored  = await this.storageAdapter.upload(rawFile, fileKey);

    const fileEntity = this.mapper.toEntity(stored, userId);

    this.eventEmitter.emit(
      'storage.file_uploaded',
      new FileUploadedEvent(fileEntity.fileKey, fileEntity.imageUrl, userId, context, new Date()),
    );

    return this.mapper.toResponseDto(fileEntity);
  }
}