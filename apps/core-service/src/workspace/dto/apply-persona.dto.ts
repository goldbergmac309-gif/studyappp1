import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyPersonaDto {
  @IsString()
  @IsNotEmpty()
  personaId!: string;
}
