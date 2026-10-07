import {
    ObligationSelectionError,
    packLineIds,
    parseObligationLineIds,
    selectOpenLines,
    unpackLineIds,
} from './obligation-selection.util';

const walletId = (n: string) =>
    `wallet:${n}-1111-4111-8111-111111111111:GATEWAY_CANCEL_FEE`;

describe('obligation selection', () => {
    it('rejects a malformed id, duplicates, and an empty list', () => {
        expect(() => parseObligationLineIds([])).toThrow(ObligationSelectionError);
        expect(() => parseObligationLineIds(['not-an-id'])).toThrow(/Invalid obligation id/);
        const id = walletId('aaaaaaaa');
        expect(() => parseObligationLineIds([id, id.toUpperCase()])).toThrow(/Duplicate/);
    });

    it('rejects a settled or unknown line and sums the open ones', () => {
        const open = { id: walletId('bbbbbbbb'), status: 'OPEN', amount: 4.01 };
        const settled = { id: walletId('cccccccc'), status: 'SETTLED', amount: 2 };
        expect(() => selectOpenLines([open, settled], [settled.id])).toThrow(/already settled/);
        expect(() => selectOpenLines([open], [walletId('dddddddd')])).toThrow(/unavailable/);
        const picked = selectOpenLines(
            [open, { id: walletId('eeeeeeee'), status: 'OPEN', amount: 5.4 }],
            [open.id, walletId('eeeeeeee')],
        );
        expect(picked.amount).toBe(9.41);
        expect(picked.lines).toHaveLength(2);
    });

    it('packs and unpacks ids longer than one metadata value', () => {
        const ids = Array.from({ length: 12 }, (_, i) =>
            walletId(i.toString(16).padStart(8, '0')),
        );
        const packed = packLineIds(ids);
        expect(Object.keys(packed).length).toBeGreaterThan(1);
        for (const value of Object.values(packed)) expect(value.length).toBeLessThanOrEqual(450);
        expect(unpackLineIds(packed)).toEqual(ids);
    });
});
