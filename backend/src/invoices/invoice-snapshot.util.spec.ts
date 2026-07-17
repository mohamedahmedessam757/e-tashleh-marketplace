import {
  mergeShippingLineItems,
  resolveShippingBatch,
  sumShippingLineItems,
} from './invoice-snapshot.util';

describe('invoice-snapshot.util', () => {
  describe('resolveShippingBatch', () => {
    it('skips SHIPPING when cost is zero', () => {
      const r = resolveShippingBatch({
        paymentId: 'pay-1',
        shippingCost: 0,
        shippingType: 'combined',
        cartShipmentId: 'cart-1',
      });
      expect(r.shouldCreate).toBe(false);
    });

    it('uses paymentId as batch key for separate shipping', () => {
      const r = resolveShippingBatch({
        paymentId: 'pay-1',
        shippingCost: 50,
        shippingType: 'separate',
        cartShipmentId: 'cart-1',
      });
      expect(r.shouldCreate).toBe(true);
      expect(r.isCombined).toBe(false);
      expect(r.shippingBatchKey).toBe('pay-1');
    });

    it('uses cartShipmentId when combined', () => {
      const r = resolveShippingBatch({
        paymentId: 'pay-1',
        shippingCost: 50,
        shippingType: 'combined',
        cartShipmentId: 'cart-abc',
      });
      expect(r.shouldCreate).toBe(true);
      expect(r.isCombined).toBe(true);
      expect(r.shippingBatchKey).toBe('cart-abc');
    });

    it('falls back to paymentId when combined but no cartShipmentId', () => {
      const r = resolveShippingBatch({
        paymentId: 'pay-2',
        shippingCost: 40,
        shippingType: 'combined',
        cartShipmentId: null,
      });
      expect(r.isCombined).toBe(false);
      expect(r.shippingBatchKey).toBe('pay-2');
    });
  });

  describe('mergeShippingLineItems', () => {
    it('appends and updates by paymentId', () => {
      const a = mergeShippingLineItems([], {
        paymentId: 'p1',
        partName: 'A',
        amount: 10,
      });
      const b = mergeShippingLineItems(a, {
        paymentId: 'p2',
        partName: 'B',
        amount: 20,
      });
      const c = mergeShippingLineItems(b, {
        paymentId: 'p1',
        partName: 'A2',
        amount: 15,
      });
      expect(c).toHaveLength(2);
      expect(c.find((x) => x.paymentId === 'p1')?.amount).toBe(15);
      expect(sumShippingLineItems(c)).toBe(35);
    });
  });
});
