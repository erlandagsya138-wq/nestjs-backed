// src/ai-core/market-intelligence/infrastructures/repositories/agent-run.repository.interface.ts

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
  upsertRun(data: UpsertAgentRunData): Promise<AgentRunEntity>;
  
  updatePricesFound(runId: string, count: number): Promise<void>;

  findById(runId: string): Promise<AgentRunEntity | null>;
  findRecent(limit: number): Promise<AgentRunEntity[]>;
}

export const AGENT_RUN_REPOSITORY_TOKEN = Symbol('IAgentRunRepository');