import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ReportClientErrorDto {
  @IsUUID()
  correlationId!: string;

  @IsString()
  @MaxLength(200)
  errorName!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  componentStack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pagePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageLabel?: string;

  @IsOptional()
  @IsEnum(['GUEST', 'CUSTOMER', 'MERCHANT', 'ADMIN'])
  userRole?: 'GUEST' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

  @IsOptional()
  @IsString()
  @MaxLength(8)
  locale?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  httpStatus?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestPath?: string;

  @IsOptional()
  @IsEnum(['mobile', 'tablet', 'desktop', 'unknown'])
  deviceClass?: 'mobile' | 'tablet' | 'desktop' | 'unknown';

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
