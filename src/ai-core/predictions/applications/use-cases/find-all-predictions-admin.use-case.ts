import { Inject, Injectable } from '@nestjs/common';
import { PaginatedPredictionResponseDto } from '../dto/prediction-response.dto';
import { AdminListPredictionsQueryDto } from '../dto/admin-prediction.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import { PREDICTION_REPOSITORY_TOKEN, type IPredictionRepository } from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class FindAllPredictionsAdminUseCase {
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly mapper: PredictionMapper,
  ) {}

  async execute(query: AdminListPredictionsQueryDto): Promise<PaginatedPredictionResponseDto> {
    console.log("===== USECASE =====");
  console.log(query);
    const { page, limit, status, varietyCode, isVerified, isCurated } = query;
    const skip = (page - 1) * limit;

    const [predictions, total] = await this.predictionRepo.findAllForAdmin({
      skip, limit, status, varietyCode, isVerified, isCurated
    });

    return {
      data: this.mapper.toResponseDtoList(predictions),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
  }
}