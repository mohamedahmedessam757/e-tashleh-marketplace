import type { TemplateBodyField } from './template-registry';
import { truncateWhatsAppParam } from './template-registry';
import type { WidersTemplateComponent } from './widers.types';

const BODY_FIELD_DEFAULTS: Partial<Record<TemplateBodyField, string>> = {
    name: 'مستخدم',
    otp_code: '000000',
    order_number: '-',
    status_detail: '-',
    tracking_number: 'غير متوفر',
    invoice_number: '-',
    amount: '-',
    summary: '-',
    store_name: 'متجر',
    doc_type: 'مستند',
};

/** Meta (#100) and Widers often reject empty template variables. */
export function resolveTemplateBodyValue(
    field: TemplateBodyField,
    raw?: string | null,
): string {
    const trimmed = raw?.trim();
    if (trimmed) return truncateWhatsAppParam(trimmed);
    return truncateWhatsAppParam(BODY_FIELD_DEFAULTS[field] ?? '-');
}

export function isWhatsAppInvalidParameterError(error?: string | null): boolean {
    if (!error) return false;
    const normalized = error.toLowerCase();
    return (
        normalized.includes('invalid parameter') ||
        normalized.includes('(#100)') ||
        normalized.includes('error 100') ||
        normalized.includes('132000') ||
        normalized.includes('132001')
    );
}

export interface BuildTemplateComponentsOptions {
    bodyTexts: string[];
    headerText?: string;
    buttonSuffix?: string;
    /** Used only for welcome_* fallback when Widers template has a static header. */
    welcomeFallbackHeader?: string;
}

export function buildTemplateComponents(
    options: BuildTemplateComponentsOptions,
): WidersTemplateComponent[] {
    const components: WidersTemplateComponent[] = [];

    if (options.headerText) {
        components.push({
            type: 'header',
            parameters: [
                {
                    type: 'text',
                    text: truncateWhatsAppParam(options.headerText, 60),
                },
            ],
        });
    }

    if (options.bodyTexts.length > 0) {
        components.push({
            type: 'body',
            parameters: options.bodyTexts.map((t) => ({
                type: 'text' as const,
                text: truncateWhatsAppParam(t),
            })),
        });
    }

    if (options.buttonSuffix) {
        components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: options.buttonSuffix }],
        });
    }

    return components;
}

function componentKey(components: WidersTemplateComponent[]): string {
    return JSON.stringify(components);
}

/**
 * Ordered component payloads to try when Meta returns (#100) Invalid parameter.
 * Covers static vs dynamic URL buttons and optional/missing headers in Widers.
 */
export function buildTemplateComponentVariants(
    options: BuildTemplateComponentsOptions,
): WidersTemplateComponent[][] {
    const primary = buildTemplateComponents(options);
    const variants: WidersTemplateComponent[][] = [primary];
    const seen = new Set<string>([componentKey(primary)]);

    const push = (components: WidersTemplateComponent[]) => {
        const key = componentKey(components);
        if (seen.has(key)) return;
        seen.add(key);
        variants.push(components);
    };

    if (options.buttonSuffix) {
        push(
            buildTemplateComponents({
                ...options,
                buttonSuffix: undefined,
            }),
        );
    }

    if (options.headerText) {
        push(
            buildTemplateComponents({
                ...options,
                headerText: undefined,
            }),
        );
    }

    if (options.buttonSuffix && options.headerText) {
        push(
            buildTemplateComponents({
                bodyTexts: options.bodyTexts,
            }),
        );
    }

    if (!options.headerText && options.welcomeFallbackHeader) {
        push(
            buildTemplateComponents({
                ...options,
                headerText: options.welcomeFallbackHeader,
            }),
        );
        if (options.buttonSuffix) {
            push(
                buildTemplateComponents({
                    bodyTexts: options.bodyTexts,
                    headerText: options.welcomeFallbackHeader,
                }),
            );
        }
    }

    return variants;
}
