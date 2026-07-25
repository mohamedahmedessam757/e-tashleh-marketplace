import {
  resolveTemplateFamily,
  type NotificationDispatchInput,
} from './whatsapp-notification.mapper';

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

  it('does not map SYSTEM type', () => {
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
});
