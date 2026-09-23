import 'dotenv/config';
import pg from 'pg';

const CASE_ID = '13277211-227e-4968-aede-27d10b36f49d';
const OFFER_ID = '7947bf9a-5ac2-4ee3-8e94-165412c7a256';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ret = await client.query(
      `SELECT id, offer_id, order_id, status, fault_party, verdict_locked,
              shipping_company_liability, shipping_payee
       FROM returns WHERE id = $1 FOR UPDATE`,
      [CASE_ID],
    );
    if (!ret.rows[0]) throw new Error('return not found');
    console.log('before', ret.rows[0]);

    // Reverse mistaken RELEASE_FUNDS escrow credit if present
    const esc = await client.query(
      `SELECT e.id, e.status, e.merchant_amount, e.payment_id, p.offer_id
       FROM escrow_transactions e
       JOIN payment_transactions p ON p.id = e.payment_id
       WHERE p.offer_id = $1
       ORDER BY e.created_at DESC LIMIT 1`,
      [OFFER_ID],
    );
    console.log('escrow', esc.rows[0]);

    if (esc.rows[0] && esc.rows[0].status === 'RELEASED') {
      const merchantAmount = Number(esc.rows[0].merchant_amount);
      const store = await client.query(
        `SELECT s.id, s.balance, s.owner_id FROM stores s
         JOIN offers o ON o.store_id = s.id WHERE o.id = $1`,
        [OFFER_ID],
      );
      if (store.rows[0]) {
        await client.query(
          `UPDATE stores SET balance = GREATEST(0, balance - $1),
                                 pending_balance = pending_balance + $1
           WHERE id = $2`,
          [merchantAmount, store.rows[0].id],
        );
        await client.query(
          `UPDATE escrow_transactions
           SET status = 'HELD', released_at = NULL, release_condition = NULL
           WHERE id = $1`,
          [esc.rows[0].id],
        );
        await client.query(
          `INSERT INTO wallet_transactions
             (user_id, role, type, transaction_type, amount, currency, balance_after, description, metadata)
           VALUES ($1, 'VENDOR', 'DEBIT', 'ADJUDICATION_RESET', $2, 'AED',
                   (SELECT balance FROM stores WHERE id = $3),
                   $4, $5::jsonb)`,
          [
            store.rows[0].owner_id,
            merchantAmount,
            store.rows[0].id,
            `Reset mistaken verdict release for case ${CASE_ID.slice(0, 8)}`,
            JSON.stringify({ caseId: CASE_ID, reset: true, offerId: OFFER_ID }),
          ],
        );
        console.log('reversed escrow release', merchantAmount);
      }
    }

    // Reverse any shipping-company liability wallet / platform balance for this case
    const scLiab = await client.query(
      `SELECT id, amount, metadata
       FROM wallet_transactions
       WHERE transaction_type = 'SHIPPING_COMPANY_LIABILITY'
         AND (metadata->>'caseId') = $1`,
      [CASE_ID],
    );
    let liabilityReversed = 0;
    for (const row of scLiab.rows) {
      liabilityReversed += Number(row.amount || 0);
    }
    if (liabilityReversed > 0.009) {
      await client.query(
        `UPDATE platform_wallet
         SET shipping_company_liability_balance =
               GREATEST(0, COALESCE(shipping_company_liability_balance, 0) - $1)`,
        [liabilityReversed],
      );
      await client.query(
        `DELETE FROM wallet_transactions
         WHERE transaction_type = 'SHIPPING_COMPANY_LIABILITY'
           AND (metadata->>'caseId') = $1`,
        [CASE_ID],
      );
      console.log('reversed SC liability', liabilityReversed);
    }

    await client.query(
      `UPDATE returns SET
         status = 'PENDING',
         verdict_locked = false,
         verdict_issued_at = NULL,
         verdict_notes = NULL,
         fault_party = NULL,
         final_refund_decision = NULL,
         final_customer_refund_amount = 0,
         refund_amount = 0,
         refund_execution_status = 'NOT_REQUIRED',
         shipping_payee = NULL,
         shipping_payment_status = 'NONE',
         shipping_payment_method = NULL,
         shipping_company_liability = 0,
         shipping_roundtrip = NULL,
         shipping_refund = 0,
         gateway_fee_amount = NULL,
         refund_fee_amount = NULL,
         fee_bearer = NULL,
         admin_approval = NULL,
         admin_approval_reason = NULL,
         admin_name = NULL,
         admin_email = NULL,
         admin_signature = NULL,
         adjudication_fee_amount = NULL,
         adjudication_fee_payee = NULL,
         adjudication_fee_payment_status = 'NONE',
         updated_at = NOW()
       WHERE id = $1`,
      [CASE_ID],
    );

    await client.query(
      `UPDATE offers SET resolution_locked = false, fulfillment_status = 'DELIVERED'
       WHERE id = $1`,
      [OFFER_ID],
    );

    // Remove any SC obligations / mistaken warranty fee invoices for this case
    await client.query(
      `DELETE FROM shipping_company_settlements
       WHERE obligation_id IN (SELECT id FROM shipping_company_obligations WHERE case_id = $1)`,
      [CASE_ID],
    );
    await client.query(
      `DELETE FROM shipping_company_obligations WHERE case_id = $1`,
      [CASE_ID],
    );
    await client.query(
      `DELETE FROM invoices WHERE shipping_batch_key LIKE $1`,
      [`RETURNS_FEE:${CASE_ID}%`],
    );

    // Mark mistaken verdict notifications as read for this case
    const notif = await client.query(
      `UPDATE notifications
       SET is_read = true,
           updated_at = NOW()
       WHERE (metadata->>'caseId') = $1
         AND is_read = false`,
      [CASE_ID],
    );
    console.log('marked notifications read', notif.rowCount);

    await client.query('COMMIT');
    console.log('RESET_OK', CASE_ID);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
