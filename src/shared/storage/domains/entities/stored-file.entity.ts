// src/shared/storage/domains/entities/stored-file.entity.ts
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
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../../../identity/users/domains/entities/user.entity';
import { PredictionEntity } from '../../../../ai-core/predictions/domains/entities/prediction.entity';

export type StorageProvider = 'local' | 's3';

@Entity({ name: 'stored_files' })
export class StoredFileEntity {
  // ── Primary Key ──────────────────────────────────────────────
  // Menggunakan @PrimaryColumn eksplisit agar tidak ada dual-generation
  // path antara TypeORM dan @BeforeInsert (fix M2 dari analisis Phase 1)
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Foreign Key: siapa yang mengupload ──────────────────────
  @Column({ type: 'varchar', length: 36, nullable: false })
  userId: string = '';

  // ── File Metadata ────────────────────────────────────────────
  @Column({ type: 'varchar', length: 512, nullable: false })
  fileKey: string = '';

  @Column({ type: 'varchar', length: 512, nullable: false })
  imageUrl: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false })
  originalName: string = '';

  @Column({ type: 'varchar', length: 100, nullable: false })
  mimeType: string = '';

  @Column({ type: 'int', unsigned: true, nullable: false })
  sizeInBytes: number = 0;

  // Enum disimpan sebagai varchar agar tidak perlu ALTER TABLE
  // jika provider bertambah di masa depan
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'local' })
  provider: StorageProvider = 'local';

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────

  // Menggunakan Relation<T> wrapper (TypeORM v0.3+) untuk
  // kompatibilitas TypeScript strict mode tanpa definite assignment (!)
  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: Relation<UserEntity>;

  // Satu StoredFile menghasilkan tepat satu Prediction (1-to-1)
  // Sisi inverse — FK ada di tabel predictions (storedFileId)
  @OneToOne(() => PredictionEntity, (prediction) => prediction.storedFile, {
    cascade: false,
    nullable: true,
  })
  prediction: Relation<PredictionEntity> | null = null;
}

/**
 * @deprecated Gunakan StoredFileEntity untuk persistensi ke database.
 * Class ini dipertahankan hanya sebagai DTO internal upload pipeline
 * sebelum data di-persist, bukan sebagai TypeORM entity.
 */
export class RawUploadedFile {
  buffer: Buffer = Buffer.alloc(0);
  originalName: string = '';
  mimeType: string = '';
  sizeInBytes: number = 0;
}