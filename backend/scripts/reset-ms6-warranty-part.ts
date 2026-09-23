/**
 * Reset دبله صدام (OFR-TEST-MS6-03) to pre-warranty-return state:
 * COMPLETED + active warranty, no open return/waybill/return-shipment.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/client';
import { createDatabasePool } from '../src/prisma/pg-pool';

async function main() {
  const pool = createDatabasePool(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const order = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-TEST-MULTI-SCENARIO-6' },
    select: { id: true, orderNumber: true },
  });
  if (!order) throw new Error('Order ORD-TEST-MULTI-SCENARIO-6 not found');

  const offer = await prisma.offer.findFirst({
    where: { orderId: order.id, offerNumber: 'OFR-TEST-MS6-03' },
    include: { orderPart: true },
  });
  if (!offer) throw new Error('Offer OFR-TEST-MS6-03 not found');

  const returns = await prisma.returnRequest.findMany({
    where: {
      OR: [
        { offerId: offer.id },
        { orderPartId: offer.orderPartId || undefined },
      ],
      orderId: order.id,
    },
  });

  console.log('Found returns:', returns.map((r) => ({ id: r.id, status: r.status, returnType: r.returnType })));

  for (const ret of returns) {
    if (ret.returnWaybillId) {
      const returnShipments = await prisma.shipment.findMany({
        where: { waybillId: ret.returnWaybillId },
      });
      for (const s of returnShipments) {
        await prisma.shipmentStatusLog.deleteMany({ where: { shipmentId: s.id } });
        await prisma.shipment.delete({ where: { id: s.id } });
        console.log('Deleted return shipment', s.id, s.status);
      }
      await prisma.shippingWaybill.delete({ where: { id: ret.returnWaybillId } }).catch(() => undefined);
      console.log('Deleted return waybill', ret.returnWaybillId);
    }

    await prisma.caseMessage.deleteMany({
      where: { caseId: ret.id, caseType: 'return' },
    }).catch(() => undefined);

    await prisma.returnRequest.delete({ where: { id: ret.id } });
    console.log('Deleted return', ret.id);
  }

  // Orphan return-status shipments for this part
  if (offer.orderPartId) {
    const orphanReturns = await prisma.shipment.findMany({
      where: {
        orderId: order.id,
        status: {
          in: [
            'RETURN_LABEL_ISSUED',
            'RETURN_STARTED',
            'RECEIVED_FROM_CUSTOMER',
            'DELIVERED_TO_VENDOR',
          ],
        },
        waybill: { partId: offer.orderPartId },
      },
    });
    for (const s of orphanReturns) {
      await prisma.shipmentStatusLog.deleteMany({ where: { shipmentId: s.id } });
      const wbId = s.waybillId;
      await prisma.shipment.delete({ where: { id: s.id } });
      if (wbId) {
        await prisma.shippingWaybill.delete({ where: { id: wbId } }).catch(() => undefined);
      }
      console.log('Deleted orphan return shipment', s.id);
    }
  }

  const warrantyEnd =
    offer.warrantyEndAt ||
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      fulfillmentStatus: 'COMPLETED',
      resolutionLocked: true,
      completedAt: offer.completedAt || new Date(),
      hasWarranty: true,
      warrantyDuration: offer.warrantyDuration || '3MONTHS',
      warrantyActiveAt: offer.warrantyActiveAt || offer.completedAt || new Date(),
      warrantyEndAt: warrantyEnd,
      shippedFromCart: true,
    },
  });

  console.log('Reset offer', {
    offerNumber: offer.offerNumber,
    part: offer.orderPart?.name,
    fulfillmentStatus: 'COMPLETED',
    warrantyEndAt: warrantyEnd,
  });

  // Keep sibling outbound shipments intact — list them for visibility
  const remaining = await prisma.shipment.findMany({
    where: { orderId: order.id },
    select: { id: true, status: true, trackingNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log('Remaining shipments on order:', remaining);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
