import { Injectable } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketPriceEntryDto } from '../../applications/dto/market-price-entry.dto';
import { DurianVarietyCode, MarketPriceEntity } from '../entities/market-price.entity';
import { CreateMarketPriceData } from '../../infrastructures/repositories/market-price.repository.interface';

export class MarketPriceResponseDto {
  @ApiProperty({
    description: 'UUID record harga.',
    example:     '550e8400-e29b-41d4-a716-446655440000',
    format:      'uuid',
  })
  id: string = '';

  @ApiProperty({
    enum:        DurianVarietyCode,
    description: 'Kode varietas DOA Malaysia.',
    example:     DurianVarietyCode.D197,
  })
  varietyCode: string = '';

  @ApiProperty({
    description: 'Nama alias produk dari sumber data.',
    example:     'Musang King',
  })
  varietyAlias: string = '';

  @ApiPropertyOptional({
    description: 'Harga minimum per Kg (IDR).',
    example:     350000,
    nullable:    true,
  })
  pricePerKgMin: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga maksimum per Kg (IDR).',
    example:     450000,
    nullable:    true,
  })
  pricePerKgMax: number | null = null;

  @ApiPropertyOptional({
    description: 'Harga rata-rata per Kg (IDR).',
    example:     400000,
    nullable:    true,
  })
  pricePerKgAvg: number | null = null;

  @ApiPropertyOptional({
    description: 'Lokasi yang disebut di sumber data.',
    example:     'Jakarta',
    nullable:    true,
  })
  locationHint: string | null = null;

  @ApiPropertyOptional({
    description: 'Jenis penjual.',
    example:     'reseller',
    nullable:    true,
  })
  sellerType: string | null = null;

  @ApiProperty({
    description: 'Referensi berat asli dari listing.',
    example:     'per buah 2 kg',
  })
  weightReference: string = '';

  @ApiProperty({
    description: 'Skor kepercayaan LLM (0–1).',
    example:     0.85,
    minimum:     0,
    maximum:     1,
  })
  confidence: number = 0;

  @ApiProperty({
    description: 'Nama sumber data.',
    example:     'market-intelligence-agent',
  })
  sourceName: string = '';

  @ApiProperty({
    description: 'Waktu record dibuat.',
    example:     '2024-01-15T20:00:00.000Z',
    format:      'date-time',
  })
  createdAt: Date = new Date();
}

@Injectable()
export class MarketPriceMapper {
  toCreateData(
    entry:        MarketPriceEntryDto,
    sourceName:   string,
    sourceUrl:    string,
    agentVersion: string,
  ): CreateMarketPriceData {
    return {
      varietyCode:     entry.variety_code,
      varietyAlias:    entry.variety_alias.trim(),
      pricePerKgMin:   entry.price_per_kg_min,
      pricePerKgMax:   entry.price_per_kg_max,
      pricePerKgAvg:   entry.price_per_kg_avg,
      pricePerUnitMin: entry.price_per_unit_min,
      pricePerUnitMax: entry.price_per_unit_max,
      locationHint:    entry.location_hint,
      sellerType:      entry.seller_type,
      weightReference: entry.weight_reference.trim(),
      notes:           entry.notes,
      confidence:      entry.confidence,
      rawTextSnippet:  entry.raw_text_snippet,
      sourceName,
      sourceUrl,
      agentVersion,
    };
  }

  toResponseDto(entity: MarketPriceEntity): MarketPriceResponseDto {
    return {
      id:              entity.id,
      varietyCode:     entity.varietyCode,
      varietyAlias:    entity.varietyAlias,
      pricePerKgMin:   entity.pricePerKgMin,
      pricePerKgMax:   entity.pricePerKgMax,
      pricePerKgAvg:   entity.pricePerKgAvg,
      locationHint:    entity.locationHint,
      sellerType:      entity.sellerType,
      weightReference: entity.weightReference,
      confidence:      entity.confidence,
      sourceName:      entity.sourceName,
      createdAt:       entity.createdAt,
    };
  }

  toResponseDtoList(entities: MarketPriceEntity[]): MarketPriceResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}