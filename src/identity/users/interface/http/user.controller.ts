// src/users/interface/http/user.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseFilters,
  UseGuards,
  Header,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UserOrchestrator } from '../../applications/orchestrator/user.orchestrator';
import { UpdateUserDto } from '../../applications/dto/update-user.dto';
import { UserResponseDto } from '../../applications/dto/user-response.dto';
import { UserExceptionFilter } from '../filters/user-exception.filter';
import { JwtAuthGuard } from '../../../auth/interface/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/interface/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
@UseFilters(UserExceptionFilter)
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly orchestrator: UserOrchestrator) {}

  // ── GET /users/me ──────────────────────────────────────────────────────────

  @Get('me')
  @Header('Cache-Control', 'private, max-age=60')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Lihat profil saya',
    description: 'Mengambil data profil user yang sedang login berdasarkan JWT token.',
    operationId: 'usersGetMe',
  })
  @ApiOkResponse({ type: UserResponseDto, description: 'Data profil berhasil diambil.' })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  getMe(
    @CurrentUser('sub') userId: string,
  ): Promise<UserResponseDto> {
    return this.orchestrator.getById(userId);
  }

  // ── GET /users/:id ─────────────────────────────────────────────────────────

  @Get(':id')
  @Header('Cache-Control', 'private, max-age=60')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Lihat profil berdasarkan ID',
    description:
      'Mengambil data profil user berdasarkan UUID.\n\n' +
      '**Hanya bisa mengakses profil milik sendiri** (ID harus cocok dengan JWT).\n\n' +
      'Untuk melihat profil sendiri lebih praktis gunakan `GET /api/v1/users/me`.',
    operationId: 'usersGetById',
  })
  @ApiParam({
    name:        'id',
    type:        'string',
    format:      'uuid',
    description: 'UUID user yang sama dengan userId di JWT',
    example:     '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: UserResponseDto, description: 'Profil user berhasil diambil.' })
  @ApiUnauthorizedResponse({ description: 'Token tidak ada atau tidak valid.' })
  @ApiForbiddenResponse({
    description: 'Tidak boleh mengakses profil user lain.',
    schema: { example: { statusCode: 403, message: 'Anda tidak memiliki izin untuk mengakses profil user lain.', error: 'ForbiddenException' } },
  })
  @ApiNotFoundResponse({
    description: 'User tidak ditemukan.',
    schema: { example: { statusCode: 404, message: "User dengan id 'xxx' tidak ditemukan", error: 'NotFoundException' } },
  })
  async getById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('sub') requestingUserId: string,
  ): Promise<UserResponseDto> {
    if (id !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengakses profil user lain.',
      );
    }
    return this.orchestrator.getById(id);
  }

  // ── PATCH /users/:id ───────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Update profil',
    description:
      'Update nama lengkap dan/atau password.\n\n' +
      '**Hanya bisa mengubah profil milik sendiri.**\n\n' +
      'Untuk ganti password, wajib kirim `currentPassword` dan `newPassword` bersamaan.\n\n' +
      '```json\n' +
      '{\n' +
      '  "fullName": "Nama Baru",\n' +
      '  "currentPassword": "OldPass123",\n' +
      '  "newPassword": "NewPass456"\n' +
      '}\n' +
      '```',
    operationId: 'usersUpdate',
  })
  @ApiParam({
    name:        'id',
    type:        'string',
    format:      'uuid',
    description: 'UUID user yang sama dengan userId di JWT',
    example:     '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ type: UserResponseDto, description: 'Profil berhasil diperbarui.' })
  @ApiUnauthorizedResponse({ description: 'Token tidak valid, atau currentPassword salah.' })
  @ApiForbiddenResponse({ description: 'Tidak boleh mengubah profil user lain.' })
  @ApiNotFoundResponse({ description: 'User tidak ditemukan.' })
  @ApiBadRequestResponse({ description: 'Validasi gagal — field tidak sesuai ketentuan.' })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') requestingUserId: string,
  ): Promise<UserResponseDto> {
    if (id !== requestingUserId) {
      throw new ForbiddenException(
        'Anda tidak memiliki izin untuk mengubah profil user lain.',
      );
    }
    return this.orchestrator.update(id, dto, requestingUserId);
  }
}
