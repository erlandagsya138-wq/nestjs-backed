// src/ai-core/datasets/infrastructures/repositories/dataset.repository.interface.ts

import { DatasetEntity, DatasetExportFormat, DatasetStatus } from '../../domains/entities/dataset.entity';
import { DatasetItemEntity } from '../../domains/entities/dataset-item.entity';

// ── Create / Update data shapes ───────────────────────────────────────────────

export interface CreateDatasetData {
  name:         string;
  description:  string | null;
  exportFormat: DatasetExportFormat;
}

export interface UpdateDatasetStatusData {
  status:       DatasetStatus;
  exportUrl?:   string | null;
  exportedAt?:  Date | null;
  errorMessage?: string | null;
}

export interface CreateDatasetItemData {
  datasetId:    string;
  predictionId: string;
}

// ── Query filters ─────────────────────────────────────────────────────────────

export interface ListDatasetsFilter {
  skip:  number;
  limit: number;
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface IDatasetRepository {
  // ── Dataset CRUD ───────────────────────────────────────────────────────────
  create(data: CreateDatasetData): Promise<DatasetEntity>;

  findById(id: string): Promise<DatasetEntity | null>;

  findAll(filter: ListDatasetsFilter): Promise<[DatasetEntity[], number]>;

  updateStatus(id: string, data: UpdateDatasetStatusData): Promise<DatasetEntity>;

  incrementTotalItems(id: string, by: number): Promise<void>;

  decrementTotalItems(id: string): Promise<void>;

  delete(id: string): Promise<void>;

  // ── Dataset Items ──────────────────────────────────────────────────────────

  /** Tambah satu prediction ke dataset. Duplikat ditolak oleh unique constraint. */
  createItem(data: CreateDatasetItemData): Promise<DatasetItemEntity>;

  /**
   * Bulk insert items — abaikan duplikat (INSERT IGNORE).
   * Returns jumlah row yang benar-benar baru di-insert.
   */
  createItemsBulk(data: CreateDatasetItemData[]): Promise<number>;

  findItemById(itemId: string): Promise<DatasetItemEntity | null>;

  findItemsByDatasetId(datasetId: string): Promise<DatasetItemEntity[]>;

  /** Cek apakah prediction sudah ada di dataset ini */
  itemExists(datasetId: string, predictionId: string): Promise<boolean>;

  deleteItem(itemId: string): Promise<void>;
}

export const DATASET_REPOSITORY_TOKEN = Symbol('IDatasetRepository');