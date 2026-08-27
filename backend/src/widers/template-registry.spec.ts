import {
    getOrderShipmentTemplateVersion,
    getTemplateDefinition,
    isOrderShipmentTemplateFamily,
    resolveTemplateName,
    TEMPLATE_REGISTRY,
} from './template-registry';

describe('order/shipment template version cutover', () => {
    const prev = process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;

    afterEach(() => {
        if (prev === undefined) {
            delete process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;
        } else {
            process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION = prev;
        }
    });

    it('defaults to v2 when env unset', () => {
        delete process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;
        expect(getOrderShipmentTemplateVersion(undefined)).toBe('v2');
        expect(resolveTemplateName('txn_order_customer', 'ar')).toBe(
            'txn_order_customer_ar_v2',
        );
    });

    it('resolves order/shipment families to _ar_v3 when env=v3', () => {
        process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION = 'v3';
        expect(resolveTemplateName('txn_order_customer', 'ar')).toBe(
            'txn_order_customer_ar_v3',
        );
        expect(resolveTemplateName('txn_order_merchant', 'ar')).toBe(
            'txn_order_merchant_ar_v3',
        );
        expect(resolveTemplateName('txn_shipment_customer', 'ar')).toBe(
            'txn_shipment_customer_ar_v3',
        );
        expect(resolveTemplateName('txn_shipment_merchant', 'ar')).toBe(
            'txn_shipment_merchant_ar_v3',
        );
    });

    it('keeps non-order families on _ar_v2 even when env=v3', () => {
        process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION = 'v3';
        expect(resolveTemplateName('txn_invoice_customer', 'ar')).toBe(
            'txn_invoice_customer_ar_v2',
        );
        expect(resolveTemplateName('txn_violation_customer', 'ar')).toBe(
            'txn_violation_customer_ar_v2',
        );
    });

    it('marks only the four order/shipment families', () => {
        expect(isOrderShipmentTemplateFamily('txn_order_customer')).toBe(true);
        expect(isOrderShipmentTemplateFamily('txn_invoice_customer')).toBe(false);
    });
});

describe('order/shipment v3 template definitions', () => {
    it('registers v3 defs with follow_url and no button suffix', () => {
        for (const name of [
            'txn_order_customer_ar_v3',
            'txn_order_merchant_ar_v3',
            'txn_shipment_customer_ar_v3',
            'txn_shipment_merchant_ar_v3',
        ]) {
            const def = getTemplateDefinition(name);
            expect(def).toBeDefined();
            expect(def!.bodyFields).toEqual([
                'name',
                'order_number',
                'status_detail',
                'follow_url',
            ]);
            expect(def!.buttonSuffixPattern).toBeUndefined();
            expect(def!.buttonLabel).toBeUndefined();
        }
    });

    it('keeps v2 order templates at 3 body fields with static button metadata', () => {
        const def = getTemplateDefinition('txn_order_customer_ar_v2');
        expect(def!.bodyFields).toEqual(['name', 'order_number', 'status_detail']);
        expect(def!.buttonUrlDynamic).toBe(false);
        expect(def!.buttonSuffixPattern).toBe('order-details/{orderId}');
    });

    it('keeps both v2 and v3 names in the registry', () => {
        const names = TEMPLATE_REGISTRY.map((t) => t.name);
        expect(names).toContain('txn_order_customer_ar_v2');
        expect(names).toContain('txn_order_customer_ar_v3');
        expect(names).toContain('txn_shipment_merchant_ar_v2');
        expect(names).toContain('txn_shipment_merchant_ar_v3');
    });
});
