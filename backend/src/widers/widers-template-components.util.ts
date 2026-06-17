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
        normalized.includes('number of parameters') ||
        normalized.includes('parameter name')
    );
}

export function isParameterCountMismatchError(error?: string | null): boolean {
    if (!error) return false;
    const normalized = error.toLowerCase();
    return (
        normalized.includes('132000') ||
        normalized.includes('number of parameters')
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

function attemptKey(attempt: TemplateSendAttempt): string {
    return `${attempt.label}:${componentKey(attempt.components)}:${JSON.stringify(attempt.bodyParameters ?? null)}`;
}

/** Detect Meta/Widers errors embedded in HTTP-200 responses. */
export function extractWidersTemplateSendError(
    parsed: { success?: boolean; error?: string; message?: string; data?: unknown },
    rawText?: string,
): string | undefined {
    const dataError =
        parsed.data && typeof parsed.data === 'object'
            ? (() => {
                  const d = parsed.data as Record<string, unknown>;
                  const nested = [d.error, d.message, d.status, d.details]
                      .filter((v) => typeof v === 'string')
                      .join(' ');
                  return nested || undefined;
              })()
            : typeof parsed.data === 'string'
              ? parsed.data
              : undefined;

    const combined = [parsed.error, parsed.message, dataError, rawText]
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .join(' ');

    if (parsed.success === false) {
        return parsed.error ?? parsed.message ?? (combined || 'Widers send failed');
    }

    if (isWhatsAppInvalidParameterError(combined)) {
        return combined;
    }

    return undefined;
}

export interface TemplateSendAttempt {
    label: string;
    components?: WidersTemplateComponent[];
    /** Positional {{1}}…{{n}} — wpbox `parameters` / `variables` arrays */
    bodyParameters?: string[];
    parameterFormat?: 'parameters' | 'variables';
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
        const key = attemptKey(attempt);
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
 * Welcome templates: exactly one body variable {{1}}.
 * Never use contact-only (0 params → #132000 when {{1}} is not mapped in Widers UI).
 */
export function buildWelcomeSendAttempts(
    options: BuildTemplateComponentsOptions & { contactName: string },
): TemplateSendAttempt[] {
    const attempts: TemplateSendAttempt[] = [];
    const seen = new Set<string>();

    const push = (attempt: TemplateSendAttempt) => {
        const key = attemptKey(attempt);
        if (seen.has(key)) return;
        seen.add(key);
        attempts.push(attempt);
    };

    const nameValue = options.bodyTexts[0] ?? options.contactName;

    push({
        label: 'components-body',
        components: buildTemplateComponents({
            bodyTexts: [nameValue],
            bodyFields: options.bodyFields,
        }),
    });

    push({
        label: 'parameters-array',
        bodyParameters: [nameValue],
        parameterFormat: 'parameters',
    });

    push({
        label: 'variables-array',
        bodyParameters: [nameValue],
        parameterFormat: 'variables',
    });

    return attempts;
}
