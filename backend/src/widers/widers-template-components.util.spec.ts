import {
    buildOtpSendAttempts,
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

    describe('buildOtpSendAttempts', () => {
        it('defaults to single otp_code body param (AUTHENTICATION)', () => {
            const attempts = buildOtpSendAttempts({
                name: 'أحمد',
                otpCode: '123456',
            });

            expect(attempts[0]?.label).toBe('components-body-only');
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
            expect(attempts.find((a) => a.label === 'parameters-array')?.bodyParameters).toEqual([
                '123456',
            ]);
        });

        it('supports legacy name + otp_code when bodyFields provided', () => {
            const attempts = buildOtpSendAttempts({
                name: 'أحمد',
                otpCode: '123456',
                bodyFields: ['name', 'otp_code'],
                headerText: 'رمز التحقق',
            });

            expect(attempts[0]?.components?.[1]?.parameters).toHaveLength(2);
            expect(attempts.find((a) => a.label === 'parameters-array')?.bodyParameters).toEqual([
                'أحمد',
                '123456',
            ]);
        });
    });
});
