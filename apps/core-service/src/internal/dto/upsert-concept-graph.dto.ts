import { ConceptRelationType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ConceptInputDto {
  @IsString()
  slug: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  taxonomyPath?: string;

  @IsOptional()
  @IsNumber()
  masteryScore?: number;

  @IsOptional()
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsNumber()
  coverage?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

class ConceptLinkDto {
  @IsString()
  fromSlug: string;

  @IsString()
  toSlug: string;

  @IsEnum(ConceptRelationType)
  relation: ConceptRelationType;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

class QuestionReferenceDto {
  @IsOptional()
  @IsString()
  questionId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsInt()
  index?: number;
}

class QuestionConceptBindingDto {
  @ValidateNested()
  @Type(() => QuestionReferenceDto)
  question!: QuestionReferenceDto;

  @IsString()
  conceptSlug!: string;

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

class FamilyMemberDto {
  @ValidateNested()
  @Type(() => QuestionReferenceDto)
  question!: QuestionReferenceDto;

  @IsOptional()
  @IsString()
  role?: string;
}

class QuestionFamilyDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  archetype?: string;

  @IsOptional()
  @IsNumber()
  difficulty?: number;

  @IsOptional()
  @IsInt()
  frequency?: number;

  @IsOptional()
  @IsString()
  synopsis?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamilyMemberDto)
  members?: FamilyMemberDto[];
}

export class UpsertConceptGraphDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptInputDto)
  concepts?: ConceptInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConceptLinkDto)
  links?: ConceptLinkDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionConceptBindingDto)
  questionConcepts?: QuestionConceptBindingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionFamilyDto)
  families?: QuestionFamilyDto[];
}

export type ConceptInput = ConceptInputDto;
export type QuestionConceptBindingInput = QuestionConceptBindingDto;
export type QuestionReferenceInput = QuestionReferenceDto;
export type QuestionFamilyInput = QuestionFamilyDto;
export type FamilyMemberInput = FamilyMemberDto;
