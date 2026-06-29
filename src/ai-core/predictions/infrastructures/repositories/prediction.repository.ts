// src/ai-core/predictions/infrastructures/repositories/prediction.repository.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PredictionEntity,
  PredictionStatus,
} from '../../domains/entities/prediction.entity';
import { BulkAddFilter } from './prediction.repository.interface';
import {
  IPredictionRepository,
  PredictionResultPayload,
  CreatePredictionData,
} from './prediction.repository.interface';
import { VerifyPredictionData } from './prediction.repository.interface';
import { resolveVarietyName } from '../../../ai-integration/domains/constants/variety.constants'

@Injectable()
export class PredictionRepository implements IPredictionRepository {
  constructor(
    @InjectRepository(PredictionEntity)
    private readonly ormRepo: Repository<PredictionEntity>,
  ) {}

  async findById(id: string): Promise<PredictionEntity | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findAllByUserId(userId: string): Promise<PredictionEntity[]> {
    return this.ormRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByUserIdPaginated(
    userId: string,
    skip:   number,
    limit:  number,
  ): Promise<[PredictionEntity[], number]> {
    return this.ormRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
  }

  async create(data: CreatePredictionData): Promise<PredictionEntity> {
    if (!data.userId.trim()) {
      throw new InternalServerErrorException(
        'Tidak dapat membuat prediction: userId kosong.',
      );
    }
    if (!data.storedFileId.trim()) {
      throw new InternalServerErrorException(
        'Tidak dapat membuat prediction: storedFileId kosong. ' +
        'Pastikan file berhasil di-upload dan di-persist ke DB terlebih dahulu.',
      );
    }
    if (!data.imageUrl.trim()) {
      throw new InternalServerErrorException(
        'Tidak dapat membuat prediction: imageUrl kosong.',
      );
    }

    const id = uuidv4();

    await this.ormRepo
      .createQueryBuilder()
      .insert()
      .into(PredictionEntity)
      .values({
        id,
        userId:       data.userId.trim(),
        storedFileId: data.storedFileId.trim(),
        imageUrl:     data.imageUrl.trim(),
        status:       PredictionStatus.PENDING,
      })
      .execute();

    const created = await this.ormRepo.findOne({ where: { id } });

    if (!created) {
      throw new InternalServerErrorException(
        `Prediction berhasil di-INSERT tapi tidak ditemukan saat SELECT. id=${id}`,
      );
    }

    return created;
  }

  async updateResult(
    id:     string,
    result: PredictionResultPayload,
  ): Promise<PredictionEntity> {
    await this.ormRepo.update(id, {
      varietyCode:     result.varietyCode,
      varietyName:     result.varietyName,
      localName:       result.localName,
      origin:          result.origin,
      description:     result.description,
      confidenceScore: result.confidenceScore,
      imageEnhanced:   result.imageEnhanced,
      inferenceTimeMs: result.inferenceTimeMs,
      allVarieties:    result.allVarieties,
      modelVersion:    result.modelVersion,
      aiRequestId:     result.aiRequestId,
      status:          PredictionStatus.SUCCESS,
    });

    const updated = await this.findById(id);

    if (!updated) {
      throw new Error(
        `Prediction id='${id}' tidak ditemukan setelah updateResult.`,
      );
    }

    return updated;
  }

  async markAsFailed(id: string, reason: string): Promise<void> {
    const result = await this.ormRepo.update(id, {
      status:       PredictionStatus.FAILED,
      errorMessage: reason,
    });

    if (result.affected === 0) {
      console.warn(
        `[PredictionRepository] markAsFailed: id='${id}' tidak ditemukan ` +
        `(0 rows affected). reason='${reason}'`,
      );
    }
  }

  async findByStatus(status: string): Promise<PredictionEntity[]> {
    return this.ormRepo.find({
      where: { status: status as PredictionStatus },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(filter: import('./prediction.repository.interface').AdminPredictionFilter): Promise<[PredictionEntity[], number]> {
    const qb = this.ormRepo.createQueryBuilder('p');

    // 1. Filter Status Umum (SUCCESS, FAILED, PENDING)
    if (filter.status) {
      qb.andWhere('p.status = :status', { status: filter.status });
    }

    // 2. Filter Kode Varietas
    if (filter.varietyCode) {
      qb.andWhere('p.varietyCode = :varietyCode', { varietyCode: filter.varietyCode });
    }

    // 3. Filter Tab Kurasi (Sudah disentuh admin vs Belum)
    if (filter.isCurated !== undefined && filter.isCurated !== null) {
      // Memastikan nilai string "true" atau boolean true terbaca sama
      const isCurated = String(filter.isCurated) === 'true';

      if (isCurated) {
        // Halaman Dataset: Ambil data yang sudah divalidasi (NOT NULL)
        qb.andWhere('prediction.isVerified IS NOT NULL');
      } else {
        // Halaman Kurasi: Ambil data yang masih antrean (NULL)
        qb.andWhere('prediction.isVerified IS NULL');
      }
    }

    // 4. Filter Akurasi Spesifik (Hanya mencari yang "Benar" atau "Salah")
    if (filter.isVerified !== undefined && filter.isVerified !== null) {
      qb.andWhere('p.isVerified = :isVerified', { isVerified: filter.isVerified });
    }

    // 5. Sorting & Pagination
    qb.orderBy('p.createdAt', 'DESC')
      .skip(filter.skip)
      .take(filter.limit);

    return qb.getManyAndCount();
  }

  async verify(id: string, data: VerifyPredictionData): Promise<PredictionEntity> {
    const updatePayload: Partial<PredictionEntity> = {
      isVerified: data.isVerified,
      adminNote: data.adminNote ?? null,
      verifiedAt: new Date(),
    };

    if (!data.isVerified && data.correctedVarietyCode) {
      updatePayload.varietyCode = data.correctedVarietyCode;
      updatePayload.varietyName = resolveVarietyName(data.correctedVarietyCode);
    }

    await this.ormRepo.update(id, updatePayload);

    const updated = await this.findById(id);
    if (!updated) throw new InternalServerErrorException(`Prediction id='${id}' tidak ditemukan setelah verifikasi.`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.ormRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Gagal menghapus: Prediction dengan id='${id}' tidak ditemukan.`);
    }
  }

  async findEligibleForBulkAdd(filter: BulkAddFilter): Promise<PredictionEntity[]> {
    const qb = this.ormRepo.createQueryBuilder('prediction')
      .where('prediction.status = :status', { status: PredictionStatus.SUCCESS })
      .andWhere('prediction.confidenceScore >= :minConfidence', {
        minConfidence: filter.minConfidence
      });

    if (filter.varietyCode !== null) {
      qb.andWhere('prediction.varietyCode = :varietyCode', {
        varietyCode: filter.varietyCode
      });
    }

    if (filter.onlyVerified) {
      qb.andWhere('prediction.isVerified = :isVerified', {
        isVerified: true,
      });
    }

    return qb.getMany();
  }

  async findVerifiedForExport(): Promise<PredictionEntity[]> {
    return this.ormRepo.find({
      where: {
        status: PredictionStatus.SUCCESS,
        isVerified: true
      },
      select: ['id', 'varietyCode', 'imageUrl']
    })
  }
}