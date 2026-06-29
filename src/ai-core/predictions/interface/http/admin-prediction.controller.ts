import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Query, UseFilters, UseGuards, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PredictionOrchestrator } from '../../applications/orchestrator/prediction.orchestrator';
import { AdminListPredictionsQueryDto, VerifyPredictionDto } from '../../applications/dto/admin-prediction.dto';
import { PaginatedPredictionResponseDto, PredictionResponseDto } from '../../applications/dto/prediction-response.dto';
import { PredictionExceptionFilter } from '../filters/prediction-exception.filter';
import { JwtAuthGuard } from '../../../../identity/auth/interface/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../identity/auth/interface/guards/roles.guard';
import { UserRole } from '../../../../identity/users/domains/entities/user.entity';
import { Roles } from '../../../../identity/auth/interface/decorators/roles.decorator';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Admin — Predictions')
@ApiBearerAuth('JWT')
@UseFilters(PredictionExceptionFilter)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@SkipThrottle()
@Controller('admin/predictions')
export class AdminPredictionController {
  constructor(private readonly orchestrator: PredictionOrchestrator) {}

  @Get('export')
  @ApiOperation({ summary: 'Unduh dataset terverifikasi dalam format ZIP' })
  exportDataset(@Res() res: Response): Promise<void> {
    return this.orchestrator.exportVerifiedDataset(res);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List semua prediksi (untuk Kurasi Admin)' })
  @ApiOkResponse({ type: PaginatedPredictionResponseDto })
  getAll(@Query() query: AdminListPredictionsQueryDto): Promise<PaginatedPredictionResponseDto> {
    return this.orchestrator.getAllForAdmin(query);
  }

  @Patch(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verifikasi hasil prediksi (Human-in-the-loop)' })
  @ApiOkResponse({ type: PredictionResponseDto })
  verify(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: VerifyPredictionDto,
  ): Promise<PredictionResponseDto> {
    return this.orchestrator.verify(id, dto);
  }
}