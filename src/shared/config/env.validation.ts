// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  // ── Application ─────────────────────────────────────────────
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsUrl(
    { require_tld: false },
    { message: 'APP_BASE_URL harus berupa URL yang valid' },
  )
  @IsNotEmpty({ message: 'APP_BASE_URL wajib diisi' })
  APP_BASE_URL: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  // ── Database (MySQL) ─────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'DB_HOST wajib diisi' })
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 3306;

  @IsString()
  @IsNotEmpty({ message: 'DB_USERNAME wajib diisi' })
  DB_USERNAME: string = 'root';

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = '';

  @IsString()
  @IsNotEmpty({ message: 'DB_DATABASE wajib diisi' })
  DB_DATABASE: string = 'capstone_project_db';

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  DB_CONNECTION_LIMIT: number = 10;

  // ── AI Microservice (FastAPI) ────────────────────────────────
  @IsUrl(
    { require_tld: false },
    { message: 'FASTAPI_BASE_URL harus berupa URL yang valid' },
  )
  @IsNotEmpty({ message: 'FASTAPI_BASE_URL wajib diisi' })
  FASTAPI_BASE_URL: string = 'http://localhost:8000';

  @IsString()
  @IsNotEmpty({ message: 'FASTAPI_API_KEY wajib diisi' })
  FASTAPI_API_KEY: string = 'your_fastapi_secret_key';

  // ── JWT ──────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET wajib diisi' })
  @MinLength(32, {
    message: 'JWT_SECRET minimal 32 karakter untuk keamanan HS256',
  })
  JWT_SECRET: string = 'your_super_secret_jwt_key_min_32_chars_here!!';

  @IsString()
  @IsNotEmpty({ message: 'JWT_EXPIRES_IN wajib diisi' })
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty({ message: 'JWT_ISSUER wajib diisi' })
  JWT_ISSUER: string = 'capstone-backend';

  @IsString()
  @IsNotEmpty({ message: 'JWT_AUDIENCE wajib diisi' })
  JWT_AUDIENCE: string = 'capstone-client';

  // ── Storage ──────────────────────────────────────────────────
  @IsString()
  @IsOptional()
  STORAGE_PROVIDER: string = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_DIR: string = 'uploads';

  // ── Market Intelligence ──────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'NESTJS_INTERNAL_API_KEY wajib diisi' })
  @MinLength(32, {
    message: 'NESTJS_INTERNAL_API_KEY minimal 32 karakter untuk keamanan HMAC-SHA256',
  })
  NESTJS_INTERNAL_API_KEY: string = 'change_me_min_32_chars_internal_api_key!!';

  // ── Throttler ────────────────────────────────────────────────
  @IsNumber()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_DEFAULT: number = 60_000;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_DEFAULT: number = 100;

  @IsNumber()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_STRICT: number = 60_000;

  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_STRICT: number = 10;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('\n');

    throw new Error(`❌ Environment validation failed:\n${messages}`);
  }

  if (
    validatedConfig.NODE_ENV === Environment.Production &&
    (!validatedConfig.ALLOWED_ORIGINS ||
      validatedConfig.ALLOWED_ORIGINS.trim().length === 0)
  ) {
    throw new Error(
      '❌ Environment validation failed:\n' +
        'ALLOWED_ORIGINS wajib diisi saat NODE_ENV=production.',
    );
  }

  return validatedConfig;
}