// src/predictions/applications/use-cases/export-verified-dataset.use-case.ts
import { Inject, Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
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
    const predictions = await this.predictionRepo.findVerifiedForExport();

    if (predictions.length === 0) {
      throw new InternalServerErrorException('Belum ada data prediksi yang terverifikasi.');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=dataset_export_${dateStr}.zip`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.pipe(res);

    this.logger.log(`Memulai export ${predictions.length} data dataset...`);

    for (const p of predictions) {
      const folderName = p.varietyCode ? p.varietyCode.toUpperCase() : 'UNKNOWN';
      const fileName = `img_${p.id}.jpg`;

      try {
        const response = await axios.get(p.imageUrl, { responseType: 'stream' });

        archive.append(response.data, { name: `${folderName}/${fileName}` });
      } catch (error) {
        this.logger.warn(`Gagal mengunduh gambar untuk prediksi ID: ${p.id}. Melewati file ini.`);
      }
    }

    // Tutup archive (menyelesaikan proses ZIP)
    await archive.finalize();
    this.logger.log(`Export ZIP selesai.`);
  }
}