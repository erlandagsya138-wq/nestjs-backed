// src/ai-core/predictions/applications/orchestrator/prediction.orchestrator.ts
import { Injectable } from '@nestjs/common';
import {
  PaginatedPredictionResponseDto,
  PredictionResponseDto,
} from '../dto/prediction-response.dto';
import { FindPredictionsQueryDto } from '../dto/find-predictions-query.dto';
import { CreatePredictionUseCase } from '../use-cases/create-prediction.use-case';
import { FindPredictionByIdUseCase } from '../use-cases/find-prediction-by-id.use-case';
import { FindPredictionsByUserUseCase } from '../use-cases/find-predictions-by-user.use-case';
import type { IUploadedFile } from '../../../../shared/storage/domains/mappers/storage.mapper';

@Injectable()
export class PredictionOrchestrator {
  constructor(
    private readonly createPrediction: CreatePredictionUseCase,
    private readonly findById:         FindPredictionByIdUseCase,
    private readonly findByUser:       FindPredictionsByUserUseCase,
  ) {}

  // Signature diubah: file (IUploadedFile) menggantikan CreatePredictionDto.
  // Controller meneruskan Multer file object langsung ke sini.
  create(
    file:               IUploadedFile,
    authenticatedUserId: string,
  ): Promise<PredictionResponseDto> {
    return this.createPrediction.execute(file, authenticatedUserId);
  }

  getById(
    id:              string,
    requestingUserId: string,
  ): Promise<PredictionResponseDto> {
    return this.findById.execute(id, requestingUserId);
  }

  getAllByUser(
    userId: string,
    query:  FindPredictionsQueryDto,
  ): Promise<PaginatedPredictionResponseDto> {
    return this.findByUser.execute(userId, query);
  }
}