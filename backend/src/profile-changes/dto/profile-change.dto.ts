import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class RequestProfileChangeOtpDto {
    @IsIn(['email', 'phone'])
    field: 'email' | 'phone';
}

export class SubmitProfileChangeDto {
    @IsIn(['email', 'phone'])
    field: 'email' | 'phone';

    @IsString()
    @IsNotEmpty()
    newValue: string;

    @IsString()
    @Length(4, 8)
    otp: string;
}

export class ResolveProfileChangeDto {
    @IsIn(['APPROVE', 'REJECT'])
    action: 'APPROVE' | 'REJECT';

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}
