# Phase 0 — دليل إعداد Widers (E-Tshaleh) خطوة بخطوة

> **الهدف:** تجهيز لوحة Widers قبل أي كود في NestJS.  
> **المنصة:** https://apps.widers.net  
> **الوثائق:** https://documenter.getpostman.com/view/8538142/2s9Ykn8gvj

---

## قبل ما تبدأ — ماذا تحتاج؟

| # | المطلوب |
|---|---------|
| 1 | حساب Widers مفعّل + رقم WhatsApp Business موثّق في Meta |
| 2 | صلاحية إنشاء قوالب ومجموعات |
| 3 | **دومين المنصة** (لأزرار الروابط): مثال `https://etshaleh.com` أو staging — اكتبه هنا: `________________` |
| 4 | رقم واتساب للاختبار (سعودي +966): `________________` |
| 5 | 2–5 أيام صبر لموافقة Meta على القوالب |

**استراتيجية الإطلاق الموصى بها:**  
ابدأ بـ **العربي فقط (14 قالب)** → بعد الموافقة أضف **الإنجليزي (14 قالب)**.  
لا تنشئ 28 قالب دفعة واحدة إلا إذا فريق Widers/Meta سريع.

> **محتوى كامل:** الأقسام أ–ز أدناه + **الملاحق أ–ح في آخر الملف** (نصوص Body، 14 قالب EN، ربط الأحداث، قائمة المتغيرات، تدقيق الاكتمال).

---

# الجزء أ — الأمان و API (30 دقيقة)

## الخطوة 1: تدوير API Token

1. ادخل https://apps.widers.net
2. من القائمة: **API** (أيقونة المطورين)
3. إذا ظهر Token قديم في screenshot أو شات — **اعتبره مسرّباً**
4. اضغط **Regenerate** / إنشاء token جديد
5. انسخ Token → احفظه في مكان آمن (Password manager)
6. **لا** ترسله في واتساب أو GitHub
7. لاحقاً (Phase 1): نضعه في `backend/.env` كـ:
   ```env
   WIDERS_API_TOKEN=التوكن_هنا
   WIDERS_API_BASE_URL=https://apps.widers.net
   ```

**تحقق:** زر **الوثائق** يفتح Postman Docs.

---

## الخطوة 2: تأكيد رقم WhatsApp

1. من القائمة: **مدير واتساب** أو إعدادات القناة
2. تأكد الحالة: **متصل / Connected**
3. إن لم يكن موثّقاً — أكمل ربط Meta Business قبل القوالب

---

# الجزء ب — المجموعات والوسوم (20 دقيقة)

## الخطوة 3: إنشاء مجموعات جهات الاتصال

المسار: **جهات الاتصال** → **المجموعات** → **+ مجموعة جديدة**

| اسم المجموعة (بالإنجليزي في النظام) | الاستخدام |
|-------------------------------------|-----------|
| `marketplace_customers` | كل عملاء E-Tshaleh |
| `marketplace_vendors` | كل تجار E-Tshaleh |

**مهم:** الاسم بالإنجليزي و underscore كما هو — الكود سيرسل `groups: "marketplace_customers"`.

---

## الخطوة 4: وسوم (Tags) — اختياري للتسويق

المسار: **جهات الاتصال** → **الوسوم**

| الوسم | اللون | الاستخدام |
|-------|-------|-----------|
| `عميل` | أزرق | عميل مسجّل |
| `مورد` | أصفر | تاجر |
| `مسجل_2026` | سماوي | تسجيل جديد |

---

## الخطوة 5: المتغيرات (Variables)

المسار: **المحتوى** → **المتغيرات** → **+ إضافة متغير جديد**

أنت عندك بالفعل: `name`, `phone`, `email`, `SKU`, …  
**أضف** (إن لم تكن موجودة) — نوع **نص** لكل من:

| اسم المتغير | الوصف |
|-------------|--------|
| `order_number` | رقم الطلب |
| `invoice_number` | رقم الفاتورة |
| `offer_id` | معرف العرض |
| `tracking_number` | رقم التتبع |
| `status_detail` | نص الإشعار الكامل |
| `amount` | المبلغ |
| `store_name` | اسم المتجر |
| `doc_type` | نوع المستند |
| `cta_path` | مسار الرابط بعد /dashboard/ |
| `part_name` | اسم القطعة (عروض/شحن — اختياري) |
| `rejection_reason` | سبب الرفض (يُدمج غالباً في status_detail) |

> **ملاحظة:** في **قوالب Meta** المتغيرات في النص غالباً `{{1}}`, `{{2}}`, `{{3}}` بالترتيب — ليس أسماء الحقول. الجدول أعلاه لجهات الاتصال والتسويق. التفاصيل الكاملة في **ملحق و** أسفل الملف.

---

# الجزء ج — القوالب (الجزء الأهم)

## قواعد Meta/Widers (اقرأها مرة)

