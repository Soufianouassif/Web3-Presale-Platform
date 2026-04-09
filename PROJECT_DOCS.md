# PEPEWIFE ($PWIFE) — توثيق شامل للمشروع

---

## جدول المحتويات

1. [نظرة عامة على المشروع](#١-نظرة-عامة)
2. [هيكل الملفات](#٢-هيكل-الملفات)
3. [طريقة عمل الموقع (Frontend)](#٣-طريقة-عمل-الموقع)
4. [طريقة عمل الباك إند (API Server)](#٤-طريقة-عمل-الباك-إند)
5. [قاعدة البيانات](#٥-قاعدة-البيانات)
6. [العقود الذكية](#٦-العقود-الذكية)
7. [نظام الإحالة (Referral)](#٧-نظام-الإحالة)
8. [التعديلات التي تمت في هذا المشروع](#٨-التعديلات-التي-تمت)
9. [إصلاحات مطلوبة عند النشر على Mainnet](#٩-إصلاحات-عند-النشر-على-mainnet)
10. [مشاكل وثغرات موجودة](#١٠-مشاكل-وثغرات-موجودة)
11. [متغيرات البيئة المطلوبة](#١١-متغيرات-البيئة)

---

## ١. نظرة عامة

PEPEWIFE هو منصة بيع مسبق (Presale) لعملة $PWIFE على شبكة Solana. يتكون من:

- **موقع React** يعرض البيع المسبق ويسمح للمستخدمين بالشراء بـ SOL أو USDT
- **API Server** يسجّل المشتريات، يدير الإحالات، ويتحقق من المعاملات على البلوكتشين
- **عقدان ذكيان** على Solana: عقد البيع المسبق + عقد توزيع التوكنز (Claim)
- **لوحة أدمن** للتحكم الكامل في البريسيل

---

## ٢. هيكل الملفات

```
/
├── artifacts/
│   ├── pepewife/               ← الموقع الرئيسي (React + Vite)
│   │   └── src/
│   │       ├── pages/          ← صفحات الموقع
│   │       ├── components/     ← مكونات واجهة المستخدم
│   │       ├── lib/            ← منطق التواصل مع البلوكتشين والـ API
│   │       └── hooks/          ← React Hooks مخصصة
│   │
│   └── api-server/             ← الباك إند (Express + TypeScript)
│       └── src/
│           ├── routes/         ← مسارات الـ API
│           ├── middleware/     ← الوسائط (Auth, Rate Limit)
│           └── lib/            ← مكتبات مساعدة
│
├── contracts/
│   ├── programs/
│   │   ├── pepewife-presale/   ← عقد البريسيل (Anchor)
│   │   └── pepewife-claim/     ← عقد الـ Claim (Anchor)
│   └── playground_lib.rs       ← نسخة Playground (ملف واحد) للاختبار
│
└── lib/
    └── db/                     ← مخطط قاعدة البيانات (Drizzle ORM)
```

---

## ٣. طريقة عمل الموقع

### الصفحات الرئيسية

| الصفحة | المسار | الوظيفة |
|--------|--------|---------|
| الرئيسية | `/` | عرض البريسيل، الشراء، التوكنوميكس، الخارطة |
| لوحة المستثمر | `/dashboard` | تتبع المشتريات، الإحالات، Claim |
| الاتصال بالمحفظة | `/connect` | خطوة ربط المحفظة |
| لوحة الأدمن | `/admin` | التحكم الكامل في البريسيل |
| المشترون | `/admin/buyers` | قائمة المشترين |
| الإحالات | `/admin/referrals` | إدارة الإحالات |
| البيانات القانونية | `/terms`, `/whitepaper` | الشروط والبيانات |

### تدفق عملية الشراء

```
المستخدم يدخل المبلغ
        ↓
WalletBuyModal يفتح
        ↓
المستخدم يختار المحفظة (Phantom / Solflare / Backpack / OKX)
        ↓
بناء المعاملة في presale-contract.ts
   - SOL → buy_with_sol instruction
   - USDT → buy_with_usdt instruction
        ↓
المحفظة تطلب توقيع المستخدم
        ↓
إرسال المعاملة عبر /api/rpc (بروكسي لتجنب CORS)
        ↓
الانتظار حتى 90 ثانية للتأكيد
        ↓
إشعار الباك إند بالمعاملة → POST /api/track/purchase
        ↓
الباك إند يتحقق من المعاملة على البلوكتشين
        ↓
تسجيل الشراء في قاعدة البيانات + تحديث الإحالة
```

### اللغات المدعومة

الموقع يدعم 3 لغات: **العربية، الإنجليزية، الفرنسية** عبر مكون `language-switcher.tsx`.

---

## ٤. طريقة عمل الباك إند

### التقنيات المستخدمة

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Auth:** Passport.js + Google OAuth (للأدمن)
- **Sessions:** express-session + connect-pg-simple (مخزنة في PostgreSQL)
- **Logging:** pino-http
- **Security:** helmet + cors + rate limiting

### مسارات الـ API

| المسار | الوظيفة |
|--------|---------|
| `POST /api/track/visit` | تسجيل زيارة صفحة |
| `POST /api/track/wallet` | تسجيل ربط محفظة |
| `POST /api/track/purchase` | **التحقق وتسجيل الشراء** |
| `GET /api/referral/code/:wallet` | توليد/جلب كود الإحالة |
| `GET /api/admin/stats` | إحصائيات لوحة الأدمن |
| `GET /api/admin/buyers` | قائمة المشترين |
| `GET /api/admin/referrals` | قائمة الإحالات |
| `GET /api/presale-chain` | حالة البريسيل من البلوكتشين |
| `POST /api/rpc` | بروكسي Solana RPC |
| `GET /api/sol-price-sync` | تزامن سعر SOL |
| `GET /api/health` | فحص صحة الخادم |

### كيف يتحقق الباك إند من الشراء؟

عند استلام `POST /api/track/purchase`:

1. يتحقق أن الـ `txHash` غير مكرر في قاعدة البيانات
2. يستعلم عن المعاملة من Solana RPC
3. يتحقق أن المعاملة نجحت (status = success)
4. يتحقق أن المرسل هو المحفظة المدّعاة
5. يتحقق أن logs المعاملة تحتوي `SOL_BUY` أو `USDT_BUY` من عقدنا
6. يسجّل الشراء في قاعدة البيانات
7. يحسب ويسجّل مكافأة الإحالة (5%) إن وُجدت

> **ملاحظة:** يوجد `DEV MODE` في ملف tracker.ts يتجاوز التحقق من البلوكتشين في بيئة الاختبار.

---

## ٥. قاعدة البيانات

قاعدة البيانات **PostgreSQL** مدارة بـ **Drizzle ORM**.

### الجداول الرئيسية

| الجدول | الوظيفة |
|--------|---------|
| `presale_config` | إعدادات البريسيل (isActive, claimEnabled, stakingEnabled) |
| `purchases` | سجل كل عمليات الشراء |
| `referral_codes` | أكواد الإحالة لكل محفظة |
| `referrals` | سجل الإحالات والمكافآت |
| `page_visits` | تتبع زيارات الصفحات |
| `wallet_connections` | تتبع ربط المحافظ |
| `admin_users` | مستخدمو لوحة الأدمن |
| `user_sessions` | جلسات تسجيل الدخول |

### ملف المخطط
`lib/db/src/schema/index.ts`

### ملف Migration
`lib/db/drizzle/0000_lonely_eternals.sql`

---

## ٦. العقود الذكية

### عقد البريسيل — `pepewife-presale`

**Program ID (Devnet):** `AUvWWYPitvKFRBYNQqQGnPD1EaNbNpXSvT4ZFpssH145`

#### التعليمات (Instructions)

| التعليمة | من يستدعيها | الوظيفة |
|----------|------------|---------|
| `initialize` | الأدمن مرة واحدة | إنشاء الـ Config وتهيئة المراحل |
| `buy_with_sol` | المستخدم | شراء بـ SOL (حد أدنى 1 SOL، أقصى 50 SOL) |
| `buy_with_usdt` | المستخدم | شراء بـ USDT (حد أدنى 100 USDT، أقصى 10,000 USDT) |
| `manual_allocate` | الأدمن | تسجيل شراء يدوي (من شبكات أخرى) |
| `withdraw_sol` | الأدمن | سحب SOL من الخزنة |
| `withdraw_usdt` | الأدمن | سحب USDT من الخزنة |
| `update_sol_price` | الأدمن | تحديث سعر SOL بالدولار |
| `advance_stage` | الأدمن | الانتقال للمرحلة التالية |
| `end_presale` | الأدمن | إنهاء البريسيل ويسجّل الوقت |
| `pause` / `resume` | الأدمن | إيقاف/استئناف الشراء |
| `update_usdt_mint` | الأدمن | تغيير عنوان USDT (أُضيف لاختبار Devnet) |

#### الحسابات (PDAs)

| الحساب | السيد | الوظيفة |
|--------|-------|---------|
| `PresaleConfig` | seeds: `["presale_config"]` | الإعدادات العامة والمراحل |
| `SOL_VAULT_PDA` | seeds: `["sol_vault"]` | خزنة SOL |
| `VAULT_AUTH_PDA` | seeds: `["vault_auth"]` | صاحب خزنة USDT |
| `VAULT_USDT_ATA` | ATA لـ VAULT_AUTH | خزنة USDT |
| `BuyerRecord` | seeds: `["buyer", config, buyer]` | سجل كل مشترٍ |

#### المراحل الأربع

| المرحلة | السعر |
|---------|-------|
| المرحلة 1 | $0.00000001 |
| المرحلة 2 | $0.00000002 |
| المرحلة 3 | $0.00000004 |
| المرحلة 4 | $0.00000006 |

كل مرحلة تحتوي 5,000,000,000,000 توكن.

---

### عقد الاستحقاق — `pepewife-claim`

**Program ID:** `CLaim1111...` (**مؤقت — لم يُنشر بعد**)

#### آلية التوزيع

- **عند TGE (Token Generation Event):** 20% فوراً
- **الباقي (80%):** موزّع على 4 أشهر بمعدل 20% شهرياً

#### التعليمات

| التعليمة | الوظيفة |
|----------|---------|
| `initialize` | تهيئة عقد الـ Claim |
| `add_claim_record` | إضافة سجل مستحقات مستخدم |
| `claim_tge` | استلام 20% الأولى |
| `claim_vesting` | استلام الدفعة الشهرية |
| `open_claim` / `close_claim` | فتح/إغلاق نافذة الاستلام |

---

## ٧. نظام الإحالة

### كيف يعمل

1. **المستخدم يشارك رابطه:** `https://pepewife.com/?ref=XXXXXXXX`
2. **الزائر يفتح الرابط:** الموقع يحفظ الكود في `localStorage` عبر `captureReferralFromUrl()`
3. **الزائر يشتري:** الكود يُرسل مع طلب تسجيل الشراء للباك إند
4. **الباك إند يحسب:** 5% من قيمة الشراء كمكافأة للمُحيل
5. **المكافأة تُسجّل:** في جدول `referrals` بحالة "pending"

### القواعد
- لا يمكن الإحالة لنفسك
- لا يمكن تطبيق إحالتين على نفس الشراء
- الكود مولّد عشوائياً بـ 8 أحرف Base58

---

## ٨. التعديلات التي تمت

### في `contracts/playground_lib.rs`
- إضافة تعليمة `update_usdt_mint` لتغيير عنوان USDT على Devnet
- هذا الملف نسخة Playground للاختبار فقط — **لا يُنشر على mainnet**

### في `artifacts/pepewife/src/lib/presale-contract.ts`
- إضافة `IS_DEVNET` flag للتمييز بين الشبكتين
- إضافة `VAULT_USDT_ATA` محسوب تلقائياً
- إضافة دالة `withdrawUsdt()` — سحب USDT بـ Phantom
- إضافة دالة `advanceStage()` — الانتقال بين المراحل
- إضافة دالة `endPresale()` — إنهاء البريسيل
- تصحيح اختيار USDT_MINT تلقائياً (devnet test token vs mainnet USDT)

### في `artifacts/pepewife/src/pages/admin/dashboard.tsx`
- إضافة `WithdrawUsdtPanel` — لوحة سحب USDT
- إضافة `AdvanceStagePanel` — لوحة الانتقال بين المراحل مع عرض بصري
- إضافة `EndPresalePanel` — لوحة إنهاء البريسيل مع خطوة تأكيد
- تصحيح نص "المراحل تتقدم تلقائياً" إلى "يجب على الأدمن الانتقال يدوياً"

### في `artifacts/api-server/src/routes/tracker.ts`
- إضافة `DEV MODE` bypass للتحقق من المعاملات في بيئة الاختبار

### في `artifacts/pepewife/src/pages/home.tsx`
- تصحيح مشكلة الأرقام العشرية عند إدخال المبلغ

### في `artifacts/pepewife/src/lib/referral.ts`
- إضافة حفظ كود الإحالة في `localStorage` بشكل مستمر

---

## ٩. إصلاحات عند النشر على Mainnet

### أولاً: تحديثات إلزامية

#### أ. نشر العقد الذكي على Mainnet
```bash
anchor build
anchor deploy --provider.cluster mainnet-beta
```
بعد النشر ستحصل على Program ID جديد يجب تحديثه في:
- `artifacts/pepewife/src/lib/presale-contract.ts` — ثابت `PROGRAM_ID`
- أو متغير البيئة `VITE_PROGRAM_ID`

#### ب. تحديث عنوان محفظة الأدمن
في `artifacts/pepewife/src/pages/admin/dashboard.tsx` السطر 91:
```ts
const PRESALE_AUTHORITY = "عنوان_محفظتك_الحقيقية_هنا";
```

#### ج. متغيرات البيئة على Mainnet
```
VITE_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=XXXX
VITE_PROGRAM_ID=Program_ID_الجديد_بعد_النشر
```

#### د. إنشاء خزنة USDT على Mainnet
بعد نشر العقد، يجب إنشاء ATA للـ USDT مرة واحدة:
```bash
spl-token create-account Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB \
  --owner <VAULT_AUTH_PDA> \
  --fee-payer <محفظتك>
```

#### هـ. حذف أو تعطيل `update_usdt_mint`
هذه التعليمة أُضيفت للاختبار فقط. على mainnet يجب:
- إما عدم تضمينها في نسخة mainnet من العقد
- أو عدم إضافة UI لها في لوحة الأدمن

#### و. تعطيل DEV MODE في الباك إند
في `artifacts/api-server/src/routes/tracker.ts`:
```ts
const DEV_MODE = false; // تأكد أن هذا false في الإنتاج
```

### ثانياً: تحديثات مستحسنة

#### ز. نشر عقد Claim
عقد الاستحقاق يحتاج:
1. نشره على mainnet
2. تحديث Program ID الخاص به
3. بعد إنهاء البريسيل، إضافة سجلات المستحقين (`add_claim_record`) لكل مشترٍ
4. تفعيل `claimEnabled = true` من لوحة الأدمن

#### ح. إعداد RPC موثوق
تجنب استخدام الـ RPC المجاني. استخدم:
- **Helius:** helius.dev
- **QuickNode:** quicknode.com
- **Alchemy:** alchemy.com

---

## ١٠. مشاكل وثغرات موجودة

### مشاكل معروفة

#### ١. انتهاء مهلة المعاملة (Transaction Timeout)
**الموقع:** `wallet-buy-modal.tsx` سطر 52
**المشكلة:** إذا انتهت مهلة الانتظار (90 ثانية) قد تكون المعاملة تأكدت فعلاً لكن الموقع يظهر خطأ. المستخدم يعتقد فشلت وربما لا يُبلّغ الباك إند بالشراء.
**الحل المقترح:** التحقق من البلوكتشين مرة أخرى بعد الخطأ قبل إعلان الفشل.

#### ٢. المراحل لا تتقدم تلقائياً
**المشكلة:** عند امتلاء المرحلة الأولى، أي شراء جديد يفشل برسالة `InsufficientStageTokens`. يجب على الأدمن الانتقال يدوياً عبر `advance_stage`.
**الحل المقترح:** إضافة تنبيه للأدمن عند اقتراب امتلاء المرحلة.

#### ٣. DEV_MODE في الباك إند
**الموقع:** `artifacts/api-server/src/routes/tracker.ts`
**المشكلة:** إذا نُشر الموقع مع `DEV_MODE = true`، يمكن لأي شخص تسجيل شراء وهمي دون معاملة حقيقية.
**الإجراء:** تأكد من إيقافه قبل الإنتاج.

#### ٤. عقد Claim غير منشور
**المشكلة:** عقد الاستحقاق يستخدم Program ID مؤقت (`CLaim111...`). لن يعمل حتى يُنشر.
**الإجراء:** نشره على mainnet وتحديث عنوانه.

#### ٥. سعر SOL غير محدّث تلقائياً
**المشكلة:** سعر SOL المستخدم لحساب التوكنز مخزّن في العقد ويحتاج تحديثاً يدوياً من لوحة الأدمن.
**الحل المقترح:** Cron Job يحدّث السعر كل ساعة تلقائياً عبر `update_sol_price`.

### ثغرات أمنية

#### ١. التحقق من المعاملة في الباك إند
**الوضع الحالي:** جيد — الباك إند يتحقق من: وجود المعاملة، نجاحها، توقيع المحفظة الصحيحة، logs العقد.
**لكن:** لا يتحقق من **القيمة الفعلية** المُدفوعة في المعاملة. يثق بالقيمة المُرسلة من الـ Frontend.
**الحل المقترح:** قراءة التوكنز من الـ BuyerRecord on-chain كمرجع نهائي.

#### ٢. Rate Limiting
**الوضع الحالي:** موجود على مسار `track/visit` (30 طلب/دقيقة).
**التحسين:** التأكد من تطبيقه على جميع مسارات الـ API الحساسة.

---

## ١١. متغيرات البيئة

### Frontend (`artifacts/pepewife/.env`)

| المتغير | الوظيفة | القيمة الافتراضية |
|---------|---------|-----------------|
| `VITE_SOLANA_RPC_URL` | رابط Solana RPC | يستخدم بروكسي الـ API |
| `VITE_PROGRAM_ID` | Program ID للعقد | مُعرَّف في الكود |
| `VITE_STABLE_MINT` | عنوان USDT مخصص | تلقائي حسب الشبكة |

### Backend (`artifacts/api-server/.env`)

| المتغير | الوظيفة | إلزامي؟ |
|---------|---------|---------|
| `DATABASE_URL` | رابط PostgreSQL | ✅ نعم |
| `SESSION_SECRET` | مفتاح تشفير الجلسات | ✅ نعم |
| `SOLANA_RPC_URL` | Solana RPC للباك إند | ✅ نعم |
| `ADMIN_KEYPAIR_JSON` | Keypair الأدمن (للعمليات الآلية) | اختياري |
| `GOOGLE_CLIENT_ID` | Google OAuth | للأدمن |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | للأدمن |

---

## ملاحظات ختامية

- **ملف Playground** (`contracts/playground_lib.rs`) هو نسخة الاختبار فقط — لا يُنشر
- **نسخة الإنتاج** من العقد موجودة في `contracts/programs/pepewife-presale/`
- **BuyerRecord PDA** مهم جداً — يخزّن ما اشتراه كل مستخدم on-chain للرجوع إليه عند الـ Claim
- **الأدمن يتحكم** في سعر SOL، المراحل، الإيقاف، السحب — كل شيء من لوحة الأدمن
