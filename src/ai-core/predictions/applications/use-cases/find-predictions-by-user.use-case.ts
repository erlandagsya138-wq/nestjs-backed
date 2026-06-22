// src/predictions/applications/use-cases/find-predictions-by-user.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { PaginatedPredictionResponseDto } from '../dto/prediction-response.dto';
import { FindPredictionsQueryDto } from '../dto/find-predictions-query.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class FindPredictionsByUserUseCase {
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly mapper: PredictionMapper,
  ) {}

  async execute(
    userId: string,
    query: FindPredictionsQueryDto,
  ): Promise<PaginatedPredictionResponseDto> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [predictions, total] =
      await this.predictionRepo.findAllByUserIdPaginated(userId, skip, limit);

    const totalPages = Math.ceil(total / limit);

    return {
      data: this.mapper.toResponseDtoList(predictions),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
