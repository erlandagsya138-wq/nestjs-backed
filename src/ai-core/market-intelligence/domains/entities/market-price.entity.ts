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
  D200 = 'D200',
  D24  = 'D24',
}

// Transformer ini wajib ada karena MySQL mengembalikan DECIMAL sebagai string.
// Tanpa transformer, operasi aritmatika pada harga akan silent fail
// (misal: 50000 + 1000 menjadi "500001000" karena string concatenation)
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
  // Menggantikan raw 'runId: string' dengan FK yang proper ke agent_runs
  // (fix M6/M7 dari analisis Phase 1)
  @Column({ type: 'varchar', length: 36, nullable: false })
  agentRunId: string = '';

  // ── Price Data ───────────────────────────────────────────────
  @Column({ type: 'enum', enum: DurianVarietyCode, nullable: false })
  varietyCode: DurianVarietyCode = DurianVarietyCode.D197;

  @Column({ type: 'varchar', length: 100, nullable: false })
  varietyAlias: string = '';

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerKgMin: number | null = null;

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerKgMax: number | null = null;

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerKgAvg: number | null = null;

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerUnitMin: number | null = null;

  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerUnitMax: number | null = null;

  // ── Context Metadata ─────────────────────────────────────────
  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  locationHint: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  sellerType: string | null = null;

  @Column({ type: 'varchar', length: 200, nullable: false })
  weightReference: string = '';

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null = null;

  // Diubah dari float ke decimal(3,2) untuk presisi terjamin pada nilai 0.00–1.00
  // (fix M3 dari analisis Phase 1)
  @Column({
    type:        'decimal',
    precision:   3,
    scale:       2,
    nullable:    false,
    default:     0.50,
    transformer: decimalTransformer,
  })
  confidence: number = 0.5;

  @Column({ type: 'text', nullable: true, default: null })
  rawTextSnippet: string | null = null;

  // ── Source Tracking ──────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, nullable: false })
  sourceName: string = '';

  @Column({ type: 'varchar', length: 512, nullable: false })
  sourceUrl: string = '';

  // agentVersion dipindahkan dari runId raw ke sini; tetap relevan
  // untuk tracing versi scraper yang digunakan
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