import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AccountAccessNotifyService } from './account-access-notify.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsGateway } from './notifications.gateway';
import { JwtAuthSharedModule } from '../auth/jwt-auth-shared.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, JwtAuthSharedModule, ConfigModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationsGateway, AccountAccessNotifyService],
    exports: [NotificationsService, AccountAccessNotifyService],
})
export class NotificationsModule { }
