import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ExamDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export class GenerateExamDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  numQuestions?: number;

  @IsOptional()
  @IsEnum(ExamDifficulty)
  difficulty?: ExamDifficulty;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCitations?: boolean;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
