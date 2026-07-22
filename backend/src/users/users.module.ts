import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ContactChangeService } from './contact-change/contact-change.service';
import { ContactChangeController } from './contact-change/contact-change.controller';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    forwardRef(() => AuthModule),
    AuditLogsModule,
  ],
  controllers: [UsersController, ContactChangeController],
  providers: [UsersService, ContactChangeService],
  exports: [UsersService],
})
export class UsersModule { }
