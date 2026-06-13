// src/ai-core/datasets/applications/use-cases/get-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  DatasetItemResponseDto,
  DatasetResponseDto,
  PaginatedDatasetResponseDto,
  ListDatasetsQueryDto,
} from '../dto/dataset.dto';
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
export class GetDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: DatasetValidator,
    private readonly mapper: DatasetMapper,
  ) {}

  async executeGetById(id: string): Promise<DatasetResponseDto> {
    const dataset = await this.datasetRepo.findById(id);
    this.validator.assertDatasetExists(dataset, id);

    const dbItems = await this.datasetRepo.findItemsByDatasetId(id);

    // Fetch prediction data untuk setiap item secara parallel
    const itemDtos: DatasetItemResponseDto[] = await Promise.all(
      dbItems.map(async (item) => {
        const prediction = await this.predictionRepo.findById(item.predictionId);
        if (!prediction) {
          // Prediction dihapus setelah masuk dataset (RESTRICT harusnya cegah ini,
          // tapi defensive handling tetap diperlukan)
          return null;
        }
        return this.mapper.toItemResponseDto(item, prediction);
      }),
    ).then((results) =>
      results.filter((r): r is DatasetItemResponseDto => r !== null),
    );

    return this.mapper.toResponseDto(dataset, itemDtos);
  }

  async executeList(
    query: ListDatasetsQueryDto,
  ): Promise<PaginatedDatasetResponseDto> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [datasets, total] = await this.datasetRepo.findAll({ skip, limit });

    const totalPages = Math.ceil(total / limit);

    return {
      data: this.mapper.toResponseDtoList(datasets),
      total,
      page,
      limit,
      totalPages,
    };
  }
}