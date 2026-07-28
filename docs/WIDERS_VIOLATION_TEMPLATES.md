# Widers — Violation / Penalty WhatsApp Templates

Copy-paste guide for Meta/Widers. After create + **APPROVED**, NestJS sends via `waEvent: VIOLATION_ISSUED`.

> Technical names must end with `_ar_v2` (platform convention).  
> Do **not** put emojis inside body variables.  
> Buttons are **static URLs** (NestJS does not send button URL params).  
> **Meta rule:** body variables must **not** start or end the body — always wrap with static text before `{{1}}` and after the last `{{n}}`.

---

## Routing (code)

| Family (code) | Widers API name | Audience | `waEvent` |
|---------------|-----------------|----------|-----------|
| `txn_violation_customer` | `txn_violation_customer_ar_v2` | CUSTOMER | `VIOLATION_ISSUED` |
| `txn_violation_vendor` | `txn_violation_vendor_ar_v2` | MERCHANT / VENDOR | `VIOLATION_ISSUED` |

Trigger: `ViolationsService` → `notifications.create` with `metadata.waEvent = 'VIOLATION_ISSUED'`.

---

## Template A — Customer

**API name:** `txn_violation_customer_ar_v2`  
**Category:** UTILITY  
**Language:** Arabic (`ar`)

### Header (static text)
```
تنبيه مخالفة
```

### Body
Variables:
- `{{1}}` → `name`
- `{{2}}` → `status_detail`

```
مرحباً {{1}}، تم تسجيل مخالفة على حسابك في إي-تشليح. التفاصيل: {{2}}. يرجى مراجعة صفحة المخالفات واتباع التعليمات المطلوبة.
```

### Button
- Label: `عرض المخالفات`
- Type: URL (static)
- URL: `https://e-tashleh.net/dashboard/violations`

### Footer
```
إي-تشليح | E-TASHLEH
```

### Example `status_detail` (filled by Nest)
```
مخالفة قبول عرض دون دفع. النقاط: 10
```
> Fine line is included only when `fineAmount > 0`.

---

## Template B — Merchant / Vendor

**API name:** `txn_violation_vendor_ar_v2`  
**Category:** UTILITY  
**Language:** Arabic (`ar`)

### Header (static text)
```
تنبيه مخالفة للمتجر
```

### Body
Variables:
- `{{1}}` → `name`
- `{{2}}` → `store_name`
- `{{3}}` → `status_detail`

```
مرحباً {{1}}، تم تسجيل مخالفة على متجر {{2}}. التفاصيل: {{3}}. يرجى مراجعة صفحة المخالفات واتباع التعليمات المطلوبة.
```

### Button
- Label: `عرض المخالفات`
- Type: URL (static)
- URL: `https://e-tashleh.net/dashboard/violations`

### Footer
```
إي-تشليح | E-TASHLEH
```

### Example `status_detail` (filled by Nest)
```
تأخير التجهيز. النقاط: 15، الغرامة: 50 درهم.
```

---

## Widers «إعداد القالب» variable map

### Customer
| Body slot | System variable key |
|-----------|---------------------|
| `{{1}}` | `name` |
| `{{2}}` | `status_detail` |

### Vendor
| Body slot | System variable key |
|-----------|---------------------|
| `{{1}}` | `name` |
| `{{2}}` | `store_name` |
| `{{3}}` | `status_detail` |

---

## Verified platform wiring (code)

Chain (confirmed in NestJS):

1. `ViolationsService` → `notifications.create({ type: 'VIOLATION', metadata.waEvent: 'VIOLATION_ISSUED', status_detail, store_name? })`
2. `NotificationsService.create` → `WhatsAppChannelService.maybeSend` (CUSTOMER / MERCHANT / VENDOR only)
3. `resolveTemplateFamily` → `txn_violation_customer` | `txn_violation_vendor`
4. `resolveTemplateName` → `*_ar_v2`
5. Body params from registry order + channel field fill (`name` from user, `store_name` for vendor, `status_detail` from metadata)
6. Button: **static** (`buttonUrlDynamic: false`) — no URL param from API

Paths that send WA: issue violation, auto-penalty, admin-approved penalty, fraud audit.  
Paths that do **not** send WA: admin oversight notify, drop violation (no `waEvent`).

---

## Checklist after create

1. Create both templates in Widers / Meta (bodies above — variables not at start/end).
2. In Widers «إعداد القالب» map variables exactly as the tables above.
3. Submit for approval → status **APPROVED**.
4. Confirm Nest `WIDERS_ENABLED=true`.
5. Optional smoke (non-prod): `POST /widers/test/template/txn_violation_customer` with `{ "phone": "+971..." }`.
6. Issue a test violation to a user with phone + WhatsApp opt-in.
7. Expect log: `WhatsApp maybeSend ok (txn_violation_*/txn_violation_*_ar_v2)`.
