// src/ai-integration/interface/filters/ai-integration-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface AiErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  module: 'ai-integration';
}

@Catch(HttpException)
export class AiIntegrationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AiIntegrationExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    let message =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? (exceptionResponse as { message: string | string[] }).message
        : exception.message;

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[AI Integration] SYSTEM ERROR ${req.method} ${req.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`
      );
      message = 'Terjadi kesalahan internal pada server AI. Silakan coba lagi nanti.';
    } else {
      this.logger.warn(
        `[AI Integration] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: AiErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : exception.name,
      module: 'ai-integration',
    };

    res.status(status).json(body);
  }
}