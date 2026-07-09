import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Postgres session-level advisory locks for cron jobs. In a multi-instance deployment every
 * instance fires the same @Cron, which double-processes financial jobs (escrow release,
 * payout reminders, expiry refunds). Wrapping a job in an advisory lock ensures only ONE
 * instance runs it at a time; others skip that tick.
 */
@Injectable()
export class CronLockService {
    private readonly logger = new Logger(CronLockService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Deterministically map a string key to a signed 32-bit integer lock id.
     * pg_try_advisory_lock(int) accepts this range; a 32-bit space is more than enough
     * to keep our handful of named cron jobs collision-free.
     */
    private lockId(key: string): number {
        // FNV-1a 32-bit hash (kept in number range to avoid BigInt literals).
        let hash = 0x811c9dc5;
        for (let i = 0; i < key.length; i++) {
            hash ^= key.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
        // Force into signed 32-bit integer.
        return hash | 0;
    }

    /**
     * Run `fn` only if the advisory lock for `key` can be acquired immediately.
     * Returns { ran: false } when another instance already holds the lock.
     */
    async runWithLock<T>(key: string, fn: () => Promise<T>): Promise<{ ran: boolean; result?: T }> {
        const id = this.lockId(key);
        const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
            SELECT pg_try_advisory_lock(${id}) AS locked
        `;
        const locked = rows?.[0]?.locked === true;
        if (!locked) {
            this.logger.debug(`Cron "${key}" skipped — lock held by another instance.`);
            return { ran: false };
        }
        try {
            const result = await fn();
            return { ran: true, result };
        } finally {
            await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${id})`.catch((err) =>
                this.logger.warn(`Failed to release cron lock "${key}": ${err?.message ?? err}`),
            );
        }
    }
}
