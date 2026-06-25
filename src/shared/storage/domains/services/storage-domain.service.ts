// src/storage/domains/services/storage-domain.service.ts
import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageDomainService {
  readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
  ] as const;

  readonly MAX_SIZE_BYTES = 10 * 1024 * 1024; // 5MB

  /**
   * Generate file key yang unik dan terstruktur.
   * Format: {context}/{userId}/{uuid}.{ext}
   * Contoh: predictions/abc-123/f47ac10b.jpg
   */
  generateFileKey(
    originalName: string,
    userId: string,
    context: string = 'general',
  ): string {
    const ext = extname(originalName).toLowerCase() || '.bin';
    const uniqueId = uuidv4().replace(/-/g, '').substring(0, 8);
    return `${context}/${userId}/${uniqueId}${ext}`;
  }

  isAllowedMimeType(
    mimeType: string,
  ): mimeType is (typeof this.ALLOWED_MIME_TYPES)[number] {
    return (this.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
  }

  isWithinSizeLimit(sizeInBytes: number): boolean {
    return sizeInBytes <= this.MAX_SIZE_BYTES;
  }

  formatFileSize(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)}MB`;
  }

  getMaxSizeMb(): number {
    return this.MAX_SIZE_BYTES / (1024 * 1024);
  }
}
