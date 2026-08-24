/**
 * Backfill Stripe-style gateway fees for SUCCESS payments where gateway_fee = 0.
 *
 * Fee = round(total_amount * percent/100 + fixed) using system_config.financial
 * or defaults 2.99% + 0.30 AED.
 *
 * Idempotent: skips payments that already have gateway_fee > 0, existing
 * GATEWAY_FEE wallet rows, or GATEWAY_FEE invoices.
 *
 * Dry-run by default. Pass --apply to write.
 *
 * Usage:
 *   node backend/scripts/backfill-stripe-gateway-fees.mjs
 *   node backend/scripts/backfill-stripe-gateway-fees.mjs --apply
 *
 * Requires DATABASE_URL in backend/.env — do NOT run blindly on production.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes('--apply');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m?.[1]?.replace(/^["']|["']$/g, '').trim();
};
const databaseUrl = get('DATABASE_URL');
if (!databaseUrl) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2));
}

function computeFee(total, percent, fixed) {
  const t = Number(total) || 0;
  if (t <= 0) return 0;
  return roundMoney(t * (Math.max(0, Number(percent) || 0) / 100) + Math.max(0, Number(fixed) || 0));
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

let percent = 2.99;
let fixed = 0.3;
try {
  const cfg = await client.query(
    `SELECT setting_value FROM platform_settings WHERE setting_key = 'system_config' LIMIT 1`,
  );
  const financial = cfg.rows[0]?.setting_value?.financial || {};
  if (financial.gatewayFeePercent != null) percent = Number(financial.gatewayFeePercent);
  if (financial.gatewayFeeFixedAed != null) fixed = Number(financial.gatewayFeeFixedAed);
} catch (err) {
  console.warn('Could not load financial settings; using defaults', err.message);
}

console.log(`Config: ${percent}% + ${fixed} AED. Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

const payments = await client.query(`
  SELECT id, order_id, customer_id, total_amount, commission, gateway_fee
  FROM payment_transactions
  WHERE status = 'SUCCESS'
    AND COALESCE(gateway_fee, 0) = 0
    AND COALESCE(total_amount, 0) > 0
  ORDER BY created_at ASC
`);

console.log(`Candidates: ${payments.rowCount}`);

let updated = 0;
let skipped = 0;
let totalFees = 0;

for (const row of payments.rows) {
  const fee = computeFee(row.total_amount, percent, fixed);
  if (fee <= 0) {
    skipped += 1;
    continue;
  }
  totalFees = roundMoney(totalFees + fee);
  console.log(
    `payment=${row.id} order=${row.order_id} total=${row.total_amount} fee=${fee}`,
  );

  if (!apply) continue;

  await client.query('BEGIN');
  try {
    await client.query(
      `UPDATE payment_transactions SET gateway_fee = $1 WHERE id = $2 AND COALESCE(gateway_fee, 0) = 0`,
      [fee, row.id],
    );

    await client.query(
      `UPDATE escrow_transactions SET gateway_fee = $1
       WHERE payment_id = $2 AND COALESCE(gateway_fee, 0) = 0`,
      [fee, row.id],
    );

    const existingWallet = await client.query(
      `SELECT id FROM wallet_transactions
       WHERE payment_id = $1 AND role = 'ADMIN' AND UPPER(transaction_type) = 'GATEWAY_FEE'
       LIMIT 1`,
      [row.id],
    );
    if (existingWallet.rowCount === 0) {
      await client.query(
        `UPDATE platform_wallets
         SET fees_balance = fees_balance + $1,
             total_revenue = total_revenue + $1`,
        [fee],
      );
      const admin = await client.query(
        `SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') ORDER BY created_at ASC LIMIT 1`,
      );
      const userId = admin.rows[0]?.id || row.customer_id;
      const pw = await client.query(`SELECT fees_balance FROM platform_wallets LIMIT 1`);
      await client.query(
        `INSERT INTO wallet_transactions
          (user_id, role, payment_id, type, transaction_type, amount, currency, description, balance_after, metadata)
         VALUES ($1, 'ADMIN', $2, 'DEBIT', 'GATEWAY_FEE', $3, 'AED', $4, $5, $6::jsonb)`,
        [
          userId,
          row.id,
          fee,
          `Payment gateway fee backfill — payment ${row.id}`,
          Number(pw.rows[0]?.fees_balance || fee),
          JSON.stringify({ source: 'GATEWAY_FEE_BACKFILL', orderId: row.order_id }),
        ],
      );
    }

    const existingInv = await client.query(
      `SELECT id FROM invoices WHERE payment_id = $1 AND invoice_type = 'GATEWAY_FEE' LIMIT 1`,
      [row.id],
    );
    if (existingInv.rowCount === 0) {
      const master = await client.query(
        `SELECT id, invoice_group_id, platform_legal_name_en, platform_legal_name_ar, part_name_snapshot
         FROM invoices WHERE payment_id = $1 AND invoice_type = 'MASTER' LIMIT 1`,
        [row.id],
      );
      let invoiceNumber;
      try {
        const n = await client.query(`SELECT generate_typed_invoice_number('GATEWAY_FEE') AS n`);
        invoiceNumber = n.rows[0]?.n;
      } catch {
        const n = await client.query(`SELECT generate_invoice_number() AS n`);
        invoiceNumber = String(n.rows[0]?.n || `INV-${Date.now()}`).replace(/^INV-/, 'INV-G-');
      }
      const groupId = master.rows[0]?.invoice_group_id || master.rows[0]?.id || null;
      await client.query(
        `INSERT INTO invoices
          (invoice_number, order_id, payment_id, customer_id, subtotal, shipping, commission, total,
           currency, status, invoice_type, invoice_group_id, parent_invoice_id,
           part_name_snapshot, platform_legal_name_en, platform_legal_name_ar, line_items)
         VALUES ($1,$2,$3,$4,0,0,0,$5,'AED','PAID','GATEWAY_FEE',$6,$7,$8,$9,$10,$11::jsonb)`,
        [
          invoiceNumber,
          row.order_id,
          row.id,
          row.customer_id,
          fee,
          groupId,
          master.rows[0]?.id || null,
          master.rows[0]?.part_name_snapshot || null,
          master.rows[0]?.platform_legal_name_en || null,
          master.rows[0]?.platform_legal_name_ar || null,
          JSON.stringify([{ kind: 'GATEWAY_FEE', amount: fee, label: 'Payment gateway fee' }]),
        ],
      );
    }

    try {
      await client.query(
        `INSERT INTO audit_logs (order_id, action, entity, actor_type, actor_id, metadata)
         VALUES ($1, 'GATEWAY_FEE_BACKFILL', 'PaymentTransaction', 'SYSTEM', 'BACKFILL_SCRIPT', $2::jsonb)`,
        [row.order_id, JSON.stringify({ paymentId: row.id, gatewayFee: fee })],
      );
    } catch {
      /* audit table shape may differ — non-fatal */
    }

    await client.query('COMMIT');
    updated += 1;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed payment ${row.id}:`, err.message);
  }
}

console.log(
  JSON.stringify(
    {
      mode: apply ? 'APPLY' : 'DRY-RUN',
      candidates: payments.rowCount,
      updated,
      skipped,
      totalFees,
      percent,
      fixed,
    },
    null,
    2,
  ),
);

await client.end();
