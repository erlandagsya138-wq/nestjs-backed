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
    const dataset = await this.datasetRepo.findById(datasetId);
    this.validator.assertDatasetExists(dataset, datasetId);
    this.validator.assertDatasetEditable(dataset);
    this.validator.assertValidThreshold(dto.confidenceThreshold);

    const eligiblePredictions = await this.predictionRepo.findEligibleForBulkAdd({
      minConfidence: dto.confidenceThreshold,
      varietyCode: dto.varietyCode ?? null,
      onlyVerified: dto.onlyVerified ?? true,
    });

    this.logger.log(
      `[BulkAdd] dataset=${datasetId}: Ditemukan ${eligiblePredictions.length} eligible predictions.`,
    );

    if (eligiblePredictions.length === 0) {
      return { added: 0, skipped: 0, evaluated: 0 };
    }

    const existingItems = await this.datasetRepo.findItemsByDatasetId(datasetId);
    const existingPredictionIds = new Set(
      existingItems.map((item) => item.predictionId),
    );

    const alreadyInDatasetCount = eligiblePredictions.filter((p) =>
      existingPredictionIds.has(p.id),
    ).length;

    const toInsert: CreateDatasetItemData[] = eligiblePredictions
      .filter((p) => !existingPredictionIds.has(p.id))
      .map((p) => ({ datasetId, predictionId: p.id }));

    if (toInsert.length === 0) {
      return {
        added:     0,
        skipped:   alreadyInDatasetCount,
        evaluated: eligiblePredictions.length,
      };
    }

    // FIX: Jika toInsert sangat besar (contoh > 5000 baris), lakukan insert per batch
    // untuk mencegah query payload limit di MySQL/Postgres.
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const inserted = await this.datasetRepo.createItemsBulk(batch);
      totalInserted += inserted;
    }

    await this.datasetRepo.incrementTotalItems(datasetId, totalInserted);

    const raceConditionSkipped = toInsert.length - totalInserted;
    const totalSkipped = alreadyInDatasetCount + raceConditionSkipped;

    return {
      added:     totalInserted,
      skipped:   totalSkipped,
      evaluated: eligiblePredictions.length,
    };
  }
}