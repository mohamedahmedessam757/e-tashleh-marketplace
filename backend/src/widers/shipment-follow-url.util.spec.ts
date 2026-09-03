import {
    buildOrderFollowUrl,
    buildShipmentFollowUrl,
    DEFAULT_SHIPMENT_FRONTEND_ORIGIN,
} from './shipment-follow-url.util';

describe('buildOrderFollowUrl', () => {
    const orderId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    it('builds customer order URL without tab', () => {
        const url = buildOrderFollowUrl({
            role: 'CUSTOMER',
            orderId,
            frontendUrl: 'https://e-tashleh.net',
        });
        expect(url).toBe(`https://e-tashleh.net/dashboard/order-details/${orderId}`);
    });

    it('builds merchant order URL without tab', () => {
        const url = buildOrderFollowUrl({
            role: 'MERCHANT',
            orderId,
            frontendUrl: 'https://e-tashleh.net/',
        });
        expect(url).toBe(`https://e-tashleh.net/dashboard/explore-offer/${orderId}`);
    });

    it('appends waybills tab for shipments', () => {
        const url = buildOrderFollowUrl({
            role: 'CUSTOMER',
            orderId,
            frontendUrl: 'https://e-tashleh.net',
            tab: 'waybills',
        });
        expect(url).toBe(
            `https://e-tashleh.net/dashboard/order-details/${orderId}?tab=waybills`,
        );
    });

    it('appends invoices tab with offerId', () => {
        const offerId = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';
        const url = buildOrderFollowUrl({
            role: 'CUSTOMER',
            orderId,
            offerId,
            frontendUrl: 'https://e-tashleh.net',
            tab: 'invoices',
        });
        expect(url).toBe(
            `https://e-tashleh.net/dashboard/order-details/${orderId}?tab=invoices&offerId=${offerId}`,
        );
    });

    it('returns null for invalid offerId when tab=invoices', () => {
        const url = buildOrderFollowUrl({
            role: 'CUSTOMER',
            orderId,
            offerId: 'not-a-uuid',
            frontendUrl: 'https://e-tashleh.net',
            tab: 'invoices',
        });
        expect(url).toBeNull();
    });

    it('returns null for invalid orderId', () => {
        expect(
            buildOrderFollowUrl({
                role: 'CUSTOMER',
                orderId: 'not-a-uuid',
                frontendUrl: 'https://e-tashleh.net',
            }),
        ).toBeNull();
    });
});

describe('buildShipmentFollowUrl', () => {
    const orderId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    it('builds customer order-details URL with waybills tab', () => {
        const url = buildShipmentFollowUrl({
            role: 'CUSTOMER',
            orderId,
            frontendUrl: 'https://e-tashleh.net',
        });
        expect(url).toBe(
            `https://e-tashleh.net/dashboard/order-details/${orderId}?tab=waybills`,
        );
    });

    it('builds merchant explore-offer URL with waybills tab', () => {
        const url = buildShipmentFollowUrl({
            role: 'MERCHANT',
            orderId,
            frontendUrl: 'https://e-tashleh.net/',
        });
        expect(url).toBe(
            `https://e-tashleh.net/dashboard/explore-offer/${orderId}?tab=waybills`,
        );
    });

    it('returns null for invalid orderId', () => {
        expect(
            buildShipmentFollowUrl({
                role: 'CUSTOMER',
                orderId: 'not-a-uuid',
                frontendUrl: 'https://e-tashleh.net',
            }),
        ).toBeNull();
    });

    it('falls back to default origin when frontendUrl missing', () => {
        const url = buildShipmentFollowUrl({
            role: 'CUSTOMER',
            orderId,
            frontendUrl: null,
        });
        expect(url?.startsWith(DEFAULT_SHIPMENT_FRONTEND_ORIGIN)).toBe(true);
        expect(url).toContain('order-details');
        expect(url).toContain('tab=waybills');
    });
});
