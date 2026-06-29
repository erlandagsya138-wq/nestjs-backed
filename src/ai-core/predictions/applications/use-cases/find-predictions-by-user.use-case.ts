// src/predictions/applications/use-cases/find-predictions-by-user.use-case.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaginatedPredictionResponseDto } from '../dto/prediction-response.dto';
import { FindPredictionsQueryDto } from '../dto/find-predictions-query.dto';
import { PredictionMapper } from '../../domains/mappers/prediction.mapper';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/prediction.repository.interface';
import { MarketIntelligenceOrchestrator } from '../../../market-intelligence/applications/orchestrator/market-intelligence.orchestrator';

@Injectable()
export class FindPredictionsByUserUseCase {
  private readonly logger = new Logger(FindPredictionsByUserUseCase.name);
  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly mapper: PredictionMapper,
    private readonly marketIntelligenceOrchestrator: MarketIntelligenceOrchestrator,
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
    const data = this.mapper.toResponseDtoList(predictions);

    await Promise.all(
      data.map(async (item) => {
        if (item.status === 'SUCCESS' && item.varietyCode) {
          try {
            const priceSummary = await this.marketIntelligenceOrchestrator.getPriceSummaryByVariety(item.varietyCode);
            item.marketPriceSummary = priceSummary ?? null;
          } catch (err) {
            this.logger.error(`[FindPredictionsByUser] Gagal ambil harga pasar untuk varietas ${item.varietyCode}`);
            item.marketPriceSummary = null;
          }
        }
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }
}