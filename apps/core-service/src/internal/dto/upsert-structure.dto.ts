import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertStructureDto {
  @IsOptional()
  @IsString()
  schemaVersion?: string;

  @IsOptional()
  @IsInt()
  pageCount?: number;

  @IsOptional()
  @IsNumber()
  ocrConfidence?: number;

  @IsOptional()
  layout?: Record<string, unknown>;

  @IsOptional()
  outline?: Record<string, unknown>;

  @IsOptional()
  stats?: Record<string, unknown>;
}
