import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject name cannot be empty.' })
  @MaxLength(100, { message: 'Subject name cannot be longer than 100 characters.' })
  name: string;
}
