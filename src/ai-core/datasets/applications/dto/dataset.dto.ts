// src/ai-core/datasets/applications/dto/dataset.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DatasetExportFormat,
  DatasetStatus,
} from '../../domains/entities/dataset.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Request DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class CreateDatasetDto {
  @ApiProperty({
    description: 'Nama dataset untuk identifikasi.',
    example:     'Dataset Durian Premium Q2-2026',
    maxLength:   255,
  })
  @IsString()
  @IsNotEmpty({ message: 'name wajib diisi' })
  @MaxLength(255)
  name: string = '';

  @ApiPropertyOptional({
    description: 'Deskripsi tujuan atau kriteria dataset ini.',
    example:     'Dataset berisi prediction Musang King dengan confidence >= 85%',
    nullable:    true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description: string | null = null;

  @ApiProperty({
    enum:        DatasetExportFormat,
    description: 'Format file export yang diinginkan.',
    example:     DatasetExportFormat.JSON,
    default:     DatasetExportFormat.JSON,
  })
  @IsEnum(DatasetExportFormat, {
    message: `exportFormat harus salah satu dari: ${Object.values(DatasetExportFormat).join(', ')}`,
  })
  exportFormat: DatasetExportFormat = DatasetExportFormat.JSON;
}

export class AddPredictionToDatasetDto {
  @ApiProperty({
    description: 'UUID prediction yang akan ditambahkan ke dataset.',
    example:     '550e8400-e29b-41d4-a716-446655440000',
    format:      'uuid',
  })
  @IsUUID('4', { message: 'predictionId harus berupa UUID v4 yang valid' })
  @IsNotEmpty()
  predictionId: string = '';

  @ApiPropertyOptional({
    description:
      'Confidence threshold minimum (0.00–1.00). ' +
      'Prediction akan ditolak jika confidence score-nya di bawah nilai ini. ' +
      'Jika tidak diisi, prediction langsung ditambahkan tanpa filter threshold.',
    example:     0.85,
    minimum:     0,
    maximum:     1,
    nullable:    true,
  })
  @IsNumber({}, { message: 'confidenceThreshold harus berupa angka' })
  @Min(0)
  @Max(1)
  @IsOptional()
  @Type(() => Number)
  confidenceThreshold: number | null = null;
}

export class BulkAddByConfidenceDto {
  @ApiProperty({
    description:
      'Confidence threshold minimum (0.00–1.00). ' +
      'Semua prediction SUCCESS dengan confidenceScore >= nilai ini akan ditambahkan.',
    example:     0.80,
    minimum:     0,
    maximum:     1,
  })
  @IsNumber({}, { message: 'confidenceThreshold harus berupa angka' })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidenceThreshold: number = 0.7;

  @ApiPropertyOptional({
    description:
      'Filter berdasarkan kode varietas DOA Malaysia. ' +
      'Jika tidak diisi, semua varietas disertakan.',
    example:     'D197',
    nullable:    true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  varietyCode: string | null = null;
}

export class ListDatasetsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit: number = 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTOs
// ─────────────────────────────────────────────────────────────────────────────

export class ConfidenceSummaryDto {
  @ApiProperty({ example: 12 })
  count: number = 0;

  @ApiPropertyOptional({ example: 0.8731, nullable: true })
  average: number | null = null;

  @ApiPropertyOptional({ example: 0.7012, nullable: true })
  min: number | null = null;

  @ApiPropertyOptional({ example: 0.9823, nullable: true })
  max: number | null = null;
}

export class DatasetItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  id: string = '';

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', format: 'uuid' })
  datasetId: string = '';

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', format: 'uuid' })
  predictionId: string = '';

  @ApiPropertyOptional({
    example:     'D197',
    description: 'Kode varietas hasil prediksi AI.',
    nullable:    true,
  })
  varietyCode: string | null = null;

  @ApiPropertyOptional({
    example:     'Musang King',
    description: 'Nama varietas hasil prediksi AI.',
    nullable:    true,
  })
  varietyName: string | null = null;

  @ApiPropertyOptional({
    example:     0.9231,
    description: 'Confidence score (0–1, 4 desimal).',
    nullable:    true,
  })
  confidenceScore: number | null = null;

  @ApiPropertyOptional({
    example:     'very_high',
    description: 'Klasifikasi tier confidence.',
    enum:        ['very_high', 'high', 'medium', 'low'],
    nullable:    true,
  })
  confidenceTier: 'very_high' | 'high' | 'medium' | 'low' | null = null;

  @ApiProperty({
    example: 'http://localhost:3000/uploads/predictions/user-id/file.jpg',
  })
  imageUrl: string = '';

  @ApiPropertyOptional({
    example:     true,
    description: 'Apakah prediction ini sudah diverifikasi admin.',
    nullable:    true,
  })
  isVerified: boolean | null = null;

  @ApiProperty({ example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  addedAt: Date = new Date();
}

export class DatasetResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  id: string = '';

  @ApiProperty({ example: 'Dataset Durian Premium Q2-2026' })
  name: string = '';

  @ApiPropertyOptional({ nullable: true, example: 'Dataset berisi prediction dengan confidence >= 85%' })
  description: string | null = null;

  @ApiProperty({ enum: DatasetStatus, example: DatasetStatus.DRAFT })
  status: DatasetStatus = DatasetStatus.DRAFT;

  @ApiProperty({ enum: DatasetExportFormat, example: DatasetExportFormat.JSON })
  exportFormat: DatasetExportFormat = DatasetExportFormat.JSON;

  @ApiProperty({ example: 12, description: 'Jumlah prediction di dataset ini.' })
  totalItems: number = 0;

  @ApiPropertyOptional({
    nullable:    true,
    example:     'https://storage.example.com/datasets/export-abc123.zip',
    description: 'URL download file export. Tersedia setelah status READY.',
  })
  exportUrl: string | null = null;

  @ApiPropertyOptional({ nullable: true, example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  exportedAt: Date | null = null;

  @ApiPropertyOptional({ nullable: true, example: 'Export gagal: storage error.' })
  errorMessage: string | null = null;

  @ApiProperty({ example: '2026-06-09T08:00:00.000Z', format: 'date-time' })
  createdAt: Date = new Date();

  @ApiPropertyOptional({
    type:     ConfidenceSummaryDto,
    nullable: true,
    description: 'Ringkasan statistik confidence score dari semua item (tersedia di detail view).',
  })
  confidenceSummary: ConfidenceSummaryDto | null = null;

  @ApiPropertyOptional({
    type:     [DatasetItemResponseDto],
    nullable: true,
    description: 'List item (tersedia di detail view, null di list view).',
  })
  items: DatasetItemResponseDto[] | null = null;
}

export class PaginatedDatasetResponseDto {
  @ApiProperty({ type: [DatasetResponseDto] })
  data: DatasetResponseDto[] = [];

  @ApiProperty({ example: 5 })
  total: number = 0;

  @ApiProperty({ example: 1 })
  page: number = 1;

  @ApiProperty({ example: 10 })
  limit: number = 10;

  @ApiProperty({ example: 1 })
  totalPages: number = 0;
}

export class BulkAddResultDto {
  @ApiProperty({ example: 8, description: 'Jumlah prediction yang berhasil ditambahkan.' })
  added: number = 0;

  @ApiProperty({ example: 3, description: 'Jumlah prediction yang dilewati (sudah ada / tidak memenuhi threshold).' })
  skipped: number = 0;

  @ApiProperty({ example: 11, description: 'Total prediction yang dievaluasi.' })
  evaluated: number = 0;
}