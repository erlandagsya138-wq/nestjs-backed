// src/ai-core/ai-integration/domains/mappers/ai-response.mapper.ts
import { Injectable } from '@nestjs/common';
import { AiPredictResultDto } from '../../applications/dto/ai-predict-response.dto';
import { PredictionResultPayload } from '../../../predictions/infrastructures/repositories/prediction.repository.interface';

/**
 * Lookup map varietyCode → varietyName.
 *
 * FastAPI hanya mengembalikan varietyCode di array allVarieties —
 * varietyName tidak disertakan per item. Mapper me-resolve nama
 * secara lokal agar tidak perlu round-trip ke FastAPI untuk data
 * yang sudah diketahui di compile time.
 *
 * Jika FastAPI menambah varietas baru, tambahkan entri di sini.
 */
const VARIETY_NAME_MAP: Record<string, string> = {
  D2:   'Dato Nina',
  D13:  'D13',
  D24:  'Sultan',
  D197: 'Musang King'
};

/**
 * Fallback jika varietyCode tidak dikenal di map.
 * Lebih aman daripada crash — prediction tetap tersimpan
 * dengan varietyCode yang benar, hanya varietyName-nya generic.
 */
function resolveVarietyName(code: string): string {
  const trimmed = code?.trim().toUpperCase() ?? '';
  return VARIETY_NAME_MAP[trimmed] ?? trimmed;
}

@Injectable()
export class AiResponseMapper {
  toPredictionResultPayload(
    result: AiPredictResultDto,
  ): PredictionResultPayload {
    return {
      varietyCode:     result.varietyCode.trim().toUpperCase(),
      varietyName:     result.varietyName.trim(),
      localName:       result.localName.trim(),
      origin:          result.origin.trim(),
      description:     result.description.trim(),
      confidenceScore: this.normalizeScore(result.confidenceScore),
      imageEnhanced:   result.imageEnhanced,
      inferenceTimeMs: result.inferenceTimeMs + result.preprocessingTimeMs,
      allVarieties: result.allVarieties.map((v) => ({
        varietyCode:     v.varietyCode.trim().toUpperCase(),
        varietyName:     resolveVarietyName(v.varietyCode),
        confidenceScore: this.normalizeScore(v.confidenceScore),
      })),

      modelVersion: result.modelVersion,
      aiRequestId:  result.aiRequestId,
    };
  }

  private normalizeScore(score: number): number {
    return parseFloat(score.toFixed(4));
  }
}