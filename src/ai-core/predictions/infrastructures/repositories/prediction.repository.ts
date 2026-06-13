// src/ai-core/predictions/infrastructures/repositories/prediction.repository.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  PredictionEntity,
  PredictionStatus,
} from '../../domains/entities/prediction.entity';
import {
  IPredictionRepository,
  PredictionResultPayload,
  CreatePredictionData,
} from './prediction.repository.interface';

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
    // Guard — semua field wajib (seharusnya sudah dicek di use case,
    // tapi defense-in-depth di repository layer)
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
        storedFileId: data.storedFileId.trim(), // ← sebelumnya tidak ada
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
}