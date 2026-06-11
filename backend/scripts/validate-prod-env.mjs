/**
 * Phase 0 — production env smoke check (run before deploy).
 * Usage: node scripts/validate-prod-env.mjs
 * Loads backend/.env and applies the same rules as validateProductionEnv().
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnvFile(path) {
  if (!existsSync(path)) {
    console.error(`❌ Missing ${path}`);
    process.exit(1);
  }
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

loadEnvFile(envPath);
process.env.NODE_ENV = 'production';

const errors = [];

const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret || jwtSecret.length < 32) {
  errors.push('JWT_SECRET must be set and at least 32 characters');
}

const cors = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '').trim();
if (!cors) {
  errors.push('CORS_ORIGINS or FRONTEND_URL must be set');
} else if (cors.includes('localhost')) {
  warn('FRONTEND_URL/CORS still points to localhost — use https://e-tshaleh.net on server');
}

if (process.env.ALLOW_MOCK_PAYMENTS === 'true') {
  errors.push('ALLOW_MOCK_PAYMENTS must not be true');
}

if (process.env.VERIFICATION_GPS_DEV_BYPASS === 'true') {
  errors.push('VERIFICATION_GPS_DEV_BYPASS must be false in production');
}

const widersOn = process.env.WIDERS_ENABLED === 'true';
const resendOn = process.env.RESEND_ENABLED === 'true';
if (!widersOn && !resendOn) {
  errors.push('Enable WIDERS_ENABLED or RESEND_ENABLED for OTP in production');
}

if (widersOn && !process.env.WIDERS_API_TOKEN?.trim()) {
  errors.push('WIDERS_API_TOKEN required when WIDERS_ENABLED=true');
}
if (widersOn && !process.env.WIDERS_WEBHOOK_SECRET?.trim()) {
  errors.push('WIDERS_WEBHOOK_SECRET required when WIDERS_ENABLED=true');
}
if (resendOn && !process.env.RESEND_API_KEY?.trim()) {
  errors.push('RESEND_API_KEY required when RESEND_ENABLED=true');
}

const stripeKey = process.env.STRIPE_SECRET_KEY || '';
if (stripeKey.startsWith('sk_test_')) {
  warn('STRIPE_SECRET_KEY is still test mode — switch to sk_live_ before go-live');
}

if (!process.env.DATABASE_URL?.includes('supabase')) {
  warn('DATABASE_URL does not look like Supabase — double-check connection string');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
  errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
}

console.log('\n=== Phase 0: Production env check ===\n');

if (errors.length) {
  for (const e of errors) fail(e);
  console.log('\nFix the items above in backend/.env (on the server use production values).\n');
  process.exit(process.exitCode || 1);
}

ok('JWT, CORS, OTP channel, Supabase — core checks passed');
if (stripeKey.startsWith('sk_test_')) {
  console.log('\n⚠️  Stripe test keys OK for staging; use Live keys for real payments.\n');
} else {
  console.log('\n🎉 Ready for production env validation. Proceed to Phase 1 (Supabase migrations).\n');
}
