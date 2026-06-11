// src/shared/storage/applications/dto/storage-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import type { StorageProvider } from './upload-file.dto';

export class StorageResponseDto {
  @ApiProperty({
    description: 'UUID record StoredFile di database. Digunakan secara internal — tidak perlu dikirim ulang ke /predictions karena flow sudah terintegrasi.',
    example:     'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  storedFileId: string = '';

  @ApiProperty({
    description: 'Unique key file di storage (path relatif atau S3 key).',
    example:     'predictions/user-id/abc12345.jpg',
  })
  fileKey: string = '';

  @ApiProperty({
    description: 'URL publik file.',
    example:     'http://localhost:3000/uploads/predictions/user-id/abc12345.jpg',
  })
  imageUrl: string = '';

  @ApiProperty({ example: 'durian-photo.jpg' })
  originalName: string = '';

  @ApiProperty({ example: 'image/jpeg', description: 'MIME type file' })
  mimeType: string = '';

  @ApiProperty({ example: 1048576, description: 'Ukuran file dalam bytes' })
  sizeInBytes: number = 0;

  @ApiProperty({ enum: ['local', 's3'], example: 'local' })
  provider: StorageProvider = 'local';

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  uploadedAt: Date = new Date();
}