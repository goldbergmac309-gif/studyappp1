import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class PositionDto {
  @IsInt()
  @Min(0)
  x!: number

  @IsInt()
  @Min(0)
  y!: number
}

class SizeDto {
  @IsInt()
  @Min(1)
  width!: number

  @IsInt()
  @Min(1)
  height!: number
}

class WidgetLayoutUpdateDto {
  @IsString()
  @IsNotEmpty()
  id!: string

  @ValidateNested()
  @Type(() => PositionDto)
  position!: PositionDto

  @ValidateNested()
  @Type(() => SizeDto)
  size!: SizeDto
}

export class UpdateWorkspaceLayoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetLayoutUpdateDto)
  widgets!: WidgetLayoutUpdateDto[]
}
