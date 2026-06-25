import { Inject, Injectable, Logger } from '@nestjs/common';
import { PredictionResponseDto } from '../dto/prediction-response.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import { PredictionValidator } from '../../domains/validators/prediction.validator';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/prediction.repository.interface';
import { MarketIntelligenceOrchestrator } from '../../../market-intelligence/applications/orchestrator/market-intelligence.orchestrator';

@Injectable()
export class FindPredictionByIdUseCase {
  private readonly logger = new Logger(FindPredictionByIdUseCase.name);

  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: PredictionValidator,
    private readonly mapper: PredictionMapper,
    private readonly marketIntelligenceOrchestrator: MarketIntelligenceOrchestrator,
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

    const responseDto = this.mapper.toResponseDto(prediction!);

    if (prediction!.status === 'SUCCESS' && prediction!.varietyCode) {
      try {
        const priceSummary = await this.marketIntelligenceOrchestrator.getPriceSummaryByVariety(prediction!.varietyCode);

        responseDto.marketPriceSummary = priceSummary || {
          minPriceKg: 0,
          maxPriceKg: 0,
          avgPriceKg: 0,
          totalListings: 0
        };

      } catch (error: unknown) {
        this.logger.error(`[TESTING] Gagal ambil harga:`, error);
        responseDto.marketPriceSummary = {
          minPriceKg: 999,
          maxPriceKg: 999,
          avgPriceKg: 999,
          totalListings: 999
        };
      }
    }

    return responseDto;
  }
}