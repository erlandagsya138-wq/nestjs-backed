// src/ai-core/datasets/applications/use-cases/create-dataset.use-case.ts

import { Inject, Injectable } from '@nestjs/common';
import { DatasetResponseDto } from '../dto/dataset.dto';
import { CreateDatasetDto } from '../dto/create-dataset.dto';
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
    const trimmedName = dto.name.trim();
    const trimmedDescription = dto.description?.trim() ?? null;

    const dataset = await this.datasetRepo.create({
      name:         trimmedName,
      // FIX: string kosong setelah trim() diperlakukan sebagai null, bukan '',
      //      konsisten dengan semantik "tidak ada deskripsi".
      description:  trimmedDescription !== null && trimmedDescription.length > 0
        ? trimmedDescription
        : null,
      exportFormat: dto.exportFormat,
    });

    // Dataset baru selalu tanpa item, jadi items = [] (bukan null) agar
    // confidenceSummary ikut terbentuk dengan benar (count: 0) di response create.
    return this.mapper.toResponseDto(dataset, []);
  }
}
