import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PredictionResponseDto } from '../dto/prediction-response.dto';
import { VerifyPredictionDto } from '../dto/admin-prediction.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import { PredictionValidator } from '../../domains/validators/prediction.validator';
import { PREDICTION_REPOSITORY_TOKEN, type IPredictionRepository } from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class VerifyPredictionUseCase {
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: PredictionValidator,
    private readonly mapper: PredictionMapper,
  ) {}

  async execute(id: string, dto: VerifyPredictionDto): Promise<PredictionResponseDto> {
    const prediction = await this.predictionRepo.findById(id);
    this.validator.assertExists(prediction, id);

    if (prediction.status !== 'SUCCESS') {
      throw new BadRequestException(`Tidak dapat memverifikasi prediksi dengan status ${prediction.status}`);
    }

    const updated = await this.predictionRepo.verify(id, {
      isVerified: dto.isVerified,
      adminNote: dto.adminNote,
      correctedVarietyCode: dto.correctedVarietyCode,
    });

    return this.mapper.toResponseDto(updated);
  }
}