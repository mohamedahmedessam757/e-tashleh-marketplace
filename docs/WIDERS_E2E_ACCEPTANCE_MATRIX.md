# Widers — Phase 5 E2E acceptance matrix

Run on staging/production **after** deploying the NotificationsService await fix.

| # | UI action | Expected template | Pass criteria |
|---|-----------|-------------------|---------------|
| 1 | Vendor OTP login | `auth_otp_vendor_ar_v2` | DELIVERED on phone |
| 2 | Admin activate store | `welcome_vendor_ar_v2` | Row in `WhatsAppMessageLog` + delivered (or documented 131026) |
| 3 | Customer creates order | `txn_order_customer` + `txn_order_merchant` | Both logs exist within ~10s |
| 4 | Customer accepts offer | `txn_order_customer` (awaiting payment) + merchant accept | Logs exist |
| 5 | Shipment created / status update | `txn_shipment_*` | Log + deep-link in body param 4 |
| 6 | Waybill issued | `txn_waybill_*` | Log exists |
| 7 | Part verification | `txn_verification_*` | Log exists |
| 8 | Doc / license alert | `txn_document_vendor` | Log exists |

Admin UI: **Settings → WhatsApp logs** or `GET /widers/message-logs`.

Probe (mapper dry-run): `node backend/scripts/probe-platform-notification-path.mjs`  
Probe (live, admin JWT): add `--send` with `ADMIN_TOKEN` + `RECIPIENT_USER_ID`.