1. **اسم القالب:** إنجليزي + `_` فقط — مثل `txn_order_customer_ar`
2. **Footer:** ثابت في كل قالب: `E-Tshaleh | أي تشليح` — **لا تكرره في Body**
3. **ترتيب المتغيرات في Body:** ثابت — الكود يرسل بنفس الترتيب دائماً
4. **زر URL:** في إعداد القالب تضع Base URL ثابت، والجزء الديناميكي يأتي من API
5. **نسبة النص للمتغيرات (Meta):** كلما زاد عدد `{{n}}` لازم **جمل عربية ثابتة أطول** حولها — لا تضع متغيراً في سطر فارغ لوحده

### Base URL لأزرار القوالب (انسخه)

استبدل `YOUR_DOMAIN` بدومينك الحقيقي:

```
https://YOUR_DOMAIN/dashboard/
```

**مثال suffix ديناميكي (يُرسل من الكود):**
```
order-details/ORDER_UUID_HERE?tab=invoices&offerId=OFFER_UUID_HERE
```

---

## مرجع شامل — اسم كل قالب + ربط المتغيرات في «إعداد القالب»

> بعد موافقة Meta، ادخل **قوالب الواتساب** → اختر القالب → **إعداد القالب**.  
> في قسم **«متغيرات القالب»** اربط كل `{{n}}` بالمتغير من القائمة كما في الجدول (نفس ما في `template-registry.ts` بالكود).

| # | اسم القالب في لوحة Widers (حقل **الاسم**) | اسم القالب التقني (Meta/API) | الجمهور | Header |
|---|------------------------------------------|------------------------------|---------|--------|
| 1 | رمز التحقق — عميل | `auth_otp_customer_ar` | عميل | `رمز التحقق` |
| 2 | رمز التحقق — تاجر | `auth_otp_vendor_ar` | تاجر | `رمز التحقق` |
| 3 | **تحديث حالة الطلب للعميل** | `txn_order_customer_ar` | عميل | `تحديث طلب` |
| 4 | تحديث حالة الطلب للتاجر | `txn_order_merchant_ar` | تاجر | `تحديث طلب` |
| 5 | تحديث الشحن للعميل | `txn_shipment_customer_ar` | عميل | `تحديث الشحن` |
| 6 | تحديث الشحن للتاجر | `txn_shipment_merchant_ar` | تاجر | `تحديث شحن الطلب` |
| 7 | فاتورة جاهزة للعميل | `txn_invoice_customer_ar` | عميل | `فاتورة جاهزة` |
| 8 | فاتورة جديدة للتاجر | `txn_invoice_merchant_ar` | تاجر | `فاتورة جديدة` |
| 9 | بوليصة الشحن للعميل | `txn_waybill_customer_ar` | عميل | `بوليصة الشحن` |
| 10 | بوليصة الشحن للتاجر | `txn_waybill_merchant_ar` | تاجر | `بوليصة الشحن` |
| 11 | مستندات المتجر | `txn_document_vendor_ar` | تاجر | `مستندات المتجر` |
| 12 | توثيق الطلب للعميل | `txn_verification_customer_ar` | عميل | `توثيق الطلب` |
| 13 | توثيق الطلب للتاجر | `txn_verification_vendor_ar` | تاجر | `توثيق الطلب` |
| 14 | ترحيب بالعميل *(اختياري)* | `welcome_customer_ar` | عميل | — |
| 15 | ترحيب بالتاجر *(اختياري)* | `welcome_vendor_ar` | تاجر | — |

### جداول ربط المتغيرات — انسخها في «إعداد القالب»

#### `auth_otp_customer_ar` / `auth_otp_vendor_ar` (Utility حتى موافقة Authentication)

| المتغير في القالب | اختر في Widers | حقل الكود (NestJS) |
|-------------------|----------------|---------------------|
| `{{1}}` | **اسم جهة الاتصال** | `name` |
| `{{2}}` | *(OTP — يُمرَّر من API)* | `otp_code` |

> إن استخدمت فئة **Authentication** من Meta: لا Body يدوي — Meta يولّد OTP تلقائياً.

---

#### `txn_order_customer_ar` — مثل لقطة الشاشة

| المتغير في القالب | اختر في Widers | حقل الكود (NestJS) |
|-------------------|----------------|---------------------|
| `{{1}}` | **اسم جهة الاتصال** | `name` |
| `{{2}}` | **order_number** | `order_number` |
| `{{3}}` | **status_detail** | `status_detail` |

**زر URL:** نص `عرض الطلب` — suffix: `order-details/{orderId}`

---

#### `txn_order_merchant_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر:** `فتح الطلب` — suffix: `explore-offer/{orderId}`

---

#### `txn_shipment_customer_ar` / `txn_shipment_merchant_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |
| `{{4}}` | tracking_number | `tracking_number` |

**زر عميل:** `تتبع الشحنة` → `order-details/{orderId}`  
**زر تاجر:** `فتح الطلب` → `explore-offer/{orderId}`

---

#### `txn_invoice_customer_ar` / `txn_invoice_merchant_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | invoice_number | `invoice_number` |
| `{{4}}` | amount | `amount` |
| `{{5}}` | status_detail *(أو ملخص قصير)* | `summary` |

