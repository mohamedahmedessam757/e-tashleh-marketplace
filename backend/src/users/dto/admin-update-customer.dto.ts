import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Admin edit of a customer's basic profile. Sensitive fields are handled by dedicated endpoints. */
export class AdminUpdateCustomerDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(80)
    country?: string;

    @IsOptional()
    @IsString()
    @MaxLength(32)
    phone?: string;
}
