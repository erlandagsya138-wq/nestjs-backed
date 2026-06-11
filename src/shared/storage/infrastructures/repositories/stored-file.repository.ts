// src/shared/storage/infrastructures/repositories/stored-file.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoredFileEntity } from '../../domains/entities/stored-file.entity';
import { IStoredFileRepository } from './stored-file.repository.interface';

@Injectable()
export class StoredFileRepository implements IStoredFileRepository {
  constructor(
    @InjectRepository(StoredFileEntity)
    private readonly ormRepo: Repository<StoredFileEntity>,
  ) {}

  async save(entity: StoredFileEntity): Promise<StoredFileEntity> {
    return this.ormRepo.save(entity);
  }

  async findById(id: string): Promise<StoredFileEntity | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findByFileKey(fileKey: string): Promise<StoredFileEntity | null> {
    return this.ormRepo.findOne({ where: { fileKey } });
  }
}