import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DatasetExportFormat } from '../../domains/entities/dataset.entity';

// ==========================================
// REQUEST
// ==========================================
export class CreateDatasetDto {
  @ApiProperty({
    description: 'Nama dataset untuk identifikasi.',
    example: 'Dataset Durian Premium Q2-2026',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'name wajib diisi' })
  @MaxLength(255)
  readonly name!: string;

  @ApiPropertyOptional({
    description: 'Deskripsi tujuan atau kriteria dataset ini.',
    example: 'Fokus pada keaslian buah dengan tingkat kepercayaan tinggi',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  readonly description?: string | null;

  @ApiProperty({
    enum: DatasetExportFormat,
    description: 'Format file export yang diinginkan.',
    example: DatasetExportFormat.JSON,
    default: DatasetExportFormat.JSON,
  })
  @IsEnum(DatasetExportFormat, {
    message: `exportFormat harus salah satu dari: ${Object.values(DatasetExportFormat).join(', ')}`,
  })
  readonly exportFormat: DatasetExportFormat = DatasetExportFormat.JSON;
}