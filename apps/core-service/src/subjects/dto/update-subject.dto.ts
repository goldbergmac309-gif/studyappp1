import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  IsBoolean,
} from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseCode?: string;

  @IsOptional()
  @IsString()
  professorName?: string;

  @IsOptional()
  @IsString()
  ambition?: string;

  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex code.',
  })
  color?: string;

  @IsOptional()
  @IsBoolean()
  starred?: boolean;
}
