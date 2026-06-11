// src/shared/storage/infrastructures/repositories/stored-file.repository.interface.ts
import { StoredFileEntity } from '../../domains/entities/stored-file.entity';

export interface IStoredFileRepository {
  save(entity: StoredFileEntity): Promise<StoredFileEntity>;
  findById(id: string): Promise<StoredFileEntity | null>;
  findByFileKey(fileKey: string): Promise<StoredFileEntity | null>;
}

export const STORED_FILE_REPOSITORY_TOKEN = Symbol('IStoredFileRepository');