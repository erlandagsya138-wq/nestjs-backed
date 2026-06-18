// src/ai-core/datasets/dataset.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ── Entities ──────────────────────────────────────────────────────────────────
import { DatasetEntity }     from './domains/entities/dataset.entity';
import { DatasetItemEntity } from './domains/entities/dataset-item.entity';

// ── Repository ────────────────────────────────────────────────────────────────
import { DatasetRepository }        from './infrastructures/repositories/dataset.repository';
import { DATASET_REPOSITORY_TOKEN } from './infrastructures/repositories/dataset.repository.interface';

// ── Domain Layer ──────────────────────────────────────────────────────────────
import { DatasetDomainService } from './domains/services/dataset-domain.service';
import { DatasetValidator }     from './domains/validators/dataset.validator';
import { DatasetMapper }        from './domains/mappers/dataset.mapper';

// ── Application Layer ─────────────────────────────────────────────────────────
import { CreateDatasetUseCase }               from './applications/use-cases/create-dataset.use-case';
import { GetDatasetUseCase }                  from './applications/use-cases/get-dataset.use-case';
import { AddPredictionToDatasetUseCase }      from './applications/use-cases/add-prediction-to-dataset.use-case';
import { BulkAddByConfidenceUseCase }         from './applications/use-cases/bulk-add-by-confidence.use-case';
import { RemovePredictionFromDatasetUseCase } from './applications/use-cases/remove-prediction-from-dataset.use-case';
import { DeleteDatasetUseCase }               from './applications/use-cases/delete-dataset.use-case';
import { ExportDatasetUseCase }               from './applications/use-cases/export-dataset.use-case';
import { DatasetOrchestrator }                from './applications/orchestrator/dataset.orchestrator';

// ── Interface Layer ───────────────────────────────────────────────────────────
import { DatasetController }      from './interface/http/dataset.controller';
import { DatasetExceptionFilter } from './interface/filters/dataset-exception.filter';

// ── External Module Dependencies ──────────────────────────────────────────────
import { PredictionModule } from '../predictions/prediction.module';
import { StorageModule }    from '../../shared/storage/storage.module';

const USE_CASES = [
  CreateDatasetUseCase,
  GetDatasetUseCase,
  AddPredictionToDatasetUseCase,
  BulkAddByConfidenceUseCase,
  RemovePredictionFromDatasetUseCase,
  DeleteDatasetUseCase,
  ExportDatasetUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([DatasetEntity, DatasetItemEntity]),
    PredictionModule,
    StorageModule,
  ],
  controllers: [DatasetController],
  providers: [
    // ── Repository (Dependency Inversion) ────────────────────────
    {
      provide:  DATASET_REPOSITORY_TOKEN,
      useClass: DatasetRepository,
    },

    // ── Domain Layer ─────────────────────────────────────────────
    DatasetDomainService,
    DatasetValidator,
    DatasetMapper,

    // ── Application Layer ─────────────────────────────────────────
    ...USE_CASES,
    DatasetOrchestrator,

    // ── Interface Filters ─────────────────────────────────────────
    DatasetExceptionFilter,
  ],
})
export class DatasetModule {}
