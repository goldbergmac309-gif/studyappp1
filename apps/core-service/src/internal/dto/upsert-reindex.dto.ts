import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';

export class ReindexChunkDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  embedding!: number[];

  @IsInt()
  @Min(0)
  @IsOptional()
  tokens?: number;
}

export class UpsertReindexDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsInt()
  @IsPositive()
  dim!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReindexChunkDto)
  chunks!: ReindexChunkDto[];
}
