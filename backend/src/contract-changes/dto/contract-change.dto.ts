import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitContractChangeDto {
  @IsObject()
  @IsNotEmpty()
  newSecondPartyData: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  newSignatureData?: Record<string, unknown>;
}

export class ResolveContractChangeDto {
  @IsString()
  @IsNotEmpty()
  action: 'APPROVE' | 'REJECT';

  @IsString()
  @IsNotEmpty()
  adminSignature: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  rejectionReason?: string;
}
