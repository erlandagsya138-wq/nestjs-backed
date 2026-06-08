// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.ts
//
// v3 Fix: Sertakan agentRunId saat create entity.

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { MarketPriceEntity } from '../../domains/entities/market-price.entity';
import {
  CreateMarketPriceData,
  IMarketPriceRepository,
} from './market-price.repository.interface';

@Injectable()
export class MarketPriceRepository implements IMarketPriceRepository {
  private readonly logger = new Logger(MarketPriceRepository.name);

  constructor(
    @InjectRepository(MarketPriceEntity)
    private readonly ormRepo: Repository<MarketPriceEntity>,
  ) {}

  async bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]> {
    if (data.length === 0) return [];

    try {
      const entities = data.map((d) =>
        this.ormRepo.create({
          agentRunId:      d.agentRunId,     // ← FK ke agent_runs
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