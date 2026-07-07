import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class SettingsAuditDto {
  @IsNotEmpty()
  value: unknown;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsString()
  @IsNotEmpty()
  adminSignature: string;

  @IsOptional()
  @IsIn(['DRAWN', 'TYPED'])
  adminSignatureType?: 'DRAWN' | 'TYPED';
}

export class UpdateStaticPageDto extends SettingsAuditDto {
  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  contentAr?: string;

  @IsOptional()
  @IsString()
  contentEn?: string;

  @IsOptional()
  isPublished?: boolean;
}

export class ToggleAdminStatusDto {
  @IsNotEmpty()
  isActive: boolean;

  @IsString()
  @MinLength(10)
  reason: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsString()
  @IsNotEmpty()
  adminSignature: string;

  @IsOptional()
  @IsIn(['DRAWN', 'TYPED'])
  adminSignatureType?: 'DRAWN' | 'TYPED';
}
