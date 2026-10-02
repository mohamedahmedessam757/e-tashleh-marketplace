import { Pool, PoolConfig } from 'pg';

function isSupabaseUrl(connectionString: string): boolean {
    return (
        connectionString.includes('supabase.co') ||
        connectionString.includes('pooler.supabase.com')
    );
}

/** Remove sslmode from URL — pg v8 treats it as strict verify-full and ignores Pool.ssl. */
function normalizeDatabaseUrl(connectionString: string): string {
    try {
        const url = new URL(connectionString);
        url.searchParams.delete('sslmode');
        url.searchParams.delete('ssl');
        return url.toString();
    } catch {
        return connectionString
            .replace(/([?&])sslmode=[^&]*&?/g, '$1')
            .replace(/([?&])ssl=[^&]*&?/g, '$1')
            .replace(/[?&]$/, '');
    }
}

export function createDatabasePool(connectionString = process.env.DATABASE_URL): Pool {
    if (!connectionString) {
        throw new Error('DATABASE_URL is not configured');
    }

    const isSupabase = isSupabaseUrl(connectionString);
    const poolMax = Number(process.env.DB_POOL_MAX) || 15;
    const config: PoolConfig = {
        connectionString: normalizeDatabaseUrl(connectionString),
        max: poolMax,
        connectionTimeoutMillis: 10_000,
        idleTimeoutMillis: 10_000,
        keepAlive: true,
    };

    if (isSupabase) {
        config.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(config);
    // Without a listener, an idle-client error (e.g. pooler closing the socket) crashes the process.
    pool.on('error', (err) => {
        console.error('[pg-pool] idle client error (client discarded):', err?.message);
    });
    return pool;
}
