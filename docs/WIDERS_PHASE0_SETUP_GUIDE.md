# Phase 0 — دليل إعداد Widers (E-TASHLEH) خطوة بخطوة — **نسخة v2**

> **الهدف:** إعادة إنشاء **15 قالب** في Widers بعد الحذف الكامل — أسماء تقنية `*_ar_v2`.  
> **المنصة:** https://apps.widers.net  
> **الموقع:** https://e-tashleh.net  
> **العلامة:** **إي-تشليح | E-TASHLEH** (Footer ثابت — لا تكرر في Body)  
> **الوثائق:** https://documenter.getpostman.com/view/8538142/2s9Ykn8gvj

---

## ⚠️ إعادة البناء v2 — لوحة Widers فارغة

| البند | التفاصيل |
|-------|----------|
| الوضع | **0 قالب** — حُذفت كل الأسماء القديمة (`*_ar` بدون v2) |
| قفل Meta | لا تعيد إنشاء `welcome_customer_ar_v2` أو أي اسم قديم — **استخدم `_ar_v2` دائماً** |
| خطأ Widers | *"لا يمكن إضافة محتوى جديد باللغة Arabic أثناء حذف المحتوى..."* → الحل: أسماء `_v2` |
| الكود | NestJS يرسل تلقائياً `{family}_ar_v2` (انظر `template-registry.ts`) |
| OTP | **Utility** + `WIDERS_OTP_MODE=utility` + متغير **`otp_code`** |

### ترتيب الإنشاء في Widers (بعد موافقة Meta لكل واحد)

1. `auth_otp_customer_ar_v2` + `auth_otp_vendor_ar_v2`
2. `welcome_customer_ar_v2` + `welcome_vendor_ar_v2`
3. `txn_order_customer_ar_v2` + `txn_order_merchant_ar_v2`
4. باقي `txn_*_ar_v2` (شحن، فاتورة، بوليصة، مستندات، توثيق)

### اسم العرض على واتساب (Meta — خارج الكود)

إذا ظهر **E-TASHLEH WhatsApp** بدل **E-TASHLEH**:

