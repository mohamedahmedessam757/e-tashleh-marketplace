import { Module, forwardRef } from '@nestjs/common';
import { VerificationTasksService } from './verification-tasks.service';
import { VerificationTasksController } from './verification-tasks.controller';
import { VerificationTasksPublicController } from './verification-tasks-public.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UploadsModule } from '../uploads/uploads.module';
import { WaybillsModule } from '../waybills/waybills.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../orders/orders.module';
import { ViolationsModule } from '../violations/violations.module';

@Module({
  imports: [
    NotificationsModule,
    AuditLogsModule,
    UploadsModule,
    WaybillsModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => ViolationsModule),
  ],
  providers: [VerificationTasksService],
  controllers: [VerificationTasksController, VerificationTasksPublicController],
  exports: [VerificationTasksService],
})
export class VerificationTasksModule {}
