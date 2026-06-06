// src/ai-core/datasets/domains/entities/dataset.entity.ts
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
import { DatasetItemEntity } from './dataset-item.entity';

export enum DatasetStatus {
  // Admin sedang memilih predictions yang akan dimasukkan
  DRAFT      = 'DRAFT',
  // Export sedang diproses (file sedang digenerate)
  PROCESSING = 'PROCESSING',
  // File export sudah siap didownload
  READY      = 'READY',
  // Proses export gagal
  FAILED     = 'FAILED',
}

export enum DatasetExportFormat {
  CSV  = 'CSV',
  JSON = 'JSON',
}

@Entity({ name: 'datasets' })
export class DatasetEntity {
  // ── Primary Key ──────────────────────────────────────────────
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Dataset Identity ─────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string = '';

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null = null;

  // ── Status & Export ──────────────────────────────────────────
  @Column({
    type:    'enum',
    enum:    DatasetStatus,
    default: DatasetStatus.DRAFT,
  })
  status: DatasetStatus = DatasetStatus.DRAFT;

  // URL file export (S3 / local) — null sampai status READY
  @Column({ type: 'varchar', length: 512, nullable: true, default: null })
  exportUrl: string | null = null;

  @Column({
    type:    'enum',
    enum:    DatasetExportFormat,
    default: DatasetExportFormat.JSON,
  })
  exportFormat: DatasetExportFormat = DatasetExportFormat.JSON;

  // Denormalisasi jumlah item untuk kemudahan tampilan tanpa COUNT query
  @Column({ type: 'int', unsigned: true, nullable: false, default: 0 })
  totalItems: number = 0;

  // Di-set saat export berhasil diselesaikan
  @Column({ type: 'timestamp', nullable: true, default: null })
  exportedAt: Date | null = null;

  // errorMessage di-set jika status FAILED
  @Column({ type: 'text', nullable: true, default: null })
  errorMessage: string | null = null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @OneToMany(() => DatasetItemEntity, (item) => item.dataset, {
    cascade: ['insert'],
  })
  items!: Relation<DatasetItemEntity[]>;
}