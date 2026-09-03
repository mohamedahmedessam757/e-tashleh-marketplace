import type { WhatsAppAudienceRole } from './whatsapp-notification.mapper';

const ORDER_UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEFAULT_SHIPMENT_FRONTEND_ORIGIN = 'https://e-tashleh.net';

export type OrderFollowTab = 'waybills' | 'invoices';

/**
 * Absolute dashboard deep-link for WhatsApp body follow_url / shipment {{4}}.
 * No tokens — SPA session gate handles auth via pendingRedirect.
 */
export function buildOrderFollowUrl(params: {
    role: WhatsAppAudienceRole;
    orderId: string | null | undefined;
    frontendUrl?: string | null;
    /** When set (shipments), appends ?tab=waybills */
    tab?: OrderFollowTab;
    /** Required when tab=invoices */
    offerId?: string | null;
}): string | null {
    const orderId = params.orderId?.trim();
    if (!orderId || !ORDER_UUID_RE.test(orderId)) {
        return null;
    }

    const offerId = params.offerId?.trim();
    if (params.tab === 'invoices') {
        if (!offerId || !ORDER_UUID_RE.test(offerId)) {
            return null;
        }
    }

    const origin = (params.frontendUrl?.trim().replace(/\/$/, '') ||
        DEFAULT_SHIPMENT_FRONTEND_ORIGIN) as string;

    const path =
        params.role === 'CUSTOMER'
            ? `order-details/${orderId}`
            : `explore-offer/${orderId}`;

    const base = `${origin}/dashboard/${path}`;
    if (params.tab === 'waybills') {
        return `${base}?tab=waybills`;
    }
    if (params.tab === 'invoices') {
        return `${base}?tab=invoices&offerId=${offerId}`;
    }
    return base;
}

/**
 * Absolute dashboard deep-link for WhatsApp shipment body {{4}}.
 * @deprecated Prefer buildOrderFollowUrl({ tab: 'waybills' })
 */
export function buildShipmentFollowUrl(params: {
    role: WhatsAppAudienceRole;
    orderId: string | null | undefined;
    frontendUrl?: string | null;
}): string | null {
    return buildOrderFollowUrl({
        ...params,
        tab: 'waybills',
    });
}
