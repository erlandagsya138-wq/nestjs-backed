// src/users/applications/use-cases/update-user.use-case.ts
import { ForbiddenException, Inject, Injectable, BadRequestException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserDomainService } from '../../domains/services/user-domain.service';
import { UserMapper } from '../../domains/mappers/user.mapper';
import { UserValidator } from '../../domains/validators/user.validator';
import { USER_REPOSITORY_TOKEN } from '../../infrastructures/repositories/user.repository.interface';
import type { IUserRepository } from '../../infrastructures/repositories/user.repository.interface';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly validator: UserValidator,
    private readonly mapper: UserMapper,
  ) {}

  async execute(
    id: string,
    dto: UpdateUserDto,
    requestingUserId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userRepo.findByIdWithPassword(id);

    this.validator.assertExists(user, id);

    if (user.id !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah profil user lain.',
      );
    }

    this.validator.assertIsActive(user);

    const updatePayload: Record<string, string | null> = {};

    if (dto.fullName !== undefined) {
      updatePayload.fullName = dto.fullName ?? null;
    }

    if (dto.newPassword || dto.currentPassword) {
      if (!dto.newPassword || !dto.currentPassword) {
        throw new BadRequestException(
          'currentPassword dan newPassword harus diisi bersamaan untuk mengganti password.'
        );
      }

      await this.validator.assertPasswordMatch(
        dto.currentPassword,
        user.password,
      );
      updatePayload.password = await this.domainService.hashPassword(
        dto.newPassword,
      );
    }

    if (Object.keys(updatePayload).length === 0) {
      return this.mapper.toResponseDto(user);
    }

    const updated = await this.userRepo.update(id, updatePayload);
    return this.mapper.toResponseDto(updated);
  }
}