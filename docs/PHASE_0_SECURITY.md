# المرحلة 0 — الأمان وتجهيز البيئة

> **الهدف:** قبل أي رفع على Hostinger، تأكد أن الأسرار سليمة والإعدادات جاهزة للإنتاج.

## Checklist (نفّذ بالترتيب)

### 0.1 — إصلاح ملفات `.env` محلياً

- [x] إصلاح `FRONTEND_URL` المعطوب في `backend/.env` (سطر quotes زائدة)
- [ ] على **السيرفر فقط**: `NODE_ENV=production`
- [ ] على **السيرفر فقط**: `FRONTEND_URL=https://e-tshaleh.net`
- [ ] على **السيرفر فقط**: `CORS_ORIGINS=https://e-tshaleh.net`
- [ ] على **السيرفر فقط**: `VERIFICATION_GPS_DEV_BYPASS=false`
- [ ] `Frontend/.env.production`: `VITE_API_URL=https://api.e-tshaleh.net` (بعد إنشاء subdomain)

### 0.2 — تدوير المفاتيح (إذا شاركت المشروع أو `.env`)

راجع [SECURITY_KEY_ROTATION.md](../SECURITY_KEY_ROTATION.md):

1. Supabase service role + DB password
2. JWT_SECRET + JWT_REFRESH_SECRET
3. Stripe secret + webhook secret
4. OpenRouter, Widers, Resend

### 0.3 — تحقق آلي

```bash
cd backend
node scripts/validate-prod-env.mjs
```

**محلياً** سيظهر تحذيرات (localhost, Stripe test) — هذا طبيعي للتطوير.  
**على السيرفر** يجب أن يمر بدون ❌.

### 0.4 — ما لا تفعله

- لا ترفع `.env` على Git
- لا تضع API tokens في الشات — استخدم MCP env vars فقط
- لا تفعّل `WIDERS_ENABLED=true` قبل `GET /widers/readiness`

## المرحلة التالية

**المرحلة 1:** Supabase migrations + backup → `docs/PHASE_1_SUPABASE.md` (قريباً)
