#!/usr/bin/env node
/**
 * Release HELD escrow for orders past the 24h return window.
 * Usage:
 *   node scripts/release-stuck-escrow.mjs           # dry-run
 *   node scripts/release-stuck-escrow.mjs --apply   # execute releases
 *
 * Requires DATABASE_URL (via backend .env).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apply = process.argv.includes('--apply');

function loadEnv() {
    for (const rel of ['../.env', '../../.env']) {
        const p = resolve(__dirname, rel);
        if (!existsSync(p)) continue;
        for (const line of readFileSync(p, 'utf8').split('\n')) {
            const m = line.match(/^([^#=]+)=(.*)$/);
            if (m && !process.env[m[1].trim()]) {
                process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
            }
        }
    }
}

loadEnv();

const RELEASE_STATUSES = [
    'COMPLETED',
    'WARRANTY_ACTIVE',
    'DELIVERED',
    'PARTIALLY_DELIVERED',
];

async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is required');
        process.exit(1);
    }

    const client = new pg.Client({ connectionString: url });
    await client.connect();

    const { rows } = await client.query(
        `
        SELECT e.id AS escrow_id, e.payment_id, e.order_id, o.order_number, o.status,
               COALESCE(o.delivered_at, o.updated_at) AS anchor_at
        FROM escrow_transactions e
        JOIN orders o ON o.id = e.order_id
        WHERE e.status = 'HELD'
          AND o.status = ANY($1::text[])
          AND COALESCE(o.delivered_at, o.updated_at) <= NOW() - INTERVAL '24 hours'
        ORDER BY anchor_at ASC
        `,
        [RELEASE_STATUSES],
    );

    console.log(`Found ${rows.length} HELD escrow row(s) eligible for release`);
    if (rows.length === 0) {
        await client.end();
        return;
    }

    for (const row of rows) {
        console.log(
            `  - ${row.order_number} (${row.status}) payment=${row.payment_id} anchor=${row.anchor_at}`,
        );
    }

    if (!apply) {
        console.log('\nDry-run only. Re-run with --apply after deploying backend fix.');
        await client.end();
        return;
    }

    const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';
    const adminToken = process.env.ADMIN_JWT;
    if (!adminToken) {
        console.error('Set ADMIN_JWT (admin bearer token) for --apply mode');
        process.exit(1);
    }

    let ok = 0;
    let fail = 0;
    for (const row of rows) {
        try {
            const res = await fetch(`${apiBase}/payments/admin/release-escrow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    orderId: row.order_id,
                    paymentId: row.payment_id,
                }),
            });
            if (res.ok) {
                ok += 1;
                console.log(`Released ${row.order_number}`);
            } else {
                fail += 1;
                const text = await res.text();
                console.error(`Failed ${row.order_number}: ${text.slice(0, 200)}`);
            }
        } catch (err) {
            fail += 1;
            console.error(`Failed ${row.order_number}:`, err);
        }
    }

    console.log(`Done: ${ok} released, ${fail} failed`);
    await client.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
