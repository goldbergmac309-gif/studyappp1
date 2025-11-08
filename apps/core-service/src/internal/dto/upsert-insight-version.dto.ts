import { InsightVersionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertInsightVersionDto {
  @IsOptional()
  @IsString()
  versionId?: string;

  @IsOptional()
  version?: number;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(InsightVersionStatus)
  status?: InsightVersionStatus;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  forecast?: Record<string, unknown>;

  @IsOptional()
  diffs?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  @IsOptional()
  @IsString()
  progressStage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  progressRatio?: number;
}
