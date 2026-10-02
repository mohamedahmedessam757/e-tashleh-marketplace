/**
 * Apply one or more SQL migration files using DIRECT_URL (session pooler) or DATABASE_URL.
 * Usage: node scripts/apply-sql-migration.mjs prisma/migrations/<file>.sql [...more]
 * Never prints connection strings.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const files = process.argv.slice(2);
if (!files.length) {
    console.error('Usage: node scripts/apply-sql-migration.mjs <file.sql> [...]');
    process.exit(1);
}

const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!raw) {
    console.error('DIRECT_URL / DATABASE_URL not configured');
    process.exit(1);
}
const url = new URL(raw);
url.searchParams.delete('sslmode');
url.searchParams.delete('pgbouncer');
url.searchParams.delete('connection_limit');
url.searchParams.delete('pool_timeout');
url.searchParams.delete('uselibpqcompat');

const client = new pg.Client({
    connectionString: url.toString(),
    ssl: url.hostname.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
try {
    for (const file of files) {
        const sql = fs.readFileSync(path.resolve(file), 'utf8');
        await client.query('BEGIN');
        try {
            await client.query(sql);
            await client.query('COMMIT');
            console.log(`Applied: ${file}`);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`Failed: ${file}: ${err.message}`);
            process.exitCode = 1;
            break;
        }
    }
} finally {
    await client.end();
}
