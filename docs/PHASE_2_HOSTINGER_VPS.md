# المرحلة 2 — Hostinger VPS + ربط e-tashleh.net

## ماذا تُظهر صور hPanel عندك؟

| الشاشة | المعنى |
|--------|--------|
| **Websites → Single** | استضافة مشتركة **منتهية** (Expired) — `e-tashleh.net` / staging / dev |
| **Domains → e-tashleh.net** | الدومين **Active** حتى 2027-05-27 ✅ |
| **Dev tools → VPS** | **لا يوجد VPS بعد** — لازم "Set up VPS" |
| **API / Cursor** | اختياري لاحقاً — لإدارة DNS من Cursor |

> **قرار:** لا تحتاج تجدّد خطة **Single** إذا هتشغّل كل شيء على **VPS**. الدومين منفصل ومفعّل.

---

## الهيكل النهائي على VPS واحد

```
e-tashleh.net          → Frontend (React build — ملفات static)
e-tashleh.net/api/*    → NestJS (اختياري — أو subdomain منفصل)
api.e-tashleh.net      → NestJS Backend (موصى به) + WebSocket
```

**Supabase** يبقى سحابي — لا يُرفع على VPS.

---

## الخطوة 2.1 — إنشاء VPS (من الصورة 5)

1. hPanel → **Dev tools** → **VPS** → **Set up VPS**
2. اختر الخطة:
   - **KVM 1** (2 vCPU / 8 GB) — كافية للبداية
   - لو ترافيك عالي: KVM 2
3. **OS:** Ubuntu 22.04 LTS
4. **Location:** أقرب لأوروبا (قريب من Supabase `eu-west-1`)
5. **Hostname:** `e-tashleh-prod`
6. أكمل الدفع وأنشئ السيرفر
7. من لوحة VPS انسخ:
   - **IP Address** (مثال: `123.45.67.89`)
   - **SSH root password** (أو SSH key)

**✋ توقف هنا واكتب لي الـ IP لما يجهز** (مش لازم الباسورد في الشات).

---

## الخطوة 2.2 — DNS (من الصورة 2)

1. hPanel → **Domains** → **e-tashleh.net** → **Manage** → **DNS / DNS Zone**
2. عدّل أو أضف:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| **A** | `@` | `IP_VPS` | 300 |
| **A** | `www` | `IP_VPS` | 300 |
| **A** | `api` | `IP_VPS` | 300 |

3. **احذف أو عطّل** أي A/CNAME قديم يشير لاستضافة Single المنتهية (إن وُجد).
4. انتظر 5–30 دقيقة لانتشار DNS.

**اختياري:**
- `staging.e-tashleh.net` → نفس IP (لاحقاً)
- `dev.e-tashleh.net` → اتركه للإيميل إن كان مستخدماً

---

## الخطوة 2.3 — أول دخول SSH للسيرفر

من PowerShell على جهازك:

```powershell
ssh root@YOUR_VPS_IP
```

أول مرة يطلب تأكيد fingerprint — اكتب `yes`.

---

## الخطوة 2.4 — تجهيز السيرفر (نفّذ على VPS)

```bash
apt update && apt upgrade -y

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx git

npm install -g pm2

node -v   # يجب >= 22
```

---

## الخطوة 2.5 — رفع المشروع

### خيار أ — Git (موصى به)

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_REPO_URL e-tashleh
cd e-tashleh
```

### خيار ب — ZIP من جهازك

ارفع المجلد عبر FileZilla/WinSCP إلى `/var/www/e-tashleh`

---

## الخطوة 2.6 — Backend `.env` على السيرفر

```bash
cd /var/www/e-tashleh/backend
nano .env
```

انسخ من جهازك مع هذه التعديلات **على السيرفر فقط**:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://e-tashleh.net
CORS_ORIGINS=https://e-tashleh.net,https://www.e-tashleh.net
```

ثم:

```bash
npm ci --omit=dev
npm run build
pm2 start npm --name e-tashleh-api -- run start:prod
pm2 save
pm2 startup
```

---

## الخطوة 2.7 — Frontend build

**على جهازك** (قبل الرفع أو على السيرفر):

```env
# Frontend/.env.production
VITE_API_URL=https://api.e-tashleh.net
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_VERIFICATION_GPS_DEV_BYPASS=false
```

```bash
cd Frontend
npm ci
npm run build
```

انسخ `Frontend/dist/` إلى `/var/www/e-tashleh/Frontend/dist` على VPS.

---

## الخطوة 2.8 — Nginx

انسخ من المشروع:

