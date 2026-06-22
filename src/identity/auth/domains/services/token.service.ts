// src/auth/domains/services/token.service.ts
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError, JsonWebTokenError } from '@nestjs/jwt';
import { AuthenticatedUser, JwtPayload } from '../entities/jwt-payload.entity';

export type JwtExpiresInFormat =
  | `${number}d`
  | `${number}h`
  | `${number}m`
  | `${number}s`
  | number;

@Injectable()
export class TokenService {
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.issuer   = this.config.getOrThrow<string>('JWT_ISSUER');
    this.audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
  }

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign({
      sub:   payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        issuer:   this.issuer,
        audience: this.audience,
      });
    } catch (err: unknown) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          'Token sudah kadaluarsa. Silakan login kembali.',
        );
      }

      if (err instanceof JsonWebTokenError) {
        // Pesan generik — tidak bocorkan detail teknis ke client
        throw new UnauthorizedException(
          'Token tidak valid atau telah dimanipulasi.',
        );
      }

      // Error tidak terduga — log dan throw 500
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Gagal memverifikasi token: ${message}`,
      );
    }
  }

  decodeToAuthUser(payload: JwtPayload): AuthenticatedUser {
    return {
      sub:   payload.sub,
      email: payload.email,
      role:  payload.role,
    };
  }

  getExpiresIn(): string {
    return this.config.getOrThrow<string>('JWT_EXPIRES_IN');
  }
}