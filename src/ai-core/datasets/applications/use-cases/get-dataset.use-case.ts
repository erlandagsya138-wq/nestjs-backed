// src/ai-core/datasets/applications/use-cases/get-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import {
  DatasetItemResponseDto,
  DatasetResponseDto,
} from '../dto/dataset.dto';
import {
  ListDatasetsQueryDto,
  PaginatedDatasetResponseDto,
} from '../dto/list-datasets-query.dto';
import { DatasetMapper } from '../../domains/mappers/dataset.mapper';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';

@Injectable()
export class GetDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    private readonly validator: DatasetValidator,
    private readonly mapper: DatasetMapper,
  ) {}

  async executeGetById(id: string): Promise<DatasetResponseDto> {
    const dataset = await this.datasetRepo.findById(id);
    this.validator.assertDatasetExists(dataset, id);

    // FIX: Sebelumnya melakukan N+1 query — loop `predictionRepo.findById`
    // untuk setiap item. Sekarang menggunakan satu JOIN query di repository.
    const itemsWithPredictions =
      await this.datasetRepo.findItemsWithPredictionsByDatasetId(id);

    const itemDtos: DatasetItemResponseDto[] = itemsWithPredictions.map(
      ({ item, prediction }) => this.mapper.toItemResponseDto(item, prediction),
    );

    return this.mapper.toResponseDto(dataset, itemDtos);
  }

  async executeList(
    query: ListDatasetsQueryDto,
  ): Promise<PaginatedDatasetResponseDto> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [datasets, total] = await this.datasetRepo.findAll({ skip, limit });

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: this.mapper.toResponseDtoList(datasets),
      total,
      page,
      limit,
      totalPages,
    };
  }
}
