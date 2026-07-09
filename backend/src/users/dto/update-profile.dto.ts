import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-service profile update. Only non-sensitive fields are accepted here.
 * Phone/email changes MUST go through the OTP-gated profile-change / recovery flow
 * (see profile-changes module + auth/recovery) — never via a plain bearer token.
 */
export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2048)
    avatar?: string;
}
