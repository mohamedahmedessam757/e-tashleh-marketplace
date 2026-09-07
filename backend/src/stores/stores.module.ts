import { Module, forwardRef } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { StoreStripeActivationService } from './store-stripe-activation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MerchantPerformanceModule } from '../merchant-performance/merchant-performance.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
    imports: [
        PrismaModule,
        NotificationsModule,
        AuditLogsModule,
        forwardRef(() => MerchantPerformanceModule),
        forwardRef(() => StripeModule),
    ],
    controllers: [StoresController],
    providers: [StoresService, StoreStripeActivationService],
    exports: [StoresService, StoreStripeActivationService],
})
export class StoresModule { }
