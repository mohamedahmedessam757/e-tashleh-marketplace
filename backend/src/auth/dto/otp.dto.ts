import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export const OTP_CHANNELS = ['email', 'whatsapp'] as const;
export type OtpChannelDto = (typeof OTP_CHANNELS)[number];

export class RegisterVerifyOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsIn(OTP_CHANNELS)
    channel: OtpChannelDto;

    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/)
    code: string;
}

export class RegisterResendOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsIn(OTP_CHANNELS)
    channel: OtpChannelDto;

    @IsOptional()
    @IsString()
    name?: string;
}

export class RegisterInitDto {
    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsIn(OTP_CHANNELS)
    channel: OtpChannelDto;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsIn(['customer', 'vendor'])
    role?: 'customer' | 'vendor';
}

export class MobileLoginResendOtpDto {
    @IsString()
    phone: string;

    /** Required so OTP is never resent for the wrong panel (customer vs merchant). */
    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class MobileLoginInitDto {
    @IsString()
    phone: string;

    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class EmailLoginInitDto {
    @IsEmail()
    email: string;

    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class EmailLoginResendOtpDto {
    @IsEmail()
    email: string;

    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';
}

export class MobileLoginVerifyDto {
    @IsString()
    phone: string;

    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/)
    code: string;

    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';

    @IsOptional()
    @IsString()
    fingerprint?: string;
}

export class EmailLoginVerifyDto {
    @IsEmail()
    email: string;

    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/)
    code: string;

    @IsIn(['customer', 'merchant'])
    role: 'customer' | 'merchant';

    @IsOptional()
    @IsString()
    fingerprint?: string;
}

export class StaffOtpDto {
    @IsEmail()
    email: string;

    @IsIn(OTP_CHANNELS)
    channel: OtpChannelDto;
}

export class StaffOtpVerifyDto {
    @IsEmail()
    email: string;

    @IsIn(OTP_CHANNELS)
    channel: OtpChannelDto;

    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/)
    code: string;
}

export class OtpVerifyDto {
    @IsString()
    phone: string;

    @IsString()
    @Length(6, 6)
    @Matches(/^\d{6}$/)
    code: string;
}
