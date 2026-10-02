import { Controller, Get, Param, Post, UseGuards, Request, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ResourceAccessService } from '../common/authorization/resource-access.service';
import { isMerchantRole, redactOrderCustomerForMerchant } from '../common/privacy/merchant-customer-privacy.util';

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
    async getMerchantInvoices(@Request() req) {
        const invoices = await this.invoicesService.getMerchantInvoices(req.user.id);
        return (invoices as any[]).map((inv) => redactInvoiceForMerchant(inv));
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
        const invoices = await this.invoicesService.getInvoicesByOrder(orderId, req.user.role, req.user.id);
        return isMerchantRole(req.user.role)
            ? (invoices as any[]).map((inv) => redactInvoiceForMerchant(inv))
            : invoices;
    }

    @Get(':id')
    async getInvoiceById(@Request() req, @Param('id') id: string) {
        const invoice = await this.invoicesService.getInvoiceById(req.user.id, id);
        // A store owner viewing a customer's invoice must not see that customer's contact data
        return invoice.customerId !== req.user.id ? redactInvoiceForMerchant(invoice) : invoice;
    }
}

function redactInvoiceForMerchant<T extends Record<string, any>>(inv: T): T {
    if (!inv?.order) return inv;
    return { ...inv, order: redactOrderCustomerForMerchant(inv.order) };
}
