
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OrderStatus, ActorType, ViolationTargetType } from '@prisma/client';
import { ViolationsService } from '../violations/violations.service';
import { OpenRouterService } from '../llm/openrouter.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import {
    normalizeSearchQuery,
    resolveUserIds,
    resolveStoreIds,
    resolveOrderIds,
    isUuid,
    mergeWhereWithSearch,
} from '../common/search/admin-entity-search.util';
import { shouldLockChatOnCompletion } from './chat-completion-lock.util';
import {
    isOfferPhaseOrderStatus,
    shouldCloseOrderChat,
} from './chat-offer-expiry.util';

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => ChatGateway))
        private chatGateway: ChatGateway,
        private notificationsService: NotificationsService,
        private auditLogsService: AuditLogsService,
        private violationsService: ViolationsService,
        private openRouterService: OpenRouterService,
        private platformSettings: PlatformSettingsService,
    ) { }

    async createOrGetChat(orderId: string, vendorId: string, customerId: string) {
        // 1. Check if Order exists and requirements
        const order = await this.prisma.order.findUnique({
            where: { id: orderId }
        });
        if (!order) throw new NotFoundException('Order not found');

        // Rule: If an offer is already accepted, ONLY that vendor can chat
        if (order.acceptedOfferId) {
            // Need to check if THIS vendor is the one accepted
            // We can check offer ownership or if we have acceptedOfferId relation to Offer->storeId
            const acceptedOffer = await this.prisma.offer.findUnique({ where: { id: order.acceptedOfferId } });
            if (acceptedOffer && acceptedOffer.storeId !== vendorId) {
                // Return existing chat but maybe marked as CLOSED or throw
                // Per requirement: "Auto-close other chats". So we fetch existing, if closed good, if missing create CLOSED?
                // Let's create it as CLOSED if it's new.
                const existing = await this.prisma.orderChat.findUnique({
                    where: { orderId_vendorId_type: { orderId, vendorId, type: 'order' } }
                });
                if (existing) return existing; // likely closed

                return this.prisma.orderChat.create({
                    data: {
                        orderId, vendorId, customerId, status: 'CLOSED', expiryAt: new Date()
                    }
                });
            }
        }

        // Rule: Cancelled / completed / warranty — order chat must stay CLOSED (no reopen)
        if (shouldCloseOrderChat(order.status)) {
            const existingClosed = await this.prisma.orderChat.findUnique({
                where: { orderId_vendorId_type: { orderId, vendorId, type: 'order' } },
            });
            if (existingClosed) {
                if (existingClosed.status === 'OPEN') {
                    await this.prisma.orderChat.update({
                        where: { id: existingClosed.id },
                        data: { status: 'CLOSED' },
                    });
                    this.chatGateway.server.to(existingClosed.id).emit('chatStatusChanged', {
                        chatId: existingClosed.id,
                        status: 'CLOSED',
                        reason: 'ORDER_COMPLETED',
                    });
                }
            } else {
                await this.prisma.orderChat.create({
                    data: {
                        orderId,
                        vendorId,
                        customerId,
                        type: 'order',
                        status: 'CLOSED',
                        expiryAt: new Date(),
                    },
                });
            }
            const kept = await this.prisma.orderChat.findUnique({
                where: { orderId_vendorId_type: { orderId, vendorId, type: 'order' } },
            });
            if (!kept) throw new NotFoundException('Chat not found');
            const fullKept = await this.prisma.orderChat.findUnique({
                where: { id: kept.id },
                include: {
                    vendor: { select: { name: true, logo: true, storeCode: true } },
                    customer: { select: { name: true, avatar: true } },
                    order: { select: { orderNumber: true, partName: true } },
                    messages: { orderBy: { createdAt: 'asc' } },
                },
            });
            if (!fullKept) throw new NotFoundException('Chat not found');
            return this.mapChatToDto(fullKept);
        }

        // Rule: 24h / selection Expiry — ONLY while still in offer/selection phases
        // (never expire chats for cancelled/completed or post-acceptance fulfillment)
        const now = new Date();
        const orderCreated = new Date(order.createdAt);
        const diffHours = (now.getTime() - orderCreated.getTime()) / (1000 * 60 * 60);

        let isExpired = false;
        if (!order.acceptedOfferId && isOfferPhaseOrderStatus(order.status)) {
            if (order.status === OrderStatus.AWAITING_SELECTION) {
                if (order.selectionDeadlineAt && now > new Date(order.selectionDeadlineAt)) {
                    isExpired = true;
                } else if (!order.selectionDeadlineAt && diffHours > 48) {
                    // Fallback: 48h from creation (24h collecting + 24h selection)
                    isExpired = true;
                }
            } else if (diffHours > 24) {
                isExpired = true;
            }
        }

        if (isExpired) {
            const existing = await this.prisma.orderChat.findUnique({
                where: { orderId_vendorId_type: { orderId, vendorId, type: 'order' } }
            });
            if (existing && existing.status !== 'EXPIRED') {
                return this.prisma.orderChat.update({
                    where: { id: existing.id },
                    data: { status: 'EXPIRED' }
                });
            }
            if (!existing) {
                return this.prisma.orderChat.create({
                    data: {
                        orderId, vendorId, customerId, status: 'EXPIRED', expiryAt: new Date()
                    }
                });
            }
            return existing;
        }

        // Normal creation or retrieval
        let chat = await this.prisma.orderChat.findUnique({
            where: { orderId_vendorId_type: { orderId, vendorId, type: 'order' } }
        });

        if (!chat) {
            // Default expiry only meaningful during offer phase
            const expiryDate = new Date(orderCreated.getTime() + 24 * 60 * 60 * 1000);

            chat = await this.prisma.orderChat.create({
                data: {
                    orderId,
                    vendorId,
                    customerId,
                    type: 'order',
                    status: 'OPEN',
                    expiryAt: expiryDate
                }
            });
        }

        // Refetch to get relations for UI
        const fullChat = await this.prisma.orderChat.findUnique({
            where: { id: chat.id },
            include: {
                vendor: { select: { name: true, logo: true, storeCode: true } },
                customer: { select: { name: true, avatar: true } },
                order: { select: { orderNumber: true, partName: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!fullChat) throw new NotFoundException('Chat not found');
        return this.mapChatToDto(fullChat);
    }

    async getChatById(id: string) {
        let chat = await this.prisma.orderChat.findUnique({
            where: { id },
            include: {
                vendor: { select: { name: true, logo: true, id: true, storeCode: true, ownerId: true } },
                customer: { select: { name: true, avatar: true, id: true } },
                order: { select: { orderNumber: true, partName: true, id: true, status: true } },
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });
        if (!chat) throw new NotFoundException('Chat not found');

        // Close order chat when order is in terminal lock statuses (no reopen)
        if (
            chat.type === 'order' &&
            shouldCloseOrderChat(chat.order?.status) &&
            chat.status === 'OPEN'
        ) {
            chat = await this.prisma.orderChat.update({
                where: { id: chat.id },
                data: { status: 'CLOSED' },
                include: {
                    vendor: { select: { name: true, logo: true, id: true, storeCode: true, ownerId: true } },
                    customer: { select: { name: true, avatar: true, id: true } },
                    order: { select: { orderNumber: true, partName: true, id: true, status: true } },
                    messages: { orderBy: { createdAt: 'asc' } },
                },
            });
            this.chatGateway.server.to(id).emit('chatStatusChanged', {
                chatId: id,
                status: 'CLOSED',
                reason: 'ORDER_COMPLETED',
            });
        }

        return this.mapChatToDto(chat);
    }

    async getUserChats(userId: string, role: string, type?: string, search?: string) {
        let chats = [];
        // Resolve the effective sender ID for unread calculation
        let effectiveSenderId = userId;

        const baseInclude = {
            customer: { select: { id: true, name: true, avatar: true, email: true, phone: true } },
            vendor: { select: { id: true, name: true, logo: true, storeCode: true, ownerId: true } },
            order: { select: { orderNumber: true, partName: true, id: true, status: true } },
            messages: { 
                where: { isDeletedByAdmin: false },
                orderBy: { createdAt: 'desc' as const }, 
                take: 1 
            },
            _count: { select: { messages: { where: { isRead: false, senderId: { not: userId }, isDeletedByAdmin: false } } } }
        };

        if (role === 'CUSTOMER') {
            chats = await this.prisma.orderChat.findMany({
                where: { customerId: userId, isDeletedByAdmin: false } as any,
                include: baseInclude as any,
                orderBy: { updatedAt: 'desc' }
            });
        } else if (role === 'VENDOR') {
            const store = await this.prisma.store.findUnique({ where: { ownerId: userId } });
            if (!store) return [];
            effectiveSenderId = store.id;

            chats = await this.prisma.orderChat.findMany({
                where: { 
                    OR: [
                        { vendorId: store.id },
                        { customerId: userId, type: 'support' } // Included Merchant-initiated support tickets
                    ],
                    isDeletedByAdmin: false 
                } as any,
                include: baseInclude as any,
                orderBy: { updatedAt: 'desc' }
            });
        } else if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPPORT') {
            let where: Record<string, unknown> = { isDeletedByAdmin: false };
            if (type) where.type = type;

            // Granular Filtering for SUPPORT role (2026 Governance Standard)
            if (role === 'SUPPORT') {
                const adminPerms = await this.prisma.adminPermission.findUnique({
                    where: { userId }
                });
                
                if (adminPerms && adminPerms.supportTicketCategories && adminPerms.supportTicketCategories.length > 0) {
                    if (type === 'support') {
                        where.category = { in: adminPerms.supportTicketCategories };
                    }
                }
            }

            const q = normalizeSearchQuery(search);
            if (q && (type === 'support' || type === 'order')) {
                const [userIds, storeIds, orderIds] = await Promise.all([
                    resolveUserIds(this.prisma, q),
                    resolveStoreIds(this.prisma, q),
                    resolveOrderIds(this.prisma, q),
                ]);

                const searchOr: Record<string, unknown>[] = [
                    { adminInitReason: { contains: q, mode: 'insensitive' } },
                    { category: { contains: q, mode: 'insensitive' } },
                    { guestName: { contains: q, mode: 'insensitive' } },
                    { guestEmail: { contains: q, mode: 'insensitive' } },
                    { guestPhone: { contains: q, mode: 'insensitive' } },
                    { order: { orderNumber: { contains: q, mode: 'insensitive' } } },
                    { order: { partName: { contains: q, mode: 'insensitive' } } },
                    { customer: { name: { contains: q, mode: 'insensitive' } } },
                    { customer: { email: { contains: q, mode: 'insensitive' } } },
                    { customer: { phone: { contains: q, mode: 'insensitive' } } },
                    { vendor: { name: { contains: q, mode: 'insensitive' } } },
                    { vendor: { storeCode: { contains: q, mode: 'insensitive' } } },
                ];

                if (isUuid(q)) {
                    searchOr.push({ id: q });
                    searchOr.push({ orderId: q });
                    searchOr.push({ customerId: q });
                    searchOr.push({ vendorId: q });
                }
                if (userIds.length) {
                    searchOr.push({ customerId: { in: userIds } });
                    searchOr.push({ vendor: { ownerId: { in: userIds } } });
                }
                if (storeIds.length) searchOr.push({ vendorId: { in: storeIds } });
                if (orderIds.length) searchOr.push({ orderId: { in: orderIds } });

                where = mergeWhereWithSearch(where, { OR: searchOr });
            }

            chats = await this.prisma.orderChat.findMany({
                where: where as any,
                include: {
                    ...baseInclude,
                    messages: { 
                        orderBy: { createdAt: 'desc' as const }, 
                        take: 1 
                    },
                    _count: { select: { messages: { where: { isRead: false, senderId: { not: userId } } } } }
                } as any,
                orderBy: { updatedAt: 'desc' }
            });
        }

        // Close OPEN chats whose orders are in terminal lock statuses (list accuracy)
        const closeIds = (chats as any[])
            .filter(
                (c) =>
                    c.type === 'order' &&
                    shouldCloseOrderChat(c.order?.status) &&
                    c.status === 'OPEN',
            )
            .map((c) => c.id as string);

        if (closeIds.length > 0) {
            await this.prisma.orderChat.updateMany({
                where: { id: { in: closeIds } },
                data: { status: 'CLOSED' },
            });
            for (const c of chats as any[]) {
                if (closeIds.includes(c.id)) c.status = 'CLOSED';
            }
            for (const chatId of closeIds) {
                this.chatGateway.server.to(chatId).emit('chatStatusChanged', {
                    chatId,
                    status: 'CLOSED',
                    reason: 'ORDER_COMPLETED',
                });
            }
        }

        return chats.map((chat: any) => ({
            ...this.mapChatToDto(chat),
            lastMessage: chat.messages?.[0]?.text || '',
            lastMessageTime: chat.messages?.[0]?.createdAt || chat.updatedAt,
            unreadCount: chat._count?.messages || 0
        }));
    }

    private mapChatToDto(chat: any) {
        return {
            ...chat,
            vendorName: chat.vendor?.name,
            vendorLogo: chat.vendor?.logo,
            customerName: chat.customer?.name,
            customerAvatar: chat.customer?.avatar,
            customerOwnerId: chat.customer?.id, // Added for attribution
            vendorOwnerId: chat.vendor?.ownerId, // Added for attribution
            customerCode: chat.customerId ? `CUS-${chat.customerId.substring(0, 6).toUpperCase()}` : undefined,
            vendorCode: chat.vendor?.storeCode,
            orderNumber: chat.order?.orderNumber,
            partName: chat.order?.partName,
            adminInitReason: chat.adminInitReason, // Explicitly included for 2026 support oversight
            category: chat.category || this.extractCategory(chat.messages?.[0]?.subject || chat.adminInitReason || ''),
            // Only keep the messages if they exist (we don't want to map over undefined if not selected)
            messages: chat.messages ? chat.messages : []
        };
    }

    /**
     * Mark all messages in a chat as read for the given user.
     * Only marks messages NOT sent by the user (i.e., incoming messages).
     */
    async markMessagesAsRead(chatId: string, userId: string) {
        const chat = await this.prisma.orderChat.findUnique({ where: { id: chatId } });
        if (!chat) throw new NotFoundException('Chat not found');

        const result = await this.prisma.orderChatMessage.updateMany({
            where: {
                chatId,
                senderId: { not: userId },
                isRead: false,
                isDeletedByAdmin: false
            } as any,
            data: { isRead: true }
        });

        // Broadcast read status to WebSocket room for real-time ✔✔
        if (result.count > 0) {
            try {
                this.chatGateway.server.to(chatId).emit('messagesRead', {
                    chatId,
                    readByUserId: userId,
                    readAt: new Date().toISOString()
                });
            } catch (e) {
                console.error('WebSocket messagesRead broadcast failed', e);
            }
        }

        return { markedCount: result.count };
    }

    async sendMessage(chatId: string, senderId: string | null, text: string, senderRole?: string, mediaUrl?: string, mediaType?: string, mediaName?: string, priority?: string, subject?: string) {
        const roleUpper = String(senderRole || '').toUpperCase();
        const isStaffSender = roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPPORT';
        if (mediaUrl && !isStaffSender) {
            const attachmentsAllowed = await this.platformSettings.isChatAttachmentsEnabled();
            if (!attachmentsAllowed) {
                throw new ForbiddenException('Chat attachments are currently disabled by the platform');
            }
        }

        let chat = await this.prisma.orderChat.findUnique({ 
            where: { id: chatId },
            include: { 
                customer: { select: { id: true, name: true } }, 
                vendor: { select: { id: true, name: true, ownerId: true } },
                order: { select: { id: true, status: true } },
            } 
        });
        if (!chat) throw new NotFoundException('Chat not found');

        // Terminal order statuses: force CLOSED and reject send (order chats only)
        if (chat.type === 'order' && shouldCloseOrderChat(chat.order?.status)) {
            if (chat.status !== 'CLOSED') {
                chat = await this.prisma.orderChat.update({
                    where: { id: chat.id },
                    data: { status: 'CLOSED' },
                    include: {
                        customer: { select: { id: true, name: true } },
                        vendor: { select: { id: true, name: true, ownerId: true } },
                        order: { select: { id: true, status: true } },
                    },
                });
                this.chatGateway.server.to(chatId).emit('chatStatusChanged', {
                    chatId,
                    status: 'CLOSED',
                    reason: 'ORDER_COMPLETED',
                });
            }
            throw new ForbiddenException('Chat is CLOSED');
        }

        if (chat.status === 'CLOSED' || chat.status === 'EXPIRED') {
            throw new ForbiddenException(`Chat is ${chat.status}`);
        }

        // --- Chat Guard (Filter) ---
        if (text) {
            let isViolation = false;
            // 1. Regex Pass (Fast)
            const infoRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+|00)\d{1,3}[\s-]*(?:\d[\s-]*){8,15})|(05\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d[\s-]*\d)|(https?:\/\/[^\s]+)|(www\.[^\s]+)|(wa\.me\/\d+)/i;
            if (infoRegex.test(text)) {
                isViolation = true;
            }

            // 2. AI Pass if Regex is clean (Smart)
            if (!isViolation && this.openRouterService.isConfigured()) {
                try {
                    const verdict = await this.openRouterService.classifyContactSharing(text);
                    if (verdict === 'VIOLATION') {
                        isViolation = true;
                    }
                } catch (e: any) {
                    console.error('AI chat filter failed:', e?.message || e);
                }
            }

            if (isViolation) {
                const actorName = senderRole === 'CUSTOMER' ? chat.customer?.name : (chat.vendor?.name || 'Unknown');
                const actorType = senderRole === 'CUSTOMER' ? 'CUSTOMER' : 'VENDOR';
                await this.auditLogsService.logAction({
                    action: 'CHAT_VIOLATION',
                    entity: 'OrderChat',
                    actorType: actorType as any,
                    actorId: senderId || 'SYSTEM',
                    actorName: actorName || 'Unknown',
                    metadata: { text, chatId, senderRole }
                });

                // Notify User about the block (Education & Transparency)
                const isMerchantSender = senderRole === 'VENDOR' || senderRole === 'MERCHANT';
                const targetType = isMerchantSender
                    ? ViolationTargetType.MERCHANT
                    : ViolationTargetType.CUSTOMER;
                const targetStoreId = isMerchantSender ? chat.vendorId : null;

                try {
                    await this.violationsService.autoIssueOffPlatformContact({
                        targetUserId: senderId!,
                        targetType,
                        targetStoreId: targetStoreId ?? undefined,
                        chatId,
                        orderId: chat.orderId,
                    });
                } catch (violationErr: any) {
                    console.error('Failed to auto-issue chat contact violation:', violationErr?.message);
                }

                await this.notificationsService.create({
                    recipientId: senderId!,
                    recipientRole: actorType as any,
                    type: 'alert',
                    titleAr: 'تنبيه أمان: تم حظر الرسالة 🛡️',
                    titleEn: 'Security Alert: Message Blocked 🛡️',
                    messageAr: 'نعتذر، تم حظر رسالتك لأنها تحتوي على بيانات اتصال مخالفة لسياسة المنصة. يرجى التواصل عبر النظام فقط.',
                    messageEn: 'Sorry, your message was blocked because it contains contact info violating our policy. Please communicate through the system only.',
                    link: 'violations',
                    metadata: { chatId, tab: 'history' },
                });

                // Notify all Admins immediately about the violation
                try {
                    await this.notificationsService.notifyAdmins({
                        type: 'CHAT_VIOLATION',
                        titleAr: 'مخالفة فلتر المحادثات 🛡️',
                        titleEn: 'Chat filter violation 🛡️',
                        messageAr: `تم رصد محاولة مشاركة بيانات اتصال من طرف (${actorName}) في المحادثة.`,
                        messageEn: `Detected contact sharing attempt from (${actorName}) in chat.`,
                        link: 'violations',
                        metadata: { chatId, text, tab: 'violations' },
                    });

                    // Notify the OTHER party (Transparency)
                    const otherPartyId = senderRole === 'CUSTOMER' ? chat.vendor?.ownerId : chat.customer?.id;
                    const otherPartyRole = senderRole === 'CUSTOMER' ? 'VENDOR' : 'CUSTOMER';
                    if (otherPartyId) {
                        await this.notificationsService.create({
                            recipientId: otherPartyId,
                            recipientRole: otherPartyRole,
                            type: 'alert',
                            titleAr: 'تم حجب رسالة واردة 🚫',
                            titleEn: 'Incoming Message Blocked 🚫',
                            messageAr: 'تم حجب رسالة من الطرف الآخر لمخالفتها سياسة المنصة (تبادل بيانات اتصال خارجية).',
                            messageEn: 'A message from the other party was blocked for violating platform policy (external contact info).',
                            metadata: { chatId }
                        });
                    }
                } catch (notifError) {
                    console.error('Failed to dispatch Admin notifications:', notifError);
                }

                throw new BadRequestException('CHAT_VIOLATION_DETECTED');
            }
        }
        // --- End Chat Guard ---

        const messageCreatedAt = new Date();

        const shouldTranslate = (
            (chat.customerTranslationEnabledAt && chat.customerTranslationEnabledAt <= messageCreatedAt) ||
            (chat.vendorTranslationEnabledAt && chat.vendorTranslationEnabledAt <= messageCreatedAt) ||
            (chat.adminTranslationEnabledAt && chat.adminTranslationEnabledAt <= messageCreatedAt)
        );

        const message = await this.prisma.orderChatMessage.create({
            data: {
                chatId,
                senderId: senderId || undefined,
                text: text || '',
                translatedText: null,
                mediaUrl,
                mediaType,
                mediaName,
                priority: priority as any,
                subject: subject as any,
                senderRole: senderRole || undefined,
                createdAt: messageCreatedAt
            } as any
        });

        try {
            this.chatGateway.broadcastNewMessage(chatId, message);
            this.chatGateway.broadcastChatUpdate(chatId, chat.type as any);
        } catch (e) {
            console.error('WebSocket dispatch failed', e);
        }

        if (shouldTranslate && text?.trim()) {
            this.translateMessageInBackground(message.id, chatId, text).catch((e) => {
                console.error('Background translation failed:', e?.message || e);
            });
        }

        // Fire & Forget Notifications (Non-blocking) — skip for system messages
        if (senderId) {
            this.dispatchChatNotification(chat, senderId, text).catch(e => {
                console.error('Failed to dispatch chat notification:', e);
            });
        }

        return message;
    }

    private async translateMessageInBackground(messageId: string, chatId: string, text: string) {
        if (!this.openRouterService.isConfigured()) return;

        let translatedText: string | null = null;
        try {
            translatedText = await this.openRouterService.translateMarketplaceMessage(text);
        } catch (error: any) {
            console.error('Translation failed:', { messageId, chatId, error: error?.message || error });
            return;
        }

        if (!translatedText) return;

        const updated = await this.prisma.orderChatMessage.update({
            where: { id: messageId },
            data: { translatedText },
        });

        try {
            this.chatGateway.broadcastMessageUpdated(chatId, updated);
        } catch (e) {
            console.error('WebSocket messageUpdated dispatch failed', e);
        }
    }

    private async dispatchChatNotification(chat: any, senderId: string, text: string) {
        const recentMessages = await this.prisma.orderChatMessage.count({
            where: {
                chatId: chat.id,
                senderId: senderId,
                createdAt: {
                    gte: new Date(Date.now() - 3000)
                }
            }
        });

        if (recentMessages > 1) {
            return;
        }

        const recipient = await this.resolveChatNotificationRecipient(chat, senderId);
        if (!recipient) {
            return;
        }

        const messageAr = text ? text.substring(0, 50) + '...' : 'مرفق جديد';
        const messageEn = text ? text.substring(0, 50) + '...' : 'New Attachment';

        if (recipient.kind === 'admins') {
            await this.notificationsService.notifyAdmins({
                titleAr: recipient.titleAr,
                titleEn: recipient.titleEn,
                messageAr,
                messageEn,
                type: 'SYSTEM',
                link: 'chats',
                metadata: { chatId: chat.id, source: 'support_message' },
            });
            return;
        }

        if (recipient.recipientId === senderId) {
            return;
        }

        await this.notificationsService.create({
            recipientId: recipient.recipientId,
            recipientRole: recipient.recipientRole,
            titleAr: recipient.titleAr,
            titleEn: recipient.titleEn,
            messageAr,
            messageEn,
            type: 'SYSTEM',
            link: `/dashboard/chats/${chat.id}`,
        });
    }

    private async resolveChatNotificationRecipient(
        chat: any,
        senderId: string,
    ): Promise<
        | { kind: 'admins'; titleAr: string; titleEn: string }
        | { kind: 'user'; recipientId: string; recipientRole: string; titleAr: string; titleEn: string }
        | null
    > {
        const sender = await this.prisma.user.findUnique({
            where: { id: senderId },
            select: { role: true },
        });
        const isStaff = sender ? ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(sender.role) : false;

        const vendorOwnerId = await this.resolveVendorOwnerId(chat.vendorId);
        const isCustomerParticipant = !!chat.customerId && senderId === chat.customerId;
        const isVendorParticipant = !!vendorOwnerId && senderId === vendorOwnerId;
        const orderRef = chat.orderId?.substring(0, 6) || '';

        if (chat.type === 'support') {
            if (isStaff) {
                const target = await this.resolveSupportChatParticipant(chat, vendorOwnerId);
                if (!target || target.recipientId === senderId) return null;
                return {
                    kind: 'user',
                    ...target,
                    titleAr: 'رد جديد من الدعم الفني',
                    titleEn: 'New Reply from Support',
                };
            }

            if (isCustomerParticipant || isVendorParticipant) {
                return {
                    kind: 'admins',
                    titleAr: isVendorParticipant ? 'رسالة دعم جديدة من تاجر' : 'رسالة دعم جديدة',
                    titleEn: isVendorParticipant ? 'New Support Message from Merchant' : 'New Support Message',
                };
            }

            return null;
        }

        if (isCustomerParticipant) {
            if (!vendorOwnerId) return null;
            return {
                kind: 'user',
                recipientId: vendorOwnerId,
                recipientRole: 'MERCHANT',
                titleAr: `رسالة من العميل بخصوص طلب ${orderRef}`,
                titleEn: `Message from Customer for Order ${orderRef}`,
            };
        }

        if (isVendorParticipant || senderId === chat.vendorId) {
            if (!chat.customerId) return null;
            return {
                kind: 'user',
                recipientId: chat.customerId,
                recipientRole: 'CUSTOMER',
                titleAr: `رسالة من التاجر بخصوص طلب ${orderRef}`,
                titleEn: `Message from Merchant for Order ${orderRef}`,
            };
        }

        return null;
    }

    private async resolveSupportChatParticipant(
        chat: any,
        vendorOwnerId: string | null,
    ): Promise<{ recipientId: string; recipientRole: string } | null> {
        if (chat.customerId) {
            const user = await this.prisma.user.findUnique({
                where: { id: chat.customerId },
                select: { role: true },
            });
            return {
                recipientId: chat.customerId,
                recipientRole: user?.role === 'VENDOR' ? 'MERCHANT' : 'CUSTOMER',
            };
        }

        if (vendorOwnerId) {
            return { recipientId: vendorOwnerId, recipientRole: 'MERCHANT' };
        }

        return null;
    }

    private async resolveVendorOwnerId(vendorId?: string | null): Promise<string | null> {
        if (!vendorId) return null;
        const store = await this.prisma.store.findUnique({
            where: { id: vendorId },
            select: { ownerId: true },
        });
        return store?.ownerId ?? null;
    }

    async toggleTranslation(chatId: string, role: string, enabled: boolean) {
        const data: any = {};
        const timestamp = enabled ? new Date() : null;

        if (role === 'CUSTOMER') data.customerTranslationEnabledAt = timestamp;
        else if (role === 'VENDOR') data.vendorTranslationEnabledAt = timestamp;
        else if (['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(role)) data.adminTranslationEnabledAt = timestamp;

        return this.prisma.orderChat.update({
            where: { id: chatId },
            data
        });
    }

    async createSupportChat(customerId: string, subject: string, initialMessage: string, orderId?: string, mediaUrl?: string, mediaType?: string, mediaName?: string, priority?: string) {
        // Enforce order validation ONLY if orderId is strictly provided
        if (orderId) {
            const order = await this.prisma.order.findUnique({ where: { id: orderId } });
            if (!order) throw new NotFoundException('Order not found for Support Ticket');
        }

        // Generic tickets are always distinct chats to preserve subject lines logic.
        // For distinctness, we simply create a new ticket (chat).
        const chat = await this.prisma.orderChat.create({
            data: {
                order: orderId ? { connect: { id: orderId } } : undefined,
                customer: { connect: { id: customerId } },
                type: 'support',
                source: 'DASHBOARD',
                status: 'OPEN',
                expiryAt: null // No SLA expiry for support
            }
        });

        // Add the initial message mapping the subject and content
        await this.sendMessage(chat.id, customerId, initialMessage, 'CUSTOMER', mediaUrl, mediaType, mediaName, priority, subject);

        return chat;
    }

    /**
     * Creates a support ticket from the Landing Page (Public/Guest)
     * 2026 Standard: Automatic user detection and linking
     */
    async createPublicSupportChat(dto: { 
        name: string; 
        email: string; 
        phone: string; 
        subject: string; 
        message: string; 
        userId?: string 
    }) {
        // 1. Intelligent Lookup: Find if user already exists by Email or Phone
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.email.toLowerCase().trim() },
                    { phone: dto.phone.trim() }
                ]
            },
            select: { id: true }
        });

        const effectiveUserId = dto.userId || existingUser?.id;

        // 2. Create the Chat record
        const chat = await this.prisma.orderChat.create({
            data: {
                customerId: effectiveUserId || undefined,
                guestName: dto.name,
                guestEmail: dto.email,
                guestPhone: dto.phone,
                type: 'support',
                source: 'LANDING',
                status: 'OPEN',
                category: this.extractCategory(dto.subject + ' ' + dto.message),
            }
        });

        // 3. Send the initial message
        await this.sendMessage(
            chat.id, 
            effectiveUserId || null, 
            dto.message, 
            effectiveUserId ? 'CUSTOMER' : 'GUEST', 
            undefined, undefined, undefined, undefined, 
            dto.subject
        );

        // 4. Notify Admins in real-time & Create Persistent Notifications
        try {
            // 4a. Real-time Socket Update
            this.chatGateway.broadcastChatUpdate(chat.id, 'support', {
                isNew: true,
                name: dto.name,
                subject: dto.subject
            });

            // 4b. Create Database Notifications for all Admin users
            await this.notificationsService.notifyAdmins({
                titleAr: 'تذكرة دعم فني جديدة',
                titleEn: 'New Support Ticket',
                messageAr: `قام ${dto.name} بإرسال تذكرة دعم جديدة بخصوص: ${dto.subject}`,
                messageEn: `${dto.name} submitted a new support ticket regarding: ${dto.subject}`,
                type: 'system',
                metadata: { chatId: chat.id, source: 'LANDING' },
            });
        } catch (e) {
            console.error('WebSocket/Notification support broadcast failed', e);
        }

        return {
            chat,
            isRegistered: !!effectiveUserId
        };
    }

    async closeOtherChats(orderId: string, acceptedVendorId: string) {
        // Called when an Offer is accepted
        await this.prisma.orderChat.updateMany({
            where: {
                orderId: orderId,
                vendorId: { not: acceptedVendorId },
                status: 'OPEN'
            },
            data: { status: 'CLOSED' }
        });
    }

    /**
     * Lock winning vendor–customer order chat when the order reaches a terminal
     * close status (cancel / complete / warranty). Does not touch support chats.
     */
    async lockOrderVendorChatOnCompletion(orderId: string): Promise<{ locked: number }> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            select: {
                id: true,
                status: true,
            },
        });
        if (!order) return { locked: 0 };

        const { shouldLock, reason } = shouldLockChatOnCompletion({
            orderStatus: order.status,
        });
        if (!shouldLock || !reason) return { locked: 0 };

        const openVendorChats = await this.prisma.orderChat.findMany({
            where: {
                orderId,
                type: 'order',
                status: 'OPEN',
                vendorId: { not: null },
            },
            select: { id: true },
        });
        if (openVendorChats.length === 0) return { locked: 0 };

        await this.prisma.orderChat.updateMany({
            where: { id: { in: openVendorChats.map((c) => c.id) } },
            data: { status: 'CLOSED' },
        });

        for (const chat of openVendorChats) {
            this.chatGateway.server.to(chat.id).emit('chatStatusChanged', {
                chatId: chat.id,
                status: 'CLOSED',
                reason,
            });
        }

        return { locked: openVendorChats.length };
    }


    /**
     * Admin action: close a chat or block a user from it.
     */
    async adminAction(adminId: string, chatId: string, action: 'close' | 'block' | 'join' | 'deleteChat' | 'deleteMessage' | 'evidence', payload?: any) {
        const chat = await this.prisma.orderChat.findUnique({ 
            where: { id: chatId },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                vendor: { include: { owner: { select: { id: true, name: true, email: true } } } },
                order: true
            }
        });
        if (!chat) throw new NotFoundException('Chat not found');

        // Audit Log (2026 Admin Chat Oversight)
        await this.auditLogsService.logAction({
            entity: 'CHAT',
            action: `ADMIN_${action.toUpperCase()}`,
            actorType: 'ADMIN',
            actorId: adminId,
            reason: payload?.reason || 'Administrative intervention',
            metadata: { 
                chatId, 
                action, 
                payload,
                orderId: chat.orderId
            }
        });

        switch (action) {
            case 'close':
                await this.prisma.orderChat.update({
                    where: { id: chatId },
                    data: { status: 'CLOSED' }
                });
                this.chatGateway.server.to(chatId).emit('chatStatusChanged', { chatId, status: 'CLOSED', reason: 'Admin closed this conversation' });
                return { success: true, action: 'close' };

            case 'block':
                if (!payload?.userId) throw new BadRequestException('userId required');
                
                // 1. Account-level blocking
                let newStatus = 'BLOCKED';
                let suspendedUntil = null;
                const suspendReason = payload?.reason || 'Administrative action';
                
                if (payload?.durationDays && payload.durationDays > 0) {
                    newStatus = 'SUSPENDED';
                    const date = new Date();
                    date.setDate(date.getDate() + payload.durationDays);
                    suspendedUntil = date;
                }

                await this.prisma.user.update({
                    where: { id: payload.userId },
                    data: { 
                        status: newStatus as any,
                        suspendedUntil,
                        suspendReason
                    }
                });

                // 2. Chat-level closing
                await this.prisma.orderChat.update({
                    where: { id: chatId },
                    data: { status: 'CLOSED' }
                });
                
                await this.sendMessage(chatId, null, `User has been ${newStatus.toLowerCase()} by an administrator.`, 'SYSTEM');
                this.chatGateway.server.to(chatId).emit('chatStatusChanged', { chatId, status: 'CLOSED', reason: 'Admin blocked a participant' });
                return { success: true, action: 'block', userId: payload.userId, newStatus };

            case 'join':
                // DISABLED for 2026 Silent Oversight policy
                throw new BadRequestException('Direct joining is disabled for Silent Oversight mode.');

            case 'deleteChat':
                await this.prisma.orderChat.update({
                    where: { id: chatId },
                    data: { isDeletedByAdmin: true } as any
                });
                this.chatGateway.server.to(chatId).emit('chatDeleted', { chatId });
                return { success: true, action: 'deleteChat' };

            case 'deleteMessage':
                if (!payload?.messageId) throw new BadRequestException('messageId required');
                await this.prisma.orderChatMessage.update({
                    where: { id: payload.messageId },
                    data: { isDeletedByAdmin: true } as any
                });
                this.chatGateway.server.to(chatId).emit('messageDeleted', { chatId, messageId: payload.messageId });
                return { success: true, action: 'deleteMessage' };
            case 'evidence':
                const allMessages = await this.prisma.orderChatMessage.findMany({
                    where: { chatId },
                    orderBy: { createdAt: 'asc' }
                });
                return {
                    chatMetadata: {
                        chatId: chat.id,
                        orderId: chat.orderId,
                        orderNumber: (chat.order as any)?.orderNumber,
                        customer: chat.customer,
                        vendor: {
                            id: chat.vendor?.id,
                            name: chat.vendor?.name,
                            logo: chat.vendor?.logo,
                        },
                        vendorOwnerId: (chat.vendor as any)?.ownerId ?? null,
                        createdAt: chat.createdAt,
                        status: chat.status
                    },
                    evidenceSnapshot: allMessages,
                    timestamp: new Date()
                };

            default:
                throw new BadRequestException('Invalid admin action');
        }
    }

    async initAdminSupportChat(adminId: string, adminName: string, targetUserId: string, targetRole: 'CUSTOMER' | 'VENDOR', reason: string, orderId?: string, payload?: {
        employeeName: string;
        signature: string;
        signatureType: 'DRAWN' | 'TYPED';
    }) {
        // 1. Resolve logical IDs (targetUserId might be an owner ID for vendors)
        let vendorId: string | undefined;
        let customerId: string | undefined;

        if (targetRole === 'VENDOR') {
            const store = await this.prisma.store.findUnique({ where: { ownerId: targetUserId } });
            if (!store) {
                // Try direct ID if ownerId search fails (might be passing storeId directly)
                const storeById = await this.prisma.store.findUnique({ where: { id: targetUserId } });
                if (!storeById) throw new NotFoundException('Vendor store not found');
                vendorId = storeById.id;
            } else {
                vendorId = store.id;
            }
        } else {
            customerId = targetUserId;
        }

        // 2. Check for existing OPEN support chat with this participant
        let chat = await this.prisma.orderChat.findFirst({
            where: {
                type: 'support',
                vendorId: vendorId || null,
                customerId: customerId || null,
                status: 'OPEN'
            }
        });

        if (!chat) {
            // Create a new support session
            chat = await this.prisma.orderChat.create({
                data: {
                    order: orderId ? { connect: { id: orderId } } : undefined,
                    customer: customerId ? { connect: { id: customerId } } : undefined,
                    vendor: vendorId ? { connect: { id: vendorId } } : undefined,
                    type: 'support',
                    status: 'OPEN',
                    expiryAt: null,
                    adminInitReason: reason,
                    category: this.extractCategory(reason),
                    source: 'ADMIN_DASHBOARD'
                }
            });
        }

        // 3. Notify Target User about the new support session (Silenced per Admin requirement)
        /*
        await this.notificationsService.create({
            recipientId: targetUserId,
            recipientRole: targetRole,
            type: 'support',
            titleAr: 'تواصل إداري جديد 🎧',
            titleEn: 'New Administrative Contact 🎧',
            messageAr: `بدأت الإدارة محادثة دعم معك بخصوص: ${reason}`,
            messageEn: `Administration started a support conversation regarding: ${reason}`,
            link: `support-chat/${chat.id}`,
            metadata: { chatId: chat.id, adminId }
        });
        */

        // 4. Log to AuditLog (2026 Audit Standard §12.4)
        await this.auditLogsService.logAction({
            action: 'ADMIN_INITIATED_SUPPORT',
            entity: 'OrderChat',
            actorType: 'ADMIN',
            actorId: adminId,
            actorName: adminName,
            reason: reason,
            orderId: orderId,
            metadata: {
                targetUserId,
                targetRole,
                chatId: chat.id,
                employeeName: payload?.employeeName,
                signatureType: payload?.signatureType,
                hasSignature: !!payload?.signature
            }
        });

        // 5. Send a system message to populate the chat list (Silenced notifications, but provides context)
        const systemText = reason;
        await this.sendMessage(chat.id, null, systemText, 'SYSTEM');

        return chat;
    }

    private extractCategory(input: string): string {
        if (!input) return 'OTHER';
        const text = input.toUpperCase();
        
        if (text.includes('ORDER') || text.includes('طلب')) return 'ORDERS';
        if (text.includes('PAYMENT') || text.includes('MALI') || text.includes('مالية') || text.includes('دفع')) return 'PAYMENT';
        if (text.includes('RETURN') || text.includes('استرجاع') || text.includes('إرجاع')) return 'RETURNS';
        if (text.includes('TECH') || text.includes('تقني') || text.includes('مشكلة')) return 'TECHNICAL';
        if (text.includes('ACCOUNT') || text.includes('حساب')) return 'ACCOUNT';
        
        // Check for bracket format [CATEGORY]
        const bracketMatch = input.match(/\[(.*?)\]/);
        if (bracketMatch) {
            const cat = bracketMatch[1].toUpperCase();
            if (['ORDERS', 'RETURNS', 'PAYMENT', 'TECHNICAL', 'ACCOUNT', 'OTHER'].includes(cat)) {
                return cat;
            }
        }

        return 'OTHER';
    }

    async userMayJoinChatRoom(chatId: string, userId: string): Promise<boolean> {
        const chat = await this.prisma.orderChat.findUnique({
            where: { id: chatId },
            include: { vendor: { select: { ownerId: true } } },
        });
        if (!chat) return false;
        if (chat.customerId === userId) return true;
        if (chat.vendor?.ownerId === userId) return true;
        const actor = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        const r = actor?.role?.toUpperCase();
        return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPPORT';
    }

    async userMayJoinAdminGlobal(userId: string): Promise<boolean> {
        const actor = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        const r = actor?.role?.toUpperCase();
        return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPPORT';
    }

    async getUserRiskProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { store: true }
        });

        if (!user) throw new NotFoundException('User not found');

        const isVendor = user.role === 'VENDOR';
        const activeOrderStatuses = ['PENDING', 'ACCEPTED', 'READY_FOR_SHIPPING', 'OUT_FOR_DELIVERY', 'RETURN_REQUESTED'];
        
        let activeOrdersCount = 0;
        let pendingBalance = 0;
        let walletBalance = 0;
        
        if (isVendor && user.store) {
            activeOrdersCount = await this.prisma.order.count({
                where: {
                    storeId: user.store.id,
                    status: { in: activeOrderStatuses as any }
                }
            });
            pendingBalance = parseFloat(user.store.pendingBalance.toString() || '0');
            walletBalance = parseFloat(user.store.balance.toString() || '0');
        } else {
            activeOrdersCount = await this.prisma.order.count({
                where: {
                    customerId: userId,
                    status: { in: activeOrderStatuses as any }
                }
            });
        }

        return {
            userId: user.id,
            role: user.role,
            isVendor,
            status: user.status,
            activeOrdersCount,
            pendingBalance,
            walletBalance
        };
    }
}