**زر عميل:** `عرض الفاتورة` → `order-details/{orderId}?tab=invoices&offerId={offerId}`  
**زر تاجر:** `عرض الفاتورة` → `explore-offer/{orderId}?tab=invoices&offerId={offerId}`

---

#### `txn_waybill_customer_ar` / `txn_waybill_merchant_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر عميل:** `عرض البوليصة` → `order-details/{orderId}?tab=waybills`  
**زر تاجر:** `عرض البوليصة` → `explore-offer/{orderId}?tab=waybills`

---

#### `txn_document_vendor_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | store_name | `store_name` |
| `{{2}}` | doc_type | `doc_type` |
| `{{3}}` | status_detail | `status_detail` |

**زر:** `فتح لوحة المتجر` → suffix: `home`

---

#### `txn_verification_customer_ar` / `txn_verification_vendor_ar`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر عميل:** `عرض الطلب` → `order-details/{orderId}`  
**زر تاجر:** `فتح الطلب` → `explore-offer/{orderId}`

---

#### `welcome_customer_ar` / `welcome_vendor_ar` *(اختياري)*

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |

**زر:** `ابدأ الآن` → suffix: `home`

---

## الخطوة 6 — قالب OTP عميل (أول قالب — جرّبه)

المسار: **قوالب الواتساب** → **+ إنشاء قالب**

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `رمز التحقق — عميل` |
| **اسم القالب التقني (Meta/API)** | `auth_otp_customer_ar` |
| **الفئة** | المصادقة (Authentication) — أو Utility مؤقتاً |
| **النوع** | رمز المرور لمرة واحدة (OTP) |
| **اللغة** | Arabic |
| **تنويه أمان** | ON |
| **تحذير الانتهاء** | OFF (أو ON حسب رغبتك) |

**لا تكتب OTP يدوياً في Body** — Meta يولّد الكود تلقائياً.  
**زر:** نسخ الكود (Copy Code) — يظهر تلقائياً في قوالب Authentication.

**Footer:** `E-Tshaleh | أي تشليح`

→ **إنشاء القالب** → انتظر الموافقة.

**كرر للتاجر:**

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `رمز التحقق — تاجر` |
| **اسم القالب التقني** | `auth_otp_vendor_ar` |

**إعداد المتغيرات (Utility OTP):** `{{1}}` → اسم جهة الاتصال | `{{2}}` → otp_code

---

## الخطوة 7 — قالب تحديث طلب (عميل) — Utility

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث حالة الطلب للعميل` |
| **اسم القالب التقني (Meta/API)** | `txn_order_customer_ar` |
| **الفئة** | أداة مساعدة (Utility) |
| **اللغة** | Arabic |

### رأس الرسالة (Header)
- النوع: **نص**
- النص الثابت: `تحديث طلب`

### محتوى القالب (Body) — انسخ بالضبط:

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على طلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل الحالة والخطوة التالية: {{3}}

شكراً لاستخدامك منصتنا.
```

| متغير في القالب | اختر في Widers (إعداد القالب) | حقل الكود | مثال |
|-----------------|-------------------------------|-----------|------|
| `{{1}}` | **اسم جهة الاتصال** | `name` | أحمد |
| `{{2}}` | **order_number** | `order_number` | ORD-2026-001 |
| `{{3}}` | **status_detail** | `status_detail` | بدأ التجهيز! القطع قيد التحضير... |

### تذييل (Footer)
```
E-Tshaleh | أي تشليح
```

### زر (Button)
- النوع: **رابط (URL)**
- نص الزر: `عرض الطلب`
- **عنوان URL الثابت:** `https://YOUR_DOMAIN/dashboard/`
- **المتغير الديناميكي (suffix):** سيُرسل من API مثل:
  `order-details/abc-123-uuid`

> في Widers قد يطلب منك إدخال مثال للـ suffix عند الإنشاء — ضع: `order-details/00000000-0000-0000-0000-000000000000`

---

## الخطوة 8 — قالب تحديث طلب (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث حالة الطلب للتاجر` |
| **اسم القالب التقني** | `txn_order_merchant_ar` |
| **Header** | `تحديث طلب` |

### Body:

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على الطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل الحالة والإجراء المطلوب: {{3}}

شكراً لتعاونك معنا.
```

**Footer:** `E-Tshaleh | أي تشليح`

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

### زر URL
- نص الزر: `فتح الطلب`
- Base: `https://YOUR_DOMAIN/dashboard/`
- suffix مثال: `explore-offer/00000000-0000-0000-0000-000000000000`

---

## الخطوة 9 — قالب الشحن (عميل)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث الشحن للعميل` |
| **اسم القالب التقني** | `txn_shipment_customer_ar` |
| **Header** | `تحديث الشحن` |

> **خطأ Meta شائع:** «عدد كبير جداً من المتغيرات مقارنةً بطول الرسالة» — مع 4 متغيرات لازم نص عربي **أطول** (انظر Body أدناه). لا تضع `{{3}}` في سطر لوحده.

