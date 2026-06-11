// src/ai-core/market-intelligence/domains/entities/market-price.entity.ts
//
// v4 Schema Cleanup:
//   - HAPUS pricePerKgMin, pricePerKgMax  → Python agent tidak pernah mengisi,
//     range per-kg tidak relevan untuk card "perkiraan harga per buah".
//   - HAPUS pricePerUnitMax               → selalu identik dengan pricePerUnitMin
//     (satu listing = satu titik harga). Rename pricePerUnitMin → pricePerUnit.
//   - HAPUS locationHint                  → jarang terisi (<5% listing), tidak
//     dipakai di card hasil scan.
//   - HAPUS sellerType                    → kategorisasi kasar dari regex,
//     tidak relevan untuk alur bisnis consumer protection.
//   - HAPUS rawTextSnippet                → debug artifact, bukan data bisnis.
//
// Column yang tersisa mendukung use case utama:
//   "Tampilkan card: jenis varietas + confidence + perkiraan harga Rp X – Rp Y"
//   → harga diambil dari agregasi pricePerUnit di view variety_price_avg.

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

// Transformer wajib ada: MySQL mengembalikan DECIMAL sebagai string.
// Tanpa ini, operasi aritmatika pada harga silent fail
// (50000 + 1000 menjadi "500001000" karena string concatenation).
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

  // ── Harga ────────────────────────────────────────────────────
  // Satu listing = satu titik harga per buah utuh (IDR).
  // Range "Rp X – Rp Y" pada card hasil scan dihasilkan dari
  // agregasi MIN/MAX column ini di view variety_price_avg.
  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    false,
    transformer: decimalTransformer,
  })
  pricePerUnit: number = 0;

  // Harga per kg — data sekunder untuk referensi internal.
  // Dihitung dari: pricePerUnit / estimasi_berat_varietas.
  @Column({
    type:        'decimal',
    precision:   12,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  pricePerKgAvg: number | null = null;

  // ── Metadata Listing ─────────────────────────────────────────
  // Referensi berat asli dari judul listing penjual.
  // Contoh: "per buah ~2.5 kg (estimasi)", "per kg × 2 kg"
  @Column({ type: 'varchar', length: 200, nullable: false })
  weightReference: string = '';

  // Catatan normalisasi harga dari extractor.
  // Contoh: "Rp650.000/buah (berat estimasi 2.5 kg untuk D13)"
  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null = null;

  // ── Quality Signal ───────────────────────────────────────────
  // Skor kepercayaan extractor terhadap akurasi entry ini (0.00–1.00).
  // Dipakai oleh view variety_price_avg untuk filter (confidence >= 0.70)
  // agar data rendah kualitas tidak masuk rata-rata harga.
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