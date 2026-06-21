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

  readonly MAX_SIZE_BYTES = 10 * 1024 * 1024;

  isAllowedMimeType(
    mimeType: string,
  ): mimeType is (typeof this.ALLOWED_MIME_TYPES)[number] {
    return (this.ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
  }

  isWithinSizeLimit(sizeInBytes: number): boolean {
    return sizeInBytes <= this.MAX_SIZE_BYTES;
  }

  isValidImageSignature(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 12) return false;

    // JPEG signature: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    if (
      buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a &&
      buffer[6] === 0x1a && buffer[7] === 0x0a
    ) {
      return true;
    }

    const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF';
    const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP';
    if (isRiff && isWebp) {
      return true;
    }

    return false;
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