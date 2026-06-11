export interface HandoverPendingOffer {
    id: string;
    partName: string;
    merchantName?: string;
}

export function getOffersAwaitingMerchantHandover(
    order: { offers?: any[]; parts?: any[] } | null | undefined,
    options?: { storeId?: string },
): HandoverPendingOffer[] {
    if (!order?.offers?.length) return [];

    return order.offers
        .filter((o) => {
            if (String(o.status).toLowerCase() !== 'accepted') return false;
            if (String(o.fulfillmentStatus || '').toUpperCase() !== 'VERIFICATION_SUCCESS') return false;
            if (options?.storeId && String(o.storeId) !== String(options.storeId)) return false;
            return true;
        })
        .map((o) => {
            const partId = o.orderPartId || o.order_part_id;
            const part = order.parts?.find((p: any) => p.id === partId);
            return {
                id: o.id,
                partName: part?.name || o.partName || o.orderPartName || 'Part',
                merchantName: o.merchantName || o.store?.name || o.vendorName,
            };
        });
}

export type HandoverBannerRole = 'admin' | 'customer' | 'merchant';

export function getHandoverPendingMessage(
    role: HandoverBannerRole,
    pending: HandoverPendingOffer[],
    isAr: boolean,
    orderNumber?: string,
): { title: string; description: string } {
    const orderRef = orderNumber ? `#${orderNumber}` : '';
    const partList = pending.map((p) => p.partName).join(isAr ? '، ' : ', ');
    const merchantList = [...new Set(pending.map((p) => p.merchantName).filter(Boolean))].join(
        isAr ? '، ' : ', ',
    );

    if (role === 'admin') {
        return {
            title: isAr ? 'في انتظار تسليم التاجر للقطعة' : 'Awaiting merchant handover to admin',
            description: isAr
                ? `الطلب ${orderRef}: التاجر${merchantList ? ` (${merchantList})` : ''} لم يُسلّم بعد ${pending.length > 1 ? 'القطع' : 'القطعة'} (${partList}) للإدارة. عند ضغطه على «طلب تسليم الشحنة للإدارة» ستُحدَّث الحالة فوراً.`
                : `Order ${orderRef}: The merchant${merchantList ? ` (${merchantList})` : ''} has not yet handed over ${pending.length > 1 ? 'parts' : 'the part'} (${partList}) to admin. Status updates in real time once they tap «Request delivery to management».`,
        };
    }

    if (role === 'customer') {
        return {
            title: isAr ? 'التاجر يجهّز تسليم قطعتك للإدارة' : 'Merchant preparing handover to admin',
            description: isAr
                ? `قطعتك (${partList}) اجتازت التوثيق. التاجر مطلوب منه تسليمها للإدارة قبل الشحن — سيتم إعلامك تلقائياً عند اكتمال ذلك.`
                : `Your part (${partList}) passed verification. The merchant must hand it over to admin before shipping — you will be notified automatically once complete.`,
        };
    }

    return {
        title: isAr ? 'مطلوب: تسليم الشحنة للإدارة' : 'Action required: hand over to admin',
        description: isAr
            ? `${pending.length > 1 ? `القطع (${partList})` : `القطعة «${partList}»`} موثّقة وجاهزة. اضغط «طلب تسليم الشحنة للإدارة» لإتمام التسليم — ستختفي هذه الرسالة فور الإرسال.`
            : `${pending.length > 1 ? `Parts (${partList}) are` : `Part «${partList}» is`} verified and ready. Tap «Request delivery to management» to complete handover — this notice disappears immediately.`,
    };
}
