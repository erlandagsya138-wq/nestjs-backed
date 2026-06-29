import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO untuk request export dataset.
 * Semua field optional — tanpa filter = export semua data.
 */
export class ExportDatasetRequestDto {
  @ApiPropertyOptional({
    description: 'Filter berdasarkan kode durian. Kosongkan untuk semua varietas.',
    example: ['D197', 'MUSANG_KING'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  durianCodes?: string[];

  @ApiPropertyOptional({
    description: 'Tanggal mulai filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Hanya sertakan gambar yang telah diverifikasi',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  onlyVerified?: boolean;
}
