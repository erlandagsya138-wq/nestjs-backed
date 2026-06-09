// src/ai-core/market-intelligence/domains/validators/market-price.validator.ts
//
// Perubahan dari versi sebelumnya:
//   - Tambah IQR outlier detection pada price_per_unit per run
//     sehingga listing ekstrem tidak masuk ke rata-rata akhir.
//   - filterWholeAndValid() sekarang menerima seluruh batch entries
//     agar IQR bisa dihitung sebelum memfilter.

import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { MarketPriceEntryDto } from '../../applications/dto/market-price-entry.dto';
import { DurianVarietyCode } from '../entities/market-price.entity';

const VALID_VARIETY_CODES = new Set<string>(Object.values(DurianVarietyCode));

// Rentang IQR: entry di luar median ± IQR_MULTIPLIER × IQR dibuang
const IQR_MULTIPLIER = 1.5;

// Minimum entry per varietas agar IQR bisa bermakna.
// Jika kurang dari ini, skip outlier detection (simpan semua yang lolos filter dasar).
const IQR_MIN_SAMPLE = 3;

@Injectable()
export class MarketPriceValidator {
  private readonly logger = new Logger(MarketPriceValidator.name);

  filterWholeAndValid(
    entries: MarketPriceEntryDto[],
    runId:   string,
  ): { valid: MarketPriceEntryDto[]; rejectedCount: number } {

    // ── Pass 1: filter dasar (is_whole_fruit, variety_code, ada harga) ──────
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

    // Kelompokkan per variety_code
    const grouped = new Map<string, MarketPriceEntryDto[]>();
    for (const entry of pass1) {
      const vc = entry.variety_code;
      if (!grouped.has(vc)) grouped.set(vc, []);
      grouped.get(vc)!.push(entry);
    }

    for (const [vc, group] of grouped) {
      // Ambil semua harga per-buah yang tersedia
      const prices = group
        .map(e => e.price_per_unit_min ?? e.price_per_unit_max ?? null)
        .filter((p): p is number => p !== null);

      if (prices.length < IQR_MIN_SAMPLE) {
        // Terlalu sedikit sampel — tidak bisa deteksi outlier, simpan semua
        this.logger.debug(
          `[Validator] ${vc}: hanya ${prices.length} sampel, skip IQR detection.`,
        );
        valid.push(...group);
        continue;
      }

      const { lowerFence, upperFence } = this._iqrFences(prices);
      this.logger.debug(
        `[Validator] ${vc}: IQR fence Rp${Math.round(lowerFence).toLocaleString()} – ` +
          `Rp${Math.round(upperFence).toLocaleString()} (${prices.length} sampel)`,
      );

      for (const entry of group) {
        const unitPrice = entry.price_per_unit_min ?? entry.price_per_unit_max ?? null;

        if (unitPrice === null) {
          // Tidak punya harga per-buah sama sekali — sudah lolos pass1,
          // tapi tidak bisa di-IQR-check. Simpan.
          valid.push(entry);
          continue;
        }

        if (unitPrice < lowerFence || unitPrice > upperFence) {
          this.logger.warn(
            `[Validator] Entry ditolak (IQR outlier) — run_id=${runId}, ` +
              `variety=${vc}, price_per_unit=Rp${Math.round(unitPrice).toLocaleString()}, ` +
              `fence=[${Math.round(lowerFence).toLocaleString()}, ${Math.round(upperFence).toLocaleString()}]`,
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
    if (!entry.is_whole_fruit) {
      return 'is_whole_fruit=false';
    }

    const normalizedCode = entry.variety_code?.toString().trim().toUpperCase();
    if (!normalizedCode || !VALID_VARIETY_CODES.has(normalizedCode)) {
      return `variety_code tidak dikenal: '${entry.variety_code}'`;
    }

    const prices = [
      entry.price_per_kg_min,
      entry.price_per_kg_max,
      entry.price_per_kg_avg,
      entry.price_per_unit_min,
      entry.price_per_unit_max,
    ];
    const hasPrice = prices.some(p => p !== null && p !== undefined && p >= 0);
    if (!hasPrice) {
      return 'semua field harga null';
    }

    return null;
  }

  /**
   * Hitung lower dan upper fence IQR dari array harga.
   * Lower fence = Q1 - multiplier × IQR
   * Upper fence = Q3 + multiplier × IQR
   */
  private _iqrFences(prices: number[]): { lowerFence: number; upperFence: number } {
    const sorted = [...prices].sort((a, b) => a - b);
    const n      = sorted.length;

    const q1 = this._percentile(sorted, 0.25);
    const q3 = this._percentile(sorted, 0.75);
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

  assertAtLeastOnePrice(entry: MarketPriceEntryDto): void {
    const prices = [
      entry.price_per_kg_min,
      entry.price_per_kg_max,
      entry.price_per_kg_avg,
      entry.price_per_unit_min,
      entry.price_per_unit_max,
    ];
    if (!prices.some(p => p !== null && p !== undefined)) {
      throw new UnprocessableEntityException(
        `Entry variety='${entry.variety_code}' tidak memiliki field harga yang terisi.`,
      );
    }
  }
}