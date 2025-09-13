import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAnalysisDto {
  @IsString()
  @IsNotEmpty()
  engineVersion!: string;

  // We accept any JSON payload; structure is validated on the oracle side.
  // Using unknown here; Nest + class-validator won't enforce deep checks.
  @IsNotEmpty()
  resultPayload!: unknown;
}
