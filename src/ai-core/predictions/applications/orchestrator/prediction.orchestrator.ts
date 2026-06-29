// src/ai-core/predictions/applications/orchestrator/prediction.orchestrator.ts
import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  PaginatedPredictionResponseDto,
  PredictionResponseDto,
} from '../dto/prediction-response.dto';
import { FindPredictionsQueryDto } from '../dto/find-predictions-query.dto';
import { AdminListPredictionsQueryDto, VerifyPredictionDto } from '../dto/admin-prediction.dto';
import { CreatePredictionUseCase } from '../use-cases/create-prediction.use-case';
import { FindPredictionByIdUseCase } from '../use-cases/find-prediction-by-id.use-case';
import { FindPredictionsByUserUseCase } from '../use-cases/find-predictions-by-user.use-case';
import type { IUploadedFile } from '../../../../shared/storage/domains/mappers/storage.mapper';
import { VerifyPredictionUseCase } from '../use-cases/verify-prediction.use-case';
import { FindAllPredictionsAdminUseCase } from '../use-cases/find-all-predictions-admin.use-case';
import { ExportVerifiedDatasetUseCase } from '../use-cases/export-verified-dataset.use-case';
import { DeletePredictionUseCase } from '../use-cases/delete-prediction.use-case';

export type MobilePredictionItemDto = Pick<
  PredictionResponseDto,
  'id' | 'varietyCode' | 'varietyName' | 'confidenceScore' | 'imageUrl' | 'status' | 'createdAt' | 'marketPriceSummary'
>;

export interface PaginatedMobilePredictionResponseDto extends Omit<PaginatedPredictionResponseDto, 'data'> {
  data: MobilePredictionItemDto[];
}

@Injectable()
export class PredictionOrchestrator {
  constructor(
    private readonly createPrediction: CreatePredictionUseCase,
    private readonly findById:         FindPredictionByIdUseCase,
    private readonly findByUser:       FindPredictionsByUserUseCase,
    private readonly findAllAdmin:     FindAllPredictionsAdminUseCase,
    private readonly verifyPrediction: VerifyPredictionUseCase,
    private readonly exportDatasetUseCase: ExportVerifiedDatasetUseCase,
    private readonly deletePredictionUseCase: DeletePredictionUseCase,
  ) {}

  create(
    file:               IUploadedFile,
    authenticatedUserId: string,
  ): Promise<PredictionResponseDto> {
    return this.createPrediction.execute(file, authenticatedUserId);
  }

  getById(
    id:               string,
    requestingUserId: string,
  ): Promise<PredictionResponseDto> {
    return this.findById.execute(id, requestingUserId);
  }

  async getAllByUser(
    userId: string,
    query:  FindPredictionsQueryDto,
  ): Promise<PaginatedMobilePredictionResponseDto> {

    const paginatedResult: PaginatedPredictionResponseDto = await this.findByUser.execute(userId, query);

    const dietItems: MobilePredictionItemDto[] = paginatedResult.data.map((item: PredictionResponseDto) => {
      return {
        id: item.id,
        varietyCode: item.varietyCode,
        varietyName: item.varietyName,
        confidenceScore: item.confidenceScore,
        imageUrl: item.imageUrl,
        status: item.status,
        createdAt: item.createdAt,
        marketPriceSummary: item.marketPriceSummary,
      };
    });

    return {
      ...paginatedResult,
      data: dietItems,
    };
  }

  getAllForAdmin(query: AdminListPredictionsQueryDto): Promise<PaginatedPredictionResponseDto> {
    return this.findAllAdmin.execute(query);
  }

  verify(id: string, dto: VerifyPredictionDto): Promise<PredictionResponseDto> {
    return this.verifyPrediction.execute(id, dto);
  }

  exportVerifiedDataset(res: Response): Promise<void> {
    return this.exportDatasetUseCase.execute(res);
  }

  deletePrediction(id: string): Promise<void> {
    return this.deletePredictionUseCase.execute(id);
  }
}