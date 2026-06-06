// src/shared/storage/infrastructures/adapters/storage.adapter.interface.ts
import { RawUploadedFile } from '../../domains/entities/stored-file.entity';
import { StorageProvider } from '../../domains/entities/stored-file.entity';

/**
 * Hasil mentah dari operasi upload di storage layer (local/S3).
 *
 * Tipe ini sengaja BUKAN TypeORM entity — adapter di Infrastructure layer
 * tidak boleh tahu tentang ORM. Mapper-lah yang mengkonversi ini ke
 * StoredFileEntity sebelum di-persist ke database.
 */
export interface UploadResult {
  fileKey:      string;
  imageUrl:     string;
  originalName: string;
  mimeType:     string;
  sizeInBytes:  number;
  provider:     StorageProvider;
}

export interface IStorageAdapter {
  upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult>;
  delete(fileKey: string): Promise<void>;
  buildPublicUrl(fileKey: string): string;
}

export const STORAGE_ADAPTER_TOKEN = Symbol('IStorageAdapter');