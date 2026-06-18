// src/ai-core/datasets/infrastructures/repositories/dataset.repository.interface.ts

import {
  DatasetEntity,
  DatasetExportFormat,
  DatasetStatus,
} from '../../domains/entities/dataset.entity';
import { DatasetItemEntity } from '../../domains/entities/dataset-item.entity';
import { PredictionEntity } from '../../../predictions/domains/entities/prediction.entity';

// ── Create / Update data shapes ───────────────────────────────────────────────

export interface CreateDatasetData {
  name:         string;
  description:  string | null;
  exportFormat: DatasetExportFormat;
}

export interface UpdateDatasetStatusData {
  status:        DatasetStatus;
  exportUrl?:    string | null;
  exportedAt?:   Date | null;
  errorMessage?: string | null;
}

export interface CreateDatasetItemData {
  datasetId:    string;
  predictionId: string;
}

export interface ListDatasetsFilter {
  skip:  number;
  limit: number;
}

/**
 * DatasetItem yang sudah di-join dengan data PredictionEntity-nya.
 * Digunakan untuk menghindari N+1 query saat memuat detail dataset.
 */
export interface DatasetItemWithPrediction {
  item:       DatasetItemEntity;
  prediction: PredictionEntity;
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface IDatasetRepository {
  // ── Dataset CRUD ───────────────────────────────────────────────────────────

  create(data: CreateDatasetData): Promise<DatasetEntity>;

  findById(id: string): Promise<DatasetEntity | null>;

  findAll(filter: ListDatasetsFilter): Promise<[DatasetEntity[], number]>;

  updateStatus(id: string, data: UpdateDatasetStatusData): Promise<DatasetEntity>;

  /**
   * Increment totalItems secara atomic.
   * @param by - jumlah yang ditambahkan (harus >= 1)
   */
  incrementTotalItems(id: string, by: number): Promise<void>;

  /**
   * Decrement totalItems secara atomic, minimal 0 (tidak bisa negatif).
   * @param by - jumlah yang dikurangi (default 1)
   */
  decrementTotalItems(id: string, by?: number): Promise<void>;

  delete(id: string): Promise<void>;

  // ── Dataset Items ──────────────────────────────────────────────────────────

  /** Tambah satu prediction ke dataset. Duplikat ditolak oleh unique constraint. */
  createItem(data: CreateDatasetItemData): Promise<DatasetItemEntity>;

  /**
   * Bulk insert items — abaikan duplikat (INSERT IGNORE).
   * @returns jumlah row yang benar-benar baru di-insert.
   */
  createItemsBulk(data: CreateDatasetItemData[]): Promise<number>;

  findItemById(itemId: string): Promise<DatasetItemEntity | null>;

  findItemsByDatasetId(datasetId: string): Promise<DatasetItemEntity[]>;

  /**
   * FIX: Metode baru untuk memuat items sekaligus dengan prediction-nya
   * dalam satu JOIN query, menghilangkan N+1 di GetDatasetUseCase dan ExportDatasetUseCase.
   */
  findItemsWithPredictionsByDatasetId(
    datasetId: string,
  ): Promise<DatasetItemWithPrediction[]>;

  /** Cek apakah prediction sudah ada di dataset ini */
  itemExists(datasetId: string, predictionId: string): Promise<boolean>;

  deleteItem(itemId: string): Promise<void>;
}

export const DATASET_REPOSITORY_TOKEN = Symbol('IDatasetRepository');
