// src/identity/auth/interface/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../../users/domains/entities/user.entity';
import { JwtUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Ambil list role yang diizinkan dari decorator @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika endpoint tidak memakai @Roles(), berarti bebas diakses (selama JWT valid)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Ambil data user hasil ekstraksi JwtStrategy
    const { user } = context.switchToHttp().getRequest<{ user: JwtUserPayload }>();

    // Jika role user ada di dalam list requiredRoles, izinkan
    if (user && requiredRoles.includes(user.role as UserRole)) {
      return true;
    }

    // Jika tidak sesuai, tolak akses
    throw new ForbiddenException('Akses ditolak. Anda tidak memiliki hak akses untuk resource ini.');
  }
}