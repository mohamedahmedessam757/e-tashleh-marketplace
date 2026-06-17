import {
    buildTemplateComponentVariants,
    isWhatsAppInvalidParameterError,
    resolveTemplateBodyValue,
} from './widers-template-components.util';

describe('widers-template-components.util', () => {
    describe('resolveTemplateBodyValue', () => {
        it('falls back for empty name', () => {
            expect(resolveTemplateBodyValue('name', '   ')).toBe('مستخدم');
        });

        it('keeps non-empty values', () => {
            expect(resolveTemplateBodyValue('name', 'أحمد')).toBe('أحمد');
        });
    });

    describe('isWhatsAppInvalidParameterError', () => {
        it('detects Meta #100 messages', () => {
            expect(isWhatsAppInvalidParameterError('(#100) Invalid parameter')).toBe(true);
            expect(isWhatsAppInvalidParameterError('something else')).toBe(false);
        });
    });

    describe('buildTemplateComponentVariants', () => {
        it('includes body-only fallback when button suffix is set', () => {
            const variants = buildTemplateComponentVariants({
                bodyTexts: ['أحمد'],
                buttonSuffix: 'home',
            });

            expect(variants).toHaveLength(2);
            expect(variants[0]).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ type: 'button' }),
                    expect.objectContaining({ type: 'body' }),
                ]),
            );
            expect(variants[1]).toEqual([
                expect.objectContaining({
                    type: 'body',
                    parameters: [{ type: 'text', text: 'أحمد' }],
                }),
            ]);
        });

        it('adds welcome header fallbacks when configured', () => {
            const variants = buildTemplateComponentVariants({
                bodyTexts: ['أحمد'],
                buttonSuffix: 'home',
                welcomeFallbackHeader: 'ترحيب',
            });

            expect(
                variants.some(
                    (v) =>
                        v.some((c) => c.type === 'header') &&
                        v.some((c) => c.type === 'body') &&
                        !v.some((c) => c.type === 'button'),
                ),
            ).toBe(true);
        });
    });
});
