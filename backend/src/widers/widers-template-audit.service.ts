import { Injectable } from '@nestjs/common';
import { TEMPLATE_REGISTRY } from './template-registry';
import { WidersService } from './widers.service';

export interface TemplateAuditRow {
    name: string;
    familyBase: string;
    inRegistry: boolean;
    inWidersApi: boolean;
    wiredInCode: boolean;
    wiredEvents: string[];
    category: string;
    audience: string;
}

export interface TemplateAuditReport {
    registryCount: number;
    widersApiCount: number;
    allPresentInWiders: boolean;
    allWired: boolean;
    missingInWiders: string[];
    missingWiring: string[];
    templates: TemplateAuditRow[];
}

/** Maps template family base → notification/code events that dispatch it */
export const WIRED_TEMPLATE_EVENTS: Record<string, string[]> = {
    auth_otp_customer: ['otp.service:REGISTER/LOGIN whatsapp customer'],
    auth_otp_vendor: ['otp.service:REGISTER/LOGIN whatsapp vendor'],
    txn_order_customer: ['OFFER', 'ORDER', 'ORDER_UPDATE', 'payment (no invoice)'],
    txn_order_merchant: ['OFFER', 'ORDER', 'ORDER_UPDATE', 'payment (no invoice)'],
    txn_shipment_customer: ['SHIPMENT_UPDATE'],
    txn_shipment_merchant: ['SHIPMENT_UPDATE'],
    txn_invoice_customer: ['payment + invoice'],
    txn_invoice_merchant: ['payment + invoice'],
    txn_waybill_customer: ['ORDER_UPDATE (waybill keywords)'],
    txn_waybill_merchant: ['ORDER_UPDATE (waybill keywords)'],
    txn_document_vendor: ['DOC_EXPIRY', 'SUCCESS', 'document notifications'],
    txn_verification_customer: ['ORDER/ORDER_UPDATE + metadata.verification'],
    txn_verification_merchant: ['ORDER/ORDER_UPDATE + metadata.verification'],
    welcome_customer: ['auth.service:register CUSTOMER'],
    welcome_vendor: ['auth.service:register VENDOR'],
};

function familyBaseFromTemplateName(name: string): string {
    return name.replace(/_ar$|_en$/, '');
}

function extractApiTemplateNames(data: unknown): string[] {
    if (!Array.isArray(data)) return [];
    const names: string[] = [];
    for (const item of data) {
        if (typeof item === 'string') {
            names.push(item);
            continue;
        }
        if (item && typeof item === 'object') {
            const rec = item as Record<string, unknown>;
            const raw =
                rec.name ??
                rec.template_name ??
                rec.templateName ??
                rec.title;
            if (typeof raw === 'string' && raw.trim()) {
                names.push(raw.trim());
            }
        }
    }
    return names;
}

@Injectable()
export class WidersTemplateAuditService {
    constructor(private readonly widers: WidersService) {}

    async audit(): Promise<TemplateAuditReport> {
        const apiResult = this.widers.isReady()
            ? await this.widers.getTemplates()
            : { success: false, data: [] as unknown[] };

        const apiNames = new Set(
            extractApiTemplateNames(apiResult.data).map((n) => n.toLowerCase()),
        );

        const templates: TemplateAuditRow[] = TEMPLATE_REGISTRY.map((def) => {
            const familyBase = familyBaseFromTemplateName(def.name);
            const wiredEvents = WIRED_TEMPLATE_EVENTS[familyBase] ?? [];
            const inWidersApi =
                apiNames.size === 0
                    ? false
                    : apiNames.has(def.name.toLowerCase()) ||
                      [...apiNames].some((n) => n.includes(familyBase));

            return {
                name: def.name,
                familyBase,
                inRegistry: true,
                inWidersApi,
                wiredInCode: wiredEvents.length > 0,
                wiredEvents,
                category: def.category,
                audience: def.audience,
            };
        });

        const missingInWiders = templates
            .filter((t) => !t.inWidersApi && apiNames.size > 0)
            .map((t) => t.name);

        const missingWiring = templates.filter((t) => !t.wiredInCode).map((t) => t.name);

        return {
            registryCount: TEMPLATE_REGISTRY.length,
            widersApiCount: apiNames.size,
            allPresentInWiders: missingInWiders.length === 0,
            allWired: missingWiring.length === 0,
            missingInWiders,
            missingWiring,
            templates,
        };
    }

    /** Sample body fields for dev smoke tests */
    sampleFieldsForFamily(familyBase: string): Record<string, string> {
        const samples: Record<string, string> = {
            name: 'اختبار',
            otp_code: '123456',
            order_number: 'ORD-2606-00001',
            status_detail: 'تحديث تجريبي',
            tracking_number: 'TRK-TEST-001',
            invoice_number: 'INV-TEST-001',
            amount: '100 AED',
            summary: 'ملخص تجريبي',
            store_name: 'متجر تجريبي',
            doc_type: 'رخصة تجارية',
        };

        const def = TEMPLATE_REGISTRY.find(
            (t) => familyBaseFromTemplateName(t.name) === familyBase,
        );
        if (!def) return { name: samples.name };

        const fields: Record<string, string> = {};
        for (const key of def.bodyFields) {
            fields[key] = samples[key] ?? '-';
        }
        return fields;
    }
}
