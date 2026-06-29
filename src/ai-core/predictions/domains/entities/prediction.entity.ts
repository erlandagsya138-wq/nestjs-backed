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

export enum CurationStatus {
  UNVERIFIED = 'UNVERIFIED',
  VERIFIED   = 'VERIFIED',
}

const decimalTransformer: ValueTransformer = {
  to: (v: number | null) => v,
  from: (v: string | null): number | null => (v === null ? null : parseFloat(v)),
};

@Entity({ name: 'predictions' })
export class PredictionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id) this.id = uuidv4();
  }

  // ── Foreign Keys ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false, unique: true })
  storedFileId: string = '';

  // ── AI Core Data ─────────────────────────────────────────────
  @Column({ type: 'varchar', length: 100, nullable: true })
  varietyCode: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  varietyName: string | null = null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  localName: string | null = null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origin: string | null = null;

  @Column({ type: 'text', nullable: true })
  description: string | null = null;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true, transformer: decimalTransformer })
  confidenceScore: number | null = null;

  @Column({ type: 'json', nullable: true })
  allVarieties: { varietyCode: string; varietyName: string; confidenceScore: number }[] | null = null;

  // ── Metadata & AI Performance ───────────────────────────────
  @Column({ type: 'boolean', nullable: true })
  imageEnhanced: boolean | null = null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  inferenceTimeMs: number | null = null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  modelVersion: string | null = null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  aiRequestId: string | null = null;

  @Column({ type: 'varchar', length: 512, nullable: false })
  imageUrl: string = '';

  // ── Status & Error Tracking ──────────────────────────────────
  @Column({ type: 'enum', enum: PredictionStatus, default: PredictionStatus.PENDING })
  status: PredictionStatus = PredictionStatus.PENDING;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null = null;

  // ── Curation Status (Pembeda Mutlak) ─────────────────────────
  @Column({ 
    type: 'enum', 
    enum: CurationStatus, 
    default: CurationStatus.UNVERIFIED 
  })
  curationStatus: CurationStatus = CurationStatus.UNVERIFIED;

  @Column({ type: 'boolean', nullable: true })
  isVerified: boolean | null = null; 

  @Column({ type: 'varchar', length: 100, nullable: true })
  actualVarietyCode: string | null = null;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null = null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @ManyToOne(() => UserEntity, (user) => user.predictions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;

  @OneToOne(() => StoredFileEntity, (sf) => sf.prediction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storedFileId' })
  storedFile!: Relation<StoredFileEntity>;
}