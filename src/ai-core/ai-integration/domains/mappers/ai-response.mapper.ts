// src/ai-core/ai-integration/domains/mappers/ai-response.mapper.ts
import { Injectable } from '@nestjs/common';
import { AiPredictResultDto } from '../../applications/dto/ai-predict-response.dto';
import { PredictionResultPayload } from '../../../predictions/infrastructures/repositories/prediction.repository.interface';
import { resolveVarietyName } from '../constants/variety.constants';

@Injectable()
export class AiResponseMapper {
  toPredictionResultPayload(
    result: AiPredictResultDto,
  ): PredictionResultPayload {
    return {
      varietyCode:     (result.varietyCode?.trim() ?? '').toUpperCase(),
      varietyName:     result.varietyName?.trim()   ?? '',
      localName:       result.localName?.trim()     ?? '',
      origin:          result.origin?.trim()        ?? '',
      description:     result.description?.trim()   ?? '',
      confidenceScore: this.normalizeScore(result.confidenceScore),
      imageEnhanced:   result.imageEnhanced,
      inferenceTimeMs: result.inferenceTimeMs + result.preprocessingTimeMs,
      allVarieties: result.allVarieties.map((v) => ({
        varietyCode:     (v.varietyCode?.trim() ?? '').toUpperCase(),
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