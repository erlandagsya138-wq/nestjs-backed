// src/ai-core/market-intelligence/domains/validators/market-price.validator.ts

import { Injectable, Logger } from '@nestjs/common';
import { MarketPriceEntryDto } from '../../applications/dto/market-price-entry.dto';
import { DurianVarietyCode }   from '../entities/market-price.entity';

const VALID_VARIETY_CODES = new Set<string>(Object.values(DurianVarietyCode));
const IQR_MULTIPLIER = 1.5;
const IQR_MIN_SAMPLE = 3;

@Injectable()
export class MarketPriceValidator {
  private readonly logger = new Logger(MarketPriceValidator.name);

  filterWholeAndValid(
    entries: MarketPriceEntryDto[],
    runId:   string,
  ): { valid: MarketPriceEntryDto[]; rejectedCount: number } {

    // ── Pass 1: filter dasar ─────────────────────────────────────────────────
    const pass1: MarketPriceEntryDto[] = [];
    let rejectedCount = 0;

    for (const entry of entries) {
      const reason = this._basicRejectionReason(entry);
      if (reason !== null) {
        this.logger.warn(
          `[Validator] Entry ditolak (basic) — run_id=${runId}, ` +
          `variety=${entry.variety_code}, alias='${entry.variety_alias}', ` +
          `reason=${reason}`,
        );
        rejectedCount++;
      } else {
        pass1.push(entry);
      }
    }

    // ── Pass 2: IQR outlier detection per varietas ───────────────────────────
    const valid: MarketPriceEntryDto[] = [];

    const grouped = new Map<string, MarketPriceEntryDto[]>();
    for (const entry of pass1) {
      const vc = entry.variety_code;
      if (!grouped.has(vc)) grouped.set(vc, []);
      grouped.get(vc)!.push(entry);
    }

    for (const [vc, group] of grouped) {
      const prices = group.map(e => e.price_per_unit);

      if (prices.length < IQR_MIN_SAMPLE) {
        this.logger.debug(
          `[Validator] ${vc}: hanya ${prices.length} sampel, skip IQR detection.`,
        );
        valid.push(...group);
        continue;
      }

      const { lowerFence, upperFence } = this._iqrFences(prices);
      this.logger.debug(
        `[Validator] ${vc}: IQR fence ` +
        `Rp${Math.round(lowerFence).toLocaleString('id-ID')} – ` +
        `Rp${Math.round(upperFence).toLocaleString('id-ID')} ` +
        `(${prices.length} sampel)`,
      );

      for (const entry of group) {
        const price = entry.price_per_unit;

        if (price < lowerFence || price > upperFence) {
          this.logger.warn(
            `[Validator] Entry ditolak (IQR outlier) — run_id=${runId}, ` +
            `variety=${vc}, ` +
            `price_per_unit=Rp${Math.round(price).toLocaleString('id-ID')}, ` +
            `fence=[${Math.round(lowerFence).toLocaleString('id-ID')}, ` +
            `${Math.round(upperFence).toLocaleString('id-ID')}]`,
          );
          rejectedCount++;
        } else {
          valid.push(entry);
        }
      }
    }

    this.logger.log(
      `[Validator] run_id=${runId}: ${valid.length} valid, ${rejectedCount} ditolak`,
    );

    return { valid, rejectedCount };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _basicRejectionReason(entry: MarketPriceEntryDto): string | null {
    // 1. Wajib buah utuh
    if (!entry.is_whole_fruit) {
      return 'is_whole_fruit=false';
    }

    // 2. Kode varietas harus dikenal
    const normalizedCode = entry.variety_code?.toString().trim().toUpperCase();
    if (!normalizedCode || !VALID_VARIETY_CODES.has(normalizedCode)) {
      return `variety_code tidak dikenal: '${entry.variety_code}'`;
    }

    // 3. Harga per buah wajib ada dan positif
    // price_per_unit sudah @Min(0) di DTO, tapi 0 tidak valid sebagai harga listing
    if (entry.price_per_unit <= 0) {
      return `price_per_unit tidak valid: ${entry.price_per_unit}`;
    }

    return null;
  }

  private _iqrFences(prices: number[]): { lowerFence: number; upperFence: number } {
    const sorted = [...prices].sort((a, b) => a - b);

    const q1  = this._percentile(sorted, 0.25);
    const q3  = this._percentile(sorted, 0.75);
    const iqr = q3 - q1;

    return {
      lowerFence: q1 - IQR_MULTIPLIER * iqr,
      upperFence: q3 + IQR_MULTIPLIER * iqr,
    };
  }

  private _percentile(sorted: number[], p: number): number {
    const idx  = p * (sorted.length - 1);
    const lo   = Math.floor(idx);
    const hi   = Math.ceil(idx);
    const frac = idx - lo;
    return sorted[lo] + frac * (sorted[hi] - sorted[lo]);
  }
}