### Body (انسخ بالضبط — نص أطول لموافقة Meta):

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن لطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لثقتك بنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |
| `{{4}}` | tracking_number | `tracking_number` |

**Footer:** `E-Tshaleh | أي تشليح` (لا تكرر الاسم في Body)

### زر: `تتبع الشحنة` → suffix: `order-details/UUID`

---

## الخطوة 10 — قالب الشحن (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث الشحن للتاجر` |
| **اسم القالب التقني** | `txn_shipment_merchant_ar` |
| **Header** | `تحديث شحن الطلب` |  

**Body:**

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |
| `{{4}}` | tracking_number | `tracking_number` |

**Footer:** `E-Tshaleh | أي تشليح`  
زر: `فتح الطلب` — suffix: `explore-offer/UUID`

---

## الخطوة 11 — قالب الفاتورة (عميل)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `فاتورة جاهزة للعميل` |
| **اسم القالب التقني** | `txn_invoice_customer_ar` |
| **Header** | `فاتورة جاهزة` |

### Body (5 متغيرات — نص أطول لتجنب رفض Meta):

```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة مرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لاستخدامك منصتنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | invoice_number | `invoice_number` |
| `{{4}}` | amount | `amount` |
| `{{5}}` | status_detail / ملخص | `summary` |

**Footer:** `E-Tshaleh | أي تشليح`

### زر
- نص: `عرض الفاتورة`
- Base: `https://YOUR_DOMAIN/dashboard/`
- suffix مثال: `order-details/ORDER_UUID?tab=invoices&offerId=OFFER_UUID`

---

## الخطوة 12 — قالب الفاتورة (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `فاتورة جديدة للتاجر` |
| **اسم القالب التقني** | `txn_invoice_merchant_ar` |
| **Header** | `فاتورة جديدة` |

### Body:

```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | invoice_number | `invoice_number` |
| `{{4}}` | amount | `amount` |
| `{{5}}` | status_detail / ملخص | `summary` |

**Footer:** `E-Tshaleh | أي تشليح`  
زر `عرض الفاتورة` — suffix:  
`explore-offer/ORDER_UUID?tab=invoices&offerId=OFFER_UUID`

---

## الخطوة 13 — قالب البوليصة (عميل + تاجر)

| الحقل | عميل | تاجر |
|-------|------|------|
| **الاسم في لوحة Widers** | `بوليصة الشحن للعميل` | `بوليصة الشحن للتاجر` |
| **اسم القالب التقني** | `txn_waybill_customer_ar` | `txn_waybill_merchant_ar` |

**Header:** `بوليصة الشحن`

### Body — عميل (`txn_waybill_customer_ar`):

```
مرحباً {{1}}،

نود إعلامك بأنه تم إنشأ بوليصة الشحن المرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل البوليصة والحالة الحالية: {{3}}

يمكنك الاطلاع على البوليصة وطباعتها من خلال الزر أدناه.

شكراً لثقتك بنا.
```

### Body — تاجر (`txn_waybill_merchant_ar`):

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل البوليصة والحالة الحالية: {{3}}

يرجى مراجعة البوليصة وإكمال الإجراءات المطلوبة من لوحة التحكم.

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**Footer:** `E-Tshaleh | أي تشليح`

### زر
- نص: `عرض البوليصة`
- suffix عميل: `order-details/UUID?tab=waybills`
- suffix تاجر: `explore-offer/UUID?tab=waybills`

---

## الخطوة 14 — قالب مستندات التاجر

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `مستندات المتجر` |
| **اسم القالب التقني** | `txn_document_vendor_ar` |
| **Header** | `مستندات المتجر` |

### Body:

```
مرحباً،

نود إعلامك بوجود تحديث جديد يخص مستندات متجرك المسجّل على منصة E-Tshaleh.

اسم المتجر: {{1}}
نوع المستند المعني: {{2}}

تفاصيل الحالة والإجراء المطلوب: {{3}}

يرجى مراجعة لوحة التحكم وإكمال المطلوب في أقرب وقت ممكن.

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | store_name | `store_name` |
| `{{2}}` | doc_type | `doc_type` |
| `{{3}}` | status_detail | `status_detail` |

**Footer:** `E-Tshaleh | أي تشليح`

### زر: `فتح لوحة المتجر` → suffix: `home` أو مسار إعدادات المتجر عندكم

---

## الخطوة 15 — قالب توثيق القطعة

| الحقل | عميل | تاجر |
|-------|------|------|
| **الاسم في لوحة Widers** | `توثيق الطلب للعميل` | `توثيق الطلب للتاجر` |
| **اسم القالب التقني** | `txn_verification_customer_ar` | `txn_verification_vendor_ar` |

**Header:** `توثيق الطلب`

### Body — عميل (`txn_verification_customer_ar`):

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة المرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل التوثيق والحالة الحالية: {{3}}

يرجى مراجعة الطلب من خلال الزر أدناه لمتابعة الخطوات التالية.

