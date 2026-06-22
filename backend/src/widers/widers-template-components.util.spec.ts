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
        it('sends two body params for name and otp_code', () => {
            const attempts = buildOtpSendAttempts({
                name: 'أحمد',
                otpCode: '123456',
            });

            expect(attempts[0]?.components?.[1]?.parameters).toHaveLength(2);
            expect(attempts.find((a) => a.label === 'parameters-array')?.bodyParameters).toEqual([
                'أحمد',
                '123456',
            ]);
        });
    });
});
