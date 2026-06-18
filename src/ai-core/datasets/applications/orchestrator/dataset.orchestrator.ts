// src/ai-core/datasets/applications/orchestrator/dataset.orchestrator.ts

import { Injectable } from '@nestjs/common';
import {
  DatasetItemResponseDto,
  DatasetResponseDto,
} from '../dto/dataset.dto';
import { CreateDatasetDto } from '../dto/create-dataset.dto';
import { ListDatasetsQueryDto, PaginatedDatasetResponseDto } from '../dto/list-datasets-query.dto';
import { AddPredictionToDatasetDto } from '../dto/add-prediction.dto';
import { BulkAddByConfidenceDto, BulkAddResultDto } from '../dto/bulk-add.dto';
import { CreateDatasetUseCase }               from '../use-cases/create-dataset.use-case';
import { GetDatasetUseCase }                  from '../use-cases/get-dataset.use-case';
import { AddPredictionToDatasetUseCase }      from '../use-cases/add-prediction-to-dataset.use-case';
import { BulkAddByConfidenceUseCase }         from '../use-cases/bulk-add-by-confidence.use-case';
import { RemovePredictionFromDatasetUseCase } from '../use-cases/remove-prediction-from-dataset.use-case';
import { DeleteDatasetUseCase }               from '../use-cases/delete-dataset.use-case';
import { ExportDatasetUseCase }               from '../use-cases/export-dataset.use-case';

@Injectable()
export class DatasetOrchestrator {
  constructor(
    private readonly createDataset:    CreateDatasetUseCase,
    private readonly getDataset:       GetDatasetUseCase,
    private readonly addPrediction:    AddPredictionToDatasetUseCase,
    private readonly bulkAdd:          BulkAddByConfidenceUseCase,
    private readonly removePrediction: RemovePredictionFromDatasetUseCase,
    private readonly deleteDataset:    DeleteDatasetUseCase,
    private readonly exportDataset:    ExportDatasetUseCase,
  ) {}

  create(dto: CreateDatasetDto): Promise<DatasetResponseDto> {
    return this.createDataset.execute(dto);
  }

  getById(id: string): Promise<DatasetResponseDto> {
    return this.getDataset.executeGetById(id);
  }

  list(query: ListDatasetsQueryDto): Promise<PaginatedDatasetResponseDto> {
    return this.getDataset.executeList(query);
  }

  addItem(
    datasetId: string,
    dto: AddPredictionToDatasetDto,
  ): Promise<DatasetItemResponseDto> {
    return this.addPrediction.execute(datasetId, dto);
  }

  bulkAddByConfidence(
    datasetId: string,
    dto: BulkAddByConfidenceDto,
  ): Promise<BulkAddResultDto> {
    return this.bulkAdd.execute(datasetId, dto);
  }

  removeItem(datasetId: string, itemId: string): Promise<void> {
    return this.removePrediction.execute(datasetId, itemId);
  }

  delete(id: string): Promise<void> {
    return this.deleteDataset.execute(id);
  }

  export(id: string): Promise<DatasetResponseDto> {
    return this.exportDataset.execute(id);
  }
}
