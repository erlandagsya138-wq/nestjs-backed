// src/auth/domains/mappers/auth.mapper.ts
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../../../users/domains/entities/user.entity';
import {
  AuthResponseDto,
  AuthUserDto,
} from '../../applications/dto/auth-response.dto';
import { JwtPayload } from '../entities/jwt-payload.entity';

@Injectable()
export class AuthMapper {
  toJwtPayload(user: UserEntity): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  toAuthUserDto(user: UserEntity): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  toAuthResponseDto(
    accessToken: string,
    expiresIn: string,
    user: UserEntity,
  ): AuthResponseDto {
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.toAuthUserDto(user),
    };
  }
}
