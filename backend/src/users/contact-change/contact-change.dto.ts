import { IsIn, IsString, MinLength, MaxLength } from 'class-validator';

export class ContactChangeInitDto {
    @IsIn(['email', 'phone'])
    field!: 'email' | 'phone';

    @IsString()
    @MinLength(3)
    @MaxLength(254)
    newValue!: string;
}

export class ContactChangeVerifyDto {
    @IsIn(['email', 'phone'])
    field!: 'email' | 'phone';

    @IsString()
    @MinLength(3)
    @MaxLength(254)
    newValue!: string;

    @IsString()
    @MinLength(4)
    @MaxLength(8)
    otp!: string;
}
