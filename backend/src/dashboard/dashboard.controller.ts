import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
    private readonly logger = new Logger(DashboardController.name);

    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    @Permissions('dashboard', 'view')
    async getStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        try {
            return await this.dashboardService.getStats(startDate, endDate);
        } catch (error) {
            this.logger.error('Failed to build dashboard stats', error instanceof Error ? error.stack : error);
            throw error;
        }
    }
}
