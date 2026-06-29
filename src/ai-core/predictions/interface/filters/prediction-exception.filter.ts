// src/predictions/interface/filters/prediction-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

@Catch(HttpException)
export class PredictionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PredictionExceptionFilter.name);

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
        `[Predictions] SYSTEM ERROR ${req.method} ${req.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`
      );
      message = 'Terjadi kesalahan internal saat memproses prediksi. Silakan coba lagi nanti.';
    } else {
      this.logger.warn(
        `[${req.method}] ${req.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
      error: exception.name,
    };

    res.status(status).json(body);
  }
}