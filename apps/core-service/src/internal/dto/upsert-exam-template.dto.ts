import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertExamTemplateDto {
  @IsOptional()
  @IsString()
  season?: string;

  // Structured plan (sections, marks, durations, distributions)
  @IsNotEmpty()
  blueprint!: Record<string, unknown>;
}
