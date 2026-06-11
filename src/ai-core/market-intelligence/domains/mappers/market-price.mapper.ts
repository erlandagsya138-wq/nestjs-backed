// src/ai-core/market-intelligence/domains/mappers/market-price.mapper.ts
//
// v3 Fix: toCreateData() menerima agentRunId sebagai parameter eksplisit
// (sebelumnya tidak ada, sehingga agentRunId di entity kosong / tidak valid).

import { Injectable }                    from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketPriceEntryDto }           from '../../applications/dto/market-price-entry.dto';
import { DurianVarietyCode, MarketPriceEntity } from '../entities/market-price.entity';
import { CreateMarketPriceData }         from '../../infrastructures/repositories/market-price.repository.interface';

export class MarketPriceResponseDto {
  @ApiProperty({ description: 'UUID record harga.', example: '550e8400-...' })
  id: string = '';

  @ApiProperty({ enum: DurianVarietyCode, description: 'Kode varietas DOA Malaysia.' })
  varietyCode: string = '';

  @ApiProperty({ description: 'Nama alias produk dari sumber data.', example: 'Musang King' })
  varietyAlias: string = '';

  @ApiPropertyOptional({ description: 'Harga minimum per Kg (IDR).', nullable: true })
  pricePerKgMin: number | null = null;

  @ApiPropertyOptional({ description: 'Harga maksimum per Kg (IDR).', nullable: true })
  pricePerKgMax: number | null = null;

  @ApiPropertyOptional({ description: 'Harga rata-rata per Kg (IDR).', nullable: true })
  pricePerKgAvg: number | null = null;

  @ApiPropertyOptional({ description: 'Lokasi dari sumber data.', nullable: true })
  locationHint: string | null = null;

  @ApiPropertyOptional({ description: 'Jenis penjual.', nullable: true })
  sellerType: string | null = null;

  @ApiProperty({ description: 'Referensi berat asli dari listing.' })
  weightReference: string = '';

  @ApiProperty({ description: 'Skor kepercayaan LLM (0–1).', minimum: 0, maximum: 1 })
  confidence: number = 0;

  @ApiProperty({ description: 'Nama sumber data.' })
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
   * @param sourceName   - Nama sumber (e.g. "market-intelligence-agent")
   * @param sourceUrl    - URL sumber (e.g. "internal" atau URL produk)
   * @param agentVersion - Versi agent / run_id
   * @param agentRunId   - UUID AgentRunEntity yang sudah dibuat (FK wajib)
   */
  toCreateData(
    entry:        MarketPriceEntryDto,
    sourceName:   string,
    sourceUrl:    string,
    agentVersion: string,
    agentRunId:   string,  // ← BARU: wajib ada untuk FK
  ): CreateMarketPriceData {
    return {
      agentRunId,
      varietyCode:     entry.variety_code,
      varietyAlias:    entry.variety_alias.trim(),
      weightReference: entry.weight_reference.trim(),
      notes:           entry.notes,
      confidence:      entry.confidence,
      sourceName:      sourceName,
      sourceUrl:       sourceUrl,
      agentVersion:    agentVersion,
    };
  }

  toResponseDto(entity: MarketPriceEntity): MarketPriceResponseDto {
    return {
      id:              entity.id,
      varietyCode:     entity.varietyCode,
      varietyAlias:    entity.varietyAlias,
      pricePerKgAvg:   entity.pricePerKgAvg,
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