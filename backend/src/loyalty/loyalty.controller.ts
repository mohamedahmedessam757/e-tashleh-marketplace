import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyLoyalty(@Request() req) {
    return this.loyaltyService.getLoyaltyData(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referrals')
  async getMyReferrals(@Request() req) {
    return this.loyaltyService.getReferralHistory(req.user.id);
  }

  /** Public marketing stats for Earn Income landing (no PII). */
  @Get('public-stats')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getPublicStats() {
    return this.loyaltyService.getPublicStats();
  }

  @UseGuards(JwtAuthGuard)
  @Post('redeem')
  async redeemPoints(
    @Request() req,
    @Body() body: { amount: number; description: string },
  ) {
    return this.loyaltyService.redeemPoints(
      req.user.id,
      body.amount,
      body.description || 'Points redeemed',
    );
  }
}
