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
    description: 'Alias nama produk yang ditemukan di sumber data.',
    example:     'Musang King',
    maxLength:   100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  variety_alias: string = '';

  @ApiProperty({
    description:
      'TRUE jika dan hanya jika produk adalah durian utuh dengan kulit. ' +
      'Entri dengan nilai FALSE akan ditolak dan tidak disimpan.',
    example: true,
  })
  @IsBoolean()
  is_whole_fruit: boolean = false;

  @ApiProperty({
    description:
      'Referensi berat asli dari listing penjual sebelum normalisasi. ' +
      'Contoh: "per buah 2-3 kg", "per kg".',
    example:   'per buah 2 kg',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  weight_reference: string = '';

  @ApiPropertyOptional({
    description:
      'Chain-of-Thought LLM: catatan matematis normalisasi harga ke per-Kg. ' +
      'Null jika harga sudah dalam satuan per-Kg.',
    example:   'Harga listing Rp800.000/buah dibagi estimasi berat 2kg → 400000/kg',
    maxLength: 500,
    nullable:  true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes: string | null = null;

  @ApiPropertyOptional({
    description: 'Harga minimum per Kg dalam IDR.',
    example:     350000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_kg_min harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_kg_min: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga maksimum per Kg dalam IDR.',
    example:     450000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_kg_max harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_kg_max: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga rata-rata / titik tunggal per Kg dalam IDR.',
    example:     400000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_kg_avg harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_kg_avg: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga minimum per buah dalam IDR.',
    example:     800000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_unit_min harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_unit_min: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga maksimum per buah dalam IDR.',
    example:     1200000,
    minimum:     0,
    nullable:    true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'price_per_unit_max harus berupa angka' })
  @Min(0)
  @Type(() => Number)
  price_per_unit_max: number | null = null;

  @ApiPropertyOptional({
    description: 'Lokasi yang disebut di sumber data.',
    example:     'Jakarta',
    maxLength:   200,
    nullable:    true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location_hint: string | null = null;

  @ApiPropertyOptional({
    description: 'Jenis penjual.',
    example:     'reseller',
    enum:        ['kebun', 'reseller', 'importir', 'toko online'],
    maxLength:   100,
    nullable:    true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  seller_type: string | null = null;

  @ApiProperty({
    description: 'Kepercayaan LLM terhadap keakuratan entri ini (0–1).',
    example:     0.85,
    minimum:     0,
    maximum:     1,
  })
  @IsNumber({}, { message: 'confidence harus berupa angka' })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  confidence: number = 0.5;

  @ApiPropertyOptional({
    description: 'Potongan JSON sumber yang menjadi dasar ekstraksi.',
    example:     '{"name": "Durian Musang King Utuh", "price": 800000}',
    maxLength:   500,
    nullable:    true,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  raw_text_snippet: string | null = null;

  @ApiProperty({
    description: 'Nama platform sumber data',
    example: 'Tokopedia',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  source_name: string = '';

  @ApiProperty({
    description: 'URL spesifik ke halaman produk',
    example: 'https://tokopedia.com/product/123',
    maxLength: 512,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  source_url: string = '';
}