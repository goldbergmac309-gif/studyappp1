import { IsInt, IsObject, IsOptional, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class PositionDto {
  @IsInt() @Min(0) x!: number
  @IsInt() @Min(0) y!: number
}

class SizeDto {
  @IsInt() @Min(1) width!: number
  @IsInt() @Min(1) height!: number
}

export class UpdateWidgetDto {
  @IsOptional() @ValidateNested() @Type(() => PositionDto)
  position?: PositionDto

  @IsOptional() @ValidateNested() @Type(() => SizeDto)
  size?: SizeDto

  @IsOptional() @IsObject()
  content?: Record<string, any>

  @IsOptional() @IsObject()
  style?: Record<string, any>
}
