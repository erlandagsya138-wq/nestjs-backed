// src/ai-core/datasets/applications/use-cases/delete-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';

@Injectable()
export class DeleteDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    private readonly validator: DatasetValidator,
  ) {}

  async execute(id: string): Promise<void> {
    const dataset = await this.datasetRepo.findById(id);
    this.validator.assertDatasetExists(dataset, id);
    // Dataset PROCESSING tidak boleh dihapus — bisa corrupt state export yang sedang berjalan
    this.validator.assertDatasetNotProcessing(dataset);

    await this.datasetRepo.delete(id);
  }
}
