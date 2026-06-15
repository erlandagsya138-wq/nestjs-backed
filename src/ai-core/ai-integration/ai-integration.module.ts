// src/ai-integration/ai-integration.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AiHealthService } from './infrastructures/health/ai-health.service';
import { AiHealthController } from './infrastructures/health/ai-health.controller';
import { AiOnlineGuard } from './infrastructures/health/ai-online.guard';
import { AiHttpAdapter } from './infrastructures/repositories/ai-http.adapter';
import { AI_HTTP_ADAPTER_TOKEN } from './infrastructures/repositories/ai-http.adapter.interface';
import { AiIntegrationDomainService } from './domains/services/ai-integration-domain.service';
import { AiResponseValidator } from './domains/validators/ai-response.validator';
import { AiResponseMapper } from './domains/mappers/ai-response.mapper';
import { ProcessPredictionUseCase } from './applications/use-cases/process-prediction.use-case';
import { AiIntegrationOrchestrator } from './applications/orchestrator/ai-integration.orchestrator';
import { AiPredictionCreatedListener } from './infrastructures/listeners/prediction-created.listener';

import { PredictionModule } from '../predictions/prediction.module';

@Module({
  imports: [
    ConfigModule,

    HttpModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('FASTAPI_BASE_URL'),
        timeout: 30_000,
      }),
    }),

    forwardRef(() => PredictionModule),
  ],
  controllers: [AiHealthController],
  providers: [
    AiHealthService,
    AiOnlineGuard,
    { provide: AI_HTTP_ADAPTER_TOKEN, useClass: AiHttpAdapter },
    AiIntegrationDomainService,
    AiResponseValidator,
    AiResponseMapper,
    ProcessPredictionUseCase,
    AiIntegrationOrchestrator,
    AiPredictionCreatedListener,
  ],
  exports: [
    AiHealthService,
    AiOnlineGuard,
    AiIntegrationOrchestrator,
    AiIntegrationDomainService,
    ProcessPredictionUseCase,
  ],
})
export class AiIntegrationModule {}