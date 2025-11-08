import { IsNotEmpty } from 'class-validator';

export class UpdateMetaDto {
  @IsNotEmpty()
  meta!: unknown;
}
