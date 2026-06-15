// src/ai-core/ai-integration/domains/validators/ai-response.validator.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiPredictResultDto } from '../../applications/dto/ai-predict-response.dto';
import { VALID_VARIETY_CODES } from '../constants/variety.constants';

@Injectable()
export class AiResponseValidator {
  assertValidResult(result: AiPredictResultDto): void {
    this.assertVarietyCode(result.varietyCode);
    this.assertConfidenceScore(result.confidenceScore);
    this.assertVarietyName(result.varietyName);
  }

  private assertVarietyCode(code: string): void {
    if (!code || code.trim().length === 0) {
      throw new InternalServerErrorException(
        'AI service mengembalikan variety_code kosong.',
      );
    }

    const normalized = code.trim().toUpperCase();

    if (!VALID_VARIETY_CODES.has(normalized)) {
      throw new InternalServerErrorException(
        `AI service mengembalikan variety_code tidak dikenal: '${code}'. ` +
          `Nilai valid: ${[...VALID_VARIETY_CODES].join(', ')}.`,
      );
    }
  }

  private assertVarietyName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InternalServerErrorException(
        'AI service mengembalikan variety_name kosong.',
      );
    }
  }

  private assertConfidenceScore(score: number): void {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new InternalServerErrorException(
        'AI service mengembalikan confidence_score yang tidak valid (bukan number).',
      );
    }

    if (score < 0 || score > 1) {
      throw new InternalServerErrorException(
        `confidence_score harus antara 0 dan 1, diterima: ${score}.`,
      );
    }
  }
}