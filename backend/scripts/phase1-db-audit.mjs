/**
 * Phase 1 — audit which migrations/objects exist in Supabase.
 * Usage: node scripts/phase1-db-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnv();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

const checks = [
  { id: 'stripe_webhook_events', sql: `SELECT to_regclass('public.stripe_webhook_events') IS NOT NULL AS ok` },
  { id: 'otp_challenges', sql: `SELECT to_regclass('public.otp_challenges') IS NOT NULL AS ok` },
  { id: 'whatsapp_message_logs', sql: `SELECT to_regclass('public.whatsapp_message_logs') IS NOT NULL AS ok` },
  { id: 'users_rls', sql: `SELECT relrowsecurity FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace` },
  { id: 'offer_fulfillment_status_col', sql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='offers' AND column_name='fulfillment_status') AS ok` },
  { id: 'verification_task_offer_id', sql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification_tasks' AND column_name='offer_id') AS ok` },
  { id: 'preferred_language_col', sql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_settings' AND column_name='preferred_language') AS ok` },
  { id: 'reviews_offer_id', sql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='offer_id') AS ok` },
  { id: 'otp_channel_col', sql: `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='otp_challenges' AND column_name='channel') AS ok` },
  { id: 'widers_webhook_events', sql: `SELECT to_regclass('public.widers_webhook_events') IS NOT NULL AS ok` },
  { id: 'support_tickets', sql: `SELECT to_regclass('public.support_tickets') IS NOT NULL AS ok` },
  { id: 'stripe_webhook_events_rls', sql: `SELECT relrowsecurity FROM pg_class WHERE relname = 'stripe_webhook_events' AND relnamespace = 'public'::regnamespace` },
];

try {
  await client.connect();
  console.log('\n=== Phase 1: Database audit ===\n');

  for (const c of checks) {
    const r = await client.query(c.sql);
    const val = r.rows[0]?.ok ?? r.rows[0]?.relrowsecurity;
    const status = val === true || val === 't' ? '✅' : val === false || val === 'f' ? '❌' : `⚠️ ${val}`;
    console.log(`${status}  ${c.id}`);
  }

  const tables = await client.query(`
    SELECT count(*)::int AS n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  console.log(`\n📊 Public tables: ${tables.rows[0].n}`);

  await client.end();
} catch (e) {
  console.error('Audit failed:', e.message);
  process.exit(1);
}
