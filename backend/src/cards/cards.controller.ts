import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
    constructor(private readonly cardsService: CardsService) { }

    @Get()
    getUserCards(@Request() req) {
        return this.cardsService.getUserCards(req.user.id);
    }

    @Post()
    addCard(@Request() req, @Body() dto: CreateCardDto) {
        return this.cardsService.addCard(req.user.id, dto);
    }

    @Post('sync-intent')
    syncFromIntent(@Request() req, @Body() body: { paymentIntentId: string }) {
        return this.cardsService.syncFromPaymentIntent(req.user.id, body.paymentIntentId);
    }

    /** Clear a stale Stripe PaymentMethod link after confirm failure */
    @Post('invalidate-pm')
    invalidatePaymentMethod(@Request() req, @Body() body: { paymentMethodId: string }) {
        return this.cardsService.clearPaymentMethodLink(req.user.id, body.paymentMethodId);
    }

    @Delete(':id')
    deleteCard(@Request() req, @Param('id') id: string) {
        return this.cardsService.deleteCard(req.user.id, id);
    }

    @Patch(':id/default')
    setDefaultCard(@Request() req, @Param('id') id: string) {
        return this.cardsService.setDefaultCard(req.user.id, id);
    }
}
