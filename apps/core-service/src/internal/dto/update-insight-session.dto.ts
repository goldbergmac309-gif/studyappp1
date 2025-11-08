import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum InsightSessionStatusDto {
  PENDING = 'PENDING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export class UpdateInsightSessionDto {
  @IsEnum(InsightSessionStatusDto)
  @IsNotEmpty()
  status!: InsightSessionStatusDto;

  // Arbitrary JSON result body produced by oracle worker
  @IsOptional()
  result?: unknown;
}
