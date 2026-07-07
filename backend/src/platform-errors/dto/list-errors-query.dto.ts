import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPlatformErrorsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['CLIENT', 'API', 'UNHANDLED'])
  source?: 'CLIENT' | 'API' | 'UNHANDLED';

  @IsOptional()
  @IsEnum(['INFO', 'WARN', 'ERROR', 'FATAL'])
  severity?: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

  @IsOptional()
  @IsEnum(['GUEST', 'CUSTOMER', 'MERCHANT', 'ADMIN'])
  userRole?: 'GUEST' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN';

  @IsOptional()
  @IsEnum(['mobile', 'tablet', 'desktop', 'unknown'])
  deviceClass?: string;

  @IsOptional()
  @IsString()
  resolved?: 'true' | 'false';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @IsOptional()
  @IsString()
  stackFingerprint?: string;
}
