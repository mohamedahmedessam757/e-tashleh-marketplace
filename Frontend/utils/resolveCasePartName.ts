/**
 * Resolve display name for a return/dispute case from orderPartId + order.parts.
 * Multi-item cases must never fall back to parts[0] when orderPartId is set.
 */
export function resolveCasePartName(r: {
  orderPartId?: string | null;
  order_part_id?: string | null;
  order?: { parts?: Array<{ id?: string; name?: string }> | null } | null;
}): string {
  const partId = r.orderPartId ?? r.order_part_id ?? null;
  const parts = r.order?.parts ?? [];
  if (partId && Array.isArray(parts)) {
    const hit = parts.find((p) => String(p.id) === String(partId));
    if (hit?.name) return String(hit.name);
  }
  if (parts.length === 1 && parts[0]?.name) return String(parts[0].name);
  return 'Parts';
}

/** Map warranty hub offer id → order part fields for return modal. */
export function resolveWarrantyClaimFromOffer(
  order: {
    part?: string;
    merchantName?: string | null;
    parts?: Array<{ id?: string; name?: string }> | null;
    offers?: Array<{
      id?: string;
      orderPartId?: string | null;
      order_part_id?: string | null;
      partName?: string | null;
      merchantName?: string | null;
      store?: { name?: string | null } | null;
    }> | null;
  },
  offerId: string,
  isMultiPartOrder: boolean,
): {
  orderPartId?: string;
  partName: string;
  merchantName: string;
} | null {
  const offer = order.offers?.find((o) => String(o.id) === String(offerId));
  const orderPartId =
    offer?.orderPartId || offer?.order_part_id || undefined;
  if (!orderPartId && isMultiPartOrder) return null;
  const part = order.parts?.find((p) => String(p.id) === String(orderPartId));
  return {
    orderPartId: orderPartId || undefined,
    partName: part?.name || offer?.partName || order.part || 'Part',
    merchantName:
      offer?.merchantName ||
      offer?.store?.name ||
      order.merchantName ||
      'Store',
  };
}

/** Evidence: at least one image required (camera capture path). */
export function hasRequiredEvidencePhoto(
  files: Array<{ type?: string } | null | undefined>,
): boolean {
  return files.some((f) => Boolean(f?.type?.startsWith('image/')));
}