1. [Meta Business Suite](https://business.facebook.com) → **WhatsApp Manager**
2. **Phone numbers** → **Profile** → **Display name** → **`E-TASHLEH`**
3. انتظر مراجعة Meta (1–3 أيام). طابق الاسم في **Widers → مدير واتساب** إن وُجد.

---

## قبل ما تبدأ — ماذا تحتاج؟

| # | المطلوب |
|---|---------|
| 1 | حساب Widers مفعّل + رقم WhatsApp Business موثّق في Meta + **فوترة** مفعّلة |
| 2 | صلاحية إنشاء قوالب ومجموعات |
| 3 | **دومين المنصة:** `https://e-tashleh.net` |
| 4 | رقم واتساب للاختبار (GCC +966…): `________________` |
| 5 | 2–5 أيام صبر لموافقة Meta على كل قالب `_v2` |

**استراتيجية الإطلاق:**  
ابدأ بـ **15 قالب عربي `_v2`** → بعد الاستقرار أضف الإنجليزي لاحقاً.

> **محتوى كامل:** الأقسام أ–ز + الملاحق. **جدول الـ 15 اسم `_v2`** في [WIDERS_EVENT_MAP.md](WIDERS_EVENT_MAP.md).

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
| `marketplace_customers` | كل عملاء E-TASHLEH |
| `marketplace_vendors` | كل تجار E-TASHLEH |

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
| `otp_code` | رمز OTP (Utility — قوالب auth_otp_*_v2) |

> **ملاحظة:** في **قوالب Meta** المتغيرات في النص غالباً `{{1}}`, `{{2}}`, `{{3}}` بالترتيب — ليس أسماء الحقول. الجدول أعلاه لجهات الاتصال والتسويق. التفاصيل الكاملة في **ملحق و** أسفل الملف.

---

# الجزء ج — القوالب (الجزء الأهم)

## قواعد Meta/Widers (اقرأها مرة)

1. **اسم القالب:** إنجليزي + `_` + **`_v2`** — مثل `txn_order_customer_ar_v2`
2. **Footer:** ثابت في كل قالب: `إي-تشليح | E-TASHLEH` — **لا تكرره في Body**
3. **ترتيب المتغيرات في Body:** ثابت — الكود يرسل بنفس الترتيب دائماً
4. **زر URL:** في إعداد القالب تضع Base URL ثابت، والجزء الديناميكي يأتي من API
5. **نسبة النص للمتغيرات (Meta):** كلما زاد عدد `{{n}}` لازم **جمل عربية ثابتة أطول** حولها — لا تضع متغيراً في سطر فارغ لوحده

### Base URL لأزرار القوالب (انسخه)

```
https://e-tashleh.net/dashboard/
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
| 1 | رمز التحقق — عميل | `auth_otp_customer_ar_v2` | عميل | `رمز التحقق` |
| 2 | رمز التحقق — تاجر | `auth_otp_vendor_ar_v2` | تاجر | `رمز التحقق` |
| 3 | **تحديث حالة الطلب للعميل** | `txn_order_customer_ar_v2` | عميل | `تحديث حالة الطلب` |
| 4 | تحديث حالة الطلب للتاجر | `txn_order_merchant_ar_v2` | تاجر | `تحديث حالة الطلب` |
| 5 | تحديث الشحن للعميل | `txn_shipment_customer_ar_v2` | عميل | `تحديث الشحن` |
| 6 | تحديث الشحن للتاجر | `txn_shipment_merchant_ar_v2` | تاجر | `تحديث شحن الطلب` |
| 7 | فاتورة جاهزة للعميل | `txn_invoice_customer_ar_v2` | عميل | `فاتورة جاهزة` |
| 8 | فاتورة جديدة للتاجر | `txn_invoice_merchant_ar_v2` | تاجر | `فاتورة جديدة` |
| 9 | بوليصة الشحن للعميل | `txn_waybill_customer_ar_v2` | عميل | `بوليصة الشحن` |
| 10 | بوليصة الشحن للتاجر | `txn_waybill_merchant_ar_v2` | تاجر | `بوليصة الشحن` |
| 11 | مستندات المتجر | `txn_document_vendor_ar_v2` | تاجر | `مستندات المتجر` |
| 12 | توثيق الطلب للعميل | `txn_verification_customer_ar_v2` | عميل | `توثيق الطلب` |
| 13 | توثيق الطلب للتاجر | `txn_verification_vendor_ar_v2` | تاجر | `توثيق الطلب` |
| 14 | ترحيب بالعميل *(اختياري)* | `welcome_customer_ar_v2` | عميل | — |
| 15 | ترحيب بالتاجر *(اختياري)* | `welcome_vendor_ar_v2` | تاجر | — |

### جداول ربط المتغيرات — انسخها في «إعداد القالب»

#### `auth_otp_customer_ar_v2` / `auth_otp_vendor_ar_v2` (Utility)

| المتغير في القالب | اختر في Widers | حقل الكود (NestJS) |
|-------------------|----------------|---------------------|
| `{{1}}` | **اسم جهة الاتصال** | `name` |
| `{{2}}` | *(OTP — يُمرَّر من API)* | `otp_code` |

> **Utility OTP فقط** — لا تستخدم فئة Authentication في v2.

---

#### `txn_order_customer_ar_v2` — مثل لقطة الشاشة

| المتغير في القالب | اختر في Widers | حقل الكود (NestJS) |
|-------------------|----------------|---------------------|
| `{{1}}` | **اسم جهة الاتصال** | `name` |
| `{{2}}` | **order_number** | `order_number` |
| `{{3}}` | **status_detail** | `status_detail` |

**زر URL:** نص `عرض الطلب` — suffix: `order-details/{orderId}`

---

#### `txn_order_merchant_ar_v2`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر:** `فتح الطلب` — suffix: `explore-offer/{orderId}`

---

#### `txn_shipment_customer_ar_v2` / `txn_shipment_merchant_ar_v2`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |
| `{{4}}` | tracking_number | `tracking_number` |

**زر عميل:** `تتبع الشحنة` → `order-details/{orderId}`  
**زر تاجر:** `فتح الطلب` → `explore-offer/{orderId}`

---

#### `txn_invoice_customer_ar_v2` / `txn_invoice_merchant_ar_v2`

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

#### `txn_waybill_customer_ar_v2` / `txn_waybill_merchant_ar_v2`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر عميل:** `عرض البوليصة` → `order-details/{orderId}?tab=waybills`  
**زر تاجر:** `عرض البوليصة` → `explore-offer/{orderId}?tab=waybills`

---

#### `txn_document_vendor_ar_v2`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | store_name | `store_name` |
| `{{2}}` | doc_type | `doc_type` |
| `{{3}}` | status_detail | `status_detail` |

**زر:** `فتح لوحة المتجر` → suffix: `home`

---

#### `txn_verification_customer_ar_v2` / `txn_verification_vendor_ar_v2`

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**زر عميل:** `عرض الطلب` → `order-details/{orderId}`  
**زر تاجر:** `فتح الطلب` → `explore-offer/{orderId}`

---

#### `welcome_customer_ar_v2` / `welcome_vendor_ar_v2` *(اختياري)*

| المتغير | اختر في Widers | حقل الكود |
|---------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |

**زر:** `ابدأ الآن` → رابط **ثابت** `https://e-tashleh.net/dashboard/home` (بدون suffix من API)

---

## الخطوة 6 — قالب OTP عميل (أول قالب — جرّبه)

المسار: **قوالب الواتساب** → **+ إنشاء قالب**

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `رمز التحقق — عميل` |
| **اسم القالب التقني (Meta/API)** | `auth_otp_cust_ar_v2` |
| **الفئة** | **Utility** (أداة مساعدة) — **ليس** Authentication |
| **Header** | `رمز التحقق` |

**Body (Utility — انسخ):**
```
مرحباً {{1}}،

رمز التحقق الخاص بك على E-TASHLEH:

{{2}}

لا تشارك هذا الرمز مع أي شخص.
```

**Footer:** `إي-تشليح | E-TASHLEH`  
**لا زر URL** في قالب OTP Utility.

→ **إنشاء القالب** → بعد الموافقة: **إعداد القالب** → `{{1}}` اسم جهة الاتصال | `{{2}}` **otp_code** → **حفظ**.

**Backend:** `WIDERS_OTP_MODE=utility`

**كرر للتاجر:**

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `رمز التحقق — تاجر` |
| **اسم القالب التقني** | `auth_otp_vendor_ar_v2` |

**إعداد المتغيرات (Utility OTP):** `{{1}}` → اسم جهة الاتصال | `{{2}}` → otp_code

---

## الخطوة 7 — قالب تحديث طلب (عميل) — Utility

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث حالة الطلب للعميل` |
| **اسم القالب التقني (Meta/API)** | `txn_order_customer_ar_v2` |
| **الفئة** | أداة مساعدة (Utility) |
| **اللغة** | Arabic |

### رأس الرسالة (Header)
- النوع: **نص**
- النص الثابت: `تحديث حالة الطلب`

### محتوى القالب (Body) — انسخ بالضبط:

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على طلبك رقم {{2}} على منصة E-TASHLEH.

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
إي-تشليح | E-TASHLEH
```

### زر (Button)
- النوع: **رابط (URL)**
- نص الزر: `عرض الطلب`
- **عنوان URL الثابت:** `https://e-tashleh.net/dashboard/`
- **المتغير الديناميكي (suffix):** سيُرسل من API مثل:
  `order-details/abc-123-uuid`

> في Widers قد يطلب منك إدخال مثال للـ suffix عند الإنشاء — ضع: `order-details/00000000-0000-0000-0000-000000000000`

---

## الخطوة 8 — قالب تحديث طلب (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث حالة الطلب للتاجر` |
| **اسم القالب التقني** | `txn_order_merchant_ar_v2` |
| **Header** | `تحديث حالة الطلب` |

### Body:

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على الطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل الحالة والإجراء المطلوب: {{3}}

شكراً لتعاونك معنا.
```

**Footer:** `إي-تشليح | E-TASHLEH`

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

### زر URL
- نص الزر: `فتح الطلب`
- Base: `https://e-tashleh.net/dashboard/`
- suffix مثال: `explore-offer/00000000-0000-0000-0000-000000000000`

---

## الخطوة 9 — قالب الشحن (عميل)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث الشحن للعميل` |
| **اسم القالب التقني** | `txn_shipment_customer_ar_v2` |
| **Header** | `تحديث الشحن` |

> **خطأ Meta شائع:** «عدد كبير جداً من المتغيرات مقارنةً بطول الرسالة» — مع 4 متغيرات لازم نص عربي **أطول** (انظر Body أدناه). لا تضع `{{3}}` في سطر لوحده.

### Body (انسخ بالضبط — نص أطول لموافقة Meta):

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن لطلبك رقم {{2}} على منصة E-TASHLEH.

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

**Footer:** `إي-تشليح | E-TASHLEH` (لا تكرر الاسم في Body)

### زر: `تتبع الشحنة` → suffix: `order-details/UUID`

---

## الخطوة 10 — قالب الشحن (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `تحديث الشحن للتاجر` |
| **اسم القالب التقني** | `txn_shipment_merchant_ar_v2` |
| **Header** | `تحديث شحن الطلب` |  

**Body:**

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

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

**Footer:** `إي-تشليح | E-TASHLEH`  
زر: `فتح الطلب` — suffix: `explore-offer/UUID`

---

## الخطوة 11 — قالب الفاتورة (عميل)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `فاتورة جاهزة للعميل` |
| **اسم القالب التقني** | `txn_invoice_customer_ar_v2` |
| **Header** | `فاتورة جاهزة` |

### Body (5 متغيرات — نص أطول لتجنب رفض Meta):

```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة مرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

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

**Footer:** `إي-تشليح | E-TASHLEH`

### زر
- نص: `عرض الفاتورة`
- Base: `https://e-tashleh.net/dashboard/`
- suffix مثال: `order-details/ORDER_UUID?tab=invoices&offerId=OFFER_UUID`

---

## الخطوة 12 — قالب الفاتورة (تاجر)

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `فاتورة جديدة للتاجر` |
| **اسم القالب التقني** | `txn_invoice_merchant_ar_v2` |
| **Header** | `فاتورة جديدة` |

### Body:

```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

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

**Footer:** `إي-تشليح | E-TASHLEH`  
زر `عرض الفاتورة` — suffix:  
`explore-offer/ORDER_UUID?tab=invoices&offerId=OFFER_UUID`

---

## الخطوة 13 — قالب البوليصة (عميل + تاجر)

| الحقل | عميل | تاجر |
|-------|------|------|
| **الاسم في لوحة Widers** | `بوليصة الشحن للعميل` | `بوليصة الشحن للتاجر` |
| **اسم القالب التقني** | `txn_waybill_customer_ar_v2` | `txn_waybill_merchant_ar_v2` |

**Header:** `بوليصة الشحن`

### Body — عميل (`txn_waybill_customer_ar_v2`):

```
مرحباً {{1}}،

نود إعلامك بأنه تم إنشأ بوليصة الشحن المرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل البوليصة والحالة الحالية: {{3}}

يمكنك الاطلاع على البوليصة وطباعتها من خلال الزر أدناه.

شكراً لثقتك بنا.
```

### Body — تاجر (`txn_waybill_merchant_ar_v2`):

```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل البوليصة والحالة الحالية: {{3}}

يرجى مراجعة البوليصة وإكمال الإجراءات المطلوبة من لوحة التحكم.

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**Footer:** `إي-تشليح | E-TASHLEH`

### زر
- نص: `عرض البوليصة`
- suffix عميل: `order-details/UUID?tab=waybills`
- suffix تاجر: `explore-offer/UUID?tab=waybills`

---

## الخطوة 14 — قالب مستندات التاجر

| الحقل | القيمة |
|-------|--------|
| **الاسم في لوحة Widers** | `مستندات المتجر` |
| **اسم القالب التقني** | `txn_document_vendor_ar_v2` |
| **Header** | `مستندات المتجر` |

### Body:

```
مرحباً،

نود إعلامك بوجود تحديث جديد يخص مستندات متجرك المسجّل على منصة E-TASHLEH.

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

**Footer:** `إي-تشليح | E-TASHLEH`

### زر: `فتح لوحة المتجر` → suffix: `home` أو مسار إعدادات المتجر عندكم

---

## الخطوة 15 — قالب توثيق القطعة

| الحقل | عميل | تاجر |
|-------|------|------|
| **الاسم في لوحة Widers** | `توثيق الطلب للعميل` | `توثيق الطلب للتاجر` |
| **اسم القالب التقني** | `txn_verification_customer_ar_v2` | `txn_verification_vendor_ar_v2` |

**Header:** `توثيق الطلب`

### Body — عميل (`txn_verification_customer_ar_v2`):

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة المرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل التوثيق والحالة الحالية: {{3}}

يرجى مراجعة الطلب من خلال الزر أدناه لمتابعة الخطوات التالية.

شكراً لثقتك بنا.
```

### Body — تاجر (`txn_verification_vendor_ar_v2`):

```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل التوثيق والإجراء المطلوب: {{3}}

يرجى مراجعة الطلب وإكمال المطلوب من لوحة التحكم.

شكراً لتعاونك معنا.
```

| متغير | اختر في Widers | حقل الكود |
|-------|----------------|-----------|
| `{{1}}` | اسم جهة الاتصال | `name` |
| `{{2}}` | order_number | `order_number` |
| `{{3}}` | status_detail | `status_detail` |

**Footer:** `إي-تشليح | E-TASHLEH`

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

Thank you — E-TASHLEH
```
| Footer | `E-TASHLEH` |
| Button | `View order` |

---

# الجزء د — ما ترسله للمطور بعد Phase 0

## جدول Mapping (املأه وارسله)

| اسم Widers (عربي) | template_name | status | lang | {{1}} Widers | {{2}} | {{3}} | {{4}} | {{5}} | button suffix |
|-------------------|---------------|--------|------|--------------|-------|-------|-------|-------|---------------|
| رمز التحقق — عميل | auth_otp_customer_ar_v2 | | ar | اسم جهة الاتصال | otp_code | | | | — |
| رمز التحقق — تاجر | auth_otp_vendor_ar_v2 | | ar | اسم جهة الاتصال | otp_code | | | | — |
| تحديث حالة الطلب للعميل | txn_order_customer_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{orderId} |
| تحديث حالة الطلب للتاجر | txn_order_merchant_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{orderId} |
| تحديث الشحن للعميل | txn_shipment_customer_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | tracking_number | | order-details/{orderId} |
| تحديث الشحن للتاجر | txn_shipment_merchant_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | tracking_number | | explore-offer/{orderId} |
| فاتورة جاهزة للعميل | txn_invoice_customer_ar_v2 | | ar | اسم جهة الاتصال | order_number | invoice_number | amount | summary | order-details/{id}?tab=invoices&offerId={offerId} |
| فاتورة جديدة للتاجر | txn_invoice_merchant_ar_v2 | | ar | اسم جهة الاتصال | order_number | invoice_number | amount | summary | explore-offer/{id}?tab=invoices&offerId={offerId} |
| بوليصة الشحن للعميل | txn_waybill_customer_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{id}?tab=waybills |
| بوليصة الشحن للتاجر | txn_waybill_merchant_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{id}?tab=waybills |
| مستندات المتجر | txn_document_vendor_ar_v2 | | ar | store_name | doc_type | status_detail | | | home |
| توثيق الطلب للعميل | txn_verification_customer_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | order-details/{orderId} |
| توثيق الطلب للتاجر | txn_verification_vendor_ar_v2 | | ar | اسم جهة الاتصال | order_number | status_detail | | | explore-offer/{orderId} |

## معلومات إلزامية

```
FRONTEND_URL=https://e-tashleh.net
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
ج: قلّل علامات تعجب، لا وعود تسويقية. OTP = **Utility** فقط (`otp_code` في Body).

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

- **إما** تضع `إي-تشليح | E-TASHLEH` في **Footer فقط** وتزيل السطر الأخير من Body
- **إما** تبقيه في Body فقط وتترك Footer فارغاً

**الموصى به:** Footer = `إي-تشليح | E-TASHLEH` — و**احذف** السطر الأخير من Body في كل القوالب أدناه (النسخ المحدّثة في الملحق ج).

---

# ملحق ب — OTP تاجر (تفصيل كامل)

## `auth_otp_vendor_ar_v2`

| الحقل | القيمة |
|-------|--------|
| الفئة | المصادقة |
| النوع | OTP |
| الاسم | `auth_otp_vendor_ar_v2` |
| اللغة | Arabic |
| Footer | `إي-تشليح | E-TASHLEH` |

نفس إعدادات `auth_otp_customer_ar_v2` — لا Body يدوي.

**إنجليزي:** `auth_otp_vendor_en` — Language: English.

---

# ملحق ج — نصوص Body كاملة (عربي) — كل القوالب

> استخدم **Footer منفصل** كما فوق. الأرقام `{{1}}`… بالترتيب.

### `txn_order_customer_ar_v2`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على طلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل الحالة والخطوة التالية: {{3}}

شكراً لاستخدامك منصتنا.
```
- زر: `عرض الطلب` → `order-details/{orderId}`

### `txn_order_merchant_ar_v2`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث جديد على الطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل الحالة والإجراء المطلوب: {{3}}

شكراً لتعاونك معنا.
```
- زر: `فتح الطلب` → `explore-offer/{orderId}`

### `txn_shipment_customer_ar_v2` — Header: `تحديث الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن لطلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لثقتك بنا.
```

### `txn_shipment_merchant_ar_v2` — Header: `تحديث شحن الطلب`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث حالة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل التحديث التالي: {{3}}

للمتابعة استخدم رقم التتبع: {{4}}

شكراً لتعاونك معنا.
```

### `txn_invoice_customer_ar_v2` — Header: `فاتورة جاهزة`
```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة مرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لاستخدامك منصتنا.
```

### `txn_invoice_merchant_ar_v2` — Header: `فاتورة جديدة`
```
مرحباً {{1}}،

يسعدنا إعلامك بإصدار فاتورة جديدة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

رقم الفاتورة: {{3}}
المبلغ الإجمالي: {{4}}

ملخص الفاتورة: {{5}}

شكراً لتعاونك معنا.
```

### `txn_waybill_customer_ar_v2` — Header: `بوليصة الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن المرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل البوليصة والحالة الحالية: {{3}}

يمكنك الاطلاع على البوليصة وطباعتها من خلال الزر أدناه.

شكراً لثقتك بنا.
```

### `txn_waybill_merchant_ar_v2` — Header: `بوليصة الشحن`
```
مرحباً {{1}}،

نود إعلامك بأنه تم تحديث بوليصة الشحن للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

تفاصيل البوليصة والحالة الحالية: {{3}}

يرجى مراجعة البوليصة وإكمال الإجراءات المطلوبة من لوحة التحكم.

شكراً لتعاونك معنا.
```

### `txn_document_vendor_ar_v2` — Header: `مستندات المتجر`
```
مرحباً،

نود إعلامك بوجود تحديث جديد يخص مستندات متجرك المسجّل على منصة E-TASHLEH.

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

### `txn_verification_customer_ar_v2` — Header: `توثيق الطلب`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة المرتبطة بطلبك رقم {{2}} على منصة E-TASHLEH.

تفاصيل التوثيق والحالة الحالية: {{3}}

يرجى مراجعة الطلب من خلال الزر أدناه لمتابعة الخطوات التالية.

شكراً لثقتك بنا.
```

### `txn_verification_vendor_ar_v2` — Header: `توثيق الطلب`
```
مرحباً {{1}}،

نود إعلامك بوجود تحديث على حالة توثيق القطعة للطلب رقم {{2}} المرتبط بمتجرك على منصة E-TASHLEH.

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
| `txn_order_customer_en` | Order update | `Hello {{1}},\n\nWe would like to inform you about an update on your order {{2}} on E-TASHLEH.\n\nStatus details: {{3}}\n\nThank you for using our platform.` | View order |
| `txn_order_merchant_en` | Order update | `Hello {{1}},\n\nThere is an update on order {{2}} linked to your store on E-TASHLEH.\n\nStatus details: {{3}}\n\nThank you for your cooperation.` | Open order |
| `txn_shipment_customer_en` | Shipment update | `Hello {{1}},\n\nYour shipment status for order {{2}} on E-TASHLEH has been updated.\n\nUpdate details: {{3}}\n\nTracking number: {{4}}\n\nThank you for your trust.` | Track |
| `txn_shipment_merchant_en` | Shipment update | `Hello {{1}},\n\nShipment status for order {{2}} linked to your store on E-TASHLEH has been updated.\n\nUpdate details: {{3}}\n\nTracking number: {{4}}\n\nThank you for your cooperation.` | Open order |
| `txn_invoice_customer_en` | Invoice ready | `Hello {{1}},\n\nA new invoice has been issued for your order {{2}} on E-TASHLEH.\n\nInvoice number: {{3}}\nTotal amount: {{4}}\n\nInvoice summary: {{5}}\n\nThank you for using our platform.` | View invoice |
| `txn_invoice_merchant_en` | New invoice | `Hello {{1}},\n\nA new invoice has been issued for order {{2}} linked to your store on E-TASHLEH.\n\nInvoice number: {{3}}\nTotal amount: {{4}}\n\nInvoice summary: {{5}}\n\nThank you for your cooperation.` | View invoice |
| `txn_waybill_customer_en` | Waybill ready | `Hello {{1}},\n\nThe shipping waybill for your order {{2}} on E-TASHLEH has been updated.\n\nWaybill details: {{3}}\n\nYou can view and print the waybill using the button below.\n\nThank you for your trust.` | View waybill |
| `txn_waybill_merchant_en` | Waybill ready | `Hello {{1}},\n\nThe shipping waybill for order {{2}} linked to your store on E-TASHLEH has been updated.\n\nWaybill details: {{3}}\n\nPlease review the waybill and complete any required actions.\n\nThank you for your cooperation.` | View waybill |
| `txn_document_vendor_en` | Store documents | `Hello,\n\nThere is a new update regarding your store documents on E-TASHLEH.\n\nStore name: {{1}}\nDocument type: {{2}}\n\nStatus and required action: {{3}}\n\nPlease review your dashboard and complete any required steps.\n\nThank you for your cooperation.` | Open store |
| `txn_verification_customer_en` | Verification | `Hello {{1}},\n\nThere is an update on part verification for your order {{2}} on E-TASHLEH.\n\nVerification details: {{3}}\n\nPlease review your order using the button below.\n\nThank you for your trust.` | View order |
| `txn_verification_vendor_en` | Verification | `Hello {{1}},\n\nThere is an update on part verification for order {{2}} linked to your store on E-TASHLEH.\n\nVerification details: {{3}}\n\nPlease review the order and complete any required steps.\n\nThank you for your cooperation.` | Open order |

**Footer كل القوالب EN:** `E-TASHLEH`  
**Suffix أزرار EN:** نفس العربي (المسار لا يتغير).

---

# ملحق هـ — قوالب تسويق (اختياري — بعد الإطلاق)

| الاسم | متى |
|------|-----|
| `welcome_customer_ar_v2` | بعد أول تسجيل ناجح |
| `welcome_vendor_ar_v2` | بعد تفعيل المتجر |

### `welcome_customer_ar_v2`
```
مرحباً {{1}}،

شكراً لتسجيلك في إي-تشليح | E-TASHLEH.

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

| نوع الحدث في E-TASHLEH | قالب WhatsApp | عميل | تاجر |
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

# Checklist اكتمال Phase 0 v2 (15 قالب)

- [ ] **15 قالب `_ar_v2`** — كلها APPROVED في Meta
- [ ] **إعداد القالب** لكل واحد — ربط المتغيرات + **حفظ**
- [ ] Footer موحّد: `إي-تشليح | E-TASHLEH`
- [ ] Base URL: `https://e-tashleh.net/dashboard/`
- [ ] `FRONTEND_URL=https://e-tashleh.net` + `WIDERS_OTP_MODE=utility`
- [ ] Display name في Meta: **E-TASHLEH**
- [ ] `node backend/scripts/widers-template-audit.mjs` → OK
- [ ] `POST /widers/test/otp` + `POST /widers/test/template/:family` لكل عائلة
- [ ] تسجيل حقيقي (OTP + welcome) + إشعار طلب تجريبي

### جدول الـ 15 اسم تقني

| # | template_name |
|---|---------------|
| 1 | `auth_otp_customer_ar_v2` |
| 2 | `auth_otp_vendor_ar_v2` |
| 3 | `txn_order_customer_ar_v2` |
| 4 | `txn_order_merchant_ar_v2` |
| 5 | `txn_shipment_customer_ar_v2` |
| 6 | `txn_shipment_merchant_ar_v2` |
| 7 | `txn_invoice_customer_ar_v2` |
| 8 | `txn_invoice_merchant_ar_v2` |
| 9 | `txn_waybill_customer_ar_v2` |
| 10 | `txn_waybill_merchant_ar_v2` |
| 11 | `txn_document_vendor_ar_v2` |
| 12 | `txn_verification_customer_ar_v2` |
| 13 | `txn_verification_merchant_ar_v2` |
| 14 | `welcome_customer_ar_v2` |
| 15 | `welcome_vendor_ar_v2` |
