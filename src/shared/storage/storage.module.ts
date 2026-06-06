// src/storage/storage.module.ts
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

// Auth (untuk JwtAuthGuard di controller)
import { AuthModule } from '../../identity/auth/auth.module';

@Module({
  imports: [
    AuthModule,

    /**
     * ServeStaticModule hanya aktif jika STORAGE_PROVIDER=local.
     * Menyajikan file dari folder uploads/ secara publik.
     * Contoh URL: http://localhost:3000/uploads/predictions/userId/file.jpg
     */
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    ServeStaticModule.forRootAsync({
      imports: [
        ConfigModule,
        AuthModule,
        TypeOrmModule.forFeature([StoredFileEntity]),
      ],
      inject: [ConfigService],
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
              index: false,
              fallthrough: false,
            },
          },
        ];
      },
    }),
  ],
  controllers: [StorageController],
  providers: [
    // ── Adapters (semua diinstansiasi, provider memilih satu) ──
    LocalStorageAdapter,
    S3StorageAdapter,

    // ── Dynamic Provider (Dependency Inversion) ────────────────
    StorageAdapterProvider,

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
    // Di-export agar AiIntegrationModule bisa download file dari storage
    StorageOrchestrator,
    StorageDomainService,
    UploadFileUseCase,
    DeleteFileUseCase,
  ],
})
export class StorageModule {}
