import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards, BadRequestException, ForbiddenException, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { UploadsService } from './uploads.service';
import { ConfirmUploadDto, SignUploadDto } from './dto/sign-upload.dto';
import { MIME_EXT, UPLOAD_POLICIES, maxBytesFor } from './upload-policy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { multerMemoryOptions } from './multer.config';
import { ResourceAccessService } from '../common/authorization/resource-access.service';

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Matches only paths produced by `signUpload` for this user: `<prefix>/<userId>/<uuid>.<ext>`. */
export function isOwnSignedUploadPath(path: string, userId: string): boolean {
    if (!SAFE_ID.test(userId) || path.includes('..') || path.startsWith('/')) return false;
    const re = new RegExp(
        `^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp|gif|pdf|mp4|mov|webm)$`,
    );
    return re.test(path);
}

@Controller('uploads')
export class UploadsController {
    constructor(
        private readonly uploadsService: UploadsService,
        private readonly resourceAccess: ResourceAccessService,
    ) { }

    private actor(req: { user: { id: string; role: string; storeId?: string | null } }) {
        return { id: req.user.id, role: req.user.role, storeId: req.user.storeId };
    }

    @Post('returns')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadReturnEvidence(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('orderId') orderId: string
    ) {
        if (!orderId) throw new BadRequestException('Order ID is required');
        if (!this.isUuid(orderId)) throw new BadRequestException('Invalid order ID');
        await this.resourceAccess.assertUserCanAccessOrder(this.actor(req), orderId);

        const url = await this.uploadsService.uploadFile(file, `returns/${orderId}`);
        return { url };
    }

    @Post('disputes')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadDisputeEvidence(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('orderId') orderId: string
    ) {
        if (!orderId) throw new BadRequestException('Order ID is required');
        if (!this.isUuid(orderId)) throw new BadRequestException('Invalid order ID');
        await this.resourceAccess.assertUserCanAccessOrder(this.actor(req), orderId);

        const url = await this.uploadsService.uploadFile(file, `disputes/${orderId}`);
        return { url };
    }

    /** Support ticket attachments (customer / merchant) — not tied to an order UUID */
    @Post('support')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadSupportAttachment(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('folder') folder: string,
    ) {
        if (!file) throw new BadRequestException('File is required');
        const allowed = new Set(['customer-tickets', 'merchant-tickets']);
        const safeFolder = allowed.has(folder) ? folder : 'support';
        const url = await this.uploadsService.uploadFile(
            file,
            `${safeFolder}/${req.user.id}`,
            'support-files',
        );
        return { url };
    }

    @Post('verification')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadVerificationDocs(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('orderId') orderId: string,
        @Body('folder') folder: string
    ) {
        if (!orderId) throw new BadRequestException('Order ID is required');
        if (!this.isUuid(orderId)) {
            throw new BadRequestException('Invalid order ID');
        }
        await this.resourceAccess.assertUserCanAccessOrder(this.actor(req), orderId);
        const subFolder = folder || 'misc';

        const url = await this.uploadsService.uploadFile(
            file,
            `${subFolder}/${orderId}`,
            'verification-docs',
            'verification',
        );
        return { url };
    }

