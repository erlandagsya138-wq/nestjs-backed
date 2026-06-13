// src/ai-core/datasets/applications/use-cases/create-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import { CreateDatasetDto, DatasetResponseDto } from '../dto/dataset.dto';
import { DatasetMapper } from '../../domains/mappers/dataset.mapper';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';

@Injectable()
export class CreateDatasetUseCase {
  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    private readonly mapper: DatasetMapper,
  ) {}

  async execute(dto: CreateDatasetDto): Promise<DatasetResponseDto> {
    const dataset = await this.datasetRepo.create({
      name:         dto.name.trim(),
      description:  dto.description?.trim() ?? null,
      exportFormat: dto.exportFormat,
    });

    return this.mapper.toResponseDto(dataset, []);
  }
}