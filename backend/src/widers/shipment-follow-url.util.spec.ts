import {
    buildShipmentFollowUrl,
    DEFAULT_SHIPMENT_FRONTEND_ORIGIN,
} from './shipment-follow-url.util';

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
