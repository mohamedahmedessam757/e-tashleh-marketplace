import { IsIn, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

/** Validated body for customer/merchant withdrawal requests. Blocks negative/NaN/overflow amounts. */
export class WithdrawalRequestDto {
    @IsNumber({ allowNaN: false, allowInfinity: false })
    @IsPositive()
    @Min(0.01)
    @Max(1_000_000)
    amount: number;

    @IsOptional()
    @IsIn(['BANK_TRANSFER', 'STRIPE', 'STRIPE_CONNECT', 'MANUAL'])
    payoutMethod?: string;
}
