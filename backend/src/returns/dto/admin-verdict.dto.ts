import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const FINAL_REFUND_DECISIONS = ['REFUND_CUSTOMER', 'NO_CUSTOMER_REFUND'] as const;
export const REFUND_EXECUTION_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
] as const;

export type FinalRefundDecision = (typeof FINAL_REFUND_DECISIONS)[number];
export type RefundExecutionStatus = (typeof REFUND_EXECUTION_STATUSES)[number];

export class AdminVerdictExtraDto {
  @IsOptional()
  @IsString()
  faultParty?: string;

  @ValidateIf((o: AdminVerdictExtraDto) => Boolean(o.faultParty || o.adminApproval))
  @IsIn(FINAL_REFUND_DECISIONS)
  finalRefundDecision?: FinalRefundDecision;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  finalCustomerRefundAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  gatewayFeePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  refundFeePct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  shippingRoundtrip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  shippingRefund?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  calculatedNetRefund?: number;

  @IsOptional()
  @IsIn(['APPROVED', 'REJECTED'])
  adminApproval?: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  adminApprovalReason?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  adminEvidence?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adminName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  adminEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  adminSignature?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  platformRetainedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  feeBearer?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  customerStripeRefund?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  shippingCompanyLiability?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  resolutionMode?: string;

  @IsOptional()
  @IsIn(['FRAUD', 'NEGLIGENCE'])
  penaltyType?: 'FRAUD' | 'NEGLIGENCE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  penaltyAmount?: number;
}

export class AdminVerdictDto {
  @IsIn(['return', 'dispute'])
  type: 'return' | 'dispute';

  @IsIn(['REFUND', 'RELEASE_FUNDS', 'DENY'])
  verdict: 'REFUND' | 'RELEASE_FUNDS' | 'DENY';

  @IsString()
  @MaxLength(4000)
  notes: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AdminVerdictExtraDto)
  extra?: AdminVerdictExtraDto;
}