    @Post('avatar')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadAvatar(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) throw new BadRequestException('File is required');
        const url = await this.uploadsService.uploadFile(
            file,
            `avatars/${req.user.id}`,
            'marketplace-uploads',
            'avatar',
        );
        return { url };
    }

    @Post('chat')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadChatMedia(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('chatId') chatId: string,
    ) {
        if (!chatId) throw new BadRequestException('Chat ID is required');
        await this.resourceAccess.assertUserCanAccessChat(this.actor(req), chatId);
        const url = await this.uploadsService.uploadFile(file, `chat/${chatId}`, 'chat_media');
        return { url };
    }

    @Post('order-draft')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadOrderDraftMedia(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('folder') folder: string,
    ) {
        if (!folder) throw new BadRequestException('Folder is required');
        const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 120);
        const url = await this.uploadsService.uploadFile(
            file,
            `order-draft/${req.user.id}/${safeFolder}`,
            'marketplace-uploads',
        );
        return { url };
    }

    @Post('appeals')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', multerMemoryOptions))
    async uploadAppealEvidence(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
        @Body('violationId') violationId: string
    ) {
        if (!violationId) throw new BadRequestException('Violation ID is required');
        await this.resourceAccess.assertUserCanAccessViolation(this.actor(req), violationId);

        const url = await this.uploadsService.uploadFile(file, `appeals/${violationId}`, 'appeals');
        return { url };
    }

    @Post('sign')
    @UseGuards(JwtAuthGuard)
    @Throttle({ short: { limit: 60, ttl: 60_000 } })
    async signUpload(@Request() req, @Body() dto: SignUploadDto) {
        const policy = UPLOAD_POLICIES[dto.purpose];
        const limit = maxBytesFor(policy, dto.contentType);
        if (!limit) throw new BadRequestException('File type not allowed');
        if (dto.size > limit) throw new BadRequestException('File too large');

        const prefix = await this.resolvePrefix(req, dto);
        const path = `${prefix}/${req.user.id}/${randomUUID()}.${MIME_EXT[dto.contentType]}`;
        const signed = await this.uploadsService.createSignedUpload(policy.bucket, path);
        return { ...signed, bucket: policy.bucket };
    }

    @Post('confirm')
    @UseGuards(JwtAuthGuard)
    @Throttle({ short: { limit: 60, ttl: 60_000 } })
    async confirmUpload(@Request() req, @Body() dto: ConfirmUploadDto) {
        if (!isOwnSignedUploadPath(dto.path, String(req.user.id))) throw new ForbiddenException();
        const url = await this.uploadsService.confirmUpload(UPLOAD_POLICIES[dto.purpose], dto.path);
        return { url };
    }

    private async resolvePrefix(req: any, dto: SignUploadDto): Promise<string> {
        const userId: string = req.user.id;
        const storeId: string | null | undefined = req.user.storeId;
        const safe = (x: string) =>
            x.replace(/[^a-zA-Z0-9/_-]/g, '').split('/').filter(Boolean).join('/').slice(0, 120).replace(/\/+$/, '') ||
            'misc';
        const requireOrder = async () => {
            if (!dto.orderId || !this.isUuid(dto.orderId)) throw new BadRequestException('Invalid order ID');
            await this.resourceAccess.assertUserCanAccessOrder(this.actor(req), dto.orderId);
            return dto.orderId;
        };

        switch (dto.purpose) {
            case 'order-draft':
                return `order-draft/${userId}/${safe(dto.folder || 'misc')}`;
            case 'offer': {
                if (!storeId) throw new ForbiddenException();
                if (!dto.orderId || !this.isUuid(dto.orderId)) throw new BadRequestException('Invalid order ID');
                return `offers/${storeId}/${dto.orderId}`;
            }
            case 'verification': {
                const orderId = await requireOrder();
                return `${safe(dto.folder || 'misc')}/${orderId}`;
            }
            case 'returns':
                return `returns/${await requireOrder()}`;
            case 'disputes':
                return `disputes/${await requireOrder()}`;
            case 'support': {
                const f = dto.folder === 'customer-tickets' || dto.folder === 'merchant-tickets' ? dto.folder : 'support';
                return `${f}/${userId}`;
            }
            case 'chat':
                if (!dto.chatId || !SAFE_ID.test(dto.chatId)) throw new BadRequestException('Chat ID is required');
                await this.resourceAccess.assertUserCanAccessChat(this.actor(req), dto.chatId);
                return `chat/${dto.chatId}`;
            case 'appeals':
                if (!dto.violationId || !SAFE_ID.test(dto.violationId)) {
                    throw new BadRequestException('Violation ID is required');
                }
                await this.resourceAccess.assertUserCanAccessViolation(this.actor(req), dto.violationId);
                return `appeals/${dto.violationId}`;
            case 'avatar':
                return `avatars/${userId}`;
            case 'store-logo':
                if (!storeId) throw new ForbiddenException();
                return `stores/${storeId}`;
            case 'vendor-document':
                return `vendors/${userId}`;
            default:
                throw new BadRequestException('Invalid upload purpose');
        }
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value.trim(),
        );
    }
}
