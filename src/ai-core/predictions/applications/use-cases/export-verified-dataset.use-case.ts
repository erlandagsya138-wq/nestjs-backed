import { Inject, Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import {
  PREDICTION_REPOSITORY_TOKEN,
  type IPredictionRepository,
} from '../../infrastructures/repositories/prediction.repository.interface';

import archiver = require('archiver');

@Injectable()
export class ExportVerifiedDatasetUseCase {
  private readonly logger = new Logger(ExportVerifiedDatasetUseCase.name);

  constructor(
    @Inject(PREDICTION_REPOSITORY_TOKEN)
    private readonly predictionRepo: IPredictionRepository,
  ) {}

  async execute(res: Response): Promise<void> {
    try {
      // 1. Ambil semua prediksi yang sudah terverifikasi
      const predictions = await this.predictionRepo.findVerifiedForExport();

      if (predictions.length === 0) {
        res.status(404).json({
          statusCode: 404,
          error: 'Not Found',
          message: 'Belum ada data prediksi yang terverifikasi untuk diexport.',
        });
        return;
      }

      // 2. Set response headers sebelum mulai streaming
      const dateStr = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=dataset_export_${dateStr}.zip`,
      );

      // 3. Buat archive instance
      //    archiver() sekarang callable langsung karena import CJS-style di atas
      const archive = archiver('zip', { zlib: { level: 6 } });

      // 4. Daftarkan error handler SEBELUM pipe (urutan ini kritis)
      archive.on('error', (err: Error) => {
        this.logger.error(`Archiver stream error: ${err.message}`, err.stack);
        // Header sudah terkirim saat pipe dimulai — tidak bisa set status lagi
        if (!res.headersSent) {
          res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Gagal membuat arsip ZIP.',
          });
        } else {
          res.destroy();
        }
      });

      archive.on('warning', (err: Error & { code?: string }) => {
        if (err.code === 'ENOENT') {
          this.logger.warn(`Archiver warning (file skip): ${err.message}`);
        } else {
          throw err;
        }
      });

      // 5. Pipe archive ke HTTP response
      archive.pipe(res);

      this.logger.log(`Memulai export ${predictions.length} gambar ke ZIP...`);

      // 6. Download gambar dari URL dan tambahkan ke ZIP
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
        const folderName = p.varietyCode
          ? p.varietyCode.toUpperCase()
          : 'UNKNOWN';
        const fileName = `img_${p.id}.jpg`;

        try {
          const response = await axios.get<ArrayBuffer>(p.imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10_000,
          });

          archive.append(Buffer.from(response.data), {
            name: `${folderName}/${fileName}`,
          });

          manifestEntries.push({
            id: p.id,
            varietyCode: p.varietyCode,
            fileName,
            status: 'SUCCESS',
          });
          successCount++;
        } catch (dlError: unknown) {
          const errorMessage =
            dlError instanceof Error
              ? dlError.message
              : 'Unknown download error';

          this.logger.warn(
            `Gagal mengunduh gambar ID: ${p.id}. Melewati. Error: ${errorMessage}`,
          );
          manifestEntries.push({
            id: p.id,
            varietyCode: p.varietyCode,
            status: 'FAILED',
            error: errorMessage,
          });
          failedCount++;
        }
      }

      // 7. Tambahkan manifest JSON ke root ZIP
      const manifest = {
        exportedAt: new Date().toISOString(),
        totalRequested: predictions.length,
        totalSuccess: successCount,
        totalFailed: failedCount,
        details: manifestEntries,
      };

      archive.append(JSON.stringify(manifest, null, 2), {
        name: 'dataset_manifest.json',
      });

      // 8. Finalisasi — wajib dipanggil agar stream selesai dikirim ke client
      await archive.finalize();

      this.logger.log(
        `Export ZIP selesai. Berhasil: ${successCount} | Gagal: ${failedCount}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Kesalahan sistem saat export ZIP: ${errorMessage}`,
        errorStack,
      );

      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Terjadi kesalahan sistem saat memproses export ZIP.',
        });
      } else {
        res.end();
      }
    }
  }
}