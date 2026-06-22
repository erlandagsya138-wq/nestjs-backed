// src/market-intelligence/interface/filters/market-intelligence-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface MarketIntelligenceErrorResponseBody {
  statusCode: number;
  timestamp:  string;
  path:       string;
  message:    string | string[];
  error:      string;
  module:     'market-intelligence';
}

@Catch(HttpException)
export class MarketIntelligenceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MarketIntelligenceExceptionFilter.name);

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
        `[MarketIntelligence] SYSTEM ERROR ${req.method} ${req.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`
      );
      message = 'Terjadi kesalahan internal pada layanan Market Intelligence. Silakan coba lagi.';
    } else {
      this.logger.warn(
        `[MarketIntelligence] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: MarketIntelligenceErrorResponseBody = {
      statusCode: status,
      timestamp:  new Date().toISOString(),
      path:       req.url,
      message,
      error:      exception.name,
      module:     'market-intelligence',
    };

    this.logger.warn(
      `[MarketIntelligence] ${req.method} ${req.url} → ${status}: ${JSON.stringify(message)}`,
    );

    res.status(status).json(body);
  }
}