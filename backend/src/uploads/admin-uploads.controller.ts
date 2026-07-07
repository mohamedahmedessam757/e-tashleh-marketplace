import {
  BadRequestException,
  Controller,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UploadsService } from './uploads.service';
import { multerMemoryOptions } from './multer.config';

const ASSET_TYPES = new Set(['logo', 'logo-dark', 'earn-income-icon', 'nomo-document']);

@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('settings', 'edit')
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('platform-asset')
  @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
  async uploadPlatformAsset(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('assetType') assetType: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!assetType || !ASSET_TYPES.has(assetType)) {
      throw new BadRequestException('Invalid assetType');
    }
    const url = await this.uploadsService.uploadPlatformAsset(
      file,
      assetType as 'logo' | 'logo-dark' | 'earn-income-icon' | 'nomo-document',
    );
    return { url, assetType };
  }
}
