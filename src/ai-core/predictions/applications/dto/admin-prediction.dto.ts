// src/ai-core/predictions/applications/dto/admin-prediction.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PredictionStatus } from '../../domains/entities/prediction.entity';

export class AdminListPredictionsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Transform(({ value }) => (isNaN(parseInt(value)) ? 1 : parseInt(value)))
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @Transform(({ value }) => (isNaN(parseInt(value)) ? 10 : parseInt(value)))
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  readonly limit: number = 10;

  @ApiPropertyOptional({ enum: PredictionStatus })
  @IsEnum(PredictionStatus)
  @IsOptional()
  readonly status?: PredictionStatus;

  @ApiPropertyOptional({ example: 'D197' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  readonly varietyCode?: string;

  @ApiPropertyOptional({ description: 'Filter status verifikasi: true/false' })
  @Type(() => String)
  @Transform(({ value }) => {
    const val = String(value).toUpperCase();
    if (val === 'TRUE' || val === '1') return true;
    if (val === 'FALSE' || val === '0') return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  readonly isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Filter data yang sudah dikurasi (true) atau belum (false)' })
  @Type(() => String)
  @Transform(({ value }) => {
    const val = String(value).toUpperCase();
    // Jika URL mengandung isCurated=true, 1, atau VERIFIED -> diubah ke boolean true
    if (val === 'TRUE' || val === '1' || val === 'VERIFIED') return true;
    // Jika URL mengandung isCurated=false, 0, atau UNVERIFIED -> diubah ke boolean false
    if (val === 'FALSE' || val === '0' || val === 'UNVERIFIED') return false;
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  readonly isCurated?: boolean;
}

export class VerifyPredictionDto {
  @ApiProperty({
    description: 'Tandai apakah prediksi AI benar (true) atau salah (false).',
    example: true,
  })
  @IsBoolean()
  readonly isVerified!: boolean;

  @ApiPropertyOptional({
    description: 'Catatan admin (misal alasan ditolak: gambar blur).',
    example: 'Gambar terlalu blur, corak duri tidak jelas.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  readonly adminNote?: string;

  @ApiPropertyOptional({
    description: 'Kode varietas yang benar jika prediksi disalahkan (misal: D197)',
    example: 'D197',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  readonly correctedVarietyCode?: string;
}