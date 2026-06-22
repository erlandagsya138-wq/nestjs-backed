// src/shared/storage/applications/dto/upload-file.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export type StorageProvider = 'local' | 's3';

export class UploadFileDto {
  @ApiPropertyOptional({
    description: 'Sub-folder penyimpanan. Hanya boleh berisi huruf, angka, strip, dan underscore.',
    example:     'predictions',
    maxLength:   50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, { 
    message: 'Context hanya boleh berisi huruf, angka, strip (-), dan underscore (_)'
  })
  context?: string;

  @ApiPropertyOptional({
    description: 'Storage provider yang digunakan.',
    enum:        ['local', 's3'],
    example:     'local',
  })
  @IsIn(['local', 's3'])
  @IsOptional()
  provider?: StorageProvider;
}