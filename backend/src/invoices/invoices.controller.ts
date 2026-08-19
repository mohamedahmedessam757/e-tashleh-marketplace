import { Controller, Get, Param, Post, UseGuards, Request, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ResourceAccessService } from '../common/authorization/resource-access.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly resourceAccess: ResourceAccessService,
    ) { }

    @Get()
    getUserInvoices(@Request() req) {
        return this.invoicesService.getUserInvoices(req.user.id);
    }

    @Get('merchant')
    getMerchantInvoices(@Request() req) {
        return this.invoicesService.getMerchantInvoices(req.user.id);
    }

    @Get('admin/customers')
    @UseGuards(PermissionsGuard)
    @Permissions('billing', 'view')
    getAdminCustomerInvoices(
        @Query('search') search?: string,
        @Query('status') status?: string,
        @Query('entityType') entityType?: 'customer' | 'store',
        @Query('invoiceType') invoiceType?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.invoicesService.getAdminCustomerInvoices({
            search,
            status,
            entityType,
            invoiceType,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Get('admin/stores')
    @UseGuards(PermissionsGuard)
    @Permissions('billing', 'view')
    getAdminStoreInvoices(
        @Query('search') search?: string,
        @Query('entityType') entityType?: 'customer' | 'store',
        @Query('invoiceType') invoiceType?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.invoicesService.getAdminStoreInvoices({
            search,
            entityType,
            invoiceType,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Post('admin/:id/resend')
    @UseGuards(PermissionsGuard)
    @Permissions('billing', 'edit')
    resendAdminInvoice(@Request() req, @Param('id') id: string) {
        return this.invoicesService.resendAdminInvoice(req.user.id, id);
    }

    @Get('admin/:id')
    @UseGuards(PermissionsGuard)
    @Permissions('billing', 'view')
    getAdminInvoiceById(@Param('id') id: string) {
        return this.invoicesService.getAdminInvoiceById(id);
    }

    @Get('order/:orderId')
    async getOrderInvoices(@Request() req, @Param('orderId') orderId: string) {
        await this.resourceAccess.assertUserCanAccessInvoice(
            { id: req.user.id, role: req.user.role, storeId: req.user.storeId },
            orderId,
        );
        return this.invoicesService.getInvoicesByOrder(orderId, req.user.role, req.user.id);
    }

    @Get(':id')
    getInvoiceById(@Request() req, @Param('id') id: string) {
        return this.invoicesService.getInvoiceById(req.user.id, id);
    }
}
