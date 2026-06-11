// src/ai-core/market-intelligence/applications/dto/market-price-entry.dto.ts
//
// v4 Sinkron dengan market-price.entity.ts v4:
//   - HAPUS price_per_kg_min, price_per_kg_max
//   - HAPUS price_per_unit_max
//   - HAPUS location_hint, seller_type, raw_text_snippet
//   - RENAME price_per_unit_min → price_per_unit

import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DurianVarietyCode } from '../../domains/entities/market-price.entity';

export class MarketPriceEntryDto {
  @ApiProperty({
    enum:        DurianVarietyCode,
    description: 'Kode varietas DOA Malaysia.',
    example:     DurianVarietyCode.D197,
  })
  @IsEnum(DurianVarietyCode, {
    message: `variety_code harus salah satu dari: ${Object.values(DurianVarietyCode).join(', ')}`,
  })
  @IsNotEmpty()
  variety_code: DurianVarietyCode = DurianVarietyCode.D197;

  @ApiProperty({
    description: 'Nama standar varietas.',
    example:     'Musang King',
    maxLength:   100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  variety_alias: string = '';

  @ApiProperty({
    description:
      'TRUE jika produk adalah durian utuh dengan kulit. ' +
      'Entri FALSE akan ditolak.',
    example: true,
  })
  @IsBoolean()
  is_whole_fruit: boolean = false;

  @ApiProperty({
    description:
      'Referensi berat dari listing sebelum normalisasi. ' +
      'Contoh: "per buah ~2.5 kg (estimasi)", "per kg × 2 kg".',
    example:   'per buah ~2.5 kg (estimasi)',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  weight_reference: string = '';

  @ApiPropertyOptional({
    description:
      'Catatan normalisasi harga dari extractor. ' +
      'Contoh: "Rp650.000/buah (berat estimasi 2.5 kg untuk D13)".',
    example:   'Rp650.000/buah (berat estimasi 2.5 kg untuk D13)',
    maxLength: 500,
    nullable:  true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes: string | null = null;

  @ApiProperty({
    description:
      'Harga per buah utuh dalam IDR. ' +
      'Satu listing = satu titik harga. Range pada card hasil scan ' +
      'dihasilkan dari agregasi MIN/MAX field ini di view variety_price_avg.',
    example:   650000,
    minimum:   0,
  })
  @IsNumber({}, { message: 'price_per_unit harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_unit: number = 0;

  @ApiPropertyOptional({
    description: 'Harga per kg dalam IDR — data sekunder untuk referensi internal.',
    example:     260000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_kg_avg harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_kg_avg: number | null = null;

  @ApiProperty({
    description: 'Skor kepercayaan extractor (0–1).',
    example:     0.80,
    minimum:     0,
    maximum:     1,
  })
  @IsNumber({}, { message: 'confidence harus berupa angka' })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidence: number = 0.5;

  @ApiProperty({
    description: 'Nama platform sumber data.',
    example:     'shopee.co.id',
    maxLength:   255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  source_name: string = '';

  @ApiProperty({
    description: 'URL ke halaman produk di Google Shopping.',
    example:     'https://www.google.co.id/search?ibp=oshop&...',
    maxLength:   512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  source_url: string = '';
}