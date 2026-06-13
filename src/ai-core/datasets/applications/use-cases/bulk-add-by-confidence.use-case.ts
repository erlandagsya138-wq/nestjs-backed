// src/ai-core/datasets/applications/use-cases/bulk-add-by-confidence.use-case.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { BulkAddByConfidenceDto, BulkAddResultDto } from '../dto/dataset.dto';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
  CreateDatasetItemData,
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

    // 2. Ambil SEMUA prediction SUCCESS
    // IPredictionRepository sudah ada findAllByUserId — kita perlu findAllSuccess.
    // Karena belum ada method tersebut, kita gunakan pendekatan berbeda:
    // findAllByUserIdPaginated tidak cocok. Kita inject langsung DataSource atau
    // tambahkan method baru di interface. Pilihan terbaik: tambah method di repo interface.
    // Untuk sekarang kita gunakan cast yang type-safe via extended interface.
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
    const toInsert: CreateDatasetItemData[] = eligible
      .filter((p) => !existingPredictionIds.has(p.id))
      .map((p) => ({ datasetId, predictionId: p.id }));

    const skipped = eligible.length - toInsert.length;

    if (toInsert.length === 0) {
      this.logger.log(`[BulkAdd] dataset=${datasetId}: semua sudah ada, skip.`);
      return {
        added:     0,
        skipped:   eligible.length,
        evaluated: allSuccessPredictions.length,
      };
    }

    // 6. Bulk insert + update counter
    const inserted = await this.datasetRepo.createItemsBulk(toInsert);
    await this.datasetRepo.incrementTotalItems(datasetId, inserted);

    this.logger.log(
      `[BulkAdd] dataset=${datasetId}: inserted=${inserted}, skipped=${skipped}`,
    );

    return {
      added:     inserted,
      skipped:   skipped + (toInsert.length - inserted), // INSERT IGNORE bisa skip juga
      evaluated: allSuccessPredictions.length,
    };
  }
}