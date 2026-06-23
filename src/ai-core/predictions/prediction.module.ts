// src/ai-core/predictions/prediction.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PredictionEntity } from './domains/entities/prediction.entity';
import { PredictionRepository } from './infrastructures/repositories/prediction.repository';
import { PREDICTION_REPOSITORY_TOKEN } from './infrastructures/repositories/prediction.repository.interface';
import { PredictionDomainService } from './domains/services/prediction-domain.service';
import { PredictionValidator } from './domains/validators/prediction.validator';
import { PredictionMapper } from './domains/mappers/prediction.mapper';
import { CreatePredictionUseCase } from './applications/use-cases/create-prediction.use-case';
import { FindPredictionByIdUseCase } from './applications/use-cases/find-prediction-by-id.use-case';
import { FindPredictionsByUserUseCase } from './applications/use-cases/find-predictions-by-user.use-case';
import { PredictionOrchestrator } from './applications/orchestrator/prediction.orchestrator';
import { PredictionController } from './interface/http/prediction.controller';
import { AdminPredictionController } from './interface/http/admin-prediction.controller';
import { PredictionCreatedLogListener } from './infrastructures/listeners/prediction-created.listener';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';
import { StorageModule } from '../../shared/storage/storage.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';
import { FindAllPredictionsAdminUseCase } from './applications/use-cases/find-all-predictions-admin.use-case';
import { VerifyPredictionUseCase } from './applications/use-cases/verify-prediction.use-case';
import { ExportVerifiedDatasetUseCase } from './applications/use-cases/export-verified-dataset.use-case';

@Module({
  imports: [
    TypeOrmModule.forFeature([PredictionEntity]),
    forwardRef(() => AiIntegrationModule),
    StorageModule,
    MarketIntelligenceModule,
  ],
  controllers: [PredictionController, AdminPredictionController],
  providers: [
    { provide: PREDICTION_REPOSITORY_TOKEN, useClass: PredictionRepository },
    PredictionDomainService,
    PredictionValidator,
    PredictionMapper,
    CreatePredictionUseCase,
    FindPredictionByIdUseCase,
    FindPredictionsByUserUseCase,
    PredictionOrchestrator,
    PredictionCreatedLogListener,
    FindAllPredictionsAdminUseCase,
    VerifyPredictionUseCase,
    ExportVerifiedDatasetUseCase,
  ],
  exports: [
    PREDICTION_REPOSITORY_TOKEN,
    PredictionMapper,
    CreatePredictionUseCase,
    FindPredictionByIdUseCase,
  ],
})
export class PredictionModule {}