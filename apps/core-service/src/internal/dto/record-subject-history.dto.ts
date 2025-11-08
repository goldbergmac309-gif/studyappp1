import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RecordSubjectHistoryDto {
  @IsDateString()
  eventDate!: string;

  @IsString()
  eventType!: string;

  @IsOptional()
  actuals?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  comparedVersionId?: string;
}
