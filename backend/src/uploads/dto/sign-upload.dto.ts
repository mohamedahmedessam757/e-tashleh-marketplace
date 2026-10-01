import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MIME_EXT, UPLOAD_PURPOSES, UploadPurpose } from '../upload-policy';

export class SignUploadDto {
    @IsIn(UPLOAD_PURPOSES as unknown as string[])
    purpose: UploadPurpose;

    @IsIn(Object.keys(MIME_EXT))
    contentType: string;

    @IsInt()
    @Min(1)
    @Max(52428800)
    size: number;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    folder?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    orderId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    chatId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    violationId?: string;
}

export class ConfirmUploadDto {
    @IsIn(UPLOAD_PURPOSES as unknown as string[])
    purpose: UploadPurpose;

    @IsString()
    @MaxLength(512)
    path: string;
}
