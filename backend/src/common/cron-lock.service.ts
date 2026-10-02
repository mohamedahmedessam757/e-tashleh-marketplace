import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/** Lease length; an instance that crashes mid-job frees the lock after this. */
const LEASE_SECONDS = 300;

/**
 * Lease-based cron locks backed by the `cron_locks` table.
 *
 * Acquire and release are single atomic statements, so no pool connection is held
 * while the job runs (the previous advisory-xact-lock version kept one connection
 * busy for the whole job, starving the 10-connection pool every minute).
 *
 * Do NOT switch to session-level pg_try_advisory_lock: with a pool, acquire and unlock
 * can land on different connections and leak the lock forever.
 */
@Injectable()
export class CronLockService {
    private readonly logger = new Logger(CronLockService.name);
    private readonly runningLocally = new Set<string>();

    constructor(private readonly prisma: PrismaService) {}

    /**
     * Run `fn` only if the lock for `key` can be acquired immediately.
     * Returns { ran: false } when another run (this or another instance) holds it.
     */
    async runWithLock<T>(key: string, fn: () => Promise<T>): Promise<{ ran: boolean; result?: T }> {
        if (this.runningLocally.has(key)) {
            this.logger.debug(`Cron "${key}" skipped — previous run still in progress.`);
            return { ran: false };
        }

        const owner = randomUUID();
        let acquired = false;
        try {
            const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
                INSERT INTO cron_locks (key, owner, locked_until)
                VALUES (${key}, ${owner}, now() + make_interval(secs => ${LEASE_SECONDS}))
                ON CONFLICT (key) DO UPDATE
                    SET owner = EXCLUDED.owner, locked_until = EXCLUDED.locked_until
                    WHERE cron_locks.locked_until < now()
                RETURNING key
            `;
            acquired = rows.length > 0;
        } catch (err: any) {
            this.logger.error(`Cron lock "${key}" acquire failed: ${err?.message ?? err}`, err?.stack);
            throw err;
        }

        if (!acquired) {
            this.logger.debug(`Cron "${key}" skipped — lock held by another instance.`);
            return { ran: false };
        }

        this.runningLocally.add(key);
        try {
            const result = await fn();
            return { ran: true, result };
        } finally {
            this.runningLocally.delete(key);
            await this.prisma.$executeRaw`
                UPDATE cron_locks SET locked_until = now()
                WHERE key = ${key} AND owner = ${owner}
            `.catch((err: any) =>
                this.logger.warn(`Cron lock "${key}" release failed: ${err?.message ?? err}`),
            );
        }
    }
}
