import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  // Tiptap JSON document
  @IsOptional()
  // Accept any JSON object; validation of structure is handled by editor side
  // and by server as opaque JSON.
  content?: unknown;
}
