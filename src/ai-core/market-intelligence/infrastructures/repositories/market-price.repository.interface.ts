// src/ai-core/market-intelligence/infrastructures/repositories/market-price.repository.interface.ts
//
// v4 Sinkron dengan entity v4:
//   - CreateMarketPriceData: hapus pricePerKgMin/Max, pricePerUnitMax,
//     locationHint, sellerType, rawTextSnippet.
//   - Rename pricePerUnitMin → pricePerUnit.
//   - VarietyPriceAverage: field disesuaikan untuk card hasil scan.

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

/**
 * Hasil query view variety_price_avg.
 *
 * Dipakai oleh card hasil scan untuk menampilkan:
 *   "Perkiraan harga: Rp{min_price_per_unit} – Rp{max_price_per_unit}"
 *   dengan avg_price_per_unit sebagai titik tengah.
 */
export interface VarietyPriceAverage {
  variety_code:       string;
  variety_name:       string;

  /** Harga rata-rata per buah utuh (IDR) — titik tengah untuk card */
  avg_price_per_unit: number;

  /** Batas bawah range harga yang ditampilkan */
  min_price_per_unit: number;

  /** Batas atas range harga yang ditampilkan */
  max_price_per_unit: number;

  /** Harga rata-rata per kg — info sekunder opsional */
  avg_price_per_kg:   number | null;

  /** Jumlah listing yang masuk agregasi (untuk indikator kualitas data) */
  sample_count:       number;

  /** Rata-rata confidence dari listing yang masuk agregasi */
  avg_confidence:     number;

  /** Timestamp listing terbaru yang masuk agregasi */
  latest_data_at:     Date;
}

export interface IMarketPriceRepository {
  bulkCreate(data: CreateMarketPriceData[]): Promise<MarketPriceEntity[]>;

  /**
   * Kembalikan rata-rata harga terkini per varietas dari view variety_price_avg.
   * Dipakai oleh endpoint yang melayani card hasil scan.
   */
  findCurrentAverages(): Promise<VarietyPriceAverage[]>;

  findByRunId(runId: string): Promise<MarketPriceEntity[]>;
  findByVarietyCode(varietyCode: string, limit: number): Promise<MarketPriceEntity[]>;
}

export const MARKET_PRICE_REPOSITORY_TOKEN = Symbol('IMarketPriceRepository');