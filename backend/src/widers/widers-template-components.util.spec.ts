import {
    AUTH_OTP_PAYLOAD_VERSION,
    buildAuthOtpSendAttempts,
    buildOtpSendAttempts,
    buildTemplateComponentVariants,
    buildWelcomeSendAttempts,
    extractAuthOtpCode,
    resolveTemplateBodyValue,
} from './widers-template-components.util';

describe('widers-template-components.util', () => {
    describe('resolveTemplateBodyValue', () => {
        it('falls back for empty name', () => {
            expect(resolveTemplateBodyValue('name', '   ')).toBe('مستخدم');
        });
    });

    describe('buildWelcomeSendAttempts', () => {
        it('sends exactly one name param via components', () => {
            const attempts = buildWelcomeSendAttempts({
                bodyTexts: ['أحمد'],
                bodyFields: ['name'],
                contactName: 'أحمد',
            });

            expect(attempts[0]?.label).toBe('components-body');
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
        });
    });

    describe('buildAuthOtpSendAttempts', () => {
        it('sends auth-copy-code-v4 with body + button url', () => {
            const attempts = buildAuthOtpSendAttempts('123456');

            expect(attempts).toHaveLength(1);
            expect(attempts[0]?.label).toBe(AUTH_OTP_PAYLOAD_VERSION);
            expect(attempts[0]?.components).toHaveLength(2);
            expect(attempts[0]?.components?.[0]?.type).toBe('body');
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
            expect(attempts[0]?.components?.[0]?.parameters?.[0]?.text).toBe('123456');
            expect(attempts[0]?.components?.[1]?.type).toBe('button');
            expect(attempts[0]?.components?.[1]?.sub_type).toBe('url');
            expect(attempts[0]?.components?.[1]?.parameters?.[0]?.text).toBe('123456');
            expect(attempts[0]?.bodyParameters).toBeUndefined();
        });
    });

    describe('extractAuthOtpCode', () => {
        it('prefers numeric code from legacy [name, code]', () => {
            expect(
                extractAuthOtpCode({
                    bodyParameters: ['abd_alkarem', '889900'],
                }),
            ).toBe('889900');
        });
    });

    describe('buildOtpSendAttempts', () => {
        it('defaults to auth-copy-code-v4', () => {
            const attempts = buildOtpSendAttempts({
                name: 'أحمد',
                otpCode: '123456',
            });

            expect(attempts[0]?.label).toBe(AUTH_OTP_PAYLOAD_VERSION);
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
        });
    });

    describe('buildTemplateComponentVariants', () => {
        it('does not emit a header component for static docs-only headers', () => {
            const attempts = buildTemplateComponentVariants({
                bodyTexts: ['أ', 'ب', 'ج'],
                bodyFields: ['name', 'order_number', 'status_detail'],
                buttonSuffix: 'order-details/1',
            });

            const primary = attempts[0];
            expect(primary?.components?.some((c) => c.type === 'header')).toBe(false);
            expect(primary?.components?.find((c) => c.type === 'body')?.parameters).toHaveLength(3);
        });
    });
});
