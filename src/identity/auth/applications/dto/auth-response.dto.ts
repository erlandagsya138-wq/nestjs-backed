// src/auth/applications/dto/auth-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({
    example:     '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID user',
    format:      'uuid',
  })
  id: string = '';

  @ApiProperty({ example: 'user@example.com', description: 'Email terdaftar' })
  email: string = '';

  @ApiPropertyOptional({
    example:     'Budi Santoso',
    nullable:    true,
    description: 'Nama lengkap user, null jika belum diisi',
  })
  fullName: string | null = null;

  @ApiProperty({
    example:     'user',
    description: 'Peran user dalam sistem',
  })
  role: string = '';
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token. Gunakan di header: `Authorization: Bearer <token>`',
    example:     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC4uLiJ9.signature',
  })
  accessToken: string = '';

  @ApiProperty({
    example:     'Bearer',
    description: 'Tipe token — selalu "Bearer"',
  })
  tokenType: string = 'Bearer';

  @ApiProperty({
    example:     '7d',
    description: 'Durasi token valid (format: NNd / NNh / NNm)',
  })
  expiresIn: string = '';

  @ApiProperty({
    type:        AuthUserDto,
    description: 'Data user yang berhasil login/register',
  })
  user: AuthUserDto = new AuthUserDto();
}
