import {
  resolveTemplateFamily,
  type NotificationDispatchInput,
} from './whatsapp-notification.mapper';
import { getTemplateDefinition, resolveTemplateName } from './template-registry';

describe('resolveTemplateFamily', () => {
  const base: NotificationDispatchInput = {
    recipientRole: 'MERCHANT',
    titleAr: 'عنوان',
    titleEn: 'Title',
    messageAr: 'رسالة',
    messageEn: 'Message',
  };

  it('maps SUCCESS store activation to welcome_vendor', () => {
    const family = resolveTemplateFamily(
      {
        ...base,
        type: 'SUCCESS',
        metadata: { docType: 'store_activation' },
      },
      'MERCHANT',
    );
    expect(family).toBe('welcome_vendor');
  });

  it('maps SUCCESS document approve to txn_document_vendor', () => {
    const family = resolveTemplateFamily(
      {
        ...base,
        type: 'SUCCESS',
        metadata: { docType: 'trade_license' },
      },
      'MERCHANT',
    );
    expect(family).toBe('txn_document_vendor');
  });

  it('maps verification alerts to txn_verification_vendor for merchants', () => {
    const family = resolveTemplateFamily(
      {
        ...base,
        type: 'system_alert',
        titleAr: 'تحديث مطابقة',
        titleEn: 'Verification update',
        messageAr: 'تم التوثيق',
        messageEn: 'Verified',
        metadata: { verification: true },
      },
      'MERCHANT',
    );
    expect(family).toBe('txn_verification_vendor');
  });

  it('does not map SYSTEM type without waEvent', () => {
    const family = resolveTemplateFamily(
      { ...base, type: 'SYSTEM' },
      'MERCHANT',
    );
    expect(family).toBeNull();
  });

  it('maps ORDER to txn_order_merchant', () => {
    const family = resolveTemplateFamily(
      { ...base, type: 'ORDER' },
      'MERCHANT',
    );
    expect(family).toBe('txn_order_merchant');
  });

  it('maps ORDER to txn_order_customer', () => {
    const family = resolveTemplateFamily(
      { ...base, type: 'ORDER', recipientRole: 'CUSTOMER' },
      'CUSTOMER',
    );
    expect(family).toBe('txn_order_customer');
  });

  it('maps SHIPMENT_UPDATE to txn_shipment_customer', () => {
    const family = resolveTemplateFamily(
      { ...base, type: 'SHIPMENT_UPDATE', recipientRole: 'CUSTOMER' },
      'CUSTOMER',
    );
    expect(family).toBe('txn_shipment_customer');
  });

  it('maps SHIPMENT_UPDATE to txn_shipment_merchant', () => {
    const family = resolveTemplateFamily(
      { ...base, type: 'SHIPMENT_UPDATE' },
      'MERCHANT',
    );
    expect(family).toBe('txn_shipment_merchant');
  });

  it('maps waybill order_update to txn_waybill_customer', () => {
    const family = resolveTemplateFamily(
      {
        ...base,
        recipientRole: 'CUSTOMER',
        type: 'order_update',
        titleAr: 'بوليصة الشحن',
        titleEn: 'Waybill',
        messageAr: 'تم إصدار بوليصة',
        messageEn: 'Waybill issued',
      },
      'CUSTOMER',
    );
    expect(family).toBe('txn_waybill_customer');
  });

  describe('waEvent explicit routing', () => {
    it('ORDER_CREATED → txn_order_customer', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'ORDER', metadata: { waEvent: 'ORDER_CREATED' } },
          'CUSTOMER',
        ),
      ).toBe('txn_order_customer');
    });

    it('ORDER_CREATED → txn_order_merchant', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'ORDER', metadata: { waEvent: 'ORDER_CREATED' } },
          'MERCHANT',
        ),
      ).toBe('txn_order_merchant');
    });

    it('ORDER_STATUS → txn_order_*', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'ORDER', metadata: { waEvent: 'ORDER_STATUS', status: 'PREPARATION' } },
          'CUSTOMER',
        ),
      ).toBe('txn_order_customer');
    });

    it('OFFER_REVEAL → txn_order_customer', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'OFFER', metadata: { waEvent: 'OFFER_REVEAL' } },
          'CUSTOMER',
        ),
      ).toBe('txn_order_customer');
    });

    it('OFFER_ACCEPTED → txn_order_merchant', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'ORDER', metadata: { waEvent: 'OFFER_ACCEPTED' } },
          'MERCHANT',
        ),
      ).toBe('txn_order_merchant');
    });

    it('SHIPMENT_STATUS → txn_shipment_*', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'SHIPMENT_UPDATE', metadata: { waEvent: 'SHIPMENT_STATUS' } },
          'CUSTOMER',
        ),
      ).toBe('txn_shipment_customer');
      expect(
        resolveTemplateFamily(
          { ...base, type: 'SHIPMENT_UPDATE', metadata: { waEvent: 'SHIPMENT_STATUS' } },
          'MERCHANT',
        ),
      ).toBe('txn_shipment_merchant');
    });

    it('WAYBILL_ISSUED → txn_waybill_* without keywords', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'order_update',
            titleAr: 'تحديث',
            titleEn: 'Update',
            messageAr: 'جاهز',
            messageEn: 'Ready',
            metadata: { waEvent: 'WAYBILL_ISSUED' },
          },
          'CUSTOMER',
        ),
      ).toBe('txn_waybill_customer');
    });

    it('VERIFICATION → txn_verification_*', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'ORDER',
            metadata: { waEvent: 'VERIFICATION', verification: true },
          },
          'CUSTOMER',
        ),
      ).toBe('txn_verification_customer');
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'system_alert',
            metadata: { waEvent: 'VERIFICATION', verification: true },
          },
          'MERCHANT',
        ),
      ).toBe('txn_verification_vendor');
    });

    it('INVOICE_ISSUED with hasInvoice → txn_invoice_*', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'payment',
            metadata: { waEvent: 'INVOICE_ISSUED', invoiceNumber: 'INV-1' },
          },
          'CUSTOMER',
          { hasInvoice: true },
        ),
      ).toBe('txn_invoice_customer');
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'payment',
            metadata: { waEvent: 'INVOICE_ISSUED', invoiceNumber: 'INV-1' },
          },
          'MERCHANT',
          { hasInvoice: true },
        ),
      ).toBe('txn_invoice_merchant');
    });

    it('PAYMENT_SUCCESS without invoice → txn_order_*', () => {
      expect(
        resolveTemplateFamily(
          { ...base, type: 'payment', metadata: { waEvent: 'PAYMENT_SUCCESS' } },
          'CUSTOMER',
          { hasInvoice: false },
        ),
      ).toBe('txn_order_customer');
    });

    it('DOCUMENT waEvent opens txn_document even on ALERT/SYSTEM', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'ALERT',
            metadata: { waEvent: 'DOCUMENT', docType: 'trade_license' },
          },
          'MERCHANT',
        ),
      ).toBe('txn_document_vendor');
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'SYSTEM',
            metadata: { waEvent: 'DOCUMENT', docType: 'trade_license' },
          },
          'MERCHANT',
        ),
      ).toBe('txn_document_vendor');
    });

    it('STORE_ACTIVATION → welcome_vendor', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'SUCCESS',
            metadata: { waEvent: 'STORE_ACTIVATION', docType: 'store_activation' },
          },
          'MERCHANT',
        ),
      ).toBe('welcome_vendor');
    });

    it('OFFER_BIDDING_RESTRICTED → txn_offer_restriction_vendor', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'GOVERNANCE_ALERT',
            metadata: { waEvent: 'OFFER_BIDDING_RESTRICTED' },
          },
          'MERCHANT',
        ),
      ).toBe('txn_offer_restriction_vendor');
    });

    it('VIOLATION_ISSUED → txn_violation_customer', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'VIOLATION',
            metadata: { waEvent: 'VIOLATION_ISSUED' },
          },
          'CUSTOMER',
        ),
      ).toBe('txn_violation_customer');
    });

    it('VIOLATION_ISSUED → txn_violation_vendor', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'VIOLATION',
            metadata: { waEvent: 'VIOLATION_ISSUED' },
          },
          'MERCHANT',
        ),
      ).toBe('txn_violation_vendor');
    });

    it('ALERT + VIOLATION_ISSUED waEvent still maps (waEvent wins)', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'alert',
            metadata: { waEvent: 'VIOLATION_ISSUED' },
          },
          'CUSTOMER',
        ),
      ).toBe('txn_violation_customer');
    });

    it('ALERT without DOCUMENT waEvent stays null', () => {
      expect(
        resolveTemplateFamily({ ...base, type: 'ALERT' }, 'MERCHANT'),
      ).toBeNull();
    });

    it('SYSTEM_ALERT without waEvent stays null (no false txn_order)', () => {
      expect(
        resolveTemplateFamily({ ...base, type: 'SYSTEM_ALERT' }, 'CUSTOMER'),
      ).toBeNull();
      expect(
        resolveTemplateFamily({ ...base, type: 'system_alert' }, 'MERCHANT'),
      ).toBeNull();
    });

    it('SYSTEM_ALERT + ORDER_STATUS waEvent still maps to txn_order_*', () => {
      expect(
        resolveTemplateFamily(
          {
            ...base,
            type: 'system_alert',
            metadata: { waEvent: 'ORDER_STATUS' },
          },
          'CUSTOMER',
        ),
      ).toBe('txn_order_customer');
    });

    it('VIOLATION type without waEvent does not send (e.g. drop/admin-only)', () => {
      expect(
        resolveTemplateFamily({ ...base, type: 'VIOLATION' }, 'CUSTOMER'),
      ).toBeNull();
      expect(
        resolveTemplateFamily({ ...base, type: 'VIOLATION' }, 'MERCHANT'),
      ).toBeNull();
    });
  });
});

describe('txn_violation registry contract (Widers body slots)', () => {
  it('customer: name → {{1}}, status_detail → {{2}}, static button, _ar_v2 name', () => {
    const name = resolveTemplateName('txn_violation_customer', 'ar');
    expect(name).toBe('txn_violation_customer_ar_v2');
    const def = getTemplateDefinition(name);
    expect(def).toBeDefined();
    expect(def!.bodyFields).toEqual(['name', 'status_detail']);
    expect(def!.buttonUrlDynamic).toBe(false);
    expect(def!.buttonSuffixPattern).toBe('violations');
  });

  it('vendor: name → {{1}}, store_name → {{2}}, status_detail → {{3}}', () => {
    const name = resolveTemplateName('txn_violation_vendor', 'ar');
    expect(name).toBe('txn_violation_vendor_ar_v2');
    const def = getTemplateDefinition(name);
    expect(def).toBeDefined();
    expect(def!.bodyFields).toEqual(['name', 'store_name', 'status_detail']);
    expect(def!.buttonUrlDynamic).toBe(false);
    expect(def!.buttonSuffixPattern).toBe('violations');
  });
});
