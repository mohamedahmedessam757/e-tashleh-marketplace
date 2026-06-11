import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function getDatabaseUrl() {
  const raw = readFileSync(envPath, 'utf8');
  const m = raw.match(/^DATABASE_URL="([^"]+)"/m);
  return m?.[1] || process.env.DATABASE_URL;
}

const url = getDatabaseUrl();
if (!url) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  const r = await client.query('SELECT current_database(), version()');
  console.log('✅ Database connected:', r.rows[0].current_database);
  await client.end();
} catch (e) {
  console.error('❌ Database connection failed:', e.message);
  process.exit(1);
}
