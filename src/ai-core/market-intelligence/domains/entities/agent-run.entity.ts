// src/ai-core/market-intelligence/domains/entities/agent-run.entity.ts
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

// Enum ini disimpan sebagai varchar untuk fleksibilitas MySQL.
// Perubahan nilai enum di MySQL membutuhkan ALTER TABLE yang mahal;
// varchar menghindari hal itu.
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

  // Siapa yang memicu run ini — saat ini selalu 'cron',
  // tapi kolom ini future-proof jika manual trigger ditambahkan nanti
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'cron' })
  triggeredBy: TriggerSource = 'cron';

  // ── Statistik Hasil Run ──────────────────────────────────────
  // Berapa sumber yang dicoba di-scrape dalam satu run ini
  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  totalSources: number = 0;

  // Berapa sumber yang berhasil di-scrape (tidak error)
  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  successSources: number = 0;

  // Jumlah total record harga yang berhasil dikumpulkan
  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  totalPricesFound: number = 0;

  // Ringkasan error jika status adalah PARTIAL atau SCRAPER_ERROR
  // Berisi JSON array dari pesan error per sumber, atau null jika SUCCESS
  @Column({ type: 'text', nullable: true, default: null })
  errorSummary: string | null = null;

  // ── Timestamps ───────────────────────────────────────────────
  // startedAt di-set manual di service (bukan @CreateDateColumn)
  // karena kita ingin mencatat waktu aktual proses dimulai,
  // bukan waktu record dibuat di DB
  @Column({ type: 'timestamp', nullable: false })
  startedAt: Date = new Date();

  // completedAt di-update setelah semua scraping selesai
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