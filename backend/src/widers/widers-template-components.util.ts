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

/** Widers dashboard variable keys (إعداد القالب → متغيرات النظام) */
const WIDERS_PARAMETER_NAMES: Partial<Record<TemplateBodyField, string>> = {
    name: 'name',
    otp_code: 'otp_code',
    order_number: 'order_number',
    status_detail: 'status_detail',
    tracking_number: 'tracking_number',
    invoice_number: 'invoice_number',
    amount: 'amount',
    summary: 'summary',
    store_name: 'store_name',
    doc_type: 'doc_type',
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
        normalized.includes('132001') ||
        normalized.includes('parameter name')
    );
}

export interface BuildTemplateComponentsOptions {
    bodyTexts: string[];
    bodyFields?: TemplateBodyField[];
    headerText?: string;
    buttonSuffix?: string;
    useNamedBodyParameters?: boolean;
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
            parameters: options.bodyTexts.map((text, index) => {
                const field = options.bodyFields?.[index];
                const parameterName =
                    options.useNamedBodyParameters && field
                        ? WIDERS_PARAMETER_NAMES[field]
                        : undefined;

                return {
                    type: 'text' as const,
                    text: truncateWhatsAppParam(text),
                    ...(parameterName ? { parameter_name: parameterName } : {}),
                };
            }),
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

function componentKey(components?: WidersTemplateComponent[]): string {
    return JSON.stringify(components ?? null);
}

export interface TemplateSendAttempt {
    components?: WidersTemplateComponent[];
    contactName?: string;
    label: string;
}

/**
 * Ordered send attempts for standard (transactional) templates.
 */
export function buildTemplateComponentVariants(
    options: BuildTemplateComponentsOptions,
): TemplateSendAttempt[] {
    const attempts: TemplateSendAttempt[] = [];
    const seen = new Set<string>();

    const push = (attempt: TemplateSendAttempt) => {
        const key = `${attempt.label}:${componentKey(attempt.components)}:${attempt.contactName ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        attempts.push(attempt);
    };

    const base = {
        bodyTexts: options.bodyTexts,
        bodyFields: options.bodyFields,
        headerText: options.headerText,
        buttonSuffix: options.buttonSuffix,
    };

    push({
        label: 'primary',
        components: buildTemplateComponents(base),
    });

    if (options.buttonSuffix) {
        push({
            label: 'no-button',
            components: buildTemplateComponents({
                ...base,
                buttonSuffix: undefined,
            }),
        });
    }

    if (options.headerText) {
        push({
            label: 'no-header',
            components: buildTemplateComponents({
                ...base,
                headerText: undefined,
            }),
        });
    }

    if (options.buttonSuffix && options.headerText) {
        push({
            label: 'body-only',
            components: buildTemplateComponents({
                bodyTexts: options.bodyTexts,
                bodyFields: options.bodyFields,
            }),
        });
    }

    if (options.useNamedBodyParameters) {
        push({
            label: 'named-body',
            components: buildTemplateComponents({
                ...base,
                buttonSuffix: undefined,
                useNamedBodyParameters: true,
            }),
        });
    }

    return attempts;
}

/**
 * Welcome templates in Widers: body {{1}} only (no header). Prefer contact-backed
 * resolution, then positional body, then named body, then optional URL button.
 */
export function buildWelcomeSendAttempts(
    options: BuildTemplateComponentsOptions & { contactName: string },
): TemplateSendAttempt[] {
    const attempts: TemplateSendAttempt[] = [];
    const seen = new Set<string>();

    const push = (attempt: TemplateSendAttempt) => {
        const key = `${attempt.label}:${componentKey(attempt.components)}:${attempt.contactName ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        attempts.push(attempt);
    };

    const base = {
        bodyTexts: options.bodyTexts,
        bodyFields: options.bodyFields,
    };

    // Widers «إعداد القالب»: {{1}} → اسم جهة الاتصال (resolved from contact)
    push({
        label: 'contact-only',
        contactName: options.contactName,
    });

    push({
        label: 'body-positional',
        contactName: options.contactName,
        components: buildTemplateComponents(base),
    });

    push({
        label: 'body-named',
        contactName: options.contactName,
        components: buildTemplateComponents({
            ...base,
            useNamedBodyParameters: true,
        }),
    });

    if (options.buttonSuffix) {
        push({
            label: 'body-button-positional',
            contactName: options.contactName,
            components: buildTemplateComponents({
                ...base,
                buttonSuffix: options.buttonSuffix,
            }),
        });
    }

    return attempts;
}
