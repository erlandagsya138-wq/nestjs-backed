// src/users/interface/filters/user-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
  module: 'user';
}

@Catch(HttpException)
export class UserExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UserExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
        `[Users] SYSTEM ERROR ${request.method} ${request.url} → Asli: ${JSON.stringify(message)} | Stack: ${exception.stack}`
      );
      message = 'Terjadi kesalahan internal pada layanan profil pengguna. Silakan coba lagi.';
    } else {
      this.logger.warn(
        `[Auth] ${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`,
      );
    }

    const body: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal Server Error' : exception.name,
      module: 'user',
    };

    this.logger.warn(
      `[${request.method}] ${request.url} → ${status}: ${JSON.stringify(message)}`,
    );

    response.status(status).json(body);
  }
}
