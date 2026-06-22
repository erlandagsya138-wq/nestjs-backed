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

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string = '';

  @BeforeInsert()
  generateId(): void {
    if (!this.id || this.id.trim().length === 0) {
      this.id = uuidv4();
    }
  }

  // ── Identity ─────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string = '';

  @Column({ type: 'varchar', length: 255, nullable: false, select: false })
  password: string = '';

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  fullName: string | null = null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole = UserRole.USER;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date = new Date();

  @OneToMany(() => PredictionEntity, (prediction) => prediction.user, {
    cascade: false,
  })
  predictions!: Relation<PredictionEntity[]>;

  @OneToMany(() => StoredFileEntity, (file) => file.user, {
    cascade: false,
  })
  storedFiles!: Relation<StoredFileEntity[]>;
}