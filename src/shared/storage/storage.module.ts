// src/shared/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { TypeOrmModule } from '@nestjs/typeorm';
import { StoredFileEntity } from './domains/entities/stored-file.entity';

// Adapters
import { LocalStorageAdapter } from './infrastructures/adapters/local-storage.adapter';
import { S3StorageAdapter } from './infrastructures/adapters/s3-storage.adapter';
import { StorageAdapterProvider } from './infrastructures/providers/storage-adapter.provider';
import {
  STORAGE_ADAPTER_TOKEN,
} from './infrastructures/adapters/storage.adapter.interface';

// Repository
import { StoredFileRepository } from './infrastructures/repositories/stored-file.repository';
import { STORED_FILE_REPOSITORY_TOKEN } from './infrastructures/repositories/stored-file.repository.interface';

// Domain
import { StorageDomainService } from './domains/services/storage-domain.service';
import { FileValidator } from './domains/validators/file.validator';
import { StorageMapper } from './domains/mappers/storage.mapper';

// Use Cases
import { UploadFileUseCase } from './applications/use-cases/upload-file.use-case';
import { DeleteFileUseCase } from './applications/use-cases/delete-file.use-case';

// Orchestrator
import { StorageOrchestrator } from './applications/orchestrator/storage.orchestrator';

// Controller & Guards
import { StorageController } from './interface/http/storage.controller';
import { FileSizeGuard } from './interface/guards/file-size.guard';

// Events & Listeners
import { FileUploadedListener } from './infrastructures/listeners/file-uploaded.listener';

// Auth
import { AuthModule } from '../../identity/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([StoredFileEntity]),

    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        if (provider !== 'local') return [];

        return [
          {
            rootPath: join(
              process.cwd(),
              config.get<string>('STORAGE_LOCAL_DIR', 'uploads'),
            ),
            serveRoot: '/uploads',
            serveStaticOptions: {
              index:     false,
              fallthrough: false,
            },
          },
        ];
      },
    }),
  ],
  controllers: [StorageController],
  providers: [
    // ── Adapters ───────────────────────────────────────────────
    LocalStorageAdapter,
    S3StorageAdapter,
    StorageAdapterProvider,

    // ── Repository ─────────────────────────────────────────────
    {
      provide:  STORED_FILE_REPOSITORY_TOKEN,
      useClass: StoredFileRepository,
    },

    // ── Domain Layer ───────────────────────────────────────────
    StorageDomainService,
    FileValidator,
    StorageMapper,

    // ── Application Layer ──────────────────────────────────────
    UploadFileUseCase,
    DeleteFileUseCase,
    StorageOrchestrator,

    // ── Guards ─────────────────────────────────────────────────
    FileSizeGuard,

    // ── Event Listeners ────────────────────────────────────────
    FileUploadedListener,
  ],
  exports: [
    // Di-export agar PredictionModule bisa memanggil UploadFileUseCase
    // langsung dari dalam CreatePredictionUseCase (1 request = upload + predict)
    STORED_FILE_REPOSITORY_TOKEN,
    StorageAdapterProvider,
    STORAGE_ADAPTER_TOKEN,
    StorageOrchestrator,
    StorageDomainService,
    LocalStorageAdapter,
    S3StorageAdapter,
    UploadFileUseCase,
    DeleteFileUseCase,
  ],
})
export class StorageModule {}