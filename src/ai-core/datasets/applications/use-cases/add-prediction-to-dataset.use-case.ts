// src/ai-core/datasets/applications/use-cases/add-prediction-to-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import { AddPredictionToDatasetDto, DatasetItemResponseDto } from '../dto/dataset.dto';
import { DatasetMapper } from '../../domains/mappers/dataset.mapper';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../../predictions/infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class AddPredictionToDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: DatasetValidator,
    private readonly mapper: DatasetMapper,
  ) {}

  async execute(
    datasetId: string,
    dto: AddPredictionToDatasetDto,
  ): Promise<DatasetItemResponseDto> {
    // 1. Pastikan dataset ada dan editable
    const dataset = await this.datasetRepo.findById(datasetId);
    this.validator.assertDatasetExists(dataset, datasetId);
    this.validator.assertDatasetEditable(dataset);

    // 2. Pastikan prediction ada dan eligible
    const prediction = await this.predictionRepo.findById(dto.predictionId);
    this.validator.assertPredictionExists(prediction, dto.predictionId);
    this.validator.assertPredictionEligible(prediction);

    // 3. Cek confidence threshold jika disertakan
    if (dto.confidenceThreshold !== null) {
      this.validator.assertValidThreshold(dto.confidenceThreshold);
      this.validator.assertPredictionMeetsThreshold(
        prediction,
        dto.confidenceThreshold,
      );
    }

    // 4. Cek duplikat
    const exists = await this.datasetRepo.itemExists(datasetId, dto.predictionId);
    this.validator.assertNoDuplicate(exists, dto.predictionId);

    // 5. Insert item + increment counter
    const item = await this.datasetRepo.createItem({
      datasetId,
      predictionId: dto.predictionId,
    });

    await this.datasetRepo.incrementTotalItems(datasetId, 1);

    return this.mapper.toItemResponseDto(item, prediction);
  }
}