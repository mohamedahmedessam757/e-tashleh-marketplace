import {
    buildWelcomeSendAttempts,
    isWhatsAppInvalidParameterError,
    resolveTemplateBodyValue,
} from './widers-template-components.util';

describe('widers-template-components.util', () => {
    describe('resolveTemplateBodyValue', () => {
        it('falls back for empty name', () => {
            expect(resolveTemplateBodyValue('name', '   ')).toBe('مستخدم');
        });
    });

    describe('buildWelcomeSendAttempts', () => {
        it('never uses contact-only and always sends exactly one name value', () => {
            const attempts = buildWelcomeSendAttempts({
                bodyTexts: ['أحمد'],
                bodyFields: ['name'],
                contactName: 'أحمد',
            });

            expect(attempts.some((a) => a.label === 'contact-only')).toBe(false);
            expect(attempts[0]?.label).toBe('components-body');
            expect(attempts[0]?.components?.[0]?.parameters).toHaveLength(1);
            expect(attempts[1]?.bodyParameters).toEqual(['أحمد']);
            expect(attempts[2]?.parameterFormat).toBe('variables');
        });
    });
});
