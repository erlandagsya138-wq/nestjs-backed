// src/ai-core/datasets/domains/validators/dataset.validator.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatasetEntity } from '../entities/dataset.entity';
import { DatasetItemEntity } from '../entities/dataset-item.entity';
import { PredictionEntity } from '../../../predictions/domains/entities/prediction.entity';
import { DatasetDomainService } from '../services/dataset-domain.service';

@Injectable()
export class DatasetValidator {
  constructor(private readonly domainService: DatasetDomainService) {}

  // ── Dataset assertions ────────────────────────────────────────────────────

  assertDatasetExists(
    dataset: DatasetEntity | null,
    id: string,
  ): asserts dataset is DatasetEntity {
    if (!dataset) {
      throw new NotFoundException(`Dataset dengan id '${id}' tidak ditemukan.`);
    }
  }

  assertDatasetEditable(dataset: DatasetEntity): void {
    if (!this.domainService.isEditable(dataset.status)) {
      throw new UnprocessableEntityException(
        `Dataset '${dataset.id}' berstatus '${dataset.status}' dan tidak dapat dimodifikasi. ` +
        `Hanya dataset berstatus DRAFT yang dapat diubah.`,
      );
    }
  }

  assertDatasetNotProcessing(dataset: DatasetEntity): void {
    if (dataset.status === 'PROCESSING') {
      throw new ConflictException(
        `Dataset '${dataset.id}' sedang dalam proses export. Tunggu hingga selesai.`,
      );
    }
  }

  // ── Dataset item assertions ───────────────────────────────────────────────

  assertItemExists(
    item: DatasetItemEntity | null,
    itemId: string,
  ): asserts item is DatasetItemEntity {
    if (!item) {
      throw new NotFoundException(
        `Dataset item dengan id '${itemId}' tidak ditemukan.`,
      );
    }
  }

  assertItemBelongsToDataset(
    item: DatasetItemEntity,
    datasetId: string,
  ): void {
    if (item.datasetId !== datasetId) {
      throw new NotFoundException(
        `Dataset item '${item.id}' tidak ditemukan di dataset '${datasetId}'.`,
      );
    }
  }

  assertNoDuplicate(exists: boolean, predictionId: string): void {
    if (exists) {
      throw new ConflictException(
        `Prediction '${predictionId}' sudah ada di dalam dataset ini.`,
      );
    }
  }

  // ── Prediction assertions ─────────────────────────────────────────────────

  assertPredictionExists(
    prediction: PredictionEntity | null,
    predictionId: string,
  ): asserts prediction is PredictionEntity {
    if (!prediction) {
      throw new NotFoundException(
        `Prediction dengan id '${predictionId}' tidak ditemukan.`,
      );
    }
  }

  assertPredictionEligible(prediction: PredictionEntity): void {
    if (
      !this.domainService.isPredictionEligible(
        prediction.status,
        prediction.confidenceScore,
      )
    ) {
      throw new UnprocessableEntityException(
        `Prediction '${prediction.id}' tidak memenuhi syarat untuk dimasukkan ke dataset. ` +
        `Status harus SUCCESS dan harus memiliki confidence score. ` +
        `Status saat ini: '${prediction.status}', ` +
        `confidenceScore: ${prediction.confidenceScore ?? 'null'}.`,
      );
    }
  }

  assertPredictionMeetsThreshold(
    prediction: PredictionEntity,
    threshold: number,
  ): void {
    if (
      !this.domainService.meetsThreshold(
        prediction.confidenceScore,
        threshold,
      )
    ) {
      const score = prediction.confidenceScore !== null
        ? this.domainService.formatConfidenceScore(prediction.confidenceScore)
        : 'null';

      throw new UnprocessableEntityException(
        `Prediction '${prediction.id}' memiliki confidence score ${score}, ` +
        `di bawah threshold ${this.domainService.formatConfidenceScore(threshold)}.`,
      );
    }
  }

  // ── Input assertions ──────────────────────────────────────────────────────

  assertValidThreshold(threshold: number): void {
    if (!this.domainService.isValidThreshold(threshold)) {
      throw new BadRequestException(
        `Confidence threshold '${threshold}' tidak valid. ` +
        `Nilai harus antara 0.00 dan 1.00.`,
      );
    }
  }

  assertDatasetHasItems(totalItems: number, datasetId: string): void {
    if (totalItems === 0) {
      throw new UnprocessableEntityException(
        `Dataset '${datasetId}' tidak memiliki item. ` +
        `Tambahkan prediction terlebih dahulu sebelum export.`,
      );
    }
  }
}