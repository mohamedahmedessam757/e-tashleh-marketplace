export const RETURNS_FEE_BATCH_PREFIX = 'RETURNS_FEE:';

export function isReturnsFeeInvoice(inv: {
    shippingBatchKey?: string | null;
    invoiceType?: string | null;
}): boolean {
    const batch = String(inv?.shippingBatchKey || '');
    return batch.startsWith(RETURNS_FEE_BATCH_PREFIX);
}

export function filterOrderInvoicesForViewer<T extends {
    invoiceType?: string | null;
    customerId?: string | null;
    shippingBatchKey?: string | null;
    paymentId: string;
    issuedAt: Date;
}>(
    invoices: T[],
    opts: { isAdmin: boolean; viewerUserId?: string | null },
): T[] {
    if (opts.isAdmin) return invoices;

    const viewerUserId = String(opts.viewerUserId || '');
    const masters = invoices.filter((inv) => String(inv.invoiceType || 'MASTER') === 'MASTER');
    const byPayment = new Map<string, T>();
    for (const inv of masters) {
        const existing = byPayment.get(inv.paymentId);
        if (!existing || inv.issuedAt > existing.issuedAt) {
            byPayment.set(inv.paymentId, inv);
        }
    }

    const feeDocs = invoices.filter(
        (inv) =>
            isReturnsFeeInvoice(inv) &&
            viewerUserId.length > 0 &&
            String(inv.customerId) === viewerUserId,
    );

    return [...Array.from(byPayment.values()), ...feeDocs].sort(
        (a, b) => a.issuedAt.getTime() - b.issuedAt.getTime(),
    );
}
