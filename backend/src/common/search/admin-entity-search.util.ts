import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function normalizeSearchQuery(value?: string | null): string {
  return (value ?? '').trim();
}

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-()+]/g, '');
}

export function buildTextOrClause(
  q: string,
  fields: Array<(query: string) => Prisma.UserWhereInput | Prisma.StoreWhereInput>,
): Array<Prisma.UserWhereInput | Prisma.StoreWhereInput> {
  return fields.map((fn) => fn(q));
}

export async function resolveUserIds(
  prisma: PrismaService,
  rawQuery?: string | null,
  take = 50,
): Promise<string[]> {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) return [];

  const or: Prisma.UserWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q, mode: 'insensitive' } },
  ];

  const phoneNorm = normalizePhone(q);
  if (phoneNorm && phoneNorm !== q) {
    or.push({ phone: { contains: phoneNorm, mode: 'insensitive' } });
  }

  if (isUuid(q)) {
    or.push({ id: q });
  }

  const users = await prisma.user.findMany({
    where: { OR: or },
    select: { id: true },
    take,
  });

  return [...new Set(users.map((u) => u.id))];
}

export async function resolveStoreIds(
  prisma: PrismaService,
  rawQuery?: string | null,
  take = 50,
): Promise<string[]> {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) return [];

  const ownerIds = await resolveUserIds(prisma, q, take);

  const or: Prisma.StoreWhereInput[] = [
    { name: { contains: q, mode: 'insensitive' } },
    { storeCode: { contains: q, mode: 'insensitive' } },
  ];

  if (isUuid(q)) {
    or.push({ id: q });
  }

  if (ownerIds.length) {
    or.push({ ownerId: { in: ownerIds } });
  }

  const stores = await prisma.store.findMany({
    where: { OR: or },
    select: { id: true },
    take,
  });

  return [...new Set(stores.map((s) => s.id))];
}

export async function resolveOrderIds(
  prisma: PrismaService,
  rawQuery?: string | null,
  take = 50,
): Promise<string[]> {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) return [];

  const customerIds = await resolveUserIds(prisma, q, take);
  const storeIds = await resolveStoreIds(prisma, q, take);

  const or: Prisma.OrderWhereInput[] = [
    { orderNumber: { contains: q, mode: 'insensitive' } },
    { partName: { contains: q, mode: 'insensitive' } },
  ];

  if (isUuid(q)) {
    or.push({ id: q });
  }

  if (customerIds.length) {
    or.push({ customerId: { in: customerIds } });
  }

  if (storeIds.length) {
    or.push({
      offers: {
        some: { storeId: { in: storeIds } },
      },
    });
  }

  const orders = await prisma.order.findMany({
    where: { OR: or },
    select: { id: true },
    take,
  });

  return [...new Set(orders.map((o) => o.id))];
}

export function mergeWhereWithSearch<T extends Record<string, unknown>>(
  base: T,
  searchClause: Record<string, unknown> | undefined,
): T {
  if (!searchClause || !Object.keys(searchClause).length) return base;
  if (!Object.keys(base).length) return searchClause as T;
  return { AND: [base, searchClause] } as unknown as T;
}
