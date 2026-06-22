# Widers WhatsApp — Event → Template Map

Single source for which in-app events dispatch which Widers template families.

> **June 2026 rebuild:** All templates use Meta/Widers technical names `{family}_ar_v2`.  
> Widers dashboard may be empty until all 15 are recreated and APPROVED.  
> Setup guide: [WIDERS_PHASE0_SETUP_GUIDE.md](WIDERS_PHASE0_SETUP_GUIDE.md)

| Template family | Widers API name (ar) | Trigger |
|-----------------|----------------------|---------|
| `auth_otp_customer` | `auth_otp_customer_ar_v2` | OTP via WhatsApp — customer (`otp.service.ts`) |
| `auth_otp_vendor` | `auth_otp_vendor_ar_v2` | OTP via WhatsApp — vendor |
| `txn_order_customer` | `txn_order_customer_ar_v2` | `OFFER`, `ORDER`, `ORDER_UPDATE`, payment without invoice |
| `txn_order_merchant` | `txn_order_merchant_ar_v2` | Same as customer, merchant role |
| `txn_shipment_customer` | `txn_shipment_customer_ar_v2` | `SHIPMENT_UPDATE` |
| `txn_shipment_merchant` | `txn_shipment_merchant_ar_v2` | `SHIPMENT_UPDATE` |
| `txn_invoice_customer` | `txn_invoice_customer_ar_v2` | `payment` + invoice metadata |
| `txn_invoice_merchant` | `txn_invoice_merchant_ar_v2` | `payment` + invoice metadata |
| `txn_waybill_customer` | `txn_waybill_customer_ar_v2` | `ORDER_UPDATE` with waybill keywords |
| `txn_waybill_merchant` | `txn_waybill_merchant_ar_v2` | `ORDER_UPDATE` with waybill keywords |
| `txn_document_vendor` | `txn_document_vendor_ar_v2` | `DOC_EXPIRY`, `SUCCESS`, document alerts |
| `txn_verification_customer` | `txn_verification_customer_ar_v2` | `ORDER` / `ORDER_UPDATE` + `metadata.verification` |
| `txn_verification_merchant` | `txn_verification_merchant_ar_v2` | Same, merchant role |
| `welcome_customer` | `welcome_customer_ar_v2` | After register — `auth.service.ts` |
| `welcome_vendor` | `welcome_vendor_ar_v2` | After register — vendor |

## Branding & URLs

- Footer (Widers): `إي-تشليح | E-TASHLEH`
- Site: https://e-tashleh.net
- Button base: `https://e-tashleh.net/dashboard/`
- OTP category: **Utility** (`WIDERS_OTP_MODE=utility`, body fields: `name`, `otp_code`)

## Intentionally no WhatsApp template

`REFERRAL`, `CHAT`, `FINANCIAL`, `WALLET`, `SYSTEM`, `ALERT`, `SECURITY`, payment failures.

## Audit & smoke tests

- `GET /widers/templates/audit` (admin JWT)
- `node backend/scripts/widers-template-audit.mjs`
- `POST /widers/test/template/:family` (dev/staging)
- `POST /widers/test/otp` (dev/staging)

## GCC phone normalization

All sends use `normalizeGulfPhone` — dial codes: +966, +971, +973, +974, +965, +968.

## Display name (Meta)

WhatsApp sender should show **E-TASHLEH** only — set in Meta Business Manager → WhatsApp Manager → Profile → Display name (not in NestJS code).
