// src/ai-integration/domains/services/ai-integration-domain.service.ts
import { Injectable } from '@nestjs/common';

export interface ImageMetadata {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  sizeInBytes: number;
}

@Injectable()
export class AiIntegrationDomainService {
  readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ] as const;

  readonly MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

  isAllowedMimeType(
    mimeType: string,
  ): mimeType is (typeof this.ALLOWED_MIME_TYPES)[number] {
    return (this.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
  }

  isWithinSizeLimit(sizeInBytes: number): boolean {
    return sizeInBytes <= this.MAX_SIZE_BYTES;
  }

  buildFileName(predictionId: string, mimeType: string): string {
    const ext = this.mimeToExtension(mimeType);
    return `prediction-${predictionId}.${ext}`;
  }

  private mimeToExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return map[mimeType] ?? 'bin';
  }
}
