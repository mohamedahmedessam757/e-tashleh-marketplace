# Widers Phase 7 — QA Matrix + Security Audit + Go-Live

> **E-Tshaleh (أي تشليح)** — آخر تحديث بعد اكتمال Phases 0b–7 في الكود.

---

## 1) تأكيد `.env` — Webhook Secret

```env
WIDERS_WEBHOOK_SECRET=etshaleh_widers_wh_2026_Xk9mP2vL7nQ4
```

| البند | الحالة |
|-------|--------|
| نفس القيمة في Widers **Webhook (sender)** | `?token=etshaleh_widers_wh_2026_Xk9mP2vL7nQ4` |
| لا يُشارك في Git | ✅ `.env` غير مُتتبّع |
| تدوير بعد التسريب | موصى به — أنشئ سراً جديداً وحدّث Widers |

**ملاحظة:** السر في URL يظهر في سجلات Widers — استخدم HTTPS فقط (`https://e-tshaleh.net/...`).

---

## 2) `WIDERS_ENABLED` — وضع التطوير vs الإنتاج

| القيمة | السلوك |
|--------|--------|
| `false` (افتراضي) | OTP يُطبع في console الباكند؛ لا إرسال واتساب حقيقي؛ `makeContact` يُسجّل فقط |
| `true` | إرسال حقيقي عبر Widers API + إشعارات transactional |

**قبل Go-Live:**

```env
WIDERS_ENABLED=true
```

**شروط الإنتاج (يفشل `validateProductionEnv` بدونها):**

- `WIDERS_API_TOKEN` مضبوط
- `WIDERS_WEBHOOK_SECRET` مضبوط

---

## 3) فحص الجاهزية الآلي

```http
GET /widers/readiness
GET /widers/health
```

`readiness` يعيد checklist بدون أسرار — استخدمه قبل تفعيل `WIDERS_ENABLED=true`.

---

## 4) مصفوفة QA — OTP

| السيناريو | الجمهور | القالب | Backend | Frontend | WhatsApp |
|-----------|---------|--------|---------|----------|----------|
| register-init | عميل/تاجر | `auth_otp_*_ar` | ✅ | ✅ | ⏳ قالب APPROVED |
| register-verify-otp | عميل/تاجر | — | ✅ | ✅ | — |
| mobile-login-init | عميل/تاجر | `auth_otp_*_ar` | ✅ | ✅ | ⏳ |
| email-login-init | عميل/تاجر | واتساب على الهاتف المسجّل | ✅ | ✅ (حقل إيميل UI) | ⏳ |
| recovery step 1/2 | عميل/تاجر | `auth_otp_*_ar` | ✅ | ✅ | ⏳ |
| Admin login OTP | إدمن | mock (مؤجّل) | — | — | لا |

**Dev (`WIDERS_ENABLED=false`):** انسخ OTP من console الباكند.

---

## 5) مصفوفة QA — إشعارات Transactional

| الحدث | type في الكود | عميل | تاجر | قالب WhatsApp |
|-------|---------------|------|------|---------------|
| تحديث طلب | `ORDER`, `ORDER_UPDATE` | ✅ | ✅ | `txn_order_*` |
| تحديث شحن | `SHIPMENT_UPDATE` | ✅ | ✅ | `txn_shipment_*` |
| دفع + فاتورة | `payment` + offerId | ✅ | ✅ | `txn_invoice_*` |
| دفع فاشل | `payment` + failureReason | In-App | — | **لا يُرسل** |
| بوليصة شحن | `order_update` + waybill | ✅ | ✅ | `txn_waybill_*` |
| توثيق | `system_alert` + verification | ✅ | ✅ | `txn_verification_*` |
| مستندات متجر | `SUCCESS`, `DOC_*` | — | ✅ | `txn_document_vendor` |
| إحالة / شات / مالي | `referral`, `chat`, `financial` | — | — | **لا يُرسل** |
| إدمن | أي | In-App | — | **لا يُرسل** |

**اللغة:** `UserSettings.preferredLanguage` → `messageAr` / `messageEn` كـ `status_detail`.

---

## 6) مصفوفة QA — Contacts (Phase 4)

