// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.interface.ts

import { DurianVarietyCode, MarketPriceEntity } from '../../domains/entities/market-price.entity';

export interface CreateMarketPriceData {
  agentRunId:      string;
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

/**
 * Hasil query view variety_price_avg.
 * Ini adalah tipe data yang dikembalikan ke aplikasi frontend.
 */
export interface VarietyPriceAverage {
  variety_code:       string;
  variety_name:       string;
  /** Harga rata-rata per buah utuh (IDR) — angka utama untuk ditampilkan */
  avg_price_per_unit: number;
  min_price_per_unit: number;
  max_price_per_unit: number;
  /** Harga rata-rata per kg — info sekunder */
  avg_price_per_kg:   number | null;
  sample_count:       number;
  avg_confidence:     number;
  latest_data_at:     Date;
}

export interface IMarketPriceRepository {
  bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]>;

  /** Kembalikan rata-rata harga terkini per varietas dari view agregasi. */
  findCurrentAverages(): Promise<VarietyPriceAverage[]>;

  findByRunId(runId: string): Promise<MarketPriceEntity[]>;
  findByVarietyCode(varietyCode: string, limit: number): Promise<MarketPriceEntity[]>;
}

export const MARKET_PRICE_REPOSITORY_TOKEN = Symbol('IMarketPriceRepository');