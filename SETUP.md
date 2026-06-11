# 🚀 دليل التثبيت والتشغيل | Installation & Setup Guide

## English Version

### Prerequisites

Before you begin, ensure you have the following installed on your system:

#### 1. Node.js (Required)
- **Version:** 18.x or higher (LTS recommended)
- **Download:** [https://nodejs.org/](https://nodejs.org/)
- **Verify installation:**
  ```bash
  node --version
  npm --version
  ```

#### 2. Git (Optional but recommended)
- **Download:** [https://git-scm.com/](https://git-scm.com/)

---

### Installation Steps

#### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

#### Step 2: Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

### Running the Application

#### Option 1: Run Both Separately (Recommended for Development)

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run start:dev
```
Backend will run on: `http://localhost:3001`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on: `http://localhost:5173`

#### Option 2: Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
```
This creates a `dist` folder ready for deployment.

**Start Backend in Production:**
```bash
cd backend
npm run build
npm run start:prod
```

---

### Quick Start Commands Summary

| Action | Command |
|--------|---------|
| Install Backend | `cd backend && npm install` |
| Install Frontend | `cd frontend && npm install` |
| Run Backend (Dev) | `cd backend && npm run start:dev` |
| Run Frontend (Dev) | `cd frontend && npm run dev` |
| Build Frontend | `cd frontend && npm run build` |
| Build Backend | `cd backend && npm run build` |

---

### Troubleshooting

#### Error: "ENOENT: no such file or directory"
- Make sure you're in the correct directory
- Run `npm install` first

#### Error: "Port already in use"
- Change the port in `.env` file
- Or kill the process using that port

#### Error: "Cannot connect to database"
- Check your `DATABASE_URL` in `.env`
- Ensure database server is running
- Check internet connection for cloud databases

---

---

## النسخة العربية

### المتطلبات الأساسية

قبل البدء، تأكد من تثبيت البرامج التالية على جهازك:

#### 1. Node.js (مطلوب)
- **الإصدار:** 18.x أو أحدث (يُنصح بإصدار LTS)
- **التحميل:** [https://nodejs.org/](https://nodejs.org/)
- **للتأكد من التثبيت:**
  ```bash
  node --version
  npm --version
  ```

#### 2. Git (اختياري لكن يُنصح به)
- **التحميل:** [https://git-scm.com/](https://git-scm.com/)

---

### خطوات التثبيت

#### الخطوة 1: تثبيت مكتبات الباك إند
```bash
cd backend
npm install
```

#### الخطوة 2: تثبيت مكتبات الفرونت إند
```bash
cd frontend
npm install
```

---

### تشغيل التطبيق

#### الطريقة 1: تشغيل كل جزء منفصلاً (للتطوير)

**نافذة Terminal 1 - تشغيل الباك إند:**
```bash
cd backend
npm run start:dev
```
الباك إند سيعمل على: `http://localhost:3001`

**نافذة Terminal 2 - تشغيل الفرونت إند:**
```bash
cd frontend
npm run dev
```
الفرونت إند سيعمل على: `http://localhost:5173`

#### الطريقة 2: بناء النسخة النهائية (للإنتاج)

**بناء الفرونت إند:**
```bash
cd frontend
npm run build
```
سيُنشئ مجلد `dist` جاهز للرفع.

**تشغيل الباك إند للإنتاج:**
```bash
cd backend
npm run build
npm run start:prod
```

---

### ملخص الأوامر السريعة

| العملية | الأمر |
|---------|-------|
| تثبيت الباك إند | `cd backend && npm install` |
| تثبيت الفرونت إند | `cd frontend && npm install` |
| تشغيل الباك إند (تطوير) | `cd backend && npm run start:dev` |
| تشغيل الفرونت إند (تطوير) | `cd frontend && npm run dev` |
| بناء الفرونت إند | `cd frontend && npm run build` |
| بناء الباك إند | `cd backend && npm run build` |

---

### حل المشاكل الشائعة

#### خطأ: "ENOENT: no such file or directory"
- تأكد أنك في المجلد الصحيح
- شغّل `npm install` أولاً

#### خطأ: "Port already in use"
- غيّر المنفذ في ملف `.env`
- أو أغلق البرنامج الذي يستخدم هذا المنفذ

#### خطأ: "Cannot connect to database"
- تأكد من `DATABASE_URL` في ملف `.env`
- تأكد من تشغيل سيرفر قاعدة البيانات
- تأكد من اتصال الإنترنت لقواعد البيانات السحابية

---

## 📁 Project Structure | هيكل المشروع

```
Marketplace Admin System/
├── backend/               # NestJS Backend Server
│   ├── src/              # Source code
│   ├── prisma/           # Database schema
│   ├── .env              # Environment variables (create this)
│   └── package.json      # Dependencies
│
├── frontend/             # React/Vite Frontend
│   ├── src/              # Source code
│   ├── .env              # Environment variables (create this)
│   └── package.json      # Dependencies
│
├── README.md             # Project documentation
└── SETUP.md              # This file
```



