import { describe, it, expect } from '@jest/globals';
import { normalizeGulfPhone } from './gulf-phone.util';

describe('normalizeGulfPhone', () => {
    const cases: Array<{
        input: string;
        countryCode?: string;
        expected: string;
    }> = [
        { input: '+966501234567', expected: '+966501234567' },
        { input: '+971544404839', expected: '+971544404839' },
        { input: '971544404839', expected: '+971544404839' },
        { input: '544404839', countryCode: '+971', expected: '+971544404839' },
        { input: '0544404839', countryCode: '+971', expected: '+971544404839' },
        { input: '501234567', countryCode: '+966', expected: '+966501234567' },
        { input: '0501234567', countryCode: '+966', expected: '+966501234567' },
        { input: '512345678', countryCode: '+973', expected: '+973512345678' },
        { input: '512345678', countryCode: '+974', expected: '+974512345678' },
        { input: '512345678', countryCode: '+965', expected: '+965512345678' },
        { input: '512345678', countryCode: '+968', expected: '+968512345678' },
    ];

    it.each(cases)('normalizes $input (cc=$countryCode) → $expected', ({ input, countryCode, expected }) => {
        expect(normalizeGulfPhone(input, countryCode)).toBe(expected);
    });
});
