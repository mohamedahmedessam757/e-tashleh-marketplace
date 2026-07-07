import { Module } from '@nestjs/common';
import { StaticPagesService } from './static-pages.service';
import { StaticPagesController } from './static-pages.controller';
import { StaticPagesAdminController } from './static-pages-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
    imports: [PrismaModule, AuditLogsModule],
    controllers: [StaticPagesController, StaticPagesAdminController],
    providers: [StaticPagesService],
    exports: [StaticPagesService],
})
export class StaticPagesModule { }
