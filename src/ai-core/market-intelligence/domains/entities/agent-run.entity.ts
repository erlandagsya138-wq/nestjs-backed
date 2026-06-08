// src/ai-core/market-intelligence/domains/entities/agent-run.entity.ts
//
// v3 Fix: Tambah field agentVersion agar bisa dicatat versi Python agent
// yang mengirim laporan. Diperlukan untuk tracing/debug.

import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AgentRunStatus } from './agent-run-status.entity';
import { MarketPriceEntity } from './market-price.entity';

type TriggerSource = 'cron' | 'manual';

@Entity({ name: 'agent_runs' })
export class AgentRunEntity {
  // ── Primary Key ──────────────────────────────────────────────
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Status & Lifecycle ───────────────────────────────────────
  @Column({
    type:    'enum',
    enum:    AgentRunStatus,
    default: AgentRunStatus.NO_DATA,
  })
  status: AgentRunStatus = AgentRunStatus.NO_DATA;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'cron' })
  triggeredBy: TriggerSource = 'cron';

  // ── Versi Agent ──────────────────────────────────────────────
  // Versi Python agent yang mengirim laporan ini.
  // Berguna untuk tracing ketika ada perubahan format payload.
  @Column({ type: 'varchar', length: 20, nullable: false, default: '1.0.0' })
  agentVersion: string = '1.0.0';

  // ── Statistik Hasil Run ──────────────────────────────────────
  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  totalSources: number = 0;

  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  successSources: number = 0;

  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  totalPricesFound: number = 0;

  @Column({ type: 'text', nullable: true, default: null })
  errorSummary: string | null = null;

  // ── Timestamps ───────────────────────────────────────────────
  @Column({ type: 'timestamp', nullable: false })
  startedAt: Date = new Date();

  @Column({ type: 'timestamp', nullable: true, default: null })
  completedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => MarketPriceEntity, (price) => price.agentRun, {
    cascade: false,
  })
  marketPrices!: Relation<MarketPriceEntity[]>;
}