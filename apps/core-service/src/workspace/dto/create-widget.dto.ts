import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  @IsInt() @Min(0) x!: number;
  @IsInt() @Min(0) y!: number;
}

class SizeDto {
  @IsInt() @Min(1) width!: number;
  @IsInt() @Min(1) height!: number;
}

export class CreateWidgetDto {
  @IsString()
  @IsNotEmpty()
  type!: string; // validate in service against enum

  @ValidateNested()
  @Type(() => PositionDto)
  position!: PositionDto;

  @ValidateNested()
  @Type(() => SizeDto)
  size!: SizeDto;

  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @IsOptional()
  @IsObject()
  style?: Record<string, any>;
}