```bash
cp /var/www/e-tashleh/deploy/nginx/e-tashleh.conf /etc/nginx/sites-available/e-tashleh
ln -sf /etc/nginx/sites-available/e-tashleh /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## الخطوة 2.9 — SSL (HTTPS)

```bash
certbot --nginx -d e-tashleh.net -d www.e-tashleh.net -d api.e-tashleh.net
```

---

## الخطوة 2.10 — تحديث Stripe + Widers webhooks

| الخدمة | URL |
|--------|-----|
| Stripe | `https://api.e-tashleh.net/stripe/webhook` |
| Widers | `https://api.e-tashleh.net/widers/webhook?token=YOUR_SECRET` |

---

## الخطوة 2.11 — اختبار

```bash
curl -I https://e-tashleh.net
curl -I https://api.e-tashleh.net
pm2 logs e-tashleh-api --lines 50
```

من المتصفح: افتح `https://e-tashleh.net` وسجّل دخول.

---

## Hostinger API + Cursor (اختياري)

1. hPanel → **API** → **Generate API token**
2. Cursor → `%USERPROFILE%\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "hostinger-mcp": {
      "command": "npx",
      "args": ["hostinger-api-mcp@latest"],
      "env": {
        "HOSTINGER_API_TOKEN": "YOUR_TOKEN"
      }
    }
  }
}
```

3. Restart Cursor — **لا ترسل التوكن في الشات**

---

## Checklist المرحلة 2

```
□ VPS منشأ + IP معروف
□ DNS: @, www, api → IP_VPS
□ SSH + Node 22 + PM2 + Nginx
□ backend .env production + pm2 running
□ Frontend dist مرفوع
□ Nginx config + SSL
□ Stripe webhook URL محدّث
□ الموقع يفتح على https://e-tashleh.net
```

## تحديثات بعد النشر (git pull)

إذا ظهر `error: Your local changes ... package-lock.json would be overwritten`:

```bash
cd /var/www/e-tashleh
git checkout -- Frontend/package-lock.json
# أو: git restore Frontend/package-lock.json
```

ثم:

```bash
git pull origin main
git log -1 --oneline

cd backend && npm install --legacy-peer-deps && npm run build
cd ../Frontend && npm ci --legacy-peer-deps && npm run build

sudo cp deploy/nginx/e-tashleh.conf /etc/nginx/sites-available/e-tashleh
sudo cp deploy/nginx/snippets/e-tashleh-static-cache.conf /etc/nginx/snippets/
sudo cp deploy/nginx/snippets/e-tashleh-gzip.conf /etc/nginx/snippets/
sudo nginx -t && sudo systemctl reload nginx
pm2 restart e-tashleh-api
```

**تحقق من gzip + cache (المرحلة 4 — إلزامي):**

```bash
curl -sI -H "Accept-Encoding: gzip" https://e-tashleh.net/assets/vendor-react-*.js | grep -iE "cache-control|content-encoding"
# المتوقع: gzip + public, max-age=31536000, immutable

curl -sI https://e-tashleh.net/logo.webp | grep -i cache-control
```

إن لم يظهر `Content-Encoding: gzip`، أضف داخل `http {}` في `/etc/nginx/nginx.conf`:

```nginx
include /etc/nginx/snippets/e-tashleh-gzip.conf;
```

**تحقق من الـ cache بعد النشر (المرحلة 3 — HTTPS):**

```bash
# يجب أن يُرجع: public, max-age=31536000, immutable
curl -sI https://e-tashleh.net/assets/index-*.js | grep -i cache-control
curl -sI https://e-tashleh.net/logo.webp | grep -i cache-control
curl -sI https://e-tashleh.net/fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2 | grep -i cache-control
# index.html يجب أن يكون no-cache
curl -sI https://e-tashleh.net/ | grep -i cache-control
```

**تحقق من PageSpeed بعد النشر:**

1. Incognito → Network: لا `fonts.googleapis.com`، لا طلبات `vendor-export` / `vendor-supabase` على `/`
2. زائر جديد: LoadingScreen ثم Hero
3. زائر عائد: بدون loader (`sessionStorage etashleh_booted`)
4. أعد القياس: https://pagespeedinsights.dev/report/https://e-tashleh.net/?strategy=mobile

**أهداف المرحلة 3:** Lab Performance 85–92، LCP &lt; 2.0s؛ Field يتحسن تدريجياً خلال 28 يوم (CrUX).

**backend `.env` (OTP logo):** احذف `RESEND_LOGO_URL` إن كان يشير لـ Google Drive — الشعار يُضمَّن تلقائياً من `backend/assets/logo-email.png`.

## المرحلة 3 — ملخص التحسينات (كود)

