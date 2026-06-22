// src/ai-core/predictions/domains/entities/prediction.entity.ts
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  type Relation,
  ValueTransformer,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../../../identity/users/domains/entities/user.entity';
import { StoredFileEntity } from '../../../../shared/storage/domains/entities/stored-file.entity';

export enum PredictionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED  = 'FAILED',
}

// Transformer untuk decimal agar tidak menjadi string di MySQL
const decimalTransformer: ValueTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null): number | null => {
    if (v === null || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  },
};

@Entity({ name: 'predictions' })
export class PredictionEntity {
  // ── Primary Key ──────────────────────────────────────────────
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Foreign Keys ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false, unique: true })
  storedFileId: string = '';

  // ── AI Result — Core ─────────────────────────────────────────
  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  varietyCode: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  varietyName: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  localName: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  origin: string | null = null;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null = null;

  @Column({
    type:        'decimal',
    precision:   5,
    scale:       4,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  confidenceScore: number | null = null;

  // ── AI Result — Metadata ─────────────────────────────────────
  @Column({ type: 'boolean', nullable: true, default: null })
  imageEnhanced: boolean | null = null;

  @Column({
    type:        'decimal',
    precision:   10,
    scale:       2,
    nullable:    true,
    default:     null,
    transformer: decimalTransformer,
  })
  inferenceTimeMs: number | null = null;

  // Semua varietas dengan skor (disimpan sebagai JSON array)
  @Column({ type: 'json', nullable: true, default: null })
  allVarieties: {
    varietyCode:     string;
    varietyName:     string;
    confidenceScore: number;
  }[] | null = null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  modelVersion: string | null = null;

  @Column({ type: 'varchar', length: 36, nullable: true, default: null })
  aiRequestId: string | null = null;

  @Column({ type: 'varchar', length: 512, nullable: false })
  imageUrl: string = '';

  // ── Status Tracking ──────────────────────────────────────────
  @Column({
    type:    'enum',
    enum:    PredictionStatus,
    default: PredictionStatus.PENDING,
  })
  status: PredictionStatus = PredictionStatus.PENDING;

  @Column({ type: 'text', nullable: true, default: null })
  errorMessage: string | null = null;

  // ── Admin Verification Fields (Human-in-the-loop) ────────────
  @Column({ type: 'boolean', nullable: true, default: null })
  isVerified: boolean | null = null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  verifiedAt: Date | null = null;

  @Column({ type: 'text', nullable: true, default: null })
  adminNote: string | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, (user) => user.predictions, {
    onDelete:  'CASCADE',
    nullable:  false,
  })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;

  @OneToOne(() => StoredFileEntity, (sf) => sf.prediction, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'storedFileId' })
  storedFile!: Relation<StoredFileEntity>;
}