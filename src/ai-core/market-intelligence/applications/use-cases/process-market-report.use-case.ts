// src/ai-core/market-intelligence/applications/use-cases/process-market-report.use-case.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository }           from '@nestjs/typeorm';
import { Repository }                 from 'typeorm';
import { EventEmitter2 }              from '@nestjs/event-emitter';
import { MarketReportDto }            from '../dto/market-report.dto';
import { MarketReportIngestResponseDto } from '../dto/market-report-ingest-response.dto';
import { MarketPriceValidator }          from '../../domains/validators/market-price.validator';
import { MarketPriceMapper }             from '../../domains/mappers/market-price.mapper';
import { MarketIntelligenceDomainService } from '../../domains/services/market-intelligence-domain.service';
import {
  type IMarketPriceRepository,
  MARKET_PRICE_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/market-price.repository.interface';
import { MarketReportIngestedEvent } from '../../infrastructures/events/market-report-ingested.event';
import { AgentRunStatus }            from '../../domains/entities/agent-run-status.entity';
import { AgentRunEntity }            from '../../domains/entities/agent-run.entity';

const FALLBACK_SOURCE_NAME = 'market-intelligence-agent';
const FALLBACK_SOURCE_URL  = '';

@Injectable()
export class ProcessMarketReportUseCase {
  private readonly logger = new Logger(ProcessMarketReportUseCase.name);

  constructor(
    @Inject(MARKET_PRICE_REPOSITORY_TOKEN)
    private readonly marketPriceRepo: IMarketPriceRepository,

    @InjectRepository(AgentRunEntity)
    private readonly agentRunRepo: Repository<AgentRunEntity>,

    private readonly validator:     MarketPriceValidator,
    private readonly mapper:        MarketPriceMapper,
    private readonly domainService: MarketIntelligenceDomainService,
    private readonly eventEmitter:  EventEmitter2,
  ) {}

  async execute(dto: MarketReportDto): Promise<MarketReportIngestResponseDto> {
    const { run_id, agent_version, status, entries } = dto;

    const existing = await this.agentRunRepo.findOne({ where: { id: run_id } });
    if (existing) {
      this.logger.warn(`[ProcessMarketReport] Laporan duplikat terdeteksi (Idempotency) → run_id=${run_id}. Diabaikan.`);
      return {
        accepted:         true,
        run_id,
        entries_saved:    0,
        entries_rejected: entries.length,
        message:          `Idempotent: Laporan dengan run_id ini sudah pernah diproses.`,
      };
    }

    this.logger.log(
      `[ProcessMarketReport] START → run_id=${run_id}, ` +
        `agent_version=${agent_version}, status=${status}, ` +
        `total_entries=${entries.length}`,
    );

    // ── 1. Upsert AgentRunEntity ────────────────────────────────────────────
    const agentRun = await this._upsertAgentRun(dto);

    // ── 2. Cek status actionable ────────────────────────────────────────────
    if (!this.domainService.isActionableStatus(status as AgentRunStatus)) {
      this.logger.warn(
        `[ProcessMarketReport] Status tidak actionable → run_id=${run_id}, status=${status}.`,
      );
      return {
        accepted:         true,
        run_id,
        entries_saved:    0,
        entries_rejected: entries.length,
        message:          `Status '${status}' tidak menghasilkan data yang dapat disimpan.`,
      };
    }

    // ── 3. Validasi, filter dasar + IQR outlier detection ───────────────────
    const { valid, rejectedCount } = this.validator.filterWholeAndValid(
      entries,
      run_id,
    );

    this.logger.debug(
      `[ProcessMarketReport] Setelah validasi → valid=${valid.length}, rejected=${rejectedCount}`,
    );

    // ── 4. Simpan ke database ───────────────────────────────────────────────
    let savedCount = 0;

    if (valid.length > 0) {
      const createDataList = valid.map((entry) =>
        this.mapper.toCreateData(
          entry,
          entry.source_name || FALLBACK_SOURCE_NAME,
          entry.source_url  || FALLBACK_SOURCE_URL,
          agent_version,
          agentRun.id,
        ),
      );

      const saved = await this.marketPriceRepo.bulkCreate(createDataList);
      savedCount  = saved.length;
    }

    // ── 5. Update stats di agent_run ────────────────────────────────────────
    await this.agentRunRepo.update(agentRun.id, {
      totalPricesFound: savedCount,
      completedAt:      new Date(),
    });

    // ── 6. Emit event ───────────────────────────────────────────────────────
    this.eventEmitter.emit(
      'market-intelligence.report_ingested',
      new MarketReportIngestedEvent(
        run_id,
        agent_version,
        status as AgentRunStatus,
        savedCount,
        new Date(),
      ),
    );

    this.logger.log(
      `[ProcessMarketReport] DONE → ${this.domainService.summarizeRun(
        run_id,
        entries.length,
        savedCount,
        rejectedCount,
        status as AgentRunStatus,
      )}`,
    );

    return {
      accepted:         true,
      run_id,
      entries_saved:    savedCount,
      entries_rejected: rejectedCount,
      message:          `Laporan diterima. ${savedCount} entri disimpan, ${rejectedCount} ditolak.`,
    };
  }

  private async _upsertAgentRun(dto: MarketReportDto): Promise<AgentRunEntity> {
    const { run_id, agent_version, status, sources_scraped, sources_failed } = dto;

    const existing = await this.agentRunRepo.findOne({ where: { id: run_id } });
    if (existing) {
      this.logger.debug(`[ProcessMarketReport] AgentRun sudah ada → id=${run_id}`);
      return existing;
    }

    const agentRun = this.agentRunRepo.create({
      id:             run_id,
      status:         status as AgentRunStatus,
      triggeredBy:    'cron',
      totalSources:   sources_scraped,
      successSources: Math.max(0, sources_scraped - sources_failed),
      startedAt:      dto.run_started_at ? new Date(dto.run_started_at) : new Date(),
      completedAt:    dto.run_ended_at   ? new Date(dto.run_ended_at)   : null,
      agentVersion:   agent_version,
    });

    const saved = await this.agentRunRepo.save(agentRun);
    this.logger.debug(
      `[ProcessMarketReport] AgentRun dibuat → id=${saved.id}, status=${saved.status}`,
    );
    return saved;
  }
}