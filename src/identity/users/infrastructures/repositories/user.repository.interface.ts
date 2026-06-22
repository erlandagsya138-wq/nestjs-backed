// src/users/infrastructures/repositories/user.repository.interface.ts
import { UserEntity } from '../../domains/entities/user.entity';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByIdWithPassword(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findAll(): Promise<UserEntity[]>;
  create(user: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
}

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');
