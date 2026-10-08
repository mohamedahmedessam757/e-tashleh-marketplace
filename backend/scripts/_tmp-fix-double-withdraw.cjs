// One-time repair. Run on the server whose .env has the live Stripe key, then delete.
// Reverses the duplicate manual-payout transfer and records the withdrawal debit once.
// Usage: node scripts/_tmp-fix-double-withdraw.cjs
//        node scripts/_tmp-fix-double-withdraw.cjs --apply
require('dotenv/config');
const pg = require('pg');
const Stripe = require('stripe');

const apply = process.argv.includes('--apply');
const REQUEST_ID = 'ecd51d8c-103b-49de-98d8-c4280b2dcc2b';
const KEEP_TRANSFER = 'tr_1UNxc4Ruqz9CT4PrnREJ9PYf';
const REVERSE_TRANSFER = 'tr_1UNxVoRuqz9CT4PrsZ3iAZ6s';
const STORE_ID = 'eb90220e-8c21-4f6b-813f-d8184a245436';
const AMOUNT = 5;

(async () => {
    const raw = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!raw) throw new Error('Database URL env var is missing');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is missing');
    if (!stripeKey.startsWith('sk_live_')) {
        throw new Error('STRIPE_SECRET_KEY is not a live key. Refusing to reverse or change the ledger.');
    }

    const url = new URL(raw);
    for (const k of ['sslmode', 'pgbouncer', 'connection_limit', 'pool_timeout', 'uselibpqcompat']) {
        url.searchParams.delete(k);
    }
    const c = new pg.Client({
        connectionString: url.toString(),
        ssl: url.hostname.includes('supabase') ? { rejectUnauthorized: false } : undefined,
    });
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
    await c.connect();

    const fail = async (msg) => {
        try { await c.query('ROLLBACK'); } catch { /* no open tx */ }
        console.error(`Aborted: ${msg}. Ledger was not changed.`);
        process.exitCode = 1;
    };

    const wd = await c.query(
        `SELECT id, status, amount, payout_method, stripe_transfer_id, store_id
           FROM withdrawal_requests WHERE id = $1`,
        [REQUEST_ID],
    );
    if (wd.rowCount !== 1) return await fail('withdrawal row missing');
    const request = wd.rows[0];
    if (request.status !== 'COMPLETED') return await fail(`status is ${request.status}`);
    if (request.stripe_transfer_id !== KEEP_TRANSFER) return await fail('kept transfer id mismatch');
    if (Number(request.amount) !== AMOUNT) return await fail(`amount is ${request.amount}`);
    if (request.store_id !== STORE_ID) return await fail('store mismatch');
    if (request.payout_method !== 'STRIPE') return await fail('payout method is not STRIPE');

    const store = await c.query(
        `SELECT balance, frozen_balance, stripe_account_id, owner_id
           FROM stores WHERE id = $1`,
        [STORE_ID],
    );
    if (store.rowCount !== 1) return await fail('store missing');
    const row = store.rows[0];
    if (Number(row.balance) !== 6) return await fail(`balance is ${row.balance}, expected 6.00`);
    if (Number(row.frozen_balance) !== 0) return await fail(`frozen is ${row.frozen_balance}, expected 0`);
    if (!row.stripe_account_id) return await fail('store has no Stripe account');

    const existingDebit = await c.query(
        `SELECT id FROM wallet_transactions
          WHERE user_id = $1
            AND transaction_type = 'withdrawal'
            AND metadata->>'requestId' = $2`,
        [row.owner_id, REQUEST_ID],
    );
    if (existingDebit.rowCount > 0) return await fail('withdrawal debit already exists');

    const transfer = await stripe.transfers.retrieve(REVERSE_TRANSFER);
    const dest = typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id;
    if (dest !== row.stripe_account_id) return await fail('duplicate transfer destination does not match the store');
    if (transfer.currency !== 'aed') return await fail(`transfer currency is ${transfer.currency}`);
    if (transfer.amount !== AMOUNT * 100) return await fail(`transfer amount is ${transfer.amount}`);
    const alreadyReversed = Number(transfer.amount_reversed || 0) >= AMOUNT * 100;

    const balance = await stripe.balance.retrieve({}, { stripeAccount: row.stripe_account_id });
    const availableAed = (balance.available || [])
        .filter((b) => b.currency === 'aed')
        .reduce((sum, b) => sum + Number(b.amount || 0), 0) / 100;
    console.log(JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        balance: Number(row.balance),
        frozen: Number(row.frozen_balance),
        availableAed,
        alreadyReversed,
        reverse: REVERSE_TRANSFER,
        keep: KEEP_TRANSFER,
    }));

    if (!alreadyReversed && availableAed < AMOUNT) {
        return await fail(`connected available ${availableAed} is below ${AMOUNT}`);
    }

    if (!apply) {
        console.log('Dry-run only. No reversal and no ledger write.');
        await c.end();
        return;
    }

    let reversalId = null;
    if (!alreadyReversed) {
        const reversal = await stripe.transfers.createReversal(
            REVERSE_TRANSFER,
            {
                amount: AMOUNT * 100,
                metadata: {
                    type: 'duplicate_manual_payout_reversal',
                    requestId: REQUEST_ID,
                    keptTransfer: KEEP_TRANSFER,
                },
            },
            { idempotencyKey: `reverse_manual_${REVERSE_TRANSFER}` },
        );
        reversalId = reversal.id;
        console.log('Reversed', REVERSE_TRANSFER, 'as', reversalId);
    } else {
        console.log('Transfer already reversed; continuing with the ledger only.');
    }

    try {
        await c.query('BEGIN');
        const locked = await c.query(
            `SELECT balance, frozen_balance, owner_id
               FROM stores WHERE id = $1 FOR UPDATE`,
            [STORE_ID],
        );
        if (locked.rowCount !== 1) return await fail('store disappeared');
        const lockedRow = locked.rows[0];
        if (Number(lockedRow.balance) !== 6 || Number(lockedRow.frozen_balance) !== 0) {
            return await fail(`locked balance ${lockedRow.balance} frozen ${lockedRow.frozen_balance}`);
        }
        const again = await c.query(
            `SELECT id FROM wallet_transactions
              WHERE user_id = $1
                AND transaction_type = 'withdrawal'
                AND metadata->>'requestId' = $2`,
            [lockedRow.owner_id, REQUEST_ID],
        );
        if (again.rowCount > 0) return await fail('withdrawal debit appeared during lock');

        const updated = await c.query(
            `UPDATE stores
                SET balance = balance - $2::numeric, updated_at = now()
              WHERE id = $1
                AND balance = 6
                AND frozen_balance = 0
              RETURNING balance`,
            [STORE_ID, AMOUNT],
        );
        if (updated.rowCount !== 1 || Number(updated.rows[0].balance) !== 1) {
            return await fail('balance update did not land on 1.00');
        }

        await c.query(
            `INSERT INTO wallet_transactions
                (user_id, role, type, transaction_type, amount, currency, description, balance_after, metadata)
             VALUES ($1, 'VENDOR', 'DEBIT', 'withdrawal', $2, 'AED', $3, 1.00, $4::jsonb)`,
            [
                lockedRow.owner_id,
                AMOUNT,
                `Withdrawal via STRIPE: ${REQUEST_ID}`,
                JSON.stringify({
                    requestId: REQUEST_ID,
                    payoutMethod: 'STRIPE',
                    stripeTransferId: KEEP_TRANSFER,
                    reversedDuplicateTransferId: REVERSE_TRANSFER,
                    reversalId,
                    repair: 'WITHDRAWAL_DUPLICATE_REVERSED',
                }),
            ],
        );
        await c.query(
            `INSERT INTO audit_logs
                (action, entity, actor_type, actor_id, previous_state, new_state, reason, metadata)
             VALUES ('WITHDRAWAL_DUPLICATE_REVERSED', 'FINANCIAL', 'SYSTEM', 'WITHDRAWAL_REPAIR', '6.00', '1.00', $1, $2::jsonb)`,
            [
                `Reversed duplicate manual payout ${REVERSE_TRANSFER} and deducted the withdrawal once`,
                JSON.stringify({
                    requestId: REQUEST_ID,
                    keptTransfer: KEEP_TRANSFER,
                    reversedTransfer: REVERSE_TRANSFER,
                    reversalId,
                    amount: AMOUNT,
                }),
            ],
        );
        await c.query('COMMIT');
        console.log('Ledger deducted 5. Store balance is 1.00. Kept', KEEP_TRANSFER);
    } catch (err) {
        await fail(err.message || String(err));
        return;
    } finally {
        await c.end();
    }
})().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
