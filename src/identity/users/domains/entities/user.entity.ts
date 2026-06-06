// src/identity/users/domains/entities/user.entity.ts
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PredictionEntity } from '../../../../ai-core/predictions/domains/entities/prediction.entity';
import { StoredFileEntity } from '../../../../shared/storage/domains/entities/stored-file.entity';

@Entity({ name: 'users' })
export class UserEntity {
  // ── Primary Key ──────────────────────────────────────────────
  // Konsisten dengan entity lain: @PrimaryColumn eksplisit (fix M2)
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    // Guard trim() ditambahkan untuk konsistensi (fix M1 dari Phase 1)
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Identity ─────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string = '';

  // select: false agar password tidak ikut ter-load di setiap query SELECT
  @Column({ type: 'varchar', length: 255, nullable: false, select: false })
  password: string = '';

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  fullName: string | null = null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean = true;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();

  // ── Relations ────────────────────────────────────────────────
  // Diubah dari lazy Promise<T[]> (TypeORM v2 pattern) ke
  // Relation<T[]> (TypeORM v0.3+ pattern) untuk strict mode (fix M9)
  @OneToMany(() => PredictionEntity, (prediction) => prediction.user, {
    cascade: false,
  })
  predictions!: Relation<PredictionEntity[]>;

  @OneToMany(() => StoredFileEntity, (file) => file.user, {
    cascade: false,
  })
  storedFiles!: Relation<StoredFileEntity[]>;
}