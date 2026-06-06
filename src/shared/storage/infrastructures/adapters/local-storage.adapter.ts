// src/shared/storage/infrastructures/adapters/local-storage.adapter.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RawUploadedFile } from '../../domains/entities/stored-file.entity';
import {
  IStorageAdapter,
  UploadResult,
} from './storage.adapter.interface';

@Injectable()
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly logger   = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;
  private readonly baseUrl:   string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('STORAGE_LOCAL_DIR', 'uploads');
    this.baseUrl   = this.config.getOrThrow<string>('APP_BASE_URL');
  }

  async upload(file: RawUploadedFile, fileKey: string): Promise<UploadResult> {
    const fullPath = path.join(this.uploadDir, fileKey);
    const dir      = path.dirname(fullPath);

    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, file.buffer);

      this.logger.log(`[Local] File uploaded → ${fullPath}`);

      // Return UploadResult (plain object) — bukan StoredFileEntity.
      // Mapper di layer atas yang akan mengkonversi ini ke entity.
      const result: UploadResult = {
        fileKey,
        imageUrl:     this.buildPublicUrl(fileKey),
        originalName: file.originalName,
        mimeType:     file.mimeType,
        sizeInBytes:  file.sizeInBytes,
        provider:     'local',
      };

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Local] Upload failed → ${message}`);
      throw new InternalServerErrorException(
        `Gagal menyimpan file ke local storage: ${message}`,
      );
    }
  }

  async delete(fileKey: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, fileKey);
    try {
      await fs.unlink(fullPath);
      this.logger.log(`[Local] File deleted → ${fullPath}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[Local] Delete failed (mungkin sudah terhapus) → ${message}`,
      );
    }
  }

  buildPublicUrl(fileKey: string): string {
    const normalizedKey = fileKey.replace(/\\/g, '/');
    return `${this.baseUrl}/uploads/${normalizedKey}`;
  }
}