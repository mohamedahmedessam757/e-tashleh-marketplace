# نشر التحديثات — GitHub + VPS

## 1) من جهازك (Windows) — رفع على GitHub

```powershell
cd "C:\Users\attar\Desktop\Marketplace Admin System"
.\deploy\push-to-github.ps1 "وصف التحديث هنا"
```

**مثال:**

```powershell
.\deploy\push-to-github.ps1 "Update landing page, language toggle, and OTP template"
```

- لا يرفع `.env` (محمي في `.gitignore`)
- يرفع فقط: `backend`, `Frontend`, `deploy`, `docs`, `supabase`, وملفات الجذر المهمة

---

## 2) على VPS — تحديث وتشغيل

```bash
ssh root@187.127.233.203
bash /var/www/e-tashleh/deploy/update-vps.sh
```

**أول مرة فقط** (صلاحية تنفيذ):

```bash
chmod +x /var/www/e-tashleh/deploy/update-vps.sh
```

---

## 3) ملفات `.env` (يدوياً — لا تُرفع على GitHub)

### Backend — `/var/www/e-tashleh/backend/.env`

```bash
nano /var/www/e-tashleh/backend/.env
```

### Frontend — `/var/www/e-tashleh/Frontend/.env.production`

```bash
nano /var/www/e-tashleh/Frontend/.env.production
```

**مهم:** `VITE_API_URL` لازم يكون:

```env
VITE_API_URL=https://api.e-tashleh.net
```

---

## 4) سير العمل الكامل (كل تحديث)

| الخطوة | أين | الأمر |
|--------|-----|--------|
| 1 | Windows | `.\deploy\push-to-github.ps1 "رسالة"` |
| 2 | VPS SSH | `bash /var/www/e-tashleh/deploy/update-vps.sh` |
| 3 | متصفح | https://e-tashleh.net |

---

## 5) أوامر مفيدة على VPS

```bash
pm2 status
pm2 logs e-tashleh-api --lines 50
curl -I https://api.e-tashleh.net/health
nginx -t
```

---

## 6) Clone أول مرة على VPS

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/mohamedahmedessam757/e-tashleh-marketplace.git e-tashleh
cd e-tashleh/backend && nano .env
cd ../Frontend && nano .env.production
bash /var/www/e-tashleh/deploy/update-vps.sh
```
