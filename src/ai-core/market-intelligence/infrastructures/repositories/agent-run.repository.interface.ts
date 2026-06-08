// src/ai-core/market-intelligence/infrastructures/repositories/agent-run.repository.interface.ts
//
// [FIX-NEST-5] Interface baru untuk AgentRunRepository.
// Sebelumnya tidak ada repository untuk agent_runs — use-case langsung insert
// ke market_prices tanpa ada FK target, menyebabkan constraint violation.

import { AgentRunEntity } from '../../domains/entities/agent-run.entity';
import { AgentRunStatus } from '../../domains/entities/agent-run-status.entity';

export interface UpsertAgentRunData {
  id:               string;
  status:           AgentRunStatus;
  agentVersion:     string;
  triggeredBy:      'cron' | 'manual';
  startedAt:        Date;
  completedAt:      Date | null;
  totalSources:     number;
  successSources:   number;
  totalPricesFound: number;
  errorSummary:     string | null;
}

export interface IAgentRunRepository {
  /**
   * Upsert: insert jika belum ada, update jika sudah ada.
   * Dipanggil di awal setiap ingestReport untuk memastikan FK target tersedia.
   */
  upsertRun(data: UpsertAgentRunData): Promise<AgentRunEntity>;

  /**
   * Update totalPricesFound setelah market_prices berhasil di-insert.
   */
  updatePricesFound(runId: string, count: number): Promise<void>;

  findById(runId: string): Promise<AgentRunEntity | null>;
  findRecent(limit: number): Promise<AgentRunEntity[]>;
}

export const AGENT_RUN_REPOSITORY_TOKEN = Symbol('IAgentRunRepository');