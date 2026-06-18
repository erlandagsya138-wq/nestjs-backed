import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatasetExportFormat, DatasetStatus } from '../../domains/entities/dataset.entity';

export class ConfidenceSummaryDto {
  @ApiProperty({ example: 12 })
  readonly count!: number;

  @ApiPropertyOptional({ example: 0.8731, nullable: true })
  readonly average?: number | null;

  @ApiPropertyOptional({ example: 0.7012, nullable: true })
  readonly min?: number | null;

  @ApiPropertyOptional({ example: 0.9823, nullable: true })
  readonly max?: number | null;
}

export class DatasetItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', format: 'uuid' })
  readonly datasetId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', format: 'uuid' })
  readonly predictionId!: string;

  @ApiPropertyOptional({ example: 'D197', description: 'Kode varietas hasil prediksi AI.', nullable: true })
  readonly varietyCode?: string | null;

  @ApiPropertyOptional({ example: 'Musang King', description: 'Nama varietas hasil prediksi AI.', nullable: true })
  readonly varietyName?: string | null;

  @ApiPropertyOptional({ example: 0.9231, description: 'Confidence score (0–1).', nullable: true })
  readonly confidenceScore?: number | null;

  @ApiPropertyOptional({ example: 'very_high', enum: ['very_high', 'high', 'medium', 'low'], nullable: true })
  readonly confidenceTier?: 'very_high' | 'high' | 'medium' | 'low' | null;

  @ApiProperty({ example: 'http://localhost:3000/uploads/predictions/user-id/file.jpg' })
  readonly imageUrl!: string;

  @ApiPropertyOptional({ example: true, nullable: true })
  readonly isVerified?: boolean | null;

  @ApiProperty({ example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  readonly addedAt!: Date;
}

export class DatasetResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'Dataset Durian Premium Q2-2026' })
  readonly name!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Dataset berisi prediksi Musang King dengan confidence >= 85%' })
  readonly description?: string | null;

  @ApiProperty({ enum: DatasetStatus, example: DatasetStatus.DRAFT })
  readonly status!: DatasetStatus;

  @ApiProperty({ enum: DatasetExportFormat, example: DatasetExportFormat.JSON })
  readonly exportFormat!: DatasetExportFormat;

  @ApiProperty({ example: 12, description: 'Jumlah prediction di dataset ini.' })
  readonly totalItems!: number;

  @ApiPropertyOptional({ nullable: true, example: 'https://storage.example.com/datasets/export-abc123.zip' })
  readonly exportUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-06-09T10:00:00.000Z', format: 'date-time' })
  readonly exportedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true, example: 'Export gagal: storage error.' })
  readonly errorMessage?: string | null;

  @ApiProperty({ example: '2026-06-09T08:00:00.000Z', format: 'date-time' })
  readonly createdAt!: Date;

  @ApiPropertyOptional({ type: ConfidenceSummaryDto, nullable: true })
  readonly confidenceSummary?: ConfidenceSummaryDto | null;

  @ApiPropertyOptional({ type: [DatasetItemResponseDto], nullable: true })
  readonly items?: DatasetItemResponseDto[] | null;
}