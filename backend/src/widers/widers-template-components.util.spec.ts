import {
    buildTemplateComponentVariants,
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

    describe('isWhatsAppInvalidParameterError', () => {
        it('detects Meta #100 messages', () => {
            expect(isWhatsAppInvalidParameterError('(#100) Invalid parameter')).toBe(true);
        });
    });

    describe('buildWelcomeSendAttempts', () => {
        it('starts with contact-only then body variants', () => {
            const attempts = buildWelcomeSendAttempts({
                bodyTexts: ['أحمد'],
                bodyFields: ['name'],
                buttonSuffix: 'home',
                contactName: 'أحمد',
            });

            expect(attempts[0]).toEqual({
                label: 'contact-only',
                contactName: 'أحمد',
            });
            expect(attempts.some((a) => a.label === 'body-positional')).toBe(true);
            expect(attempts.some((a) => a.label === 'body-named')).toBe(true);
        });
    });

    describe('buildTemplateComponentVariants', () => {
        it('includes body-only fallback when header and button exist', () => {
            const attempts = buildTemplateComponentVariants({
                bodyTexts: ['أحمد'],
                bodyFields: ['name'],
                headerText: 'تحديث',
                buttonSuffix: 'home',
            });

            expect(attempts.some((a) => a.label === 'body-only')).toBe(true);
        });
    });
});
