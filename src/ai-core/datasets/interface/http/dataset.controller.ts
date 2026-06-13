// src/ai-core/datasets/interface/http/dataset.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { DatasetOrchestrator } from '../../applications/orchestrator/dataset.orchestrator';
import {
  AddPredictionToDatasetDto,
  BulkAddByConfidenceDto,
  BulkAddResultDto,
  CreateDatasetDto,
  DatasetItemResponseDto,
  DatasetResponseDto,
  ListDatasetsQueryDto,
  PaginatedDatasetResponseDto,
} from '../../applications/dto/dataset.dto';
import { DatasetExceptionFilter } from '../filters/dataset-exception.filter';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';

@ApiTags('Admin — Datasets')
@ApiBearerAuth('JWT')
@Controller('admin/datasets')
@UseFilters(DatasetExceptionFilter)
@UseGuards(JwtAuthGuard)
export class DatasetController {
  constructor(private readonly orchestrator: DatasetOrchestrator) {}

  // ── POST /admin/datasets ───────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:     'Buat dataset baru',
    description:
      'Membuat dataset baru dengan status DRAFT. ' +
      'Dataset siap menerima predictions setelah dibuat.',
    operationId: 'datasetsCreate',
  })
  @ApiCreatedResponse({
    type:        DatasetResponseDto,
    description: 'Dataset berhasil dibuat.',
  })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid.' })
  create(@Body() dto: CreateDatasetDto): Promise<DatasetResponseDto> {
    return this.orchestrator.create(dto);
  }

  // ── GET /admin/datasets ────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'List semua dataset',
    description: 'Mengambil daftar semua dataset dengan pagination.',
    operationId: 'datasetsList',
  })
  @ApiOkResponse({
    type:        PaginatedDatasetResponseDto,
    description: 'Daftar dataset berhasil diambil.',
  })
  list(@Query() query: ListDatasetsQueryDto): Promise<PaginatedDatasetResponseDto> {
    return this.orchestrator.list(query);
  }

  // ── GET /admin/datasets/:id ────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Detail dataset',
    description:
      'Mengambil detail dataset beserta semua items, confidence summary, ' +
      'dan data prediction masing-masing item.',
    operationId: 'datasetsGetById',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type:        DatasetResponseDto,
    description: 'Detail dataset berhasil diambil.',
  })
  @ApiNotFoundResponse({ description: 'Dataset tidak ditemukan.' })
  getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DatasetResponseDto> {
    return this.orchestrator.getById(id);
  }

  // ── DELETE /admin/datasets/:id ─────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:     'Hapus dataset',
    description:
      'Menghapus dataset beserta semua items-nya. ' +
      'Dataset berstatus PROCESSING tidak dapat dihapus. ' +
      '**Prediction yang ada di dalam dataset tidak ikut terhapus.**',
    operationId: 'datasetsDelete',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Dataset berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Dataset tidak ditemukan.' })
  @ApiConflictResponse({ description: 'Dataset sedang dalam proses export.' })
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.orchestrator.delete(id);
  }

  // ── POST /admin/datasets/:id/items ────────────────────────────────────────

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:     'Tambah prediction ke dataset (manual)',
    description:
      'Menambahkan satu prediction ke dataset secara manual. ' +
      'Prediction harus berstatus SUCCESS dan memiliki confidence score. ' +
      'Opsional: sertakan `confidenceThreshold` untuk menolak prediction ' +
      'yang confidence score-nya di bawah ambang batas.',
    operationId: 'datasetsAddItem',
  })
  @ApiParam({ name: 'id', description: 'UUID dataset', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    type:        DatasetItemResponseDto,
    description: 'Prediction berhasil ditambahkan.',
  })
  @ApiNotFoundResponse({ description: 'Dataset atau prediction tidak ditemukan.' })
  @ApiConflictResponse({ description: 'Prediction sudah ada di dataset ini.' })
  @ApiUnprocessableEntityResponse({
    description:
      'Dataset tidak editable, prediction tidak eligible, ' +
      'atau confidence score di bawah threshold.',
  })
  addItem(
    @Param('id', new ParseUUIDPipe({ version: '4' })) datasetId: string,
    @Body() dto: AddPredictionToDatasetDto,
  ): Promise<DatasetItemResponseDto> {
    return this.orchestrator.addItem(datasetId, dto);
  }

  // ── POST /admin/datasets/:id/items/bulk ───────────────────────────────────

  @Post(':id/items/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Bulk tambah predictions berdasarkan confidence threshold',
    description:
      'Secara otomatis menambahkan semua prediction SUCCESS ' +
      'yang confidence score-nya >= `confidenceThreshold`. ' +
      'Prediction yang sudah ada di dataset akan dilewati (tidak error). ' +
      'Opsional: filter berdasarkan `varietyCode` untuk menambahkan ' +
      'hanya varietas tertentu.',
    operationId: 'datasetsAddItemsBulk',
  })
  @ApiParam({ name: 'id', description: 'UUID dataset', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type:        BulkAddResultDto,
    description: 'Bulk add selesai. Lihat `added` dan `skipped` untuk detail.',
  })
  @ApiNotFoundResponse({ description: 'Dataset tidak ditemukan.' })
  @ApiUnprocessableEntityResponse({ description: 'Dataset tidak editable.' })
  bulkAddByConfidence(
    @Param('id', new ParseUUIDPipe({ version: '4' })) datasetId: string,
    @Body() dto: BulkAddByConfidenceDto,
  ): Promise<BulkAddResultDto> {
    return this.orchestrator.bulkAddByConfidence(datasetId, dto);
  }

  // ── DELETE /admin/datasets/:id/items/:itemId ──────────────────────────────

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:     'Hapus prediction dari dataset',
    description:
      'Menghapus satu item dari dataset. ' +
      '**Prediction itu sendiri tidak ikut terhapus.**',
    operationId: 'datasetsRemoveItem',
  })
  @ApiParam({ name: 'id',     description: 'UUID dataset',      type: 'string', format: 'uuid' })
  @ApiParam({ name: 'itemId', description: 'UUID dataset item', type: 'string', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Item berhasil dihapus dari dataset.' })
  @ApiNotFoundResponse({ description: 'Dataset atau item tidak ditemukan.' })
  @ApiUnprocessableEntityResponse({ description: 'Dataset tidak editable.' })
  removeItem(
    @Param('id',     new ParseUUIDPipe({ version: '4' })) datasetId: string,
    @Param('itemId', new ParseUUIDPipe({ version: '4' })) itemId:    string,
  ): Promise<void> {
    return this.orchestrator.removeItem(datasetId, itemId);
  }

  // ── POST /admin/datasets/:id/export ───────────────────────────────────────

  @Post(':id/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Trigger export dataset',
    description:
      'Memulai proses export dataset ke file ZIP. ' +
      'File berisi metadata (JSON atau CSV sesuai `exportFormat`) ' +
      'dan manifest URL gambar. ' +
      'Setelah selesai, `status` berubah ke `READY` dan ' +
      '`exportUrl` berisi URL download.\n\n' +
      '**Dataset harus berstatus DRAFT dan memiliki minimal 1 item.**',
    operationId: 'datasetsExport',
  })
  @ApiParam({ name: 'id', description: 'UUID dataset', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    type:        DatasetResponseDto,
    description: 'Export berhasil. `exportUrl` berisi link download.',
  })
  @ApiNotFoundResponse({ description: 'Dataset tidak ditemukan.' })
  @ApiUnprocessableEntityResponse({
    description: 'Dataset tidak editable atau tidak memiliki item.',
  })
  export(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DatasetResponseDto> {
    return this.orchestrator.export(id);
  }
}