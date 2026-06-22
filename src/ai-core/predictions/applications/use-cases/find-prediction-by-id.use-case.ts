// src/predictions/applications/use-cases/find-prediction-by-id.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { PredictionResponseDto } from '../dto/prediction-response.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import { PredictionValidator } from '../../domains/validators/prediction.validator';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class FindPredictionByIdUseCase {
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: PredictionValidator,
    private readonly mapper: PredictionMapper,
  ) {}

  async execute(
    id: string,
    requestingUserId: string,
  ): Promise<PredictionResponseDto> {
    const prediction = await this.predictionRepo.findById(id);

    this.validator.assertExistsAndBelongsToUser(
      prediction,
      id,
      requestingUserId,
    );

    return this.mapper.toResponseDto(prediction!);
  }
}
