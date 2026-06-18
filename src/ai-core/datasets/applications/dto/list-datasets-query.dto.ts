import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DatasetResponseDto } from './dataset.dto';

// ==========================================
// REQUEST (Query Params)
// ==========================================
export class ListDatasetsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  readonly page: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 50 })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  readonly limit: number = 10;
}

// ==========================================
// RESPONSE
// ==========================================
export class PaginatedDatasetResponseDto {
  @ApiProperty({ type: [DatasetResponseDto] })
  readonly data!: DatasetResponseDto[];

  @ApiProperty({ example: 5 })
  readonly total!: number;

  @ApiProperty({ example: 1 })
  readonly page!: number;

  @ApiProperty({ example: 10 })
  readonly limit!: number;

  @ApiProperty({ example: 1 })
  readonly totalPages!: number;
}