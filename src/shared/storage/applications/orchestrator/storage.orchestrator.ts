// src/storage/applications/orchestrator/storage.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { UploadFileDto } from '../dto/upload-file.dto';
import { StorageResponseDto } from '../dto/storage-response.dto';
import { UploadFileUseCase } from '../use-cases/upload-file.use-case';
import type { IUploadedFile } from '../../domains/mappers/storage.mapper';

@Injectable()
export class StorageOrchestrator {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
  ) {}

  upload(
    file:   IUploadedFile | undefined | null,
    dto:    UploadFileDto,
    userId: string,
  ): Promise<StorageResponseDto> {
    return this.uploadFile.execute(file, dto, userId);
  }

}
