// src/shared/storage/applications/use-cases/delete-file.use-case.ts
import { Inject, Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { type IStorageAdapter, STORAGE_ADAPTER_TOKEN } from '../../infrastructures/adapters/storage.adapter.interface';
import { type IStoredFileRepository, STORED_FILE_REPOSITORY_TOKEN } from '../../infrastructures/repositories/stored-file.repository.interface';

@Injectable()
export class DeleteFileUseCase {
  private readonly logger = new Logger(DeleteFileUseCase.name);

  constructor(
    @Inject(STORAGE_ADAPTER_TOKEN)
    private readonly storageAdapter: IStorageAdapter,

    @Inject(STORED_FILE_REPOSITORY_TOKEN)
    private readonly storedFileRepo: IStoredFileRepository,
  ) {}

  async execute(fileKey: string, userId: string): Promise<void> {
    this.logger.log(`[DeleteFile] Validasi kepemilikan file → key=${fileKey}`);

    const fileEntity = await this.storedFileRepo.findByFileKey(fileKey);
    if (!fileEntity) {
      throw new NotFoundException('File tidak ditemukan di dalam sistem.');
    }

    if (fileEntity.userId !== userId) {
      this.logger.warn(`[DeleteFile] Serangan IDOR terdeteksi: User ${userId} mencoba menghapus file milik ${fileEntity.userId}`);
      throw new ForbiddenException('Akses ditolak. Anda tidak memiliki izin untuk menghapus file ini.');
    }

    this.logger.log(`[DeleteFile] Deleting dari fisik storage → key=${fileKey}`);
    await this.storageAdapter.delete(fileKey);

  }
}