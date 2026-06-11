// src/shared/storage/domains/mappers/storage.mapper.ts
import { Injectable } from '@nestjs/common';
import {
  RawUploadedFile,
  StoredFileEntity,
} from '../entities/stored-file.entity';
import { StorageResponseDto } from '../../applications/dto/storage-response.dto';
import { UploadResult } from '../../infrastructures/adapters/storage.adapter.interface';

export interface IUploadedFile {
  buffer:       Buffer;
  originalname: string;
  mimetype:     string;
  size:         number;
}

@Injectable()
export class StorageMapper {
  /**
   * Mengkonversi file mentah dari Multer ke RawUploadedFile.
   */
  toRawUploadedFile(file: IUploadedFile): RawUploadedFile {
    return {
      buffer:       file.buffer,
      originalName: file.originalname,
      mimeType:     file.mimetype,
      sizeInBytes:  file.size,
    };
  }

  /**
   * Mengkonversi UploadResult (return value adapter) + userId
   * ke StoredFileEntity yang siap di-persist ke database.
   *
   * PENTING: Entity yang dihasilkan belum memiliki `id` dan `createdAt`
   * — keduanya di-generate saat `repository.save()` via @BeforeInsert
   * dan @CreateDateColumn.
   */
  toEntity(result: UploadResult, userId: string): StoredFileEntity {
    const entity        = new StoredFileEntity();
    entity.userId       = userId;
    entity.fileKey      = result.fileKey;
    entity.imageUrl     = result.imageUrl;
    entity.originalName = result.originalName;
    entity.mimeType     = result.mimeType;
    entity.sizeInBytes  = result.sizeInBytes;
    entity.provider     = result.provider;
    return entity;
  }

  /**
   * Mengkonversi StoredFileEntity yang sudah di-persist ke DTO response.
   *
   * Menerima entity yang sudah di-save (bukan UploadResult mentah) agar
   * `storedFileId` yang dihasilkan DB bisa disertakan dalam response.
   */
  toResponseDto(entity: StoredFileEntity): StorageResponseDto {
    return {
      storedFileId: entity.id,        // ID dari DB — tersedia setelah save()
      fileKey:      entity.fileKey,
      imageUrl:     entity.imageUrl,
      originalName: entity.originalName,
      mimeType:     entity.mimeType,
      sizeInBytes:  entity.sizeInBytes,
      provider:     entity.provider,
      uploadedAt:   entity.createdAt, // createdAt tersedia setelah save()
    };
  }
}