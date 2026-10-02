/**
 * Merchants (VENDOR) must never receive customer contact / location data.
 * Only the customer's display name (and opaque ids / codes) may reach them.
 * Applied server-side so hidden fields never leave the API, regardless of UI.
 */

export function isMerchantRole(role?: string | null): boolean {
    const r = String(role || '').toUpperCase();
    return r === 'VENDOR' || r === 'MERCHANT';
}

const CUSTOMER_SIDE_RECIPIENT_FIELDS = [
    'recipientPhone',
    'recipientEmail',
    'recipientAddress',
    'recipientCity',
    'recipientCountry',
] as const;

const CUSTOMER_SIDE_SENDER_FIELDS = ['senderPhone', 'senderAddress', 'senderCity', 'senderCountry'] as const;

function isReturnWaybill(wb: { waybillNumber?: string | null }): boolean {
    return String(wb?.waybillNumber || '').toUpperCase().startsWith('RTN');
}

/** Forward waybill: customer is the recipient. Return waybill: customer is the sender. */
export function redactWaybillForMerchant<T extends Record<string, any>>(wb: T): T {
    if (!wb || typeof wb !== 'object') return wb;
    const out: Record<string, any> = { ...wb };
    const fields = isReturnWaybill(wb) ? CUSTOMER_SIDE_SENDER_FIELDS : CUSTOMER_SIDE_RECIPIENT_FIELDS;
    for (const f of fields) {
        if (f in out) out[f] = null;
    }
    if (out.order && typeof out.order === 'object') {
        out.order = redactOrderCustomerForMerchant(out.order);
    }
    return out as T;
}

export function redactShippingAddressForMerchant<T extends Record<string, any> | null | undefined>(
    addr: T,
): T {
    if (!addr || typeof addr !== 'object') return addr;
    const { id, orderId, orderPartId, fullName, createdAt, updatedAt } = addr as Record<string, any>;
    return { id, orderId, orderPartId, fullName, createdAt, updatedAt } as unknown as T;
}

/** Strips customer contact / address data from an order payload (keeps name + ids). */
export function redactOrderCustomerForMerchant<T extends Record<string, any>>(order: T): T {
    if (!order || typeof order !== 'object') return order;
    const out: Record<string, any> = { ...order };

    if (out.customer && typeof out.customer === 'object') {
        out.customer = { id: out.customer.id, name: out.customer.name };
    }
    if (Array.isArray(out.shippingAddresses)) {
        out.shippingAddresses = out.shippingAddresses.map((a: any) => redactShippingAddressForMerchant(a));
    }
    if (out.shippingAddress && typeof out.shippingAddress === 'object') {
        out.shippingAddress = redactShippingAddressForMerchant(out.shippingAddress);
    }
    if (Array.isArray(out.shippingWaybills)) {
        out.shippingWaybills = out.shippingWaybills.map((w: any) => redactWaybillForMerchant(w));
    }
    for (const k of ['customerPhone', 'customerEmail', 'customerAddress', 'customerCity', 'customerCountry']) {
        if (k in out) out[k] = null;
    }
    return out as T;
}
