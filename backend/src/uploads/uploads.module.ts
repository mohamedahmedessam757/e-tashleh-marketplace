import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AdminUploadsController } from './admin-uploads.controller';
import { UploadsService } from './uploads.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [UploadsController, AdminUploadsController],
    providers: [UploadsService],
    exports: [UploadsService]
})
export class UploadsModule { }
