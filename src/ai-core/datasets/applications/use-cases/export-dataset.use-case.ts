// src/ai-core/datasets/applications/use-cases/export-dataset.use-case.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { DatasetResponseDto } from '../dto/dataset.dto';
import { DatasetMapper } from '../../domains/mappers/dataset.mapper';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import { DatasetDomainService } from '../../domains/services/dataset-domain.service';
import { DatasetExportFormat, DatasetStatus } from '../../domains/entities/dataset.entity';
import {
  DATASET_REPOSITORY_TOKEN,
  type DatasetItemWithPrediction,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';
import { STORAGE_ADAPTER_TOKEN, type IStorageAdapter } from '../../../../shared/storage/infrastructures/adapters/storage.adapter.interface';
import { RawUploadedFile } from '../../../../shared/storage/domains/entities/stored-file.entity';

/** Record entry yang masuk ke file metadata dataset (dataset.json / dataset.csv) */
interface DatasetExportRecord {
  predictionId:    string;
  imageUrl:        string;
  imageFile:       string;
  varietyCode:     string | null;
  varietyName:     string | null;
  confidenceScore: number | null;
  confidenceTier:  string | null;
  isVerified:      boolean | null;
  allVarieties:    { varietyCode: string; varietyName: string; confidenceScore: number }[] | null;
  addedAt:         string;
}

@Injectable()
export class ExportDatasetUseCase {
  private readonly logger = new Logger(ExportDatasetUseCase.name);

  constructor(
    @Inject(DATASET_REPOSITORY_TOKEN)
    private readonly datasetRepo: IDatasetRepository,
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,
    private readonly validator: DatasetValidator,
    private readonly mapper: DatasetMapper,
    private readonly domainService: DatasetDomainService,
  ) {}

  async execute(datasetId: string): Promise<DatasetResponseDto> {
    // ── 1. Validasi ──────────────────────────────────────────────────────────
    const dataset = await this.datasetRepo.findById(datasetId);
    this.validator.assertDatasetExists(dataset, datasetId);
    this.validator.assertDatasetEditable(dataset);
    this.validator.assertDatasetHasItems(dataset.totalItems, datasetId);

    // ── 2. Set PROCESSING ────────────────────────────────────────────────────
    await this.datasetRepo.updateStatus(datasetId, { status: DatasetStatus.PROCESSING });
    this.logger.log(`[Export] dataset=${datasetId}: status → PROCESSING`);

    try {
      // ── 3. Fetch semua items + predictions dalam SATU query ──────────────
      // FIX: Sebelumnya melakukan N+1 query (loop predictionRepo.findById per item),
      // dan dipanggil DUA KALI (sekali di sini, sekali lagi di _buildItemDtos
      // setelah export selesai). Sekarang cukup satu JOIN query, hasilnya dipakai
      // ulang untuk membangun records ZIP maupun response DTO.
      const itemsWithPredictions =
        await this.datasetRepo.findItemsWithPredictionsByDatasetId(datasetId);

      const records: DatasetExportRecord[] = itemsWithPredictions.map(
        ({ item, prediction }) => {
          const ext       = this._extractExtension(prediction.imageUrl);
          const imageFile = `images/${prediction.id}${ext}`;

          const confidenceTier =
            prediction.confidenceScore !== null
              ? this.domainService.classifyConfidence(prediction.confidenceScore)
              : null;

          return {
            predictionId:    prediction.id,
            imageUrl:        prediction.imageUrl,
            imageFile,
            varietyCode:     prediction.varietyCode,
            varietyName:     prediction.varietyName,
            confidenceScore: prediction.confidenceScore,
            confidenceTier,
            isVerified:      prediction.isVerified,
            allVarieties:    prediction.allVarieties,
            addedAt:         item.addedAt.toISOString(),
          };
        },
      );

      // ── 4 & 5. Build ZIP in memory ───────────────────────────────────────
      const zipBuffer = await this._buildZip(dataset.exportFormat, records);

      // ── 6. Upload ke storage ─────────────────────────────────────────────
      const exportFileName = `datasets/${datasetId}/export-${Date.now()}.zip`;

      const rawFile: RawUploadedFile = Object.assign(new RawUploadedFile(), {
        buffer:       zipBuffer,
        originalName: `export-${datasetId}.zip`,
        mimeType:     'application/zip',
        sizeInBytes:  zipBuffer.length,
      });

      const uploadResult = await this.storageAdapter.upload(rawFile, exportFileName);
      const exportUrl    = uploadResult.imageUrl;

      // ── 7. Set READY ─────────────────────────────────────────────────────
      const updated = await this.datasetRepo.updateStatus(datasetId, {
        status:     DatasetStatus.READY,
        exportUrl,
        exportedAt: new Date(),
      });

      this.logger.log(`[Export] dataset=${datasetId}: DONE → exportUrl=${exportUrl}`);

      const itemDtos = itemsWithPredictions.map(({ item, prediction }) =>
        this.mapper.toItemResponseDto(item, prediction),
      );

      return this.mapper.toResponseDto(updated, itemDtos);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Export] dataset=${datasetId}: FAILED → ${message}`);

      await this.datasetRepo.updateStatus(datasetId, {
        status:       DatasetStatus.FAILED,
        errorMessage: message,
      });

      throw err;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _buildZip(
    format:  DatasetExportFormat,
    records: DatasetExportRecord[],
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const archive = new ZipArchive({ zlib: { level: 6 } });

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('error', (err: Error) => reject(err));
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      // Metadata file
      if (format === DatasetExportFormat.JSON) {
        const json = JSON.stringify({ records }, null, 2);
        archive.append(json, { name: 'dataset.json' });
      } else {
        const csv = this._buildCsv(records);
        archive.append(csv, { name: 'dataset.csv' });
      }

      // Manifest gambar: predictionId + URL asal, BUKAN gambar yang ter-download.
      // Lihat catatan pipeline di kepala file ini.
      const manifestLines = records.map((r) => `${r.predictionId}\t${r.imageUrl}`);
      archive.append(manifestLines.join('\n'), { name: 'image_manifest.txt' });

      void archive.finalize();
    });
  }

  private _buildCsv(records: DatasetExportRecord[]): string {
    const headers = [
      'predictionId',
      'imageFile',
      'imageUrl',
      'varietyCode',
      'varietyName',
      'confidenceScore',
      'confidenceTier',
      'isVerified',
      'addedAt',
    ];

    const escapeCsvField = (value: string): string =>
      `"${value.replace(/"/g, '""')}"`;

    const rows = records.map((r) =>
      [
        r.predictionId,
        r.imageFile,
        r.imageUrl,
        r.varietyCode ?? '',
        r.varietyName ?? '',
        r.confidenceScore !== null ? String(r.confidenceScore) : '',
        r.confidenceTier ?? '',
        r.isVerified !== null ? String(r.isVerified) : '',
        r.addedAt,
      ]
        .map(escapeCsvField)
        .join(','),
    );

    return [headers.map(escapeCsvField).join(','), ...rows].join('\n');
  }

  private _extractExtension(imageUrl: string): string {
    try {
      const url  = new URL(imageUrl);
      const path = url.pathname;
      const dot  = path.lastIndexOf('.');
      return dot !== -1 ? path.substring(dot) : '.jpg';
    } catch {
      return '.jpg';
    }
  }
}
