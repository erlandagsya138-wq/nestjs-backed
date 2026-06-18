// src/ai-core/datasets/domains/services/dataset-domain.service.ts

import { Injectable } from '@nestjs/common';
import { DatasetStatus } from '../entities/dataset.entity';
import { PredictionStatus } from '../../../predictions/domains/entities/prediction.entity';

/** Batas confidence score yang valid (0.00 – 1.00) */
export const CONFIDENCE_SCORE_MIN = 0;
export const CONFIDENCE_SCORE_MAX = 1;

/** Default threshold jika admin tidak menentukan */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

/** Status dataset yang memperbolehkan penambahan/penghapusan item dan trigger export */
export const DATASET_EDITABLE_STATUSES: readonly DatasetStatus[] = [
  DatasetStatus.DRAFT,
] as const;

/** Status prediction yang layak masuk dataset */
export const PREDICTION_ELIGIBLE_STATUSES: readonly PredictionStatus[] = [
  PredictionStatus.SUCCESS,
] as const;

export interface ConfidenceSummary {
  count:   number;
  average: number | null;
  min:     number | null;
  max:     number | null;
}

@Injectable()
export class DatasetDomainService {
  /**
   * Apakah dataset boleh dimodifikasi (tambah/hapus item, trigger export)?
   * Hanya dataset berstatus DRAFT yang editable.
   */
  isEditable(status: DatasetStatus): boolean {
    return (DATASET_EDITABLE_STATUSES as ReadonlyArray<DatasetStatus>).includes(status);
  }

  /**
   * Apakah prediction layak dimasukkan ke dataset?
   * Hanya prediction SUCCESS yang memiliki confidenceScore.
   */
  isPredictionEligible(
    status: PredictionStatus,
    confidenceScore: number | null,
  ): boolean {
    return (
      (PREDICTION_ELIGIBLE_STATUSES as ReadonlyArray<PredictionStatus>).includes(status) &&
      confidenceScore !== null
    );
  }

  /**
   * Apakah prediction memenuhi confidence threshold?
   */
  meetsThreshold(
    confidenceScore: number | null,
    threshold: number,
  ): boolean {
    if (confidenceScore === null) return false;
    return confidenceScore >= threshold;
  }

  /**
   * Apakah confidence threshold yang diberikan valid?
   */
  isValidThreshold(threshold: number): boolean {
    return (
      Number.isFinite(threshold) &&
      threshold >= CONFIDENCE_SCORE_MIN &&
      threshold <= CONFIDENCE_SCORE_MAX
    );
  }

  /**
   * Format confidence score untuk display: 0.9231 → "92.31%"
   */
  formatConfidenceScore(score: number): string {
    return `${(score * 100).toFixed(2)}%`;
  }

  /**
   * Klasifikasi confidence score ke label tier.
   * Dipakai untuk info/display di response dataset item.
   */
  classifyConfidence(score: number): 'very_high' | 'high' | 'medium' | 'low' {
    if (score >= 0.90) return 'very_high';
    if (score >= 0.75) return 'high';
    if (score >= 0.50) return 'medium';
    return 'low';
  }

  /**
   * Build ringkasan statistik dataset dari list confidence scores.
   * Mengembalikan null untuk average/min/max jika tidak ada scores.
   */
  buildConfidenceSummary(scores: number[]): ConfidenceSummary {
    if (scores.length === 0) {
      return { count: 0, average: null, min: null, max: null };
    }

    const sum = scores.reduce((acc, s) => acc + s, 0);

    return {
      count:   scores.length,
      // Bulatkan ke 4 desimal untuk konsistensi dengan DB numeric precision
      average: Math.round((sum / scores.length) * 10_000) / 10_000,
      min:     Math.min(...scores),
      max:     Math.max(...scores),
    };
  }
}