شكراً لثقتك بنا.
```

### Body — تاجر (`txn_verification_vendor_ar`):

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل التوثيق والإجراء المطلوب: {{3}}

يرجى مراجعة الطلب وإكمال المطلوب من لوحة التحكم.

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**Footer:** `E-Tshaleh | أي تشليح`

### زر
- عميل: `عرض الطلب` → `order-details/UUID`
- تاجر: `فتح الطلب` → `explore-offer/UUID`

---

## الخطوة 16 — مزامنة وموافقة Meta

1. من **قوالب الواتساب** اضغط **مزامنة**
2. انتظر الحالة: **APPROVED** (قد تستغرق ساعات إلى 3 أيام)
3. إن **REJECTED** — اقرأ سبب الرفض من Meta وعدّل النص (غالباً: تسويقي زائد، أو متغيرات غير واضحة)

---

## الخطوة 17 — النسخ الإنجليزية (بعد موافقة العربي)

لكل قالب `_ar` أنشئ `_en` بنفس الهيكل:

**مثال `txn_order_customer_en`:**

| الحقل | القيمة |
|-------|--------|
| اسم القالب | `txn_order_customer_en` |
| اللغة | **English** |
| Header | `Order update` |
| Body | |
```
Hello {{1}},

Your order {{2}}

{{3}}

