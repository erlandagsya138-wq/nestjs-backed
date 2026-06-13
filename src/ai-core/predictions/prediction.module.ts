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
import { PredictionCreatedLogListener } from './infrastructures/listeners/prediction-created.listener';
import { AiIntegrationModule } from '../ai-integration/ai-integration.module';

// StorageModule di-import agar UploadFileUseCase tersedia untuk di-inject
// ke CreatePredictionUseCase. Ini memungkinkan 1 request POST /predictions
// menjalankan upload + predict secara sequential dalam satu transaksi logis.
import { StorageModule } from '../../shared/storage/storage.module';
import { MarketIntelligenceModule } from '../market-intelligence/market-intelligence.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PredictionEntity]),
    forwardRef(() => AiIntegrationModule),

    // StorageModule menyediakan: UploadFileUseCase, StorageDomainService,
    // StorageAdapterProvider, dan StoredFileRepository
    StorageModule,
    MarketIntelligenceModule,
  ],
  controllers: [PredictionController],
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
  ],
  exports: [
    PREDICTION_REPOSITORY_TOKEN,
    PredictionMapper,
    CreatePredictionUseCase,
    FindPredictionByIdUseCase,
  ],
})
export class PredictionModule {}