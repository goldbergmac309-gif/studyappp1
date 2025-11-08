import { AssessmentMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsBoolean,
} from 'class-validator';

class QuestionConceptHintDto {
  @IsString()
  slug: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsString()
  rationale?: string;
}

class QuestionInputDto {
  @IsInt()
  index: number;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsNumber()
  marks?: number;

  @IsOptional()
  @IsNumber()
  marksConfidence?: number;

  @IsOptional()
  @IsBoolean()
  hasNonText?: boolean;

  @IsOptional()
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsEnum(AssessmentMode)
  assessmentMode?: AssessmentMode;

  @IsOptional()
  @IsString()
  taxonomyPath?: string;

  @IsOptional()
  meta?: Record<string, unknown>;

  @IsOptional()
  solutionProfile?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionConceptHintDto)
  conceptHints?: QuestionConceptHintDto[];
}

export class UpsertQuestionsDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuestionInputDto)
  questions!: QuestionInputDto[];
}

export type QuestionInput = QuestionInputDto;
