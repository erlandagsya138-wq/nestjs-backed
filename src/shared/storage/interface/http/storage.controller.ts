// src/storage/interface/http/storage.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiBadRequestResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { StorageOrchestrator } from '../../applications/orchestrator/storage.orchestrator';
import { UploadFileDto } from '../../applications/dto/upload-file.dto';
import { StorageResponseDto } from '../../applications/dto/storage-response.dto';
import { StorageExceptionFilter } from '../filters/storage-exception.filter';
import { FileUploadInterceptor } from '../interceptors/file-upload.interceptor';
import { FileSizeGuard } from '../guards/file-size.guard';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../identity/auth/interface/decorators/current-user.decorator';

/** Karakter yang diizinkan dalam fileKey hasil decode base64 */
const SAFE_FILEKEY_PATTERN = /^[a-zA-Z0-9/_\-\.]+$/;

function isSafeFileKey(key: string): boolean {
  if (!key || key.trim().length === 0) return false;
  if (key.includes('..') || key.includes('//')) return false;
  if (key.startsWith('/') || key.startsWith('\\')) return false;
  return SAFE_FILEKEY_PATTERN.test(key);
}

@ApiTags('Storage')
@ApiBearerAuth('JWT')
@Controller('storage')
@UseFilters(StorageExceptionFilter)
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly orchestrator: StorageOrchestrator) {}

  // ── Upload ─────────────────────────────────────────────────────────────────

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(FileSizeGuard)
  @UseInterceptors(FileUploadInterceptor)
  @ApiOperation({
    summary: 'Upload gambar durian',
    description:
      'Upload file gambar untuk digunakan dalam prediksi.\n\n' +
      '**Format yang didukung:** JPG, PNG, WebP\n\n' +
      '**Ukuran maksimum:** 5MB\n\n' +
      '**Flow penggunaan:**\n' +
      '1. Upload gambar di sini → dapatkan `imageUrl`\n' +
      '2. Gunakan `imageUrl` tersebut di `POST /api/v1/predictions`\n\n' +
      '`userId` diambil otomatis dari JWT — tidak perlu dikirim di body.\n\n' +
      'File disimpan di path: `{context}/{userId}/{uuid}.{ext}`',
    operationId: 'storageUpload',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File gambar wajib disertakan. `context` dan `provider` bersifat opsional.',
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type:        'string',
          format:      'binary',
          description: 'File gambar (JPG/PNG/WebP, maks 5MB)',
        },
        context: {
          type:        'string',
          example:     'predictions',
          description: 'Sub-folder penyimpanan. Default: `general`',
        },
        provider: {
          type:        'string',
          enum:        ['local', 's3'],
          example:     'local',
          description: 'Storage provider. Default mengikuti env `STORAGE_PROVIDER`',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type:        StorageResponseDto,
    description: 'File berhasil diupload. Gunakan `imageUrl` untuk membuat prediksi.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid.' })
  @ApiUnprocessableEntityResponse({
    description: 'File tidak ada, format tidak didukung (bukan JPG/PNG/WebP), atau ukuran melebihi 5MB.',
    schema: {
      example: {
        statusCode: 422,
        message: "Tipe file 'image/gif' tidak didukung. Gunakan: image/jpeg, image/png, image/webp",
        error: 'UnprocessableEntityException',
        module: 'storage',
      },
    },
  })
  @ApiPayloadTooLargeResponse({
    description: 'Ukuran file melebihi batas 5MB.',
    schema: { example: { statusCode: 413, message: 'Ukuran file 6.50MB melebihi batas maksimum 5MB', error: 'PayloadTooLargeException', module: 'storage' } },
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadFileDto,
    @CurrentUser('sub') authenticatedUserId: string,
  ): Promise<StorageResponseDto> {
    return this.orchestrator.upload(file, dto, authenticatedUserId);
  }
}
