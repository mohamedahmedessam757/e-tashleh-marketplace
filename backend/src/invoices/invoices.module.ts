import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceSnapshotService } from './invoice-snapshot.service';
import { ReturnsFeeInvoiceService } from './returns-fee-invoice.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, AuditLogsModule],
    controllers: [InvoicesController],
    providers: [InvoicesService, InvoiceSnapshotService, ReturnsFeeInvoiceService],
    exports: [InvoicesService, InvoiceSnapshotService, ReturnsFeeInvoiceService],
})
export class InvoicesModule { }
