import { DatasetImage } from '../entities/dataset-image.entity';

export interface DatasetExportFilter {
  durianCodes?: string[];
  startDate?: Date;
  endDate?: Date;
  onlyVerified?: boolean;
}

export const DATASET_EXPORT_REPOSITORY = Symbol('DATASET_EXPORT_REPOSITORY');

export interface IDatasetExportRepository {
  findImagesForExport(filter: DatasetExportFilter): Promise<DatasetImage[]>;
  findDistinctDurianCodes(): Promise<string[]>;
}