Thank you — E-Tshaleh
```
| Footer | `E-Tshaleh` |
| Button | `View order` |

---

# الجزء د — ما ترسله للمطور بعد Phase 0

## جدول Mapping (املأه وارسله)

| اسم Widers (عربي) | template_name | status | lang | {{1}} Widers | {{2}} | {{3}} | {{4}} | {{5}} | button suffix |
|-------------------|---------------|--------|------|--------------|-------|-------|-------|-------|---------------|
| رمز التحقق — عميل | auth_otp_customer_ar | | ar | اسم جهة الاتصال | otp_code | | | | — |
| رمز التحقق — تاجر | auth_otp_vendor_ar | | ar | اسم جهة الاتصال | otp_code | | | | — |
| تحديث حالة الطلب للعميل | txn_order_customer_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{orderId} |
| تحديث حالة الطلب للتاجر | txn_order_merchant_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{orderId} |
| تحديث الشحن للعميل | txn_shipment_customer_ar | | ar | اسم جهة الاتصال | order_number | status_detail | tracking_number | | order-details/{orderId} |
| تحديث الشحن للتاجر | txn_shipment_merchant_ar | | ar | اسم جهة الاتصال | order_number | status_detail | tracking_number | | explore-offer/{orderId} |
| فاتورة جاهزة للعميل | txn_invoice_customer_ar | | ar | اسم جهة الاتصال | order_number | invoice_number | amount | summary | order-details/{id}?tab=invoices&offerId={offerId} |
| فاتورة جديدة للتاجر | txn_invoice_merchant_ar | | ar | اسم جهة الاتصال | order_number | invoice_number | amount | summary | explore-offer/{id}?tab=invoices&offerId={offerId} |
| بوليصة الشحن للعميل | txn_waybill_customer_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{id}?tab=waybills |
| بوليصة الشحن للتاجر | txn_waybill_merchant_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{id}?tab=waybills |
| مستندات المتجر | txn_document_vendor_ar | | ar | store_name | doc_type | status_detail | | | home |
| توثيق الطلب للعميل | txn_verification_customer_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{orderId} |
| توثيق الطلب للتاجر | txn_verification_vendor_ar | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{orderId} |

## معلومات إلزامية

```
FRONTEND_URL=https://.....
WIDERS_API_TOKEN=(موجود في .env فقط — لا ترسل في الشات)
TEST_PHONE=+9665xxxxxxxx
```

---

# ترتيب العمل اليوم (Checklist)

- [ ] **أ** الخطوة 1–2: Token + رقم WhatsApp
- [ ] **ب** الخطوة 3–5: Groups + Tags + Variables
- [ ] **ج** الخطوة 6: OTP عميل (اختبار أول موافقة)
- [ ] **ج** الخطوة 7–8: طلب عميل + تاجر
- [ ] **ج** الخطوة 9–10: شحن
- [ ] **ج** الخطوة 11–12: فاتورة
- [ ] **ج** الخطوة 13–15: بوليصة + مستندات + توثيق
- [ ] **ج** الخطوة 16: مزامنة + انتظار APPROVED
- [ ] **د** الخطوة 17 + جدول Mapping (بعد الموافقة)
- [ ] أخبرنا: "Phase 0 جاهز" → نبدأ **Phase 1** (كود NestJS)

---

# أسئلة شائعة

**س: Meta رفض القالب؟**  
ج: قلّل علامات تعجب، لا وعود تسويقية، Utility للتشغيل فقط، Authentication للـ OTP فقط.

**س: هل أكتب الرمز {{1}} في Widers؟**  
ج: نعم في محتوى Body — بالترتيب. عند الإرسال من API نمرّر القيم بنفس الترتيب.

**س: لماذا لا PDF في الفاتورة؟**  
ج: الرابط يفتح صفحة الطلب → تبويب الفواتير داخل المنصة (قراركم).

**س: خطأ «عدد كبير جداً من المتغيرات مقارنةً بطول الرسالة»؟**  
ج: قاعدة Meta: كلما زادت المتغيرات (`{{1}}`…`{{4}}`) لازم **نص عربي ثابت أطول** حولها. لا تضع متغيراً في سطر فارغ لوحده. للشحن (4 متغيرات) استخدم Body الخطوة 9 المحدّث. للفواتير (5 متغيرات) استخدم Body الخطوة 11 المحدّث.

**س: Webhook الآن؟**  
ج: لا — Phase 6 بعد تشغيل الـ API. في Phase 0 ركّز على القوالب والـ Token.

---

# ملحق أ — تدقيق الاكتمال (اقرأه قبل ما تقول "خلصت كل حاجة")

## هل الدليل كان مكتملاً 100%؟

**لا — النسخة السابقة كانت تغطي ~85%:** الأساسيات صحيحة، لكن فيه فجوات. هذا الملحق يكمّلها.

| البند | في الدليل الأساسي؟ | الحالة |
|-------|---------------------|--------|
| Token + Groups + Variables | نعم | مكتمل |
| OTP عميل + تاجر (تفصيل كامل) | جزئي | **مكمّل في الملحق ب** |
| طلب / شحن / فاتورة / بوليصة (عربي) | نعم (بعضها "نفس السابق") | **نصوص كاملة في الملحق ج** |
| توثيق + مستندات تاجر | نعم | مكتمل |
| قوالب **إنجليزية** (14) | مثال واحد فقط | **جدول كامل في الملحق د** |
| `welcome_*` (تسويق) | لا | **ملحق هـ — اختياري Phase 0** |
| `txn_store_vendor_ar` (تفعيل/إيقاف متجر) | لا | **يُغطى بـ `txn_document` أو قالب إضافي** |
| إرجاع / نزاع / ضمان / عروض | لا قالب منفصل | **يُغطى بـ `txn_order` + `status_detail`** |
| Webhook (receiver) | مذكور لاحقاً | Phase 6 — لا يلزم في Phase 0 |
| حد Meta 1024 حرف لـ `{{3}}` | لا | **الكود سيختصر — لا تحتاج تفعل شيء** |
| تكرار Footer في Body + Footer | نعم قد يحدث | **انظر قاعدة Footer أدناه** |

### قاعدة Footer (مهمة)

Meta تسمح بـ **Footer ثابت** منفصل. لتجنب الرفض أو التكرار:

- **إما** تضع `E-Tshaleh | أي تشليح` في **Footer فقط** وتزيل السطر الأخير من Body
- **إما** تبقيه في Body فقط وتترك Footer فارغاً

**الموصى به:** Footer = `E-Tshaleh | أي تشليح` — و**احذف** السطر الأخير من Body في كل القوالب أدناه (النسخ المحدّثة في الملحق ج).

---

# ملحق ب — OTP تاجر (تفصيل كامل)

## `auth_otp_vendor_ar`

| الحقل | القيمة |
|-------|--------|
| الفئة | المصادقة |
| النوع | OTP |
| الاسم | `auth_otp_vendor_ar` |
| اللغة | Arabic |
| Footer | `E-Tshaleh | أي تشليح` |

نفس إعدادات `auth_otp_customer_ar` — لا Body يدوي.

**إنجليزي:** `auth_otp_vendor_en` — Language: English.

---

# ملحق ج — نصوص Body كاملة (عربي) — كل القوالب

> استخدم **Footer منفصل** كما فوق. الأرقام `{{1}}`… بالترتيب.

### `txn_order_customer_ar`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على طلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل الحالة والخطوة التالية: {{3}}

شكراً لاستخدامك منصتنا.
```
- زر: `عرض الطلب` → `order-details/{orderId}`

### `txn_order_merchant_ar`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على الطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل الحالة والإجراء المطلوب: {{3}}

شكراً لتعاونك معنا.
```
- زر: `فتح الطلب` → `explore-offer/{orderId}`

### `txn_shipment_customer_ar` — Header: `تحديث الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن لطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لثقتك بنا.
```

### `txn_shipment_merchant_ar` — Header: `تحديث شحن الطلب`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لتعاونك معنا.
```

### `txn_invoice_customer_ar` — Header: `فاتورة جاهزة`
```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة مرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لاستخدامك منصتنا.
```

### `txn_invoice_merchant_ar` — Header: `فاتورة جديدة`
```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لتعاونك معنا.
```

### `txn_waybill_customer_ar` — Header: `بوليصة الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن المرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل البوليصة والحالة الحالية: {{3}}

يمكنك الاطلاع على البوليصة وطباعتها من خلال الزر أدناه.

شكراً لثقتك بنا.
```

### `txn_waybill_merchant_ar` — Header: `بوليصة الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل البوليصة والحالة الحالية: {{3}}

