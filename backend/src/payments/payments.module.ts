import { forwardRef, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EscrowService } from './escrow.service';
import { StripeModule } from '../stripe/stripe.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { OrdersModule } from '../orders/orders.module';
import { CardsModule } from '../cards/cards.module';
import { FinancialConfigService } from '../common/financial-config.service';
import { AdminFinancialService } from './admin-financial.service';
import { WithdrawalWorkflowService } from './withdrawal-workflow.service';

@Module({
    imports: [
        PrismaModule,
        NotificationsModule,
        AuditLogsModule,
        forwardRef(() => StripeModule),
        forwardRef(() => OrdersModule),
        CardsModule,
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, EscrowService, FinancialConfigService, AdminFinancialService, WithdrawalWorkflowService],
    exports: [PaymentsService, EscrowService, FinancialConfigService, AdminFinancialService, WithdrawalWorkflowService],
})
export class PaymentsModule { }
