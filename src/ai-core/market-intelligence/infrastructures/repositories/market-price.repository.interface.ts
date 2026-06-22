// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.interface.ts

import { SelectQueryBuilder } from 'typeorm';
import { DurianVarietyCode, MarketPriceEntity } from '../../domains/entities/market-price.entity';

export interface CreateMarketPriceData {
  agentRunId:      string;
  varietyCode:     DurianVarietyCode;
  varietyAlias:    string;
  pricePerUnit:    number;
  pricePerKgAvg:   number | null;
  weightReference: string;
  notes:           string | null;
  confidence:      number;
  sourceName:      string;
  sourceUrl:       string;
  agentVersion:    string;
}

export interface VarietyPriceAverage {
  variety_code:       string;
  variety_name:       string;
  avg_price_per_unit: number;
  min_price_per_unit: number;
  max_price_per_unit: number;
  avg_price_per_kg:   number | null;
  sample_count:       number;
  avg_confidence:     number;
  latest_data_at:     Date;
}

export interface IMarketPriceRepository {
  bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]>;

  findCurrentAverages(): Promise<VarietyPriceAverage[]>;

  findByRunId(runId: string): Promise<MarketPriceEntity[]>;
  findByVarietyCode(varietyCode: string, limit: number): Promise<MarketPriceEntity[]>;
  createQueryBuilder(alias: string): SelectQueryBuilder<MarketPriceEntity>;
}

export const MARKET_PRICE_REPOSITORY_TOKEN = Symbol('IMarketPriceRepository');