// src/ai-core/datasets/domains/mappers/dataset.mapper.ts

import { Injectable } from '@nestjs/common';
import { DatasetEntity } from '../entities/dataset.entity';
import { DatasetItemEntity } from '../entities/dataset-item.entity';
import { PredictionEntity } from '../../../predictions/domains/entities/prediction.entity';
import {
  ConfidenceSummaryDto,
  DatasetItemResponseDto,
  DatasetResponseDto,
} from '../../applications/dto/dataset.dto';
import { DatasetDomainService } from '../services/dataset-domain.service';

@Injectable()
export class DatasetMapper {
  constructor(private readonly domainService: DatasetDomainService) {}

  toItemResponseDto(
    item: DatasetItemEntity,
    prediction: PredictionEntity,
  ): DatasetItemResponseDto {
    const confidenceTier =
      prediction.confidenceScore !== null
        ? this.domainService.classifyConfidence(prediction.confidenceScore)
        : null;

    return {
      id:              item.id,
      datasetId:       item.datasetId,
      predictionId:    item.predictionId,
      varietyCode:     prediction.varietyCode,
      varietyName:     prediction.varietyName,
      confidenceScore: prediction.confidenceScore,
      confidenceTier,
      imageUrl:        prediction.imageUrl,
      isVerified:      prediction.isVerified,
      addedAt:         item.addedAt,
    };
  }

  /**
   * Map dataset entity ke response DTO.
   * @param items - null untuk list view (tidak memuat items/confidenceSummary),
   *                array (boleh kosong) untuk detail view.
   */
  toResponseDto(
    dataset: DatasetEntity,
    items: DatasetItemResponseDto[] | null,
  ): DatasetResponseDto {
    const confidenceSummary =
      items !== null
        ? this._buildConfidenceSummary(items)
        : null;

    return {
      id:               dataset.id,
      name:             dataset.name,
      description:      dataset.description,
      status:           dataset.status,
      exportFormat:     dataset.exportFormat,
      totalItems:       dataset.totalItems,
      exportUrl:        dataset.exportUrl,
      exportedAt:       dataset.exportedAt,
      errorMessage:     dataset.errorMessage,
      createdAt:        dataset.createdAt,
      confidenceSummary,
      items,
    };
  }

  /** Untuk list view — tidak memuat items maupun confidenceSummary. */
  toResponseDtoList(datasets: DatasetEntity[]): DatasetResponseDto[] {
    return datasets.map((d) => this.toResponseDto(d, null));
  }

  private _buildConfidenceSummary(
    items: DatasetItemResponseDto[],
  ): ConfidenceSummaryDto {
    const scores = items
      .map((i) => i.confidenceScore)
      .filter((s): s is number => s !== null);

    return this.domainService.buildConfidenceSummary(scores);
  }
}
