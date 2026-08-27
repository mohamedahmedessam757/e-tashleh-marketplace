# Widers WhatsApp — Event → Template Map

Single source for which in-app events dispatch which Widers template families.

> **June 2026 rebuild:** Default templates use Meta/Widers technical names `{family}_ar_v2`.  
> **Aug 2026 order/shipment links:** Optional `{family}_ar_v3` — **no URL button**; Nest injects absolute `follow_url` as body `{{4}}`. Cutover via `WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION=v3` after Meta APPROVED.  
> Preferred routing uses `metadata.waEvent` (see below). Type/keyword heuristics remain as fallback.  
> Setup guide: [WIDERS_PHASE0_SETUP_GUIDE.md](WIDERS_PHASE0_SETUP_GUIDE.md)

| Template family | Widers API name (ar) | `waEvent` (preferred) | Trigger (fallback) |
|-----------------|----------------------|------------------------|--------------------|
| `auth_otp_customer` | `auth_otp_customer_ar_v2` | — (direct OTP) | OTP via WhatsApp — customer register/login (`otp.service.ts`) |
| `auth_otp_vendor` | `auth_otp_vendor_ar_v2` | — (direct OTP) | OTP via WhatsApp — vendor register/login |
| `auth_otp_admin` | `auth_otp_admin_ar_v2` | — (direct OTP) | OTP via WhatsApp — staff 2FA (all admin roles) |
| `txn_order_customer` | `txn_order_customer_ar_v2` (default) / `_ar_v3` | `ORDER_CREATED`, `ORDER_STATUS`, `OFFER_REVEAL`, `OFFER_ACCEPTED` | `OFFER`, `ORDER`, `ORDER_UPDATE`, payment without invoice |
| `txn_order_merchant` | `txn_order_merchant_ar_v2` (default) / `_ar_v3` | same | Same as customer, merchant role |
| `txn_shipment_customer` | `txn_shipment_customer_ar_v2` (default) / `_ar_v3` | `SHIPMENT_STATUS` | `SHIPMENT_UPDATE` |
| `txn_shipment_merchant` | `txn_shipment_merchant_ar_v2` (default) / `_ar_v3` | `SHIPMENT_STATUS` | `SHIPMENT_UPDATE` |
| `txn_invoice_customer` | `txn_invoice_customer_ar_v2` | `INVOICE_ISSUED` / `PAYMENT_SUCCESS` + invoice | `payment` + invoice metadata |
| `txn_invoice_merchant` | `txn_invoice_merchant_ar_v2` | `INVOICE_ISSUED` / `PAYMENT_SUCCESS` + invoice | `payment` + invoice metadata |
| `txn_waybill_customer` | `txn_waybill_customer_ar_v2` | `WAYBILL_ISSUED` | `order_update` + waybill keywords |
| `txn_waybill_merchant` | `txn_waybill_merchant_ar_v2` | `WAYBILL_ISSUED` | `order_update` + waybill keywords |
| `txn_document_vendor` | `txn_document_vendor_ar_v2` | `DOCUMENT` | `DOC_EXPIRY`, `SUCCESS`, or `ALERT`/`SYSTEM` **only when** `waEvent=DOCUMENT` |
| `txn_offer_restriction_vendor` | `txn_offer_restriction_vendor_ar_v2` | `OFFER_BIDDING_RESTRICTED` | Monthly deletion limit (50) / admin bidding restriction — body `{{1}}` name · `{{2}}` store_name · `{{3}}` status_detail |
| `txn_violation_customer` | `txn_violation_customer_ar_v2` | `VIOLATION_ISSUED` | New violation / penalty notify to customer — body `{{1}}` name · `{{2}}` status_detail |
| `txn_violation_vendor` | `txn_violation_vendor_ar_v2` | `VIOLATION_ISSUED` | New violation / penalty notify to merchant — body `{{1}}` name · `{{2}}` store_name · `{{3}}` status_detail |
| `txn_verification_customer` | `txn_verification_customer_ar_v2` | `VERIFICATION` | `ORDER` / `system_alert` + `metadata.verification` |
| `txn_verification_vendor` | `txn_verification_vendor_ar_v2` | `VERIFICATION` | Same, merchant role |
| `welcome_customer` | `welcome_customer_ar_v2` | — (direct) | After register — `auth.service.ts` |
| `welcome_vendor` | `welcome_vendor_ar_v2` | `STORE_ACTIVATION` | Vendor register **and** store activation (`docType: store_activation`) |

## Allowed `metadata.waEvent` values

`ORDER_CREATED` | `ORDER_STATUS` | `OFFER_REVEAL` | `OFFER_ACCEPTED` | `OFFER_BIDDING_RESTRICTED` | `VIOLATION_ISSUED` | `PAYMENT_SUCCESS` | `INVOICE_ISSUED` | `SHIPMENT_STATUS` | `WAYBILL_ISSUED` | `VERIFICATION` | `DOCUMENT` | `STORE_ACTIVATION`

## Branding & URLs

- Footer (Widers): `إي-تشليح | E-TASHLEH`
- Site: https://e-tashleh.net
- Button base (legacy v2 txn_* with static buttons): `https://e-tashleh.net/dashboard/`
- OTP category: **AUTHENTICATION** (`WIDERS_OTP_MODE=authentication`)
- OTP send: Meta COPY_CODE — body `{{1}}` + button URL `{{1}}` (same code). **Never** map Body `{{1}}` to contact name in Widers «إعداد القالب» (causes Meta #132000: 2 vs 1).
- Most txn_* buttons in current WABA remain **static URLs** — NestJS does not send button URL parameters for those.
- **Order/shipment v3:** **no URL button**. Nest generates an absolute deep-link and sends it as body `{{4}}` (`follow_url`). Auth is session-based via SPA `pendingRedirect` — no JWT in the URL.
- Shipment v2 body `{{4}}` (`tracking_number` field) is already an **https deep-link** (not a carrier tracking code). Carrier tracking is appended into `{{3}}` / status_detail.
- Cutover env: `WIDERS_ORDER_SHIPMENT_TEMPLATE_VERSION=v2|v3` (default `v2`).

## Intentionally no WhatsApp template

`REFERRAL`, `CHAT`, `FINANCIAL`, `WALLET`, `SYSTEM`, `ALERT`, `SECURITY`, payment failures — **except**:
- `ALERT`/`SYSTEM` with `waEvent=DOCUMENT` (document reject/reupload)
- `ALERT`/`VIOLATION` with `waEvent=VIOLATION_ISSUED` (violations & penalties — see [WIDERS_VIOLATION_TEMPLATES.md](WIDERS_VIOLATION_TEMPLATES.md))

## Audit & smoke tests

- `GET /widers/templates/audit` (admin JWT)
- `node backend/scripts/widers-template-audit.mjs`
- `POST /widers/test/template/:family` (dev/staging)
- `POST /widers/test/otp` (dev/staging)
- `POST /widers/test/notification-path` (dev/staging — full NotificationsService → WhatsApp path)

## GCC phone normalization

All sends use `normalizeGulfPhone` — dial codes: +966, +971, +973, +974, +965, +968.

## Display name (Meta)

WhatsApp sender should show **E-TASHLEH** only — set in Meta Business Manager → WhatsApp Manager → Profile → Display name (not in NestJS code).
