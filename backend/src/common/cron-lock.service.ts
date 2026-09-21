import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Postgres transaction-scoped advisory locks for cron jobs.
 *
 * IMPORTANT: Do NOT use session-level pg_try_advisory_lock with Prisma's pool —
 * acquire and unlock can land on different connections, leaking the lock forever
 * so every subsequent tick logs "skipped — lock held by another instance".
 *
 * pg_try_advisory_xact_lock is held for the duration of the wrapping transaction
 * and auto-releases on commit/rollback (even if the worker crashes mid-job).
 */
@Injectable()
export class CronLockService {
    private readonly logger = new Logger(CronLockService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Deterministically map a string key to a signed 32-bit integer lock id.
     * pg_try_advisory_xact_lock(int) accepts this range; a 32-bit space is more than enough
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
     *
     * `fn` may use other pool connections; the xact lock stays held on the
     * transaction connection until `fn` completes and the transaction commits.
     */
    async runWithLock<T>(key: string, fn: () => Promise<T>): Promise<{ ran: boolean; result?: T }> {
        const id = this.lockId(key);
        try {
            return await this.prisma.$transaction(
                async (tx) => {
                    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`
                        SELECT pg_try_advisory_xact_lock(${id}) AS locked
                    `;
                    const locked = rows?.[0]?.locked === true;
                    if (!locked) {
                        this.logger.debug(`Cron "${key}" skipped — lock held by another instance.`);
                        return { ran: false };
                    }
                    const result = await fn();
                    return { ran: true, result };
                },
                {
                    // Cleanup / escrow ticks can exceed the default interactive tx timeout.
                    maxWait: 10_000,
                    timeout: 120_000,
                },
            );
        } catch (err: any) {
            this.logger.error(
                `Cron lock "${key}" failed: ${err?.message ?? err}`,
                err?.stack,
            );
            throw err;
        }
    }
}
