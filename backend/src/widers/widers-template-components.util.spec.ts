import {
    buildAuthOtpSendAttempts,
    buildOtpSendAttempts,
    buildTemplateComponentVariants,
    buildWelcomeSendAttempts,
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
        it('starts with body-only single otp param', () => {
            const attempts = buildAuthOtpSendAttempts('123456');

            expect(attempts[0]?.label).toBe('body-only');
            expect(attempts[0]?.components).toHaveLength(1);
            expect(attempts[0]?.components?.[0]?.type).toBe('body');
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
            expect(attempts[0]?.components?.[0]?.parameters?.[0]?.text).toBe('123456');
        });

        it('never sends two body parameters on any attempt', () => {
            const attempts = buildAuthOtpSendAttempts('654321');
            for (const attempt of attempts) {
                const body = attempt.components?.find((c) => c.type === 'body');
                if (body) {
                    expect(body.parameters).toHaveLength(1);
                }
                if (attempt.bodyParameters) {
                    expect(attempt.bodyParameters).toHaveLength(1);
                }
            }
        });

        it('includes packaging fallbacks with same single param', () => {
            const attempts = buildAuthOtpSendAttempts('111222');
            expect(attempts.find((a) => a.label === 'parameters-array')?.bodyParameters).toEqual([
                '111222',
            ]);
            expect(attempts.some((a) => a.label === 'body-plus-otp-button')).toBe(true);
        });
    });

    describe('buildOtpSendAttempts', () => {
        it('defaults to auth single-param attempts', () => {
            const attempts = buildOtpSendAttempts({
                name: 'أحمد',
                otpCode: '123456',
            });

            expect(attempts[0]?.label).toBe('body-only');
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

        it('keeps the same body param count across packaging fallbacks', () => {
            const attempts = buildTemplateComponentVariants({
                bodyTexts: ['أ', 'ب', 'ج', 'د'],
                bodyFields: ['name', 'order_number', 'status_detail', 'tracking_number'],
            });

            expect(attempts.find((a) => a.label === 'parameters-array')?.bodyParameters).toHaveLength(
                4,
            );
        });
    });
});
