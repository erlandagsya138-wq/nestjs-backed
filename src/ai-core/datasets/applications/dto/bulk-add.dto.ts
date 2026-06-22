import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ==========================================
// REQUEST
// ==========================================
export class BulkAddByConfidenceDto {
  @ApiProperty({
    description: 'Semua prediction SUCCESS dengan confidenceScore >= nilai ini akan ditambahkan.',
    example: 0.80,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber({}, { message: 'confidenceThreshold harus berupa angka' })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  readonly confidenceThreshold: number = 0.7;

  @ApiPropertyOptional({
    description: 'Filter berdasarkan kode varietas DOA Malaysia (misal: D197).',
    example: 'D197',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  readonly varietyCode?: string | null;

  @ApiPropertyOptional({
    description: 'Jika true, hanya memasukkan prediksi yang sudah di-verify benar (isVerified = true) oleh admin.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  readonly onlyVerified?: boolean = true;
}

// ==========================================
// RESPONSE
// ==========================================
export class BulkAddResultDto {
  @ApiProperty({ example: 8, description: 'Jumlah prediction yang berhasil ditambahkan.' })
  readonly added!: number;

  @ApiProperty({ example: 3, description: 'Jumlah prediction yang dilewati.' })
  readonly skipped!: number;

  @ApiProperty({ example: 11, description: 'Total prediction yang dievaluasi.' })
  readonly evaluated!: number;
}