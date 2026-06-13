// src/ai-core/datasets/applications/use-cases/remove-prediction-from-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';

@Injectable()
export class RemovePredictionFromDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    private readonly validator: DatasetValidator,
  ) {}

  async execute(datasetId: string, itemId: string): Promise<void> {
    const dataset = await this.datasetRepo.findById(datasetId);
    this.validator.assertDatasetExists(dataset, datasetId);
    this.validator.assertDatasetEditable(dataset);

    const item = await this.datasetRepo.findItemById(itemId);
    this.validator.assertItemExists(item, itemId);
    this.validator.assertItemBelongsToDataset(item, datasetId);

    await this.datasetRepo.deleteItem(itemId);
    await this.datasetRepo.decrementTotalItems(datasetId);
  }
}