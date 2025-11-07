import { ArrayNotEmpty, IsArray, IsString } from 'class-validator'

export class CreateInsightSessionDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  documentIds!: string[]
}
