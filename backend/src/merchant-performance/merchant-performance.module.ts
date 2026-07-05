import { Module, forwardRef } from '@nestjs/common';
import { MerchantPerformanceService } from './merchant-performance.service';
import { MerchantPerformanceController } from './merchant-performance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    PaymentsModule,
    forwardRef(() => LoyaltyModule),
  ],
  controllers: [MerchantPerformanceController],
  providers: [MerchantPerformanceService],
  exports: [MerchantPerformanceService],
})
export class MerchantPerformanceModule {}
