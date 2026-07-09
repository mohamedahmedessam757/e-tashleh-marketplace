import { Controller, Get, Param, UseGuards, Request, Post, Body, Patch, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { sanitizeUser, isAdminRole } from '../common/user-sanitizer';
import { ResourceAccessService } from '../common/authorization/resource-access.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminUpdateCustomerDto } from './dto/admin-update-customer.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly resourceAccess: ResourceAccessService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return sanitizeUser(req.user);
  }

  // --- Administrative Endpoints (ADMIN/SUPER_ADMIN Only) ---

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'view')
  @Get('admin/customers')
  async getAllCustomers(@Query('search') search?: string) {
    return this.usersService.adminFindAllCustomers(search);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'view')
  @Get('admin/search')
  async searchEntities(@Query('q') query: string) {
    return this.usersService.adminSearchEntities(query);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'view')
  @Get('admin/customers/:id')
  async getCustomerById(@Param('id') id: string) {
    return this.usersService.adminFindCustomerById(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'edit')
  @Patch('admin/customers/:id/status')
  async updateCustomerStatus(
    @Param('id') id: string, 
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string }
  ) {
    return this.usersService.adminUpdateStatus(id, body.status, body.reason);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'edit')
  @Patch('admin/customers/:id/update')
  async updateCustomerData(@Param('id') id: string, @Body() body: AdminUpdateCustomerDto) {
    return this.usersService.adminUpdateCustomer(id, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'edit')
  @Patch('admin/customers/:id/notes')
  async updateCustomerNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.usersService.adminUpdateNotes(id, body.notes);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'edit')
  @Patch('admin/customers/:id/restrictions')
  async updateCustomerRestrictions(
    @Request() req,
    @Param('id') id: string, 
    @Body() body: any
  ) {
    return this.usersService.adminUpdateRestrictions(id, req.user.id, body);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('customers', 'edit')
  @Post('admin/customers/:id/clear-restrictions')
  async clearCustomerRestrictions(
    @Request() req,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.usersService.adminClearRestrictions(id, req.user.id, body);
  }

  // --- Profile Endpoints (fixed paths before :id) ---

  @UseGuards(JwtAuthGuard)
  @Get('settings/me')
  async getMySettings(@Request() req) {
    return this.usersService.getUserSettings(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings/me')
  async updateMySettings(
    @Request() req,
    @Body() body: { autoTranslateChat?: boolean; preferredLanguage?: 'ar' | 'en' },
  ) {
    return this.usersService.updateUserSettings(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/update')
  async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    // Only name/avatar are accepted. Sensitive fields (phone/email/role/balance/status)
    // are intentionally NOT settable here — they go through OTP-gated flows.
    return this.usersService.update(req.user.id || req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    await this.resourceAccess.assertUserCanViewUserProfile(
      { id: req.user.id, role: req.user.role, storeId: req.user.storeId },
      id,
    );
    const user = await this.usersService.findById(id);
    if (!user) return null;
    return sanitizeUser(user, {
      includeFinancial: req.user.id === id || isAdminRole(req.user.role),
    });
  }
}