| التوقيت | API | DB |
|---------|-----|-----|
| register-init | `makeContact` + tag `lead` | — |
| register/customer\|vendor | `makeContact` + tags عميل/مورد | `widersContactId`, `widersSyncedAt` |
| login (بدون contactId) | backfill | ✅ |
| batch (dev) | `POST /widers/contacts/sync-batch` | ✅ |

---

## 7) مصفوفة QA — Webhook (Phase 6)

| الاختبار | المتوقع |
|----------|---------|
| `GET /widers/webhook?hub.mode=subscribe&hub.verify_token=SECRET&hub.challenge=123` | يرد `123` |
| `POST /widers/webhook?token=SECRET` + body statuses | 200 + تحديث `whatsapp_message_logs` |
| POST بدون token | 403 |
| نفس status مرتين | idempotency عبر `widers_webhook_events` |
| `GET /widers/webhook/logs` في production | 403 |

**Widers sender URL (مؤكد منك):**

```
https://e-tshaleh.net/widers/webhook?token=etshaleh_widers_wh_2026_Xk9mP2vL7nQ4
```

**تحقق:** `GET https://e-tshaleh.net/widers/health` → JSON (ليس صفحة React).

---

## 8) Security Audit

| البند | الحالة | ملاحظة |
|-------|--------|--------|
| Token في body (ليس Bearer عام) | ✅ | `WIDERS_API_TOKEN` في `.env` فقط |
| لا OTP ثابت `123456` | ✅ | Phase 2 |
| Webhook auth | ✅ | `?token=` أو `x-widers-token` |
| Dev endpoints معطّلة في prod | ✅ | test/otp, sync-batch, logs |
| Rate limit OTP | ✅ | `otp_challenges` window |
| `whatsappOptIn` | ✅ | default true — Phase 4 |
| لا إرسال لـ ADMIN | ✅ | `maybeSend` filter |
| JWT في روابط WhatsApp | ✅ | لا `?token=` JWT — UUID فقط |
| IDOR على الطلبات | ✅ | `ResourceAccessService` (موجود) |
| Token في URL Widers | ⚠️ | يظهر في logs — HTTPS + تدوير دوري |
| قوالب `_en` | ⏳ | fallback `_ar` تلقائي |
| Deep links `?tab=invoices` | ⏳ | **Phase 5b** (Frontend) |
| JWT 7d + pendingRedirect | ⏳ | **Phase 5c** |
| Dedup WhatsApp 5min | ⏳ | اختياري Phase 7+ |

---

## 9) Go-Live Checklist (أنت)

- [ ] كل قوالب `txn_*` + `auth_otp_*` → **APPROVED** في Meta
- [ ] قوالب OTP Utility (`auth_otp_customer_ar`, `auth_otp_vendor_ar`) منشأة
- [ ] Base URL أزرار القوالب = `https://e-tshaleh.net/dashboard/`
- [ ] Groups: `marketplace_customers`, `marketplace_vendors`
- [ ] `GET /widers/health` → `apiReachable: true`
- [ ] `GET /widers/readiness` → `readyForProduction: true`
- [ ] Webhook sender محفوظ في Widers
- [ ] `WIDERS_ENABLED=true` على سيرفر الإنتاج
- [ ] اختبار OTP على `WIDERS_TEST_PHONE`
- [ ] اختبار إشعار طلب/شحن/فاتورة حقيقي

---

## 10) ما تبقى في الخطة (بعد Phase 7)

| Phase | الحالة | الوصف |
|-------|--------|--------|
| **0** | ⏳ أنت | قوالب Meta APPROVED + OTP templates |
| **5b** | ⏳ كود | `?tab=invoices&offerId=` في OrderDetails + preferredLanguage في Frontend |
| **5c** | ⏳ كود | pendingRedirect + JWT 7d عميل/تاجر |

---

## 11) أوامر اختبار سريعة (dev)

```bash
# Backend
curl http://localhost:3000/widers/health
curl http://localhost:3000/widers/readiness

# OTP smoke (dev only, WIDERS_ENABLED=true)
curl -X POST http://localhost:3000/widers/test/otp -H "Content-Type: application/json" -d "{}"

# Webhook smoke
curl -X POST "http://localhost:3000/widers/webhook?token=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"statuses":[{"id":"wamid.test","status":"delivered","timestamp":"1710000000"}]}}]}]}'
```

---

**المرجع:** `c:\Users\attar\.cursor\plans\widers_whatsapp_integration_a282930f.plan.md`
