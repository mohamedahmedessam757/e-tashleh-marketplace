import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateStaticPageDto } from '../platform-settings/dto/settings-audit.dto';

@Injectable()
export class StaticPagesService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private readonly auditLogs: AuditLogsService,
    ) { }

    async onModuleInit() {
        try {
            const count = await this.prisma.staticPage.count();
            if (count === 0) {
                const pages = [
                    { slug: 'about', titleAr: 'من نحن', titleEn: 'About Us', contentAr: 'محتوى تجريبي عن الشركة...', contentEn: 'Demo content about us...' },
                    { slug: 'how-we-work', titleAr: 'كيف نعمل', titleEn: 'How We Work', contentAr: 'خطوات العمل...', contentEn: 'Work steps...' },
                    { slug: 'terms', titleAr: 'الشروط والأحكام', titleEn: 'Terms & Conditions', contentAr: 'الشروط...', contentEn: 'Terms...' },
                    { slug: 'privacy', titleAr: 'سياسة الخصوصية', titleEn: 'Privacy Policy', contentAr: 'السياسة...', contentEn: 'Policy...' },
                    { slug: 'return-policy', titleAr: 'سياسة الإرجاع', titleEn: 'Return Policy', contentAr: 'سياسة الإرجاع...', contentEn: 'Return Policy...' },
                    { slug: 'contact', titleAr: 'تواصل معنا', titleEn: 'Contact Us', contentAr: 'بيانات التواصل...', contentEn: 'Contact info...' },
                    { slug: 'payment-policy', titleAr: 'سياسة الدفع', titleEn: 'Payment Policy', contentAr: 'سياسة الدفع...', contentEn: 'Payment policy...' },
                    { slug: 'shipping-policy', titleAr: 'سياسة الشحن', titleEn: 'Shipping Policy', contentAr: 'سياسة الشحن...', contentEn: 'Shipping policy...' },
                    { slug: 'loyalty-policy', titleAr: 'سياسة الولاء', titleEn: 'Loyalty Policy', contentAr: 'سياسة الولاء...', contentEn: 'Loyalty policy...' },
                    { slug: 'economic-registry', titleAr: 'السجل الاقتصادي', titleEn: 'Economic Registry', contentAr: 'محتوى السجل...', contentEn: 'Registry content...' },
                ];

                for (const page of pages) {
                    await this.prisma.staticPage.create({ data: page });
                }
                console.log('Seeded Static Pages');
            }
        } catch (error) {
            console.warn('Static pages seed skipped — database not ready:', error instanceof Error ? error.message : error);
        }
    }

    async findAllPublished() {
        return this.prisma.staticPage.findMany({
            where: { isPublished: true },
            select: {
                slug: true,
                titleAr: true,
                titleEn: true,
                updatedAt: true,
            },
            orderBy: { slug: 'asc' },
        });
    }

    async findAllAdmin() {
        return this.prisma.staticPage.findMany({ orderBy: { slug: 'asc' } });
    }

    async findPublishedBySlug(slug: string) {
        const page = await this.prisma.staticPage.findFirst({
            where: { slug, isPublished: true },
        });
        if (!page) throw new NotFoundException(`Page "${slug}" not found`);
        return page;
    }

    async findOneAdmin(slug: string) {
        const page = await this.prisma.staticPage.findUnique({ where: { slug } });
        if (!page) throw new NotFoundException(`Page "${slug}" not found`);
        return page;
    }

    async updateBySlug(
        slug: string,
        actorId: string,
        dto: UpdateStaticPageDto,
    ) {
        const existing = await this.findOneAdmin(slug);
        const { value, reason, adminName, adminSignature, adminSignatureType, ...fields } = dto as UpdateStaticPageDto & { value?: unknown };

        const data: Record<string, unknown> = {
            version: existing.version + 1,
            updatedById: actorId,
            updatedAt: new Date(),
        };
        if (fields.titleAr !== undefined) data.titleAr = fields.titleAr;
        if (fields.titleEn !== undefined) data.titleEn = fields.titleEn;
        if (fields.contentAr !== undefined) data.contentAr = fields.contentAr;
        if (fields.contentEn !== undefined) data.contentEn = fields.contentEn;
        if (fields.isPublished !== undefined) data.isPublished = fields.isPublished;

        const updated = await this.prisma.staticPage.update({
            where: { slug },
            data: data as any,
        });

        await this.auditLogs.logAction({
            actorId,
            actorType: 'ADMIN',
            action: 'STATIC_PAGE_UPDATE',
            entity: 'STATIC_PAGE',
            metadata: {
                slug,
                before: {
                    titleAr: existing.titleAr,
                    titleEn: existing.titleEn,
                    isPublished: existing.isPublished,
                    version: existing.version,
                },
                after: {
                    titleAr: updated.titleAr,
                    titleEn: updated.titleEn,
                    isPublished: updated.isPublished,
                    version: updated.version,
                },
                adminName,
                adminSignature,
                adminSignatureType,
            },
            reason: reason || `Updated static page: ${slug}`,
        });

        return updated;
    }

    /** @deprecated use findPublishedBySlug */
    async findAll() {
        return this.findAllPublished();
    }

    /** @deprecated use findPublishedBySlug */
    async findOne(slug: string) {
        return this.findPublishedBySlug(slug);
    }
}
