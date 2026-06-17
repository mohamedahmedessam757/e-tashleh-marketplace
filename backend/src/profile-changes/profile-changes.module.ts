import { Module } from '@nestjs/common';
import { ProfileChangesService } from './profile-changes.service';
import { ProfileChangesController } from './profile-changes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, AuthModule, NotificationsModule, AuditLogsModule],
    controllers: [ProfileChangesController],
    providers: [ProfileChangesService],
    exports: [ProfileChangesService],
})
export class ProfileChangesModule {}
