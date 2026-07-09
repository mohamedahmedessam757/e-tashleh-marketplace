import { IsIn, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Validated body for admin financial adjustments (credit/debit). */
export class CreateFinancialAdjustmentDto {
    @IsIn(['CREDIT', 'DEBIT'])
    type: 'CREDIT' | 'DEBIT';

    @IsNumber({ allowNaN: false, allowInfinity: false })
    @IsPositive()
    @Min(0.01)
    @Max(1_000_000)
    amount: number;

    @IsString()
    @MinLength(3)
    @MaxLength(500)
    reason: string;

    @IsOptional()
    @IsString()
    invoiceId?: string;

    @IsOptional()
    @IsString()
    orderId?: string;

    @IsOptional()
    @IsString()
    targetUserId?: string;

    @IsOptional()
    @IsString()
    targetStoreId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(8)
    currency?: string;
}
