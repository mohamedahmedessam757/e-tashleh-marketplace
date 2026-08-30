import {
    getOrderShipmentTemplateVersion,
    getTemplateDefinition,
    isOrderShipmentTemplateFamily,
    resolveTemplateName,
    TEMPLATE_REGISTRY,
} from './template-registry';

describe('order/shipment template version (v3 default)', () => {
    const prev = process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;

    afterEach(() => {
        if (prev === undefined) {
            delete process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;
        } else {
            process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION = prev;
        }
    });

    it('defaults to v3 when env unset', () => {
        delete process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;
        expect(getOrderShipmentTemplateVersion(undefined)).toBe('v3');
        expect(resolveTemplateName('txn_order_customer', 'ar')).toBe(
            'txn_order_customer_ar_v3',
        );
        expect(resolveTemplateName('txn_shipment_merchant', 'ar')).toBe(
            'txn_shipment_merchant_ar_v3',
        );
    });

    it('resolves all four families to _ar_v3', () => {
        delete process.env.WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION;
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

    it('keeps non-order families on _ar_v2', () => {
        expect(resolveTemplateName('txn_invoice_customer', 'ar')).toBe(
            'txn_invoice_customer_ar_v2',
        );
        expect(resolveTemplateName('txn_violation_customer', 'ar')).toBe(
            'txn_violation_customer_ar_v2',
        );
        expect(resolveTemplateName('welcome_customer', 'ar')).toBe(
            'welcome_customer_ar_v2',
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

    it('does not keep retired order/shipment _ar_v2 definitions', () => {
        const names = TEMPLATE_REGISTRY.map((t) => t.name);
        expect(names).not.toContain('txn_order_customer_ar_v2');
        expect(names).not.toContain('txn_order_merchant_ar_v2');
        expect(names).not.toContain('txn_shipment_customer_ar_v2');
        expect(names).not.toContain('txn_shipment_merchant_ar_v2');
        expect(names).toContain('txn_order_customer_ar_v3');
        expect(names).toContain('txn_shipment_merchant_ar_v3');
    });
});
