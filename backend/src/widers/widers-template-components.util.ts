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
    /**
     * Only for templates whose Meta header is a *variable* ({{1}}).
     * Static headers (most txn_* templates) must NOT be sent — leave undefined.
     */
    headerVariableText?: string;
    buttonSuffix?: string;
    useNamedBodyParameters?: boolean;
}

export function buildTemplateComponents(
    options: BuildTemplateComponentsOptions,
): WidersTemplateComponent[] {
    const components: WidersTemplateComponent[] = [];

    if (options.headerVariableText) {
        components.push({
            type: 'header',
            parameters: [
                {
                    type: 'text',
                    text: truncateWhatsAppParam(options.headerVariableText, 60),
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
    parsed: {
        success?: boolean;
        status?: string;
        error?: string | { message?: string; code?: number; error_data?: unknown };
        message?: string;
        data?: unknown;
    },
    rawText?: string,
): string | undefined {
    const errorObj =
        parsed.error && typeof parsed.error === 'object'
            ? parsed.error
            : undefined;
    const errorStr =
        typeof parsed.error === 'string'
            ? parsed.error
            : typeof errorObj?.message === 'string'
              ? errorObj.message
              : undefined;

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

    const combined = [errorStr, parsed.message, dataError, rawText]
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .join(' ');

    const statusFailed =
        parsed.success === false ||
        (typeof parsed.status === 'string' &&
            parsed.status.toLowerCase() !== 'success');

    if (statusFailed) {
        return errorStr ?? parsed.message ?? (combined || 'Widers send failed');
    }

    if (isWhatsAppInvalidParameterError(combined)) {
        return combined;
    }

    return undefined;
}

export function formatWidersError(
    error?: string | { message?: string; code?: number; error_data?: unknown } | null,
    fallback?: string,
): string | undefined {
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object' && typeof error.message === 'string') {
        return error.message;
    }
    return fallback;
}

/** Normalize Widers wpbox success flags (`success` boolean or `status: "success"`). */
export function isWidersSendSuccess(parsed: {
    success?: boolean;
    status?: string;
}): boolean {
    if (typeof parsed.status === 'string') {
        return parsed.status.toLowerCase() === 'success';
    }
    // Undefined success with no status → treat as ok only if caller already filtered errors
    return parsed.success !== false;
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
 * Same body param count on every attempt — only packaging / button presence changes.
 * Never sends static headerText (registry headerText is documentation only).
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

    const bodyTexts = options.bodyTexts;
    const bodyFields = options.bodyFields;
    const base = {
        bodyTexts,
        bodyFields,
        headerVariableText: options.headerVariableText,
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

    push({
        label: 'parameters-array',
        bodyParameters: bodyTexts,
        parameterFormat: 'parameters',
    });

    push({
        label: 'variables-array',
        bodyParameters: bodyTexts,
        parameterFormat: 'variables',
    });

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

/**
 * AUTHENTICATION COPY_CODE OTP via Widers.
 *
 * Live getTemplates: BODY has {{1}}, BUTTON URL also has {{1}}.
 * Empirically (probe-widers-otp-delivery.mjs, Jul 2026):
 * - components body-only with 1 text param → DELIVERS
 * - components body + button url → also delivers on clean contacts
 * - flat parameters:[code] → does NOT substitute {{1}} via Widers
 * - parameters:[name, code] / body with 2 params → Meta #132000 (2 vs 1)
 *
 * Use body-only only. Widers fills COPY_CODE button from the same body {{1}}.
 * Never include `name` or a second body parameter.
 */
export function buildAuthOtpSendAttempts(otpCode: string): TemplateSendAttempt[] {
    const code = truncateWhatsAppParam(otpCode.trim().replace(/\s+/g, '') || '000000', 15);
    if (!/^\d{4,8}$/.test(code)) {
        // Still send digits-only best-effort; callers generate numeric OTP
    }

    return [
        {
            label: 'auth-body-only-v3',
            components: [
                {
                    type: 'body',
                    parameters: [{ type: 'text', text: code }],
                },
            ],
        },
    ];
}

/** @deprecated Use buildAuthOtpSendAttempts — kept for tests/compat */
export function buildOtpSendAttempts(options: {
    name: string;
    otpCode: string;
    headerText?: string;
    bodyFields?: TemplateBodyField[];
}): TemplateSendAttempt[] {
    const bodyFields: TemplateBodyField[] = options.bodyFields?.length
        ? options.bodyFields
        : ['otp_code'];
    if (bodyFields.length === 1 && bodyFields[0] === 'otp_code') {
        return buildAuthOtpSendAttempts(options.otpCode);
    }

    // Legacy utility path (name + otp) — must not be used with AUTHENTICATION templates
    const bodyTexts = bodyFields.map((field) =>
        field === 'name' ? options.name : options.otpCode,
    );
    return [
        {
            label: 'legacy-body',
            components: buildTemplateComponents({ bodyTexts, bodyFields }),
        },
        {
            label: 'parameters-array',
            bodyParameters: bodyTexts,
            parameterFormat: 'parameters',
        },
    ];
}
