// src/shared/common/filters/global-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface GlobalErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();
    const req  = ctx.getRequest<Request>();
    const path = req?.url ?? 'unknown';

    if (res.headersSent) {
      const msg = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `[GlobalFilter] Exception setelah headers terkirim (stream aktif) — ${req?.method ?? ''} ${path}: ${msg}`,
      );
      res.end();
      return;
    }

    let status  = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Terjadi kesalahan internal. Silakan coba lagi.';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status    = exception.getStatus();
      errorName = exception.name;

      const raw = exception.getResponse();
      if (typeof raw === 'object' && raw !== null && 'message' in raw) {
        message = (raw as { message: string | string[] }).message;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Log detail internal tapi JANGAN kirim ke client
      this.logger.error(
        `[Unhandled] ${req?.method ?? ''} ${path} → ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`[Unhandled non-Error] ${path} → ${String(exception)}`);
    }

    // Untuk error 5xx, log juga (tanpa stack ke client)
    if (status >= 500 && exception instanceof HttpException) {
      this.logger.error(
        `[HTTP ${status}] ${req?.method ?? ''} ${path} → ${exception.message}`,
      );
    }

    const body: GlobalErrorBody = {
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path,
      message,
      error: errorName,
    };

    res.status(status).json(body);
  }
}