import { refundInvoiceBatchKey, invoiceTypePrefix } from './invoice-snapshot.util';

describe('REFUND invoice helpers', () => {
  it('prefix is INV-R', () => {
    expect(invoiceTypePrefix('REFUND')).toBe('INV-R');
  });

  it('batch key is REFUND:{stripeRefundId}', () => {
    expect(refundInvoiceBatchKey('re_123')).toBe('REFUND:re_123');
  });

  it('trims stripe refund id', () => {
    expect(refundInvoiceBatchKey('  re_abc  ')).toBe('REFUND:re_abc');
  });
});