يرجى مراجعة البوليصة وإكمال الإجراءات المطلوبة من لوحة التحكم.

شكراً لتعاونك معنا.
```

### `txn_document_vendor_ar` — Header: `مستندات المتجر`
```
مرحباً،

نود إعلامك بوجود تحديث جديد يخص مستندات متجرك المسجّل على منصة E-Tshaleh.

اسم المتجر: {{1}}
نوع المستند المعني: {{2}}

تفاصيل الحالة والإجراء المطلوب: {{3}}

يرجى مراجعة لوحة التحكم وإكمال المطلوب في أقرب وقت ممكن.

شكراً لتعاونك معنا.
```
| {{1}} | store_name |
| {{2}} | doc_type (مثل: commercial_license) |
| {{3}} | status_detail كامل (موافقة/رفض/إعادة رفع) |

- زر: `فتح المتجر` → suffix: `home` (أو مسار إعدادات المتجر عندكم)

### `txn_verification_customer_ar` — Header: `توثيق الطلب`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة المرتبطة بطلبك رقم {{2}} على منصة E-Tshaleh.

تفاصيل التوثيق والحالة الحالية: {{3}}

يرجى مراجعة الطلب من خلال الزر أدناه لمتابعة الخطوات التالية.

شكراً لثقتك بنا.
```

### `txn_verification_vendor_ar` — Header: `توثيق الطلب`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-Tshaleh.

تفاصيل التوثيق والإجراء المطلوب: {{3}}

يرجى مراجعة الطلب وإكمال المطلوب من لوحة التحكم.

شكراً لتعاونك معنا.
```

---

# ملحق د — كل القوالب الإنجليزية (14) — محتوى Body

| template_name | Header | Body (انسخ) | Button |
|---------------|--------|-------------|--------|
| `auth_otp_customer_en` | — | (Meta OTP) | Copy code |
| `auth_otp_vendor_en` | — | (Meta OTP) | Copy code |
| `txn_order_customer_en` | Order update | `Hello {{1}},\n\nWe would like to inform you about an update on your order {{2}} on E-Tshaleh.\n\nStatus details: {{3}}\n\nThank you for using our platform.` | View order |
| `txn_order_merchant_en` | Order update | `Hello {{1}},\n\nThere is an update on order {{2}} linked to your store on E-Tshaleh.\n\nStatus details: {{3}}\n\nThank you for your cooperation.` | Open order |
| `txn_shipment_customer_en` | Shipment update | `Hello {{1}},\n\nYour shipment status for order {{2}} on E-Tshaleh has been updated.\n\nUpdate details: {{3}}\n\nTracking number: {{4}}\n\nThank you for your trust.` | Track |
| `txn_shipment_merchant_en` | Shipment update | `Hello {{1}},\n\nShipment status for order {{2}} linked to your store on E-Tshaleh has been updated.\n\nUpdate details: {{3}}\n\nTracking number: {{4}}\n\nThank you for your cooperation.` | Open order |
| `txn_invoice_customer_en` | Invoice ready | `Hello {{1}},\n\nA new invoice has been issued for your order {{2}} on E-Tshaleh.\n\nInvoice number: {{3}}\nTotal amount: {{4}}\n\nInvoice summary: {{5}}\n\nThank you for using our platform.` | View invoice |
| `txn_invoice_merchant_en` | New invoice | `Hello {{1}},\n\nA new invoice has been issued for order {{2}} linked to your store on E-Tshaleh.\n\nInvoice number: {{3}}\nTotal amount: {{4}}\n\nInvoice summary: {{5}}\n\nThank you for your cooperation.` | View invoice |
| `txn_waybill_customer_en` | Waybill ready | `Hello {{1}},\n\nThe shipping waybill for your order {{2}} on E-Tshaleh has been updated.\n\nWaybill details: {{3}}\n\nYou can view and print the waybill using the button below.\n\nThank you for your trust.` | View waybill |
| `txn_waybill_merchant_en` | Waybill ready | `Hello {{1}},\n\nThe shipping waybill for order {{2}} linked to your store on E-Tshaleh has been updated.\n\nWaybill details: {{3}}\n\nPlease review the waybill and complete any required actions.\n\nThank you for your cooperation.` | View waybill |
| `txn_document_vendor_en` | Store documents | `Hello,\n\nThere is a new update regarding your store documents on E-Tshaleh.\n\nStore name: {{1}}\nDocument type: {{2}}\n\nStatus and required action: {{3}}\n\nPlease review your dashboard and complete any required steps.\n\nThank you for your cooperation.` | Open store |
| `txn_verification_customer_en` | Verification | `Hello {{1}},\n\nThere is an update on part verification for your order {{2}} on E-Tshaleh.\n\nVerification details: {{3}}\n\nPlease review your order using the button below.\n\nThank you for your trust.` | View order |
| `txn_verification_vendor_en` | Verification | `Hello {{1}},\n\nThere is an update on part verification for order {{2}} linked to your store on E-Tshaleh.\n\nVerification details: {{3}}\n\nPlease review the order and complete any required steps.\n\nThank you for your cooperation.` | Open order |

**Footer كل القوالب EN:** `E-Tshaleh`  
**Suffix أزرار EN:** نفس العربي (المسار لا يتغير).

---

# ملحق هـ — قوالب تسويق (اختياري — بعد الإطلاق)

| الاسم | متى |
|------|-----|
| `welcome_customer_ar` | بعد أول تسجيل ناجح |
| `welcome_vendor_ar` | بعد تفعيل المتجر |

### `welcome_customer_ar`
```
مرحباً {{1}}،

