import { Injectable, Logger } from '@nestjs/common';
import { WidersConfig } from './widers.config';
import type {
    MakeContactPayload,
    SendTemplateMessagePayload,
    WidersApiResponse,
    WidersTemplateComponent,
} from './widers.types';
import { normalizeGulfPhone } from '../common/phone/gulf-phone.util';
import {
    buildTemplateComponents,
    extractWidersTemplateSendError,
    formatWidersError,
    isWidersSendSuccess,
} from './widers-template-components.util';

const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class WidersService {
    private readonly logger = new Logger(WidersService.name);

    constructor(private readonly widersConfig: WidersConfig) {}

    isReady(): boolean {
        return this.widersConfig.isConfigured();
    }

    /** E.164 normalization for GCC registration countries (+966 … +968). */
    normalizePhone(phone: string, countryCode?: string | null): string {
        return normalizeGulfPhone(phone, countryCode);
    }

    private async post<T>(
        path: string,
        body: Record<string, unknown>,
    ): Promise<WidersApiResponse<T>> {
        const token = this.widersConfig.apiToken;
        if (!token) {
            return { success: false, error: 'WIDERS_API_TOKEN not configured' };
        }

        const url = this.widersConfig.apiPath(path);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ...body, token }),
                signal: controller.signal,
            });

            const text = await response.text();
            let parsed: WidersApiResponse<T> = {};
            try {
                parsed = text ? (JSON.parse(text) as WidersApiResponse<T>) : {};
            } catch {
                parsed = { success: false, error: text || response.statusText };
            }

            if (!response.ok) {
                this.logger.warn(
                    `Widers ${path} HTTP ${response.status}: ${parsed.error ?? parsed.message ?? text}`,
                );
                return {
                    ...parsed,
                    success: false,
                    error: parsed.error ?? parsed.message ?? `HTTP ${response.status}`,
                };
            }

            return { ...parsed, success: parsed.success !== false };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown Widers error';
            this.logger.error(`Widers ${path} failed: ${message}`);
            return { success: false, error: message };
        } finally {
            clearTimeout(timeout);
        }
    }

    private async get<T>(path: string, query: Record<string, string> = {}): Promise<WidersApiResponse<T>> {
        const token = this.widersConfig.apiToken;
        if (!token) {
            return { success: false, error: 'WIDERS_API_TOKEN not configured' };
        }

        const url = new URL(this.widersConfig.apiPath(path));
        url.searchParams.set('token', token);
        for (const [k, v] of Object.entries(query)) {
            url.searchParams.set(k, v);
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });

            const text = await response.text();
            let parsed: WidersApiResponse<T> = {};
            try {
                parsed = text ? (JSON.parse(text) as WidersApiResponse<T>) : {};
            } catch {
                parsed = { success: false, error: text || response.statusText };
            }

            if (!response.ok) {
                return {
                    ...parsed,
                    success: false,
                    error: parsed.error ?? parsed.message ?? `HTTP ${response.status}`,
                };
            }

            return { ...parsed, success: parsed.success !== false };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown Widers error';
            return { success: false, error: message };
        } finally {
            clearTimeout(timeout);
        }
    }

    buildComponents(
        bodyTexts: string[],
        options?: {
            headerVariableText?: string;
            buttonSuffix?: string;
        },
    ): WidersTemplateComponent[] {
        return buildTemplateComponents({
            bodyTexts,
            headerVariableText: options?.headerVariableText,
            buttonSuffix: options?.buttonSuffix,
        });
    }

    async sendTemplateMessage(
        payload: SendTemplateMessagePayload,
    ): Promise<WidersApiResponse> {
        if (!this.widersConfig.enabled) {
            this.logger.debug(
                `Widers disabled — skip template ${payload.templateName} to ${payload.phone}`,
            );
            return { success: false, error: 'WIDERS_ENABLED is false' };
        }

        const phone = this.normalizePhone(payload.phone);
        const body: Record<string, unknown> = {
            phone,
            template_name: payload.templateName,
            template_language: payload.templateLanguage,
        };

        if (payload.components?.length) {
            // Harden AUTH OTP: never forward >1 body parameter (Meta #132000)
            if (payload.templateName.startsWith('auth_otp_')) {
                body.components = payload.components
                    .filter((c) => c.type === 'body')
                    .map((c) => ({
                        type: 'body' as const,
                        parameters: (c.parameters ?? []).slice(0, 1).map((p) => ({
                            type: 'text' as const,
                            text: String(p.text ?? '').trim(),
                        })),
                    }))
                    .filter((c) => c.parameters.length === 1);
                if (!(body.components as unknown[]).length) {
                    return {
                        success: false,
                        error: 'auth_otp payload must include exactly 1 body parameter',
                    };
                }
            } else {
                body.components = payload.components;
            }
        } else if (payload.bodyParameters?.length) {
            if (payload.templateName.startsWith('auth_otp_')) {
                // Flat parameters for AUTH often fail on Widers; force single body component
                const code = String(payload.bodyParameters[0] ?? '').trim();
                body.components = [
                    {
                        type: 'body',
                        parameters: [{ type: 'text', text: code }],
                    },
                ];
            } else {
                const key =
                    payload.parameterFormat === 'variables' ? 'variables' : 'parameters';
                body[key] = payload.bodyParameters;
            }
        }

        const formatLabel = payload.components?.length
            ? `components×${payload.components.length}`
            : `${payload.parameterFormat ?? 'parameters'}×${payload.bodyParameters?.length ?? 0}`;

        this.logger.log(
            `Sending template ${payload.templateName} (${payload.templateLanguage}) → ${phone} [${formatLabel}]`,
        );
        if (payload.templateName.startsWith('auth_otp_')) {
            // Log shape only (never log the OTP code itself in production logs at info — truncate)
            const shape = payload.components?.length
                ? payload.components.map((c) => ({
                      type: c.type,
                      sub_type: c.sub_type,
                      paramCount: c.parameters?.length ?? 0,
                  }))
                : {
                      format: payload.parameterFormat ?? 'parameters',
                      count: payload.bodyParameters?.length ?? 0,
                  };
            this.logger.log(`OTP payload shape for ${payload.templateName}: ${JSON.stringify(shape)}`);
        }

        const token = this.widersConfig.apiToken;
        if (!token) {
            return { success: false, error: 'WIDERS_API_TOKEN not configured' };
        }

        const url = this.widersConfig.apiPath('sendtemplatemessage');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ ...body, token }),
                signal: controller.signal,
            });

            const text = await response.text();
            let parsed: WidersApiResponse = {};
            try {
                parsed = text ? (JSON.parse(text) as WidersApiResponse) : {};
            } catch {
                parsed = { success: false, error: text || response.statusText };
            }

            if (!response.ok) {
                const error = parsed.error ?? parsed.message ?? `HTTP ${response.status}`;
                this.logger.warn(`Widers sendtemplatemessage HTTP ${response.status}: ${error}`);
                return { ...parsed, success: false, error };
            }

            const embeddedError = extractWidersTemplateSendError(parsed, text);
            if (embeddedError) {
                this.logger.warn(
                    `Widers sendtemplatemessage rejected ${payload.templateName}: ${embeddedError}`,
                );
                return { ...parsed, success: false, error: embeddedError };
            }

            const ok = isWidersSendSuccess(parsed);
            if (!ok) {
                const err =
                    typeof parsed.error === 'string'
                        ? parsed.error
                        : parsed.error && typeof parsed.error === 'object'
                          ? parsed.error.message
                          : parsed.message ?? 'Widers send failed';
                return { ...parsed, success: false, error: err };
            }

            this.logger.log(
                `Widers accepted ${payload.templateName} message_id=${parsed.message_id ?? '?'} wamid=${parsed.message_wamid ?? 'null'}`,
            );
            return { ...parsed, success: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown Widers error';
            this.logger.error(`Widers sendtemplatemessage failed: ${message}`);
            return { success: false, error: message };
        } finally {
            clearTimeout(timeout);
        }
    }

    async makeContact(payload: MakeContactPayload): Promise<WidersApiResponse> {
        if (!this.widersConfig.enabled) {
            return { success: false, error: 'WIDERS_ENABLED is false' };
        }

        const phone = this.normalizePhone(payload.phone);
        const body: Record<string, unknown> = { phone };

        if (payload.name) body.name = payload.name;
        if (payload.email) body.email = payload.email;
        if (payload.groups) body.groups = payload.groups;
        if (payload.tags) body.tags = payload.tags;
        if (payload.fields) Object.assign(body, payload.fields);

        return this.post('makeContact', body);
    }

    async getTemplates(): Promise<WidersApiResponse<unknown[]>> {
        return this.get<unknown[]>('getTemplates');
    }

    async ping(): Promise<{ reachable: boolean; templateCount?: number; error?: string }> {
        if (!this.isReady()) {
            return { reachable: false, error: 'Token not configured' };
        }

        const result = await this.getTemplates();
        if (!isWidersSendSuccess(result)) {
            return {
                reachable: false,
                error: formatWidersError(result.error, result.message),
            };
        }

        const data = result.data;
        const count = Array.isArray(data) ? data.length : undefined;
        return { reachable: true, templateCount: count };
    }
}
