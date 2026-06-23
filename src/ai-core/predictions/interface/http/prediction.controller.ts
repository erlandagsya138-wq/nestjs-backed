// src/ai-core/predictions/interface/http/prediction.controller.ts
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
  UnprocessableEntityException,
  Header,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiServiceUnavailableResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { PredictionOrchestrator } from '../../applications/orchestrator/prediction.orchestrator';
import {
  PaginatedPredictionResponseDto,
  PredictionResponseDto,
} from '../../applications/dto/prediction-response.dto';
import { FindPredictionsQueryDto } from '../../applications/dto/find-predictions-query.dto';
import { PredictionExceptionFilter } from '../filters/prediction-exception.filter';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../identity/auth/interface/decorators/current-user.decorator';
import { PaginatedMobilePredictionResponseDto } from '../../applications/orchestrator/prediction.orchestrator';

const memoryStorage = multer.memoryStorage();

@ApiTags('Predictions')
@ApiBearerAuth('JWT')
@Controller('predictions')
@UseFilters(PredictionExceptionFilter)
@UseGuards(JwtAuthGuard)
export class PredictionController {
  private readonly logger = new Logger(PredictionController.name);

  constructor(private readonly orchestrator: PredictionOrchestrator) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage,
      limits: {
        fileSize: 10 * 1024 * 1024,
        files:    1,
      },
    }),
  )
  @ApiOperation({
    summary:     'Buat prediksi baru (upload + predict dalam 1 request)',
    description:
      '**Upload gambar dan prediksi dalam satu request.**\n\n' +
      'Backend akan:\n' +
      '1. Upload dan simpan gambar ke storage\n' +
      '2. Mencatat file ke database (`stored_files`)\n' +
      '3. Membuat record prediksi (`predictions`)\n' +
      '4. Mengirim ke AI untuk dianalisis\n' +
      '5. Mengembalikan hasil prediksi\n\n' +
      '**Format file:** JPG, PNG, WebP\n\n' +
      '**Ukuran maksimum:** 5MB\n\n' +
      '`userId` diambil otomatis dari JWT.',
    operationId: 'predictionsCreate',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File gambar durian (JPG/PNG/WebP, maks 5MB)',
    schema: {
      type:     'object',
      required: ['file'],
      properties: {
        file: {
          type:        'string',
          format:      'binary',
          description: 'File gambar durian yang akan diklasifikasi',
        },
      },
    },
  })
  @ApiCreatedResponse({
    type:        PredictionResponseDto,
    description: 'Prediksi berhasil diproses.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid atau expired.' })
  @ApiUnprocessableEntityResponse({
    description: 'File tidak ada atau format tidak didukung (bukan JPG/PNG/WebP).',
  })
  @ApiPayloadTooLargeResponse({
    description: 'Ukuran file melebihi batas 5MB.',
  })
  @ApiServiceUnavailableResponse({
    description: 'AI service sedang offline atau model belum siap.',
  })
  create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser('sub') authenticatedUserId: string,
  ): Promise<PredictionResponseDto> {
    if (!authenticatedUserId?.trim()) {
      this.logger.error(
        '[PredictionController] authenticatedUserId kosong dari @CurrentUser("sub").',
      );
      throw new InternalServerErrorException(
        'Gagal mengidentifikasi user dari token. Coba logout dan login kembali.',
      );
    }

    if (!file) {
      throw new UnprocessableEntityException(
        'File gambar wajib disertakan dalam request.',
      );
    }

    this.logger.debug(
      `[PredictionController] create → userId=${authenticatedUserId}, ` +
      `file=${file.originalname} (${file.size} bytes)`,
    );

    return this.orchestrator.create(file, authenticatedUserId);
  }

  // ── List my predictions ────────────────────────────────────────────────────

  @Get('user/me')
  @Header('Cache-Control', 'private, max-age=60')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Daftar prediksi saya',
    description: 'Mengambil semua prediksi milik user yang sedang login dengan pagination.',
    operationId: 'predictionsGetMyList',
  })
  @ApiQuery({ name: 'page',  type: Number, required: false, example: 1  })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiOkResponse({ type: PaginatedPredictionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid.' })
  getAllByUser(
    @CurrentUser('sub') authenticatedUserId: string,
    @Query() query: FindPredictionsQueryDto,
  ): Promise<PaginatedMobilePredictionResponseDto> {
    if (!authenticatedUserId?.trim()) {
      throw new InternalServerErrorException(
        'Gagal mengidentifikasi user dari token. Coba logout dan login kembali.',
      );
    }
    return this.orchestrator.getAllByUser(authenticatedUserId, query);
  }

  // ── Get by ID ──────────────────────────────────────────────────────────────

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Detail prediksi',
    description: 'Mengambil detail prediksi berdasarkan ID. **Hanya bisa mengakses prediksi milik sendiri.**',
    operationId: 'predictionsGetById',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({ type: PredictionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid.' })
  @ApiNotFoundResponse({ description: 'Prediksi tidak ditemukan.' })
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('sub') requestingUserId: string,
  ): Promise<PredictionResponseDto> {
    if (!requestingUserId?.trim()) {
      throw new InternalServerErrorException(
        'Gagal mengidentifikasi user dari token. Coba logout dan login kembali.',
      );
    }
    return this.orchestrator.getById(id, requestingUserId);
  }
}