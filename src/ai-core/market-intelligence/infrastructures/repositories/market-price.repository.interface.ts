// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.interface.ts
//
// v3 Fix: Tambah agentRunId ke CreateMarketPriceData.
// Sebelumnya field ini tidak ada sehingga FK ke agent_runs tidak terisi.

import { DurianVarietyCode, MarketPriceEntity } from '../../domains/entities/market-price.entity';

export interface CreateMarketPriceData {
  agentRunId:      string;          // ← BARU: FK wajib ke agent_runs.id
  varietyCode:     DurianVarietyCode;
  varietyAlias:    string;
  pricePerKgMin:   number | null;
  pricePerKgMax:   number | null;
  pricePerKgAvg:   number | null;
  pricePerUnitMin: number | null;
  pricePerUnitMax: number | null;
  locationHint:    string | null;
  sellerType:      string | null;
  weightReference: string;
  notes:           string | null;
  confidence:      number;
  rawTextSnippet:  string | null;
  sourceName:      string;
  sourceUrl:       string;
  agentVersion:    string;
}

export interface IMarketPriceRepository {
  bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]>;
  findByRunId(runId: string): Promise<MarketPriceEntity[]>;
  findByVarietyCode(varietyCode: string, limit: number): Promise<MarketPriceEntity[]>;
}

export const MARKET_PRICE_REPOSITORY_TOKEN = Symbol('IMarketPriceRepository');