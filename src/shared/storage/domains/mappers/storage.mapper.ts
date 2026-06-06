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
   * RawUploadedFile adalah DTO internal pipeline upload sebelum
   * data di-persist — bukan TypeORM entity.
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
   * userId diperlukan karena adapter tidak tahu konteks user —
   * hanya tahu tentang file storage. Mapper yang menggabungkan
   * kedua konteks ini.
   */
  toEntity(result: UploadResult, userId: string): StoredFileEntity {
    const entity       = new StoredFileEntity();
    entity.userId      = userId;
    entity.fileKey     = result.fileKey;
    entity.imageUrl    = result.imageUrl;
    entity.originalName = result.originalName;
    entity.mimeType    = result.mimeType;
    entity.sizeInBytes = result.sizeInBytes;
    entity.provider    = result.provider;
    // id dan createdAt di-generate otomatis via @BeforeInsert dan @CreateDateColumn
    return entity;
  }

  /**
   * Mengkonversi StoredFileEntity ke DTO response untuk API.
   * Field uploadedAt di-map dari createdAt karena StoredFile lama
   * menggunakan uploadedAt, sedangkan entity baru menggunakan createdAt.
   */
  toResponseDto(entity: StoredFileEntity): StorageResponseDto {
    return {
      fileKey:      entity.fileKey,
      imageUrl:     entity.imageUrl,
      originalName: entity.originalName,
      mimeType:     entity.mimeType,
      sizeInBytes:  entity.sizeInBytes,
      provider:     entity.provider,
      uploadedAt:   entity.createdAt,
    };
  }
}