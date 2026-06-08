// src/ai-core/market-intelligence/applications/use-cases/process-market-report.use-case.ts
//
// v3 Fix: Membuat AgentRunEntity dulu sebelum insert MarketPriceEntity.
// Sebelumnya agentRunId di market_prices tidak ada FK yang valid
// karena record di agent_runs tidak pernah dibuat, sehingga FK constraint
// gagal dan semua insert market_prices ditolak.

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

const SOURCE_NAME_PLACEHOLDER = 'market-intelligence-agent';
const SOURCE_URL_PLACEHOLDER  = 'internal';

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

    this.logger.log(
      `[ProcessMarketReport] START → run_id=${run_id}, ` +
        `agent_version=${agent_version}, ` +
        `status=${status}, ` +
        `total_entries=${entries.length}`,
    );

    // ── 1. Buat atau update AgentRunEntity ──────────────────────────────────
    // WAJIB dilakukan sebelum insert market_prices karena ada FK constraint.
    // Gunakan upsert: jika run_id sudah ada (retry), update statusnya.
    const agentRun = await this._upsertAgentRun(dto);

    // ── 2. Cek status actionable ────────────────────────────────────────────
    if (!this.domainService.isActionableStatus(status as AgentRunStatus)) {
      this.logger.warn(
        `[ProcessMarketReport] Status tidak actionable → run_id=${run_id}, status=${status}. ` +
          `Tidak ada data yang disimpan.`,
      );
      return {
        accepted:         true,
        run_id,
        entries_saved:    0,
        entries_rejected: entries.length,
        message:          `Status '${status}' tidak menghasilkan data yang dapat disimpan.`,
      };
    }

    // ── 3. Validasi & filter entries ────────────────────────────────────────
    const { valid, rejectedCount } = this.validator.filterWholeAndValid(
      entries,
      run_id,
    );

    this.logger.debug(
      `[ProcessMarketReport] Validasi selesai → ` +
        `valid=${valid.length}, rejected=${rejectedCount}`,
    );

    // ── 4. Simpan ke database ───────────────────────────────────────────────
    let savedCount = 0;

    if (valid.length > 0) {
      const createDataList = valid.map((entry) =>
        this.mapper.toCreateData(
          entry,
          SOURCE_NAME_PLACEHOLDER,
          SOURCE_URL_PLACEHOLDER,
          run_id,          // agentVersion — pakai run_id sebagai versi agen
          agentRun.id,     // agentRunId   — FK yang valid ke agent_runs
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private async _upsertAgentRun(dto: MarketReportDto): Promise<AgentRunEntity> {
    const { run_id, agent_version, status, sources_scraped, sources_failed } = dto;

    // Cek apakah run_id sudah ada (hindari duplikasi)
    const existing = await this.agentRunRepo.findOne({ where: { id: run_id } });

    if (existing) {
      this.logger.debug(
        `[ProcessMarketReport] AgentRun sudah ada untuk run_id=${run_id}. ` +
          `Gunakan yang existing.`,
      );
      return existing;
    }

    // Buat record baru
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