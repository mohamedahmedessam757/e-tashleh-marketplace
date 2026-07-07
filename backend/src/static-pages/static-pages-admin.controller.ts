import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { StaticPagesService } from './static-pages.service';
import { UpdateStaticPageDto } from '../platform-settings/dto/settings-audit.dto';

@Controller('admin/static-pages')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('settings', 'view')
export class StaticPagesAdminController {
    constructor(private readonly staticPagesService: StaticPagesService) {}

    @Get()
    findAll() {
        return this.staticPagesService.findAllAdmin();
    }

    @Get(':slug')
    findOne(@Param('slug') slug: string) {
        return this.staticPagesService.findOneAdmin(slug);
    }

    @Put(':slug')
    @Permissions('settings', 'edit')
    update(
        @Request() req,
        @Param('slug') slug: string,
        @Body() dto: UpdateStaticPageDto,
    ) {
        const actorId = req.user?.id || req.user?.userId;
        return this.staticPagesService.updateBySlug(slug, actorId, dto);
    }
}
