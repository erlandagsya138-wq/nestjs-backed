// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.ts
//
// Tambahan: findCurrentAverages() — query view variety_price_avg.
// Ini satu-satunya method yang dipanggil untuk menampilkan harga ke pengguna.

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MarketPriceEntity } from '../../domains/entities/market-price.entity';
import {
  CreateMarketPriceData,
  IMarketPriceRepository,
  VarietyPriceAverage,
} from './market-price.repository.interface';

@Injectable()
export class MarketPriceRepository implements IMarketPriceRepository {
  private readonly logger = new Logger(MarketPriceRepository.name);

  constructor(
    @InjectRepository(MarketPriceEntity)
    private readonly ormRepo: Repository<MarketPriceEntity>,

    private readonly dataSource: DataSource,
  ) {}

  async bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]> {
    if (data.length === 0) return [];

    try {
      const entities = data.map((d) =>
        this.ormRepo.create({
          agentRunId:      d.agentRunId,
          varietyCode:     d.varietyCode,
          varietyAlias:    d.varietyAlias,
          pricePerKgMin:   d.pricePerKgMin,
          pricePerKgMax:   d.pricePerKgMax,
          pricePerKgAvg:   d.pricePerKgAvg,
          pricePerUnitMin: d.pricePerUnitMin,
          pricePerUnitMax: d.pricePerUnitMax,
          locationHint:    d.locationHint,
          sellerType:      d.sellerType,
          weightReference: d.weightReference,
          notes:           d.notes,
          confidence:      d.confidence,
          rawTextSnippet:  d.rawTextSnippet,
          sourceName:      d.sourceName,
          sourceUrl:       d.sourceUrl,
          agentVersion:    d.agentVersion,
        }),
      );

      return await this.ormRepo.save(entities);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[MarketPriceRepository] bulkCreate gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal menyimpan data harga pasar: ${message}`,
      );
    }
  }

  /**
   * Query view variety_price_avg — hasil agregasi bersih siap ditampilkan ke pengguna.
   * Kembalikan array terurut: D197, D13, D24, D2.
   */
  async findCurrentAverages(): Promise<VarietyPriceAverage[]> {
    try {
      const rows = await this.dataSource.query<VarietyPriceAverage[]>(
        `SELECT
           variety_code,
           variety_name,
           avg_price_per_unit,
           min_price_per_unit,
           max_price_per_unit,
           avg_price_per_kg,
           sample_count,
           avg_confidence,
           latest_data_at
         FROM variety_price_avg`,
      );
      return rows;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[MarketPriceRepository] findCurrentAverages gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal mengambil rata-rata harga: ${message}`,
      );
    }
  }

  async findByRunId(runId: string): Promise<MarketPriceEntity[]> {
    return this.ormRepo.find({
      where: { agentRunId: runId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByVarietyCode(
    varietyCode: string,
    limit: number,
  ): Promise<MarketPriceEntity[]> {
    return this.ormRepo.find({
      where: { varietyCode: varietyCode as MarketPriceEntity['varietyCode'] },
      order: { createdAt: 'DESC' },
      take:  limit,
    });
  }
}