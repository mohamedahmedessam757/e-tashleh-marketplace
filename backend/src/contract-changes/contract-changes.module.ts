import { Module } from '@nestjs/common';
import { ContractChangesController } from './contract-changes.controller';
import { ContractChangesService } from './contract-changes.service';
import { ContractsModule } from '../contracts/contracts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ContractsModule, PrismaModule, AuditLogsModule, NotificationsModule],
  controllers: [ContractChangesController],
  providers: [ContractChangesService],
  exports: [ContractChangesService],
})
export class ContractChangesModule {}
