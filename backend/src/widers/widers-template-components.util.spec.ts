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
        it('prefers contact-only before explicit body params', () => {
            const attempts = buildWelcomeSendAttempts({
                bodyTexts: ['أحمد'],
                bodyFields: ['name'],
                contactName: 'أحمد',
            });

            expect(attempts[0]?.label).toBe('contact-only');
            expect(attempts[1]?.label).toBe('body-positional');
            expect(attempts[1]?.contactName).toBeUndefined();
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
