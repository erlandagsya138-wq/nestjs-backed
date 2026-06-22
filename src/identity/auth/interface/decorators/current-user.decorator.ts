// src/auth/interface/decorators/current-user.decorator.ts
// FIX: Resilient terhadap dist/ stale — lihat komentar di bawah
import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';
import { Request } from 'express';

const logger = new Logger('CurrentUserDecorator');

/**
 * Interface payload yang di-inject oleh JwtAuthGuard ke dalam request.
 * Field ini harus sesuai dengan return value dari JwtStrategy.validate().
 */
export interface JwtUserPayload {
  sub:   string;  // userId (UUID)
  email: string;
  role: string;
}

/**
 * @CurrentUser() — param decorator untuk mengekstrak data user
 * dari JWT payload yang sudah diverifikasi oleh JwtAuthGuard.
 *
 * FIX [BUG — Empty userId Debug]:
 *   Tambah warning log jika request.user tidak ada atau tidak punya 'sub'.
 *   Ini membantu debug jika JwtStrategy.validate() mengembalikan format
 *   yang salah (misal: { userId: '...' } bukan { sub: '...' }).
 *
 * Penggunaan di controller:
 *   @Get('me')
 *   getMe(@CurrentUser() user: JwtUserPayload) { ... }
 *
 *   // Ambil field spesifik:
 *   create(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof JwtUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtUserPayload }>();

    const user = request.user;

    // ── Debug guard — deteksi masalah konfigurasi JWT/Passport ────────────
    if (!user) {
      logger.error(
        'request.user tidak ada. ' +
          'Kemungkinan JwtAuthGuard tidak berjalan atau Passport strategy error. ' +
          `Path: ${request.method} ${request.url}`,
      );
      return undefined;
    }

    if (field === 'sub' && (!user.sub || user.sub.trim().length === 0)) {
      // Log semua keys yang ada di user object untuk membantu debug
      const userKeys = Object.keys(user as object).join(', ');
      logger.error(
        `request.user.sub kosong atau tidak ada. ` +
          `Keys yang tersedia di request.user: [${userKeys}]. ` +
          `Pastikan JwtStrategy.validate() mengembalikan { sub: uuid, email: '...' }. ` +
          `Path: ${request.method} ${request.url}`,
      );
    }

    return field ? user?.[field] : user;
  },
);