| بند | الملفات |
|-----|---------|
| nginx HTTPS + cache موحّد | `deploy/nginx/e-tashleh.conf`, `deploy/nginx/snippets/e-tashleh-static-cache.conf` |
| خطوط self-hosted | `Frontend/public/fonts/`, `Frontend/index.css`, `Frontend/index.html` |
| CSS بدل framer-motion (landing) | `Hero`, `Navbar`, `RoleSelectionScreen`, `LoadingScreen`, `App`, `GlassCard` |
| i18n guest + legal lazy | `guest-landing.ts`, `legal-privacy.ts`, `loadLegalContent.ts`, `translations.ts` |
| NestJS compression | `backend/src/main.ts` |
| CSS code split | `vite.config.ts` → `cssCodeSplit: true` |

## المرحلة 4 — Mobile Field Data (56 → هدف 65+ خلال 28 يوم)

| بند | الملفات |
|-----|---------|
| nginx gzip snippet داخل server 443 | `deploy/nginx/snippets/e-tashleh-gzip.conf` |
| فصل `vendor-motion` / `vendor-icons` | `Frontend/vite.config.ts` |
| تأجيل `/system/status` | `Frontend/hooks/usePublicSystemStatus.ts` |
| loader أقصر على الموبايل + critical CSS | `LoadingScreen.tsx`, `index.html` |
| أيقونات SVG بدون lucide (footer/role) | `FooterIcons.tsx`, `RoleIcons.tsx`, `LandingFooter.tsx` |
| `logo.webp` مضغوط (~13 KB) | `Frontend/scripts/compress-logo-webp.mjs` |

**Checklist بعد النشر:**
1. `index.html` يعمل preload لـ `vendor-icons` فقط (لا `vendor-motion`)
2. Incognito mobile: لا `vendor-motion` في Network على `/`
3. زائر جديد موبايل: loader ~120ms
4. قياس: https://pagespeedinsights.dev/report/https://e-tashleh.net/?strategy=mobile

## المرحلة 5 — Mobile Lab + Field (هدف Lab ≥78، Field 65+ خلال 28 يوم)

| بند | الملفات |
|-----|---------|
| AuthLayout بدون framer-motion/lucide | `Frontend/components/auth/AuthLayout.tsx`, `index.css` |
| عزل jspdf/xlsx (dynamic import) | `AdminChatContext.tsx`, `AdminStoreProfile.tsx`, `AdminCustomerProfile.tsx` |
| lazy AdminChat في DashboardShell | `Frontend/routes/DashboardShell.tsx` |
| CSS guest/dashboard منفصل | `guest.css`, `dashboard.css`, `index.css` |
| خط عربي 400 فقط + fonts-extended | `index.css`, `public/fonts-extended.css`, `LanguageContext.tsx` |
| تأجيل `/system/status` بعد loader | `usePublicSystemStatus.ts`, `App.tsx` |
| logo.webp / logo_nomo.webp | `RoleSelectionScreen`, `Navbar`, `NomoBadge`, `LoadingScreen` |
| rolldown codeSplitting (لا vendor-motion على `/`) | `Frontend/vite.config.ts` |
| nginx fonts-extended cache | `deploy/nginx/snippets/e-tashleh-static-cache.conf` |

**نتائج البناء المحلي (المرحلة 5):**
- `index.css` ~130 KB (كان ~391 KB)
- `index.js` ~120 KB — يستورد `vendor-react` فقط (لا `vendor-motion`، لا `vendor-export`)
- `dashboard.css` ~315 KB — يُحمَّل مع `DashboardShell` فقط

**نشر VPS:**

```bash
cd /var/www/e-tashleh && git pull origin main
cd Frontend && npm ci --legacy-peer-deps && npm run build
sudo cp deploy/nginx/e-tashleh.conf /etc/nginx/sites-available/e-tashleh
sudo cp deploy/nginx/snippets/e-tashleh-*.conf /etc/nginx/snippets/
sudo nginx -t && sudo systemctl reload nginx
```

**تحقق إلزامي بعد النشر:**

```bash
# gzip + cache على assets
curl -sI -H "Accept-Encoding: gzip" https://e-tashleh.net/assets/vendor-react-*.js | grep -iE "cache-control|content-encoding"

# Incognito على / — Network: لا vendor-motion، لا vendor-pdf-tools، لا vendor-xlsx
```

**قياس:** [DebugBear](https://www.debugbear.com/test/website-speed/m3QoatbN/overview) + [PageSpeed Mobile](https://pagespeedinsights.dev/report/https://e-tashleh.net/?strategy=mobile)

**Checklist قبول المرحلة 5:**
1. FCP Lab < 2.5s، LCP Lab < 2.5s على `/`
2. Page Weight على `/` < 1.5 MB
3. DebugBear Lab ≥ 78
4. Field يبدأ التحسن خلال 28 يوم بعد تفعيل nginx cache
