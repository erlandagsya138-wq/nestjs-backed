import { Inject, Injectable } from '@nestjs/common';
import {
  DATASET_EXPORT_REPOSITORY,
  type IDatasetExportRepository,
} from '../../domains/ports/dataset-export.repository.port';

export interface ExportPreviewItem {
  durianCode: string;
  imageCount: number;
}

export interface ExportPreviewResult {
  totalDistinctCodes: number;
  items: ExportPreviewItem[];
}

/**
 * Use Case: Preview export dataset
 * Menampilkan ringkasan berapa gambar per kode durian
 * tanpa benar-benar men-generate ZIP.
 */
@Injectable()
export class GetExportPreviewUseCase {
  constructor(
    @Inject(DATASET_EXPORT_REPOSITORY)
    private readonly datasetRepo: IDatasetExportRepository,
  ) {}

  async execute(): Promise<ExportPreviewResult> {
    const images = await this.datasetRepo.findImagesForExport({});
    const countMap = new Map<string, number>();

    for (const image of images) {
      const code = image.durianCode.getValue();
      countMap.set(code, (countMap.get(code) ?? 0) + 1);
    }

    const items: ExportPreviewItem[] = Array.from(countMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([durianCode, imageCount]) => ({ durianCode, imageCount }));

    return {
      totalDistinctCodes: items.length,
      items,
    };
  }
}
