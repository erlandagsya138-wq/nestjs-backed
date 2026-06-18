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

interface DatasetErrorResponseBody {
  statusCode: number;
  timestamp:  string;
  path:       string;
  message:    string | string[];
  error:      string;
  module:     'datasets';
}

/** Type guard untuk shape standar NestJS HttpException response body */
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
    const message: string | string[] = hasStringOrArrayMessage(exceptionResponse)
      ? exceptionResponse.message
      : exception.message;

    const body: DatasetErrorResponseBody = {
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      message,
      error:      exception.name,
      module:     'datasets',
    };

    this.logger.warn(
      `[Datasets] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
    );

    res.status(status).json(body);
  }
}
