import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassThrough } from 'stream';

import { DatasetGroup } from '../../domains/entities/dataset-group.entity';
import { DatasetImage } from '../../domains/entities/dataset-image.entity';
import {
  DATASET_EXPORT_REPOSITORY,
  DatasetExportFilter,
  type IDatasetExportRepository,
} from '../../domains/ports/dataset-export.repository.port';
import {
  FILE_STORAGE_PORT,
  type IFileStoragePort,
} from '../../domains/ports/file-storage.port';
import { ExportDatasetRequestDto } from '../dto/export-dataset-request.dto';

import archiver = require('archiver');

export interface ZipExportResult {
  stream: PassThrough;
  filename: string;
  groups: DatasetGroup[];
  totalImages: number;
}

@Injectable()
export class ExportDatasetUseCase {
  private readonly logger = new Logger(ExportDatasetUseCase.name);

  constructor(
    @Inject(DATASET_EXPORT_REPOSITORY)
    private readonly datasetRepo: IDatasetExportRepository,

    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: IFileStoragePort,
  ) {}

  /**
   * Execute: membangun stream ZIP secara on-the-fly.
   * Caller (controller) langsung pipe stream ke HTTP response.
   */
  async execute(request: ExportDatasetRequestDto): Promise<ZipExportResult> {
    const filter = this.buildFilter(request);

    this.logger.log(
      `Starting dataset export with filter: ${JSON.stringify(filter)}`,
    );

    // 1. Ambil semua gambar dari repository
    const images = await this.datasetRepo.findImagesForExport(filter);

    if (images.length === 0) {
      this.logger.warn('No images found for the given filter');
    }

    // 2. Kelompokkan berdasarkan DurianCode
    const groups = this.groupByDurianCode(images);

    // 3. Buat nama file ZIP
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `durian_dataset_${timestamp}.zip`;

    // 4. Buat stream ZIP menggunakan archiver
    //    archiver() callable langsung setelah fix import di atas
    const passThrough = new PassThrough();
    const archive = archiver('zip', {
      zlib: { level: 6 }, // kompresi sedang, balance antara speed & size
    });

    archive.on('error', (err: Error) => {
      this.logger.error(`Archiver error: ${err.message}`, err.stack);
      passThrough.destroy(err);
    });

    archive.on('warning', (err: Error & { code?: string }) => {
      if (err.code === 'ENOENT') {
        this.logger.warn(`Archiver warning: ${err.message}`);
      } else {
        passThrough.destroy(err);
      }
    });

    archive.pipe(passThrough);

    // 5. Tambah file ke ZIP secara async di background
    this.populateArchive(archive, groups).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to populate archive: ${msg}`, stack);
      archive.abort();
    });

    return {
      stream: passThrough,
      filename,
      groups,
      totalImages: images.length,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildFilter(dto: ExportDatasetRequestDto): DatasetExportFilter {
    return {
      durianCodes: dto.durianCodes?.length ? dto.durianCodes : undefined,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      onlyVerified: dto.onlyVerified ?? false,
    };
  }

  private groupByDurianCode(images: DatasetImage[]): DatasetGroup[] {
    const map = new Map<string, DatasetGroup>();

    for (const image of images) {
      const key = image.durianCode.getValue();
      const existing = map.get(key) ?? new DatasetGroup(image.durianCode);
      map.set(key, existing.addImage(image));
    }

    return Array.from(map.values()).sort((a, b) =>
      a.getFolderName().localeCompare(b.getFolderName()),
    );
  }

  private async populateArchive(
    archive: archiver.Archiver,
    groups: DatasetGroup[],
  ): Promise<void> {
    let totalAdded = 0;
    let totalSkipped = 0;
    const manifestEntries: ManifestEntry[] = [];

    for (const group of groups) {
      for (const image of group.getImages()) {
        try {
          const buffer = await this.fileStorage.readFileAsBuffer(
            image.storagePath,
          );

          archive.append(buffer, {
            name: `${group.getFolderName()}/${image.getZipFilename()}`,
          });

          manifestEntries.push({
            id: image.id,
            durianCode: image.durianCode.getValue(),
            folder: group.getFolderName(),
            file: image.getZipFilename(),
            mimeType: image.mimeType,
            capturedAt: image.capturedAt.toISOString(),
          });

          totalAdded++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(
            `Skipping image ${image.id} (${image.storagePath}): ${msg}`,
          );
          totalSkipped++;
        }
      }
    }

    // Tambahkan manifest JSON ke root ZIP
    const manifest = {
      exportedAt: new Date().toISOString(),
      totalImages: totalAdded,
      skippedImages: totalSkipped,
      totalGroups: groups.length,
      groups: groups.map((g) => ({
        durianCode: g.durianCode.getValue(),
        folder: g.getFolderName(),
        imageCount: g.totalImages(),
      })),
      entries: manifestEntries,
    };

    archive.append(JSON.stringify(manifest, null, 2), {
      name: 'dataset_manifest.json',
    });

    this.logger.log(
      `Archive complete: ${totalAdded} images added, ${totalSkipped} skipped across ${groups.length} groups`,
    );

    await archive.finalize();
  }
}

interface ManifestEntry {
  id: string;
  durianCode: string;
  folder: string;
  file: string;
  mimeType: string;
  capturedAt: string;
}