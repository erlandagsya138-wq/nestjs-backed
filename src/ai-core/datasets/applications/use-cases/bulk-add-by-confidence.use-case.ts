// src/ai-core/datasets/applications/use-cases/bulk-add-by-confidence.use-case.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { BulkAddByConfidenceDto, BulkAddResultDto } from '../dto/bulk-add.dto';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  CreateDatasetItemData,
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../../predictions/infrastructures/repositories/prediction.repository.interface';
import { DatasetDomainService } from '../../domains/services/dataset-domain.service';
import { PredictionStatus } from '../../../predictions/domains/entities/prediction.entity';

@Injectable()
export class BulkAddByConfidenceUseCase {
  private readonly logger = new Logger(BulkAddByConfidenceUseCase.name);

  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: DatasetValidator,
    private readonly domainService: DatasetDomainService,
  ) {}

  async execute(
    datasetId: string,
    dto: BulkAddByConfidenceDto,
  ): Promise<BulkAddResultDto> {
    // 1. Validasi dataset
    const dataset = await this.datasetRepo.findById(datasetId);
    this.validator.assertDatasetExists(dataset, datasetId);
    this.validator.assertDatasetEditable(dataset);
    this.validator.assertValidThreshold(dto.confidenceThreshold);

    const allSuccessPredictions = await this.predictionRepo.findByStatus(
      PredictionStatus.SUCCESS,
    );

    // 3. Filter berdasarkan threshold dan varietyCode (jika ada)
    const eligible = allSuccessPredictions.filter((p) => {
      const meetsThreshold = this.domainService.meetsThreshold(
        p.confidenceScore,
        dto.confidenceThreshold,
      );
      const meetsVariety =
        dto.varietyCode === null || p.varietyCode === dto.varietyCode;
      return meetsThreshold && meetsVariety;
    });

    this.logger.log(
      `[BulkAdd] dataset=${datasetId}: ${eligible.length} eligible dari ` +
      `${allSuccessPredictions.length} total SUCCESS`,
    );

    if (eligible.length === 0) {
      return { added: 0, skipped: 0, evaluated: allSuccessPredictions.length };
    }

    // 4. Ambil prediction yang sudah ada di dataset (untuk skip duplikat)
    const existingItems = await this.datasetRepo.findItemsByDatasetId(datasetId);
    const existingPredictionIds = new Set(
      existingItems.map((item) => item.predictionId),
    );

    // 5. Filter hanya yang belum ada di dataset
    const alreadyInDatasetCount = eligible.filter((p) =>
      existingPredictionIds.has(p.id),
    ).length;

    const toInsert: CreateDatasetItemData[] = eligible
      .filter((p) => !existingPredictionIds.has(p.id))
      .map((p) => ({ datasetId, predictionId: p.id }));

    if (toInsert.length === 0) {
      this.logger.log(`[BulkAdd] dataset=${datasetId}: semua sudah ada, skip.`);
      return {
        added:     0,
        skipped:   alreadyInDatasetCount,
        evaluated: allSuccessPredictions.length,
      };
    }

    const inserted = await this.datasetRepo.createItemsBulk(toInsert);
    await this.datasetRepo.incrementTotalItems(datasetId, inserted);

    const raceConditionSkipped = toInsert.length - inserted;
    const totalSkipped = alreadyInDatasetCount + raceConditionSkipped;

    this.logger.log(
      `[BulkAdd] dataset=${datasetId}: inserted=${inserted}, skipped=${totalSkipped}`,
    );

    return {
      added:     inserted,
      skipped:   totalSkipped,
      evaluated: allSuccessPredictions.length,
    };
  }
}
