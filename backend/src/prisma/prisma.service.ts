import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from './client';
import { createDatabasePool } from './pg-pool';

const CONNECT_MAX_RETRIES = 5;
const CONNECT_BASE_DELAY_MS = 2000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly pool: Pool;

    constructor() {
        const pool = createDatabasePool();
        const adapter = new PrismaPg(pool);
        super({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });
        this.pool = pool;
    }

    async onModuleInit() {
        await this.connectWithRetry();
    }

    async onModuleDestroy() {
        await this.$disconnect();
        await this.pool.end().catch(() => undefined);
    }

    /** Lightweight ping — used by health checks and reconnect logic. */
    async isHealthy(): Promise<boolean> {
        return (await this.checkDatabase()).ok;
    }

    /**
     * Two bounded attempts so a momentarily saturated pool is not reported as an outage.
     */
    async checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
        const started = Date.now();
        for (let attempt = 0; attempt < 2; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 500));
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                await Promise.race([
                    this.$queryRaw`SELECT 1`,
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error('health query timeout')), 3000);
                    }),
                ]);
                return { ok: true, latencyMs: Date.now() - started };
            } catch {
                // retry once
            } finally {
                if (timer) clearTimeout(timer);
            }
        }
        return { ok: false, latencyMs: Date.now() - started };
    }

    /**
     * Re-establish the pool after transient Supabase pooler blips (P1001).
     * Safe to call from guards / schedulers before critical queries.
     */
    async ensureConnected(): Promise<boolean> {
        if (await this.isHealthy()) {
            return true;
        }
        await new Promise((r) => setTimeout(r, 300));
        if (await this.isHealthy()) {
            return true;
        }

        // Do not $disconnect(): with an external pg Pool it detaches the adapter's idle-error
        // listener, and pg recreates broken connections on its own.
        this.logger.warn('Database ping failed — retrying connection…');
        await this.connectWithRetry();
        return this.isHealthy();
    }

    private async connectWithRetry(attempt = 1): Promise<void> {
        try {
            await this.$queryRaw`SELECT 1`;
            this.logger.log('Database connected');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            const isLast = attempt >= CONNECT_MAX_RETRIES;

            this.logger.warn(
                `Database connect ${attempt}/${CONNECT_MAX_RETRIES} failed: ${message}`,
            );

            if (isLast) {
                this.logger.error(
                    'Database unreachable after max retries — API will start; retry on next request.',
                );
                return;
            }

            await new Promise((r) => setTimeout(r, CONNECT_BASE_DELAY_MS * attempt));
            return this.connectWithRetry(attempt + 1);
        }
    }
}
