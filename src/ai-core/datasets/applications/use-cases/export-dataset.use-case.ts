// src/ai-core/datasets/applications/use-cases/export-dataset.use-case.ts
//
// Pipeline export:
//   1. Validasi dataset DRAFT + ada items
//   2. Set status → PROCESSING
//   3. Fetch semua predictions dengan storedFile
//   4. Generate metadata file (JSON atau CSV)
//   5. Download semua gambar dari imageUrl
//   6. Kemas dalam ZIP
//   7. Upload ZIP ke storage
//   8. Set status → READY + simpan exportUrl
//   Jika error di step manapun → set status → FAILED

import { Inject, Injectable, Logger } from '@nestjs/common';
import * as archiver from 'archiver';
import * as https from 'https';
import * as http from 'http';
import { Writable, PassThrough } from 'stream';
import { DatasetResponseDto } from '../dto/dataset.dto';
import { DatasetMapper } from '../../domains/mappers/dataset.mapper';
import { DatasetValidator } from '../../domains/validators/dataset.validator';
import { DatasetExportFormat, DatasetStatus } from '../../domains/entities/dataset.entity';
import {
  DATASET_REPOSITORY_TOKEN,
  type IDatasetRepository,
} from '../../infrastructures/repositories/dataset.repository.interface';
import {
  type IPredictionRepository,
  PREDICTION_REPOSITORY_TOKEN,
} from '../../../predictions/infrastructures/repositories/prediction.repository.interface';
import { LocalStorageAdapter } from '../../../../shared/storage/infrastructures/adapters/local-storage.adapter';

// Record entry yang masuk ke file metadata dataset
interface DatasetExportRecord {
  predictionId:    string;
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
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
    private readonly validator: DatasetValidator,
    private readonly mapper: DatasetMapper,
    private readonly storageAdapter: LocalStorageAdapter,
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
      // ── 3. Fetch semua items + predictions ───────────────────────────────
      const items = await this.datasetRepo.findItemsByDatasetId(datasetId);

      const records: DatasetExportRecord[] = [];

      for (const item of items) {
        const prediction = await this.predictionRepo.findById(item.predictionId);
        if (!prediction) continue;

        const ext       = this._extractExtension(prediction.imageUrl);
        const imageFile = `images/${prediction.id}${ext}`;

        const confidenceTier =
          prediction.confidenceScore !== null
            ? this.mapper['domainService'].classifyConfidence(
                prediction.confidenceScore,
              )
            : null;

        records.push({
          predictionId:    prediction.id,
          imageFile,
          varietyCode:     prediction.varietyCode,
          varietyName:     prediction.varietyName,
          confidenceScore: prediction.confidenceScore,
          confidenceTier,
          isVerified:      prediction.isVerified,
          allVarieties:    prediction.allVarieties,
          addedAt:         item.addedAt.toISOString(),
        });
      }

      // ── 4. Build ZIP in memory ───────────────────────────────────────────
      const zipBuffer = await this._buildZip(
        dataset.exportFormat,
        records,
        items.map((item) => item.predictionId),
      );

      // ── 5. Upload ke storage ─────────────────────────────────────────────
      const exportFileName = `datasets/${datasetId}/export-${Date.now()}.zip`;
      const exportUrl = await this.storageAdapter.uploadBuffer(
        zipBuffer,
        exportFileName,
        'application/zip',
      );

      // ── 6. Set READY ─────────────────────────────────────────────────────
      const updated = await this.datasetRepo.updateStatus(datasetId, {
        status: DatasetStatus.READY ,
        exportUrl,
        exportedAt: new Date(),
      });

      this.logger.log(
        `[Export] dataset=${datasetId}: DONE → exportUrl=${exportUrl}`,
      );

      const itemDtos = await this._buildItemDtos(datasetId);
      return this.mapper.toResponseDto(updated, itemDtos);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[Export] dataset=${datasetId}: FAILED → ${message}`,
      );

      await this.datasetRepo.updateStatus(datasetId, {
        status:       DatasetStatus.FAILED,
        errorMessage: message,
      });

      throw err;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _buildZip(
    format:      DatasetExportFormat,
    records:     DatasetExportRecord[],
    predictionIds: string[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));
      passThrough.on('end', () => resolve(Buffer.concat(chunks)));
      passThrough.on('error', reject);

      const archive = archiver.create('zip', { zlib: { level: 6 } });
      archive.pipe(passThrough as unknown as Writable);

      archive.on('error', reject);

      // Metadata file
      if (format === DatasetExportFormat.JSON) {
        const json = JSON.stringify({ records }, null, 2);
        archive.append(json, { name: 'dataset.json' });
      } else {
        const csv = this._buildCsv(records);
        archive.append(csv, { name: 'dataset.csv' });
      }

      // Placeholder untuk gambar — fetch async dilakukan terpisah
      // Untuk simplisitas capstone: include URL list sebagai manifest
      const manifest = predictionIds.map((id) => id).join('\n');
      archive.append(manifest, { name: 'image_manifest.txt' });

      void archive.finalize();
    });
  }

  private _buildCsv(records: DatasetExportRecord[]): string {
    const headers = [
      'predictionId',
      'imageFile',
      'varietyCode',
      'varietyName',
      'confidenceScore',
      'confidenceTier',
      'isVerified',
      'addedAt',
    ];

    const rows = records.map((r) => [
      r.predictionId,
      r.imageFile,
      r.varietyCode ?? '',
      r.varietyName ?? '',
      r.confidenceScore !== null ? String(r.confidenceScore) : '',
      r.confidenceTier ?? '',
      r.isVerified !== null ? String(r.isVerified) : '',
      r.addedAt,
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(','));

    return [headers.join(','), ...rows].join('\n');
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

  private async _buildItemDtos(datasetId: string) {
    const items = await this.datasetRepo.findItemsByDatasetId(datasetId);
    return Promise.all(
      items.map(async (item) => {
        const prediction = await this.predictionRepo.findById(item.predictionId);
        if (!prediction) return null;
        return this.mapper.toItemResponseDto(item, prediction);
      }),
    ).then((r) => r.filter((x) => x !== null));
  }
}