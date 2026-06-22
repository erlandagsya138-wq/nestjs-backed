// src/ai-core/market-intelligence/domains/entities/market-price.entity.ts

import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  ValueTransformer,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AgentRunEntity } from './agent-run.entity';

export enum DurianVarietyCode {
  D13  = 'D13',
  D197 = 'D197',
  D2   = 'D2',
  D24  = 'D24',
}

const decimalTransformer: ValueTransformer = {
  to:   (v: number | null) => v,
  from: (v: string | null): number | null => {
    if (v === null || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  },
};

@Entity({ name: 'market_prices' })
export class MarketPriceEntity {
  // ── Primary Key ──────────────────────────────────────────────
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Foreign Key ──────────────────────────────────────────────
  @Column({ type: 'varchar', length: 36, nullable: false })
  agentRunId: string = '';

  // ── Identitas Varietas ───────────────────────────────────────
  @Column({ type: 'enum', enum: DurianVarietyCode, nullable: false })
  varietyCode: DurianVarietyCode = DurianVarietyCode.D197;

  @Column({ type: 'varchar', length: 100, nullable: false })
  varietyAlias: string = '';

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    false,
    transformer: decimalTransformer,
  })
  pricePerUnit: number = 0;

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerKgAvg: number | null = null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  weightReference: string = '';

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null = null;

  @Column({
    type:        'decimal',
    precision:   3,
    scale:       2,
    nullable:    false,
    default:     0.50,
    transformer: decimalTransformer,
  })
  confidence: number = 0.5;

  // ── Source Tracking ──────────────────────────────────────────
  // Nama platform asal listing (contoh: "shopee.co.id", "tokopedia.com").
  @Column({ type: 'varchar', length: 255, nullable: false })
  sourceName: string = '';

  // URL langsung ke halaman produk di Google Shopping.
  @Column({ type: 'varchar', length: 512, nullable: false })
  sourceUrl: string = '';

  // Versi Python agent yang menghasilkan entry ini — untuk tracing.
  @Column({ type: 'varchar', length: 20, nullable: false })
  agentVersion: string = '';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @ManyToOne(() => AgentRunEntity, (run) => run.marketPrices, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'agentRunId' })
  agentRun!: Relation<AgentRunEntity>;
}