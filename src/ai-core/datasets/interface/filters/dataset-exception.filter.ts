// src/ai-core/datasets/interface/filters/dataset-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

function hasStringOrArrayMessage(
  value: unknown,
): value is { message: string | string[] } {
  if (typeof value !== 'object' || value === null) return false;
  if (!('message' in value)) return false;

  const message = (value as { message: unknown }).message;
  return (
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((m) => typeof m === 'string'))
  );
}

@Catch(HttpException)
export class DatasetExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatasetExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: unknown = exception.getResponse();
    let message: string | string[] = hasStringOrArrayMessage(exceptionResponse)
      ? exceptionResponse.message
      : exception.message;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[Datasets] SYSTEM ERROR ${req.method} ${req.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`,
      );
      message = 'Terjadi kesalahan internal pada layanan Datasets. Silakan coba lagi nanti.';
    } else {
      this.logger.warn(
        `[Datasets] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body = {
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      message,
      error:      status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : exception.name,
      module:     'datasets',
    };

    res.status(status).json(body);
  }
}
