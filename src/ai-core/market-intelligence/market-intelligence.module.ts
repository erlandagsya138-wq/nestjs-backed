// src/ai-core/market-intelligence/market-intelligence.module.ts

import { Module }        from '@nestjs/common';
import { ConfigModule }  from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentRunEntity }   from './domains/entities/agent-run.entity';
import { MarketPriceEntity } from './domains/entities/market-price.entity';

import { MarketPriceValidator }           from './domains/validators/market-price.validator';
import { MarketPriceMapper }              from './domains/mappers/market-price.mapper';
import { MarketIntelligenceDomainService } from './domains/services/market-intelligence-domain.service';

import { ProcessMarketReportUseCase }    from './applications/use-cases/process-market-report.use-case';
import { MarketIntelligenceOrchestrator } from './applications/orchestrator/market-intelligence.orchestrator';

import { MarketPriceRepository }           from './infrastructures/repositories/market-price.repository';
import { MARKET_PRICE_REPOSITORY_TOKEN }   from './infrastructures/repositories/market-price.repository.interface';
import { HmacSignatureGuard }              from './infrastructures/guards/hmac-signature.guard';
import { MarketReportIngestedListener }    from './infrastructures/listeners/market-report-ingested.listener';

import { MarketIntelligenceController } from './interface/http/market-intelligence.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      AgentRunEntity,
      MarketPriceEntity,
    ]),
  ],
  controllers: [MarketIntelligenceController],
  providers: [
    {
      provide:  MARKET_PRICE_REPOSITORY_TOKEN,
      useClass: MarketPriceRepository,
    },
    MarketIntelligenceDomainService,
    MarketPriceValidator,
    MarketPriceMapper,
    ProcessMarketReportUseCase,
    MarketIntelligenceOrchestrator,
    HmacSignatureGuard,
    MarketReportIngestedListener,
  ],
  exports: [
    MarketIntelligenceOrchestrator,
    MARKET_PRICE_REPOSITORY_TOKEN,
  ],
})
export class MarketIntelligenceModule {}