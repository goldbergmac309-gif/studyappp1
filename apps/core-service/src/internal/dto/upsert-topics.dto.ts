import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class TopicTermDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsNumber()
  @Min(0)
  score!: number;
}

export class TopicDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsNumber()
  @Min(0)
  weight!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TopicTermDto)
  terms!: TopicTermDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];
}

export class UpsertTopicsDto {
  @IsString()
  @IsNotEmpty()
  engineVersion!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TopicDto)
  topics!: TopicDto[];
}
