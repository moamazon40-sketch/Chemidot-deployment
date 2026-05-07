# نشر Chemidot على Vercel بطريقة صحيحة

هذه النسخة تم تعديلها لتجنب الأخطاء التي ظهرت سابقًا، خصوصًا:

- خطأ `Cannot read file /lib/.../tsconfig.json` بسبب رفع ملفات ناقصة يدويًا.
- خطأ `PORT environment variable is required` أثناء build.
- خطأ `BASE_PATH environment variable is required` أثناء build.
- Output Directory الخاطئ.

## مهم جدًا

لا ترفع الملفات على GitHub من المتصفح جزءًا جزءًا. استخدم GitHub Desktop أو ارفع ZIP كامل بعد فك الضغط من خلال تطبيق GitHub Desktop. الرفع اليدوي من المتصفح هو سبب تكرار ونقص الملفات.

## إعدادات Vercel

عند Import من GitHub، اترك Root Directory كما هو:

```txt
./
```

ولا تغير Build Command يدويًا إذا قرأ Vercel ملف `vercel.json`.

لو احتجت تكتب الإعدادات بنفسك، استخدم:

```bash
npm install -g pnpm@10.28.0 && pnpm install --frozen-lockfile
```

Build Command:

```bash
pnpm --filter @workspace/chemidot build
```

Output Directory:

```txt
artifacts/chemidot/dist/public
```

Environment Variable مؤقتًا:

```txt
VITE_API_URL=https://example.com
```

بعد نشر الـ Backend لاحقًا، غيّر `VITE_API_URL` إلى رابط الـ API الحقيقي.
