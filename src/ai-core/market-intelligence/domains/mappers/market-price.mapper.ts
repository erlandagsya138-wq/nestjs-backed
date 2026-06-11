// src/ai-core/market-intelligence/domains/mappers/market-price.mapper.ts
//
// v4 Sinkron dengan entity & DTO v4:
//   - MarketPriceResponseDto: hapus pricePerKgMin/Max, locationHint, sellerType.
//     Tambah pricePerUnit sebagai field utama.
//   - toCreateData(): tambah pricePerUnit dan pricePerKgAvg yang sebelumnya
//     tidak diisi sama sekali (bug di v3).
//   - toResponseDto(): sinkron dengan field entity v4.

import { Injectable }                       from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketPriceEntryDto }              from '../../applications/dto/market-price-entry.dto';
import { DurianVarietyCode, MarketPriceEntity } from '../entities/market-price.entity';
import { CreateMarketPriceData }            from '../../infrastructures/repositories/market-price.repository.interface';

// ── Response DTO untuk endpoint publik (card hasil scan, dll.) ───────────────
export class MarketPriceResponseDto {
  @ApiProperty({ description: 'UUID record harga.', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string = '';

  @ApiProperty({ enum: DurianVarietyCode, description: 'Kode varietas DOA Malaysia.', example: 'D197' })
  varietyCode: string = '';

  @ApiProperty({ description: 'Nama standar varietas.', example: 'Musang King' })
  varietyAlias: string = '';

  @ApiProperty({
    description: 'Harga per buah utuh (IDR). Satu titik harga dari satu listing.',
    example:     1950000,
  })
  pricePerUnit: number = 0;

  @ApiPropertyOptional({
    description: 'Harga per kg (IDR) — data sekunder, dihitung dari pricePerUnit / estimasi berat.',
    example:     975000,
    nullable:    true,
  })
  pricePerKgAvg: number | null = null;

  @ApiProperty({ description: 'Referensi berat asli dari listing.', example: 'per buah ~2 kg (estimasi)' })
  weightReference: string = '';

  @ApiPropertyOptional({ description: 'Catatan normalisasi harga.', nullable: true })
  notes: string | null = null;

  @ApiProperty({ description: 'Skor kepercayaan extractor (0–1).', minimum: 0, maximum: 1, example: 0.80 })
  confidence: number = 0;

  @ApiProperty({ description: 'Nama platform sumber data.', example: 'shopee.co.id' })
  sourceName: string = '';

  @ApiProperty({ description: 'Waktu record dibuat.', format: 'date-time' })
  createdAt: Date = new Date();
}

@Injectable()
export class MarketPriceMapper {
  /**
   * Konversi DTO → data untuk repository.bulkCreate().
   *
   * @param entry        - Validated DTO dari Python agent
   * @param sourceName   - Nama platform (e.g. "shopee.co.id")
   * @param sourceUrl    - URL produk Google Shopping
   * @param agentVersion - Versi Python agent
   * @param agentRunId   - UUID AgentRunEntity (FK wajib)
   */
  toCreateData(
    entry:        MarketPriceEntryDto,
    sourceName:   string,
    sourceUrl:    string,
    agentVersion: string,
    agentRunId:   string,
  ): CreateMarketPriceData {
    return {
      agentRunId,
      varietyCode:     entry.variety_code,
      varietyAlias:    entry.variety_alias.trim(),
      pricePerUnit:    entry.price_per_unit,
      pricePerKgAvg:   entry.price_per_kg_avg ?? null,
      weightReference: entry.weight_reference.trim(),
      notes:           entry.notes ?? null,
      confidence:      entry.confidence,
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
      pricePerUnit:    entity.pricePerUnit,
      pricePerKgAvg:   entity.pricePerKgAvg,
      weightReference: entity.weightReference,
      notes:           entity.notes,
      confidence:      entity.confidence,
      sourceName:      entity.sourceName,
      createdAt:       entity.createdAt,
    };
  }

  toResponseDtoList(entities: MarketPriceEntity[]): MarketPriceResponseDto[] {
    return entities.map((e) => this.toResponseDto(e));
  }
}