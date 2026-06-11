# المرحلة 1 — Supabase (migrations + backup)

## الهدف

- التأكد أن قاعدة البيانات متزامنة مع الكود
- تفعيل RLS والجداول الأمنية
- أخذ backup قبل النشر على Hostinger

---

## الخطوة 1.1 — Backup (يدوي في Dashboard)

1. [Supabase Dashboard](https://supabase.com/dashboard) → مشروع **yhasbbmieqcgyjktgyro**
2. **Database** → **Backups** (أو **Settings** → **Database** على الخطة المدفوعة)
3. إن وُجد **Download backup** أو **Create backup** — نفّذه الآن
4. على الخطة المجانية: **Database** → **Migrations** / استخدم **pg_dump** من جهازك:

```powershell
# اختياري — يحتاج PostgreSQL client مثبت
pg_dump "YOUR_DIRECT_URL" -Fc -f backup-e-tashleh-$(Get-Date -Format yyyyMMdd).dump
```

> **مهم:** لا تكمل النشر على Hostinger بدون backup واحد على الأقل.

---

## الخطوة 1.2 — فحص حالة القاعدة (آلي)

من مجلد `backend`:

```powershell
node scripts/phase1-db-audit.mjs
```

كل البنود يجب أن تكون **✅**. إن ظهر **❌** — طبّق الملف المقابل من القائمة أدناه.

---

## الخطوة 1.3 — Security hardening (إلزامي — idempotent)

الملف: `supabase/migrations/20260528_security_hardening.sql`

**طريقة أ — Supabase SQL Editor:**

1. Dashboard → **SQL Editor** → **New query**
2. انسخ محتوى الملف بالكامل → **Run**

**طريقة ب — من الطرفية:**

```powershell
cd backend
Get-Content "..\supabase\migrations\20260528_security_hardening.sql" | npx prisma db execute --stdin
```

---

## الخطوة 1.4 — باقي migrations (إن احتجت)

المشروع يستخدم ملفات `.sql` يدوية (ليست Prisma Migrate folders).  
**لا تشغّل كل الملفات عميانيًا** — معظمها مُطبَّق مسبقًا على مشروعك.

### ترتيب `supabase/migrations/` (قديم → جديد)

| # | الملف |
|---|--------|
| 1 | `create_support_tickets.sql` |
| 2 | `20240217142000_returns_disputes_setup.sql` |
| 3 | `20240217150000_fix_storage_rls.sql` |
| 4 | `20240217160000_fix_storage_final.sql` |
| 5 | `20240217163000_force_storage_fix.sql` |
| 6 | `20260428_advanced_restrictions.sql` |
| 7 | `20260519_order_realtime_verification_docs.sql` |
| 8 | `20260520_adjudication_fee_bearer.sql` |
| 9 | `20260521_fix_false_shipping_paid.sql` |
| 10 | `20260522_offer_fulfillment_status.sql` |
| 11 | `20260523_merchant_share_contact_violation.sql` |
| 12 | **`20260528_security_hardening.sql`** ← إلزامي للإنتاج |
| 13–20 | باقي ملفات 20260529 … 20260602 |

### ترتيب `backend/prisma/migrations/` (قديم → جديد)

طبّق فقط ما يفشل في `phase1-db-audit.mjs` — أهمها:

- `20260605_otp_challenges.sql`
- `20260606_widers_contact_sync.sql`
- `20260607_preferred_language.sql`
- `20260608_whatsapp_message_logs.sql`
- `20260609_widers_rls_hardening.sql`
- `20260610_otp_channel.sql`

```powershell
Get-Content "prisma\migrations\FILENAME.sql" | npx prisma db execute --stdin
```

---

## الخطوة 1.5 — تحقق Prisma schema

```powershell
cd backend
npx prisma generate
npx prisma validate
```

> `prisma migrate deploy` **لا يُستخدم** هنا — القاعدة مُدارة بملفات SQL يدوية.

---

## Checklist إتمام المرحلة 1

```
□ Backup مأخوذ من Supabase
□ node scripts/phase1-db-audit.mjs → كلها ✅
□ 20260528_security_hardening.sql منفّذ
□ npx prisma validate ناجح
```

## المرحلة التالية

**المرحلة 2:** إعداد Hostinger (VPS / DNS / Node.js)
