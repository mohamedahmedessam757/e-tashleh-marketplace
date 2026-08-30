import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Length,
    IsIn,
    IsOptional,
    MinLength,
} from 'class-validator';

export class RecoveryRoleDto {
    @IsString()
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class LostPhoneStartDto extends RecoveryRoleDto {
    /** Accessible registered email — used to identify the account */
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class LostPhoneVerifyProofDto extends RecoveryRoleDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string;
}

export class LostPhoneRequestNewDto extends RecoveryRoleDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    newPhone: string;

    @IsOptional()
    @IsString()
    newCountryCode?: string;
}

export class LostPhoneConfirmDto extends LostPhoneRequestNewDto {
    @IsString()
    @Length(6, 6)
    phoneOtp: string;
}

export class LostEmailStartDto extends RecoveryRoleDto {
    /** Accessible registered phone — used to identify the account */
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsOptional()
    @IsString()
    countryCode?: string;
}

export class LostEmailVerifyProofDto extends RecoveryRoleDto {
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsOptional()
    @IsString()
    countryCode?: string;

    @IsString()
    @Length(6, 6)
    otp: string;
}

export class LostEmailRequestNewDto extends RecoveryRoleDto {
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsOptional()
    @IsString()
    countryCode?: string;

    @IsEmail()
    @IsNotEmpty()
    newEmail: string;
}

export class LostEmailConfirmDto extends LostEmailRequestNewDto {
    @IsString()
    @Length(6, 6)
    emailOtp: string;
}

export class LostBothSubmitDto extends RecoveryRoleDto {
    @IsString()
    @IsNotEmpty()
    oldPhone: string;

    @IsOptional()
    @IsString()
    countryCode?: string;

    @IsEmail()
    @IsNotEmpty()
    oldEmail: string;
}

export class LostBothRequestOtpsDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(32)
    resumeToken: string;

    @IsString()
    @IsNotEmpty()
    newPhone: string;

    @IsOptional()
    @IsString()
    newCountryCode?: string;

    @IsEmail()
    @IsNotEmpty()
    newEmail: string;
}

export class LostBothCompleteDto extends LostBothRequestOtpsDto {
    @IsString()
    @Length(6, 6)
    phoneOtp: string;

    @IsString()
    @Length(6, 6)
    emailOtp: string;
}

export class AdminResolveRecoveryDto {
    @IsString()
    @IsNotEmpty()
    requestId: string;

    @IsString()
    @IsIn(['APPROVE', 'REJECT'])
    action: 'APPROVE' | 'REJECT';

    @IsOptional()
    @IsString()
    rejectionReason?: string;
}

export class AdminFreezeUserDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsOptional()
    @IsString()
    note?: string;
}

/** @deprecated legacy DTOs — kept for thin wrappers during cutover */
export class RequestEmailOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class VerifyEmailOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @Length(6, 6)
    otp: string;

    @IsString()
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class RequestPhoneOtpDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    newPhone: string;

    @IsString()
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class SubmitRecoveryDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    newPhone: string;

    @IsString()
    @Length(6, 6)
    phoneOtp: string;

    @IsString()
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}
