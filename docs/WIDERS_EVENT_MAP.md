# Widers WhatsApp — Event → Template Map

Single source for which in-app events dispatch which Widers template families.

| Template family | Trigger |
|-----------------|---------|
| `auth_otp_customer` | OTP via WhatsApp — customer (`otp.service.ts`) |
| `auth_otp_vendor` | OTP via WhatsApp — vendor (`otp.service.ts`) |
| `txn_order_customer` | `OFFER`, `ORDER`, `ORDER_UPDATE`, payment without invoice |
| `txn_order_merchant` | Same as customer, merchant role |
| `txn_shipment_customer` | `SHIPMENT_UPDATE` |
| `txn_shipment_merchant` | `SHIPMENT_UPDATE` |
| `txn_invoice_customer` | `payment` + invoice metadata |
| `txn_invoice_merchant` | `payment` + invoice metadata |
| `txn_waybill_customer` | `ORDER_UPDATE` with waybill keywords |
| `txn_waybill_merchant` | `ORDER_UPDATE` with waybill keywords |
| `txn_document_vendor` | `DOC_EXPIRY`, `SUCCESS`, document alerts |
| `txn_verification_customer` | `ORDER` / `ORDER_UPDATE` + `metadata.verification` |
| `txn_verification_merchant` | Same, merchant role |
| `welcome_customer` | After register — `auth.service.ts` |
| `welcome_vendor` | After register — vendor |

## Intentionally no WhatsApp template

`REFERRAL`, `CHAT`, `FINANCIAL`, `WALLET`, `SYSTEM`, `ALERT`, `SECURITY`, payment failures.

## Audit

- `GET /widers/templates/audit` (admin JWT)
- `node backend/scripts/widers-template-audit.mjs`
- `POST /widers/test/template/:family` (dev/staging)

## GCC phone normalization

All sends use `normalizeGulfPhone` — dial codes: +966, +971, +973, +974, +965, +968.
