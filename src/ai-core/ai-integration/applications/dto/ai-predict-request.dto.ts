// src/ai-integration/applications/dto/ai-predict-request.dto.ts

export class AiPredictRequestDto {
  predictionId: string = '';
  userId: string = '';
  imageBuffer: Buffer = Buffer.alloc(0);
  imageMimeType: string = '';
  originalFileName: string = '';
}
