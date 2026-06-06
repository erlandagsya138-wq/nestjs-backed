import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MarketReportDto } from '../dto/market-report.dto';
import { MarketReportIngestResponseDto } from '../dto/market-report-ingest-response.dto';
import { MarketPriceValidator } from '../../domains/validators/market-price.validator';
import { MarketPriceMapper } from '../../domains/mappers/market-price.mapper';
import { MarketIntelligenceDomainService } from '../../domains/services/market-intelligence-domain.service';
import {
  type IMarketPriceRepository,
  MARKET_PRICE_REPOSITORY_TOKEN,
} from '../../infrastructures/repositories/market-price.repository.interface';
import { MarketReportIngestedEvent } from '../../infrastructures/events/market-report-ingested.event';
import { AgentRunStatus } from '../../domains/entities/agent-run-status.entity';

const SOURCE_NAME_PLACEHOLDER = 'market-intelligence-agent';
const SOURCE_URL_PLACEHOLDER  = 'internal';

@Injectable()
export class ProcessMarketReportUseCase {
  private readonly logger = new Logger(ProcessMarketReportUseCase.name);

  constructor(
    @Inject(MARKET_PRICE_REPOSITORY_TOKEN)
    private readonly marketPriceRepo: IMarketPriceRepository,

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

    const { valid, rejectedCount } = this.validator.filterWholeAndValid(
      entries,
      run_id,
    );

    this.logger.debug(
      `[ProcessMarketReport] Validasi selesai → ` +
        `valid=${valid.length}, rejected=${rejectedCount}`,
    );

    let savedCount = 0;

    if (valid.length > 0) {
      const createDataList = valid.map((entry) =>
        this.mapper.toCreateData(
          entry,
          SOURCE_NAME_PLACEHOLDER,
          SOURCE_URL_PLACEHOLDER,
          run_id,
        ),
      );

      const saved = await this.marketPriceRepo.bulkCreate(createDataList);
      savedCount  = saved.length;
    }

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
}