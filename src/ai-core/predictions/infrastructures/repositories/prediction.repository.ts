// src/ai-core/predictions/infrastructures/repositories/prediction.repository.ts
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import {
  PredictionEntity,
  PredictionStatus,
  CurationStatus,
} from '../../domains/entities/prediction.entity';
import {
  IPredictionRepository,
  PredictionResultPayload,
  CreatePredictionData,
  VerifyPredictionData,
  AdminPredictionFilter,
  BulkAddFilter,
} from './prediction.repository.interface';
import { resolveVarietyName } from '../../../ai-integration/domains/constants/variety.constants';

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
    skip: number,
    limit: number,
  ): Promise<[PredictionEntity[], number]> {
    return this.ormRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
  }

  async create(data: CreatePredictionData): Promise<PredictionEntity> {
    if (!data.userId?.trim() || !data.storedFileId?.trim() || !data.imageUrl?.trim()) {
      throw new InternalServerErrorException('Data pembuatan prediction tidak lengkap.');
    }

    const id = uuidv4();

    // Data baru PASTI masuk sebagai UNVERIFIED (Akan muncul di Kurasi AI)
    await this.ormRepo.save({
      id,
      userId: data.userId.trim(),
      storedFileId: data.storedFileId.trim(),
      imageUrl: data.imageUrl.trim(),
      status: PredictionStatus.PENDING,
      curationStatus: CurationStatus.UNVERIFIED,
      isVerified: null, 
    });

    const created = await this.findById(id);
    if (!created) throw new InternalServerErrorException(`Gagal menemukan prediction. id=${id}`);
    
    return created;
  }

  async updateResult(
    id: string,
    result: PredictionResultPayload,
  ): Promise<PredictionEntity> {
    await this.ormRepo.update(id, {
      varietyCode: result.varietyCode,
      varietyName: result.varietyName,
      localName: result.localName,
      origin: result.origin,
      description: result.description,
      confidenceScore: result.confidenceScore,
      imageEnhanced: result.imageEnhanced,
      inferenceTimeMs: result.inferenceTimeMs,
      allVarieties: result.allVarieties,
      modelVersion: result.modelVersion,
      aiRequestId: result.aiRequestId,
      status: PredictionStatus.SUCCESS,
    });

    const updated = await this.findById(id);
    if (!updated) throw new Error(`Prediction id='${id}' tidak ditemukan setelah update.`);
    return updated;
  }

  async markAsFailed(id: string, reason: string): Promise<void> {
    await this.ormRepo.update(id, {
      status: PredictionStatus.FAILED,
      errorMessage: reason,
    });
  }

  async findByStatus(status: string): Promise<PredictionEntity[]> {
    return this.ormRepo.find({
      where: { status: status as PredictionStatus },
      order: { createdAt: 'DESC' },
    });
  }

  // --- FILTER PEMISAH HALAMAN (KURASI VS DATASET) ---
  async findAllForAdmin(
    filter: AdminPredictionFilter,
  ): Promise<[PredictionEntity[], number]> {
    const qb = this.ormRepo.createQueryBuilder('p');

    if (filter.status) {
      qb.andWhere('p.status = :status', { status: filter.status });
    }

    if (filter.varietyCode) {
      qb.andWhere('p.varietyCode = :varietyCode', { varietyCode: filter.varietyCode });
    }

    // GANTI BAGIAN INI:
    if (filter.isCurated !== undefined) {
      if (filter.isCurated === true) {
        // Halaman Dataset: Hanya ambil yang benar-benar sudah VERIFIED
        qb.andWhere('p.curationStatus = :curationStatus', {
          curationStatus: CurationStatus.VERIFIED
        });
      } else {
        // Halaman Kurasi AI: Ambil yang UNVERIFIED ATAU yang datanya masih NULL
        qb.andWhere('(p.curationStatus = :curationStatus OR p.curationStatus IS NULL)', {
          curationStatus: CurationStatus.UNVERIFIED
        });
      }
    }

    qb.orderBy('p.createdAt', 'DESC')
      .skip(filter.skip || 0)
      .take(filter.limit || 20);

    return qb.getManyAndCount();
  }

  // --- LOGIKA VERIFIKASI (MINDHAKAN DATA KE DATASET) ---
  async verify(id: string, data: VerifyPredictionData): Promise<PredictionEntity> {
    const updatePayload: Partial<PredictionEntity> = {
      isVerified: data.isVerified,
      curationStatus: CurationStatus.VERIFIED, // Data OTOMATIS pindah ke Halaman Dataset
      adminNote: data.adminNote ?? null,
      verifiedAt: new Date(),
    };

    if (!data.isVerified && data.correctedVarietyCode) {
      updatePayload.actualVarietyCode = data.correctedVarietyCode;
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
    const qb = this.ormRepo.createQueryBuilder('p')
      .where('p.status = :status', { status: PredictionStatus.SUCCESS })
      .andWhere('p.confidenceScore >= :minConfidence', { minConfidence: filter.minConfidence });

    if (filter.varietyCode !== null) {
      qb.andWhere('p.varietyCode = :varietyCode', { varietyCode: filter.varietyCode });
    }

    if (filter.onlyVerified) {
      qb.andWhere('p.curationStatus = :curationStatus', { curationStatus: CurationStatus.VERIFIED });
    }

    return qb.getMany();
  }

  async findVerifiedForExport(): Promise<PredictionEntity[]> {
    return this.ormRepo.find({
      where: {
        status: PredictionStatus.SUCCESS,
        curationStatus: CurationStatus.VERIFIED,
      },
      select: ['id', 'varietyCode', 'imageUrl'],
    });
  }
}