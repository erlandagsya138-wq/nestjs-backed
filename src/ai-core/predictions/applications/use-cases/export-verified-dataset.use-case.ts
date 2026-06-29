import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import * as archiver from 'archiver';
import axios from 'axios';
import { PREDICTION_REPOSITORY_TOKEN, type IPredictionRepository } from '../../infrastructures/repositories/prediction.repository.interface';

@Injectable()
export class ExportVerifiedDatasetUseCase {
  private readonly logger = new Logger(ExportVerifiedDatasetUseCase.name);

  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
  ) {}

  async execute(res: Response): Promise<void> {
    try {
      const predictions = await this.predictionRepo.findVerifiedForExport();

      if (predictions.length === 0) {
        res.status(404).json({
          statusCode: 404,
          error: 'Not Found',
          message: 'Belum ada data prediksi yang terverifikasi untuk diexport.'
        });
        return;
      }

      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=dataset_export_${dateStr}.zip`);

      const archive = typeof archiver === 'function'
        ? archiver('zip', { zlib: { level: 0 } })
        : (archiver as unknown as { create: (format: string, options: object) => archiver.Archiver }).create('zip', { zlib: { level: 0 } });

      archive.on('error', (err: Error) => {
        this.logger.error(`Archiver error: ${err.message}`);
      });

      archive.pipe(res);

      this.logger.log(`Memulai export ${predictions.length} gambar ke ZIP...`);

      const manifestEntries: Array<{
        id: string;
        varietyCode: string | null;
        status: 'SUCCESS' | 'FAILED';
        fileName?: string;
        error?: string;
      }> = [];

      let successCount = 0;
      let failedCount = 0;

      for (const p of predictions) {
        const folderName = p.varietyCode ? p.varietyCode.toUpperCase() : 'UNKNOWN';
        const fileName = `img_${p.id}.jpg`;

        try {
          const response = await axios.get(p.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 10000 
          });

          archive.append(Buffer.from(response.data), { name: `${folderName}/${fileName}` });
          
          manifestEntries.push({
            id: p.id,
            varietyCode: p.varietyCode,
            fileName: fileName,
            status: 'SUCCESS'
          });
          successCount++;
        } catch (error: unknown) {
          // Type-safe error extraction
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          
          this.logger.warn(`Gagal mengunduh gambar ID: ${p.id}. Melewati file ini. Error: ${errorMessage}`);
          manifestEntries.push({
            id: p.id,
            varietyCode: p.varietyCode,
            status: 'FAILED',
            error: errorMessage
          });
          failedCount++;
        }
      }

      const manifest = {
        exportedAt: new Date().toISOString(),
        totalRequested: predictions.length,
        totalSuccess: successCount,
        totalFailed: failedCount,
        details: manifestEntries
      };

      archive.append(JSON.stringify(manifest, null, 2), { name: 'dataset_manifest.json' });

      await archive.finalize();
      this.logger.log(`Export ZIP selesai. Berhasil: ${successCount} | Gagal: ${failedCount}`);

    } catch (error: unknown) {
      // Type-safe error extraction
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Kesalahan sistem saat export ZIP: ${errorMessage}`, errorStack);
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Terjadi kesalahan sistem saat memproses export ZIP.'
        });
      } else {
        res.end();
      }
    }
  }
}