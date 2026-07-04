import { Prisma } from '@prisma/client';

const CASE_REF_RE = /^CASE-\d{4}-\d{5}$/i;

type CaseRefClient = Pick<Prisma.TransactionClient, 'returnRequest' | 'dispute'>;

export function isCaseReference(value: string): boolean {
  return CASE_REF_RE.test(value.trim());
}

export async function generateCaseReference(
  prisma: CaseRefClient,
  createdAt: Date = new Date(),
): Promise<string> {
  const year = createdAt.getFullYear();
  const prefix = `CASE-${year}-`;

  const [lastReturn, lastDispute] = await Promise.all([
    prisma.returnRequest.findFirst({
      where: { caseReference: { startsWith: prefix } },
      orderBy: { caseReference: 'desc' },
      select: { caseReference: true },
    }),
    prisma.dispute.findFirst({
      where: { caseReference: { startsWith: prefix } },
      orderBy: { caseReference: 'desc' },
      select: { caseReference: true },
    }),
  ]);

  const candidates = [lastReturn?.caseReference, lastDispute?.caseReference].filter(
    Boolean,
  ) as string[];

  let maxSeq = 0;
  for (const ref of candidates) {
    const seq = parseInt(ref.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const next = maxSeq + 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
