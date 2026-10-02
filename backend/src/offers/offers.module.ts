import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StoresModule } from '../stores/stores.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ViolationsModule } from '../violations/violations.module';
import { OfferBiddingRestrictionService } from './offer-bidding-restriction.service';
import { ShippingReviewService } from './shipping-review.service';

@Module({
    imports: [PrismaModule, StoresModule, NotificationsModule, AuditLogsModule, ViolationsModule],
    controllers: [OffersController],
    providers: [OffersService, OfferBiddingRestrictionService, ShippingReviewService],
    exports: [OffersService, OfferBiddingRestrictionService, ShippingReviewService],
})
export class OffersModule { }
