import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminFieldReviewDto {
  /** true = admin approves verification; false = admin rejects verification.
   * Officer recommendation is ignored for system outcome. */
  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reason?: string;
}
