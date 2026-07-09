import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ResourceAccessService } from '../common/authorization/resource-access.service';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
    constructor(
        private readonly shipmentsService: ShipmentsService,
        private readonly resourceAccess: ResourceAccessService,
    ) {}

    private actorFrom(req: any) {
        return { id: req.user.id, role: req.user.role, storeId: req.user.storeId };
    }

    @UseGuards(PermissionsGuard)
    @Permissions('shipping', 'view')
    @Get()
    findAll(@Query('search') search?: string) {
        return this.shipmentsService.findAll(search);
    }

    @Get('my')
    findMyShipments(@Request() req) {
        return this.shipmentsService.findMyShipments(req.user.id, req.user.role);
    }

    @Get('order/:orderId')
    async getByOrderId(@Request() req, @Param('orderId') orderId: string) {
        await this.resourceAccess.assertUserCanAccessOrder(this.actorFrom(req), orderId);
        return this.shipmentsService.getByOrderId(orderId);
    }

    @Get(':id/logs')
    async getLogs(@Request() req, @Param('id') id: string) {
        await this.resourceAccess.assertUserCanAccessShipment(this.actorFrom(req), id);
        return this.shipmentsService.getLogs(id);
    }

    @UseGuards(PermissionsGuard)
    @Permissions('shipping', 'edit')
    @Post()
    create(@Body() createShipmentDto: CreateShipmentDto, @Request() req) {
        return this.shipmentsService.create(createShipmentDto, req.user.id);
    }

    @UseGuards(PermissionsGuard)
    @Permissions('shipping', 'edit')
    @Patch(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body() updateShipmentDto: UpdateShipmentStatusDto,
        @Request() req
    ) {
        return this.shipmentsService.updateStatus(id, req.user.id, updateShipmentDto);
    }
}
