// src/ai-integration/applications/dto/ai-predict-response.dto.ts

export class AiVarietyScoreDto {
  variety_code: string = '';
  variety_name: string = '';
  confidence_score: number = 0;
}

export class AiRawPredictionDto {
  variety_code: string = '';
  variety_name: string = '';
  local_name: string = '';
  origin: string = '';
  description: string = '';
  confidence_score: number = 0;
}

export class AiPredictResponseDto {
  success: boolean = false;
  prediction: AiRawPredictionDto = new AiRawPredictionDto();
  all_varieties: AiVarietyScoreDto[] = [];
  confidence_scores: Record<string, number> = {};
  image_enhanced: boolean = false;
  inference_time_ms: number = 0;
  preprocessing_time_ms: number = 0;
  model_version: string | null = null;
  request_id: string | null = null;
}

// ── Tambah interface untuk satu entri all_varieties (camelCase) ──
export class VarietyScoreResultDto {
  varietyCode: string = '';
  varietyName: string = '';
  confidenceScore: number = 0;
}

export class AiPredictResultDto {
  predictionId: string = '';
  varietyCode: string = '';
  varietyName: string = '';
  localName: string = '';
  origin: string = '';
  description: string = '';
  confidenceScore: number = 0;
  imageEnhanced: boolean = false;
  inferenceTimeMs: number = 0;
  preprocessingTimeMs: number = 0;
  allVarieties: VarietyScoreResultDto[] = [];
  modelVersion: string | null = null;
  aiRequestId: string | null = null;
}