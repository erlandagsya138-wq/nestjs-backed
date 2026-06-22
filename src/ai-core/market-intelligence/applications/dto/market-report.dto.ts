import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AgentRunStatus } from '../../domains/entities/agent-run-status.entity';
import { MarketPriceEntryDto } from './market-price-entry.dto';

export class MarketReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  agent_version: string = '';

  @IsString()
  @IsNotEmpty()
  run_id: string = '';

  @IsDateString()
  run_started_at: string = '';

  @IsDateString()
  run_ended_at: string = '';

  @IsEnum(AgentRunStatus, {
    message: `status harus salah satu dari: ${Object.values(AgentRunStatus).join(', ')}`,
  })
  status: AgentRunStatus = AgentRunStatus.NO_DATA;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarketPriceEntryDto)
  @ArrayMaxSize(3000, { message: 'Maksimal 3000 entri per laporan untuk mencegah overload sistem.' })
  entries: MarketPriceEntryDto[] = [];

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sources_scraped: number = 0;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  sources_failed: number = 0;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  llm_parse_errors: number = 0;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  entries_discarded: number = 0;

  @IsString()
  @IsOptional()
  error_details: string | null = null;
}