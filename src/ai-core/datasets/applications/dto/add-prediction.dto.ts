import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ==========================================
// REQUEST
// ==========================================
export class AddPredictionToDatasetDto {
  @ApiProperty({
    description: 'UUID prediction yang akan ditambahkan ke dataset.',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'predictionId harus berupa UUID v4 yang valid' })
  @IsNotEmpty()
  readonly predictionId!: string;

  @ApiPropertyOptional({
    description: 'Prediction akan ditolak jika confidence score-nya di bawah nilai ini.',
    example: 0.85,
    minimum: 0,
    maximum: 1,
    nullable: true,
  })
  @IsNumber({}, { message: 'confidenceThreshold harus berupa angka' })
  @Min(0)
  @Max(1)
  @IsOptional()
  @Type(() => Number)
  readonly confidenceThreshold?: number | null;
}