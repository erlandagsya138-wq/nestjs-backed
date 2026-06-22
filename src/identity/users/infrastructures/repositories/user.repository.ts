// src/users/infrastructures/repositories/user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../domains/entities/user.entity';
import { IUserRepository } from './user.repository.interface';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly ormRepo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.ormRepo.findOne({ where: { id } });
  }

  async findByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.ormRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.ormRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findAll(): Promise<UserEntity[]> {
    return this.ormRepo.find({ where: { isActive: true } });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = this.ormRepo.create(data);
    return this.ormRepo.save(user);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.ormRepo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`User dengan id ${id} tidak ditemukan setelah update`);
    }
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.ormRepo.update(id, { isActive: false });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.ormRepo.count({ where: { email } });
    return count > 0;
  }
}