شكراً لتسجيلك في E-Tshaleh | أي تشليح.

يمكنك الآن إنشاء طلبات قطع الغيار ومتابعتها من لوحة التحكم.
```
- زر: `ابدأ الآن` → `home`

---

# ملحق و — قائمة المتغيرات الكاملة

### في Widers Dashboard (جهات اتصال + CRM)

| المتغير | مطلوب؟ | ملاحظة |
|---------|--------|--------|
| `name` | موجود | |
| `phone` | موجود | |
| `email` | موجود | |
| `SKU` | موجود | قطعة/عرض |
| `order_number` | أضف | |
| `invoice_number` | أضف | |
| `offer_id` | أضف | |
| `tracking_number` | أضف | |
| `status_detail` | أضف | **الأهم** — نص الإشعار من النظام |
| `amount` | أضف | |
| `store_name` | أضف | |
| `doc_type` | أضف | |
| `cta_path` | أضف | للأزرار |
| `part_name` | أضف (اختياري) | اسم القطعة في عروض/شحن |
| `rejection_reason` | أضف (اختياري) | يُدمج غالباً في status_detail |

### في قوالب Meta + شاشة «إعداد القالب» (ترتيب API — ثابت)

| القالب | {{1}} في Widers | {{2}} | {{3}} | {{4}} | {{5}} | حقل الكود |
|--------|-----------------|-------|-------|-------|-------|-----------|
| auth_otp_* | اسم جهة الاتصال | otp_code | — | — | — | name, otp_code |
| txn_order_* | اسم جهة الاتصال | order_number | status_detail | — | — | name, order_number, status_detail |
| txn_shipment_* | اسم جهة الاتصال | order_number | status_detail | tracking_number | — | + tracking_number |
| txn_invoice_* | اسم جهة الاتصال | order_number | invoice_number | amount | summary | + invoice_number, amount, summary |
| txn_waybill_* | اسم جهة الاتصال | order_number | status_detail | — | — | name, order_number, status_detail |
| txn_document_vendor | store_name | doc_type | status_detail | — | — | store_name, doc_type, status_detail |
| txn_verification_* | اسم جهة الاتصال | order_number | status_detail | — | — | name, order_number, status_detail |
| welcome_* | اسم جهة الاتصال | — | — | — | — | name |

---

# ملحق ز — أي حدث في النظام يستخدم أي قالب؟

> **لا تحتاج قالب لكل حالة** — النظام يمرّر النص الجاهز في `status_detail`.

| نوع الحدث في E-Tshaleh | قالب WhatsApp | عميل | تاجر |
|------------------------|---------------|------|------|
| OTP تسجيل / دخول / استرجاع | `auth_otp_*` | نعم | نعم |
| تغيير حالة طلب (كل OrderStatus) | `txn_order_*` | نعم | نعم |
| تغيير حالة شحن (كل ShipmentStatus) | `txn_shipment_*` | نعم | نعم |
| دفع + فاتورة (كل offer) | `txn_invoice_*` | نعم | نعم |
| إصدار بوليصة / إرجاع | `txn_waybill_*` | نعم | نعم |
| مستند: موافقة / رفض / إعادة رفع | `txn_document_vendor` | — | نعم |
| تفعيل/رفض/إيقاف متجر | `txn_document_vendor` أو `txn_order_merchant` | — | نعم |
| توثيق قطعة (verification) | `txn_verification_*` | نعم | نعم |
| عرض جديد / قبول عرض | `txn_order_*` | نعم | نعم |
| إرجاع / نزاع | `txn_order_*` | نعم | نعم |
| انتهاء ضمان | `txn_order_*` | نعم | نعم |
| ترحيب بعد التسجيل | `welcome_*` | اختياري | اختياري |

---

# ملحق ح — عدد القوالب النهائي

| المرحلة | العدد |
|---------|-------|
| عربي إلزامي (Phase 0) | **14** |
| إنجليزي (بعد موافقة AR) | **14** |
| تسويق welcome | **+2** اختياري |
| **المجموع الكامل** | **30** |

---

# Checklist اكتمال Phase 0 (النسخة المحدّثة)

- [ ] 14 قالب عربي — كلها APPROVED
- [ ] جدول Mapping مملوء
- [ ] Footer موحّد بدون تكرار في Body
- [ ] Base URL صحيح في كل أزرار URL
- [ ] (لاحقاً) 14 قالب إنجليزي
- [ ] FRONTEND_URL + TEST_PHONE مُرسَل للمطور
