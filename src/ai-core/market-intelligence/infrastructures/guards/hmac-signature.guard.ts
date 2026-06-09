// src/ai-core/market-intelligence/infrastructures/guards/hmac-signature.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class HmacSignatureGuard implements CanActivate {
  private readonly logger = new Logger(HmacSignatureGuard.name);
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret = this.config.getOrThrow<string>('NESTJS_INTERNAL_API_KEY');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();

    const signatureHeader = request.headers['x-signature'] as string | undefined;

    if (!signatureHeader || signatureHeader.trim().length === 0) {
      this.logger.warn(
        `[HmacSignatureGuard] Request ditolak — header X-Signature tidak ada. ` +
          `path=${request.method} ${request.url}`,
      );
      throw new ForbiddenException(
        'Request tidak memiliki signature yang valid.',
      );
    }

    // rawBody dijamin terisi oleh verify callback di main.ts useBodyParser.
    // Jika tidak ada, berarti request masuk lewat jalur non-JSON (tidak wajar
    // untuk endpoint ini) — tolak segera daripada fallback ke stringify yang
    // tidak deterministic.
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      this.logger.warn(
        `[HmacSignatureGuard] Request ditolak — rawBody tidak tersedia. ` +
          `Pastikan Content-Type: application/json dan body tidak kosong.`,
      );
      throw new ForbiddenException(
        'Request body tidak tersedia untuk verifikasi signature.',
      );
    }

    const expectedSignature = this.computeHmac(rawBody);

    const signatureBuffer = Buffer.from(signatureHeader,                    'utf-8');
    const expectedBuffer  = Buffer.from(`sha256=${expectedSignature}`, 'utf-8');

    const isValid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      this.logger.warn(
        `[HmacSignatureGuard] Request ditolak — signature tidak cocok. ` +
          `path=${request.method} ${request.url}`,
      );
      throw new ForbiddenException(
        'Signature HMAC tidak valid. Request ditolak.',
      );
    }

    return true;
  }

  private computeHmac(body: Buffer): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('hex');
  }
}