// src/ai-core/market-intelligence/infrastructures/repositories/agent-run.repository.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentRunEntity } from '../../domains/entities/agent-run.entity';
import {
  IAgentRunRepository,
  UpsertAgentRunData,
} from './agent-run.repository.interface';

@Injectable()
export class AgentRunRepository implements IAgentRunRepository {
  private readonly logger = new Logger(AgentRunRepository.name);

  constructor(
    @InjectRepository(AgentRunEntity)
    private readonly ormRepo: Repository<AgentRunEntity>,
  ) {}

  async upsertRun(data: UpsertAgentRunData): Promise<AgentRunEntity> {
    try {
      // Cek dulu apakah run sudah ada (bisa terjadi jika Python retry kirim)
      const existing = await this.ormRepo.findOne({ where: { id: data.id } });

      if (existing) {
        // Update status dan completedAt saja
        existing.status      = data.status;
        existing.completedAt = data.completedAt;
        if (data.errorSummary !== null) {
          existing.errorSummary = data.errorSummary;
        }
        const updated = await this.ormRepo.save(existing);
        this.logger.debug(
          `[AgentRunRepository] Updated existing run → id=${updated.id}`,
        );
        return updated;
      }

      // Insert baru
      const entity = this.ormRepo.create({
        id:               data.id,
        status:           data.status,
        triggeredBy:      data.triggeredBy,
        startedAt:        data.startedAt,
        completedAt:      data.completedAt,
        totalSources:     data.totalSources,
        successSources:   data.successSources,
        totalPricesFound: data.totalPricesFound,
        errorSummary:     data.errorSummary,
      });

      const saved = await this.ormRepo.save(entity);
      this.logger.log(
        `[AgentRunRepository] Inserted new agent_run → id=${saved.id}, status=${saved.status}`,
      );
      return saved;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[AgentRunRepository] upsertRun gagal: ${message}`);
      throw new InternalServerErrorException(
        `Gagal menyimpan agent run: ${message}`,
      );
    }
  }

  async updatePricesFound(runId: string, count: number): Promise<void> {
    try {
      await this.ormRepo.update({ id: runId }, { totalPricesFound: count });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[AgentRunRepository] updatePricesFound gagal (non-fatal): ${message}`,
      );
    }
  }

  async findById(runId: string): Promise<AgentRunEntity | null> {
    return this.ormRepo.findOne({ where: { id: runId } });
  }

  async findRecent(limit: number): Promise<AgentRunEntity[]> {
    return this.ormRepo.find({
      order: { createdAt: 'DESC' },
      take:  limit,
    });
  }
}