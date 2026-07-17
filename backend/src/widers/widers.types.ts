export type WidersTemplateLanguage = 'ar' | 'en';

export type WidersAudience = 'customer' | 'merchant' | 'vendor' | 'admin';

export type WidersTemplateCategory = 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';

export type WidersOtpMode = 'authentication' | 'utility';

export interface WidersTextParameter {
    type: 'text';
    text: string;
    /** Meta named-parameter templates (Widers «إعداد القالب») */
    parameter_name?: string;
}

export interface WidersTemplateComponent {
    type: 'header' | 'body' | 'button';
    sub_type?: 'url' | 'quick_reply' | 'otp';
    index?: string;
    parameters: WidersTextParameter[];
}

export interface SendTemplateMessagePayload {
    phone: string;
    templateName: string;
    templateLanguage: WidersTemplateLanguage | string;
    components?: WidersTemplateComponent[];
    /** wpbox positional values — alternative to `components` (exactly matches {{1}}…{{n}}) */
    bodyParameters?: string[];
    /** When set with bodyParameters, sends `variables` instead of `parameters` */
    parameterFormat?: 'parameters' | 'variables';
}

export interface MakeContactPayload {
    phone: string;
    name?: string;
    email?: string;
    groups?: string;
    tags?: string;
    fields?: Record<string, string>;
}

export interface WidersApiResponse<T = unknown> {
    success?: boolean;
    /** Widers wpbox often returns `status: "success" | "error"` instead of boolean `success` */
    status?: string;
    message?: string;
    message_id?: number | string;
    message_wamid?: string | null;
    data?: T;
    error?: string | { message?: string; code?: number; error_data?: unknown };
}

export interface WidersHealthStatus {
    enabled: boolean;
    configured: boolean;
    apiReachable: boolean;
    frontendUrl: string | null;
    otpMode: WidersOtpMode;
    templateCount?: number;
    message?: string;
}

