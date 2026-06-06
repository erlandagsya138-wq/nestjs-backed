// src/ai-core/datasets/domains/entities/dataset-item.entity.ts
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DatasetEntity } from './dataset.entity';
import { PredictionEntity } from '../../../predictions/domains/entities/prediction.entity';

// Unique constraint memastikan satu prediction tidak bisa masuk
// ke dataset yang sama lebih dari sekali
@Unique(['datasetId', 'predictionId'])
@Entity({ name: 'dataset_items' })
export class DatasetItemEntity {
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
  datasetId: string = '';

  @Column({ type: 'varchar', length: 36, nullable: false })
  predictionId: string = '';

  // Timestamp saat admin menambahkan prediction ini ke dataset
  @CreateDateColumn({ type: 'timestamp' })
  addedAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  @ManyToOne(() => DatasetEntity, (dataset) => dataset.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'datasetId' })
  dataset!: Relation<DatasetEntity>;

  // onDelete: RESTRICT karena kita tidak boleh menghapus prediction
  // yang sudah masuk ke dataset — harus hapus dari dataset terlebih dahulu
  @ManyToOne(() => PredictionEntity, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  @JoinColumn({ name: 'predictionId' })
  prediction!: Relation<PredictionEntity>;
}