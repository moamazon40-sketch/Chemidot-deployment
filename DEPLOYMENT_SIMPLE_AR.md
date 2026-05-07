# تشغيل Chemidot Live بطريقة مبسطة

أنا جهزت المشروع ليشتغل على Render كخدمة واحدة فقط:

- الموقع Frontend
- الـ API Backend
- قاعدة البيانات PostgreSQL

## الخطوة 1
افتح Render واعمل حساب باستخدام GitHub.

## الخطوة 2
من Render اختر:

New + → Blueprint

ثم اختر GitHub repository الخاص بـ Chemidot.

Render سيقرأ ملف `render.yaml` تلقائيًا.

## الخطوة 3
قبل الضغط على Apply، عدّل هذا المتغير فقط:

`USER_EMAILS`

واكتب إيميلك بدل:

`mohamed@example.com`

## الخطوة 4
اضغط Apply / Create.

Render سيقوم تلقائيًا بـ:

1. إنشاء PostgreSQL database
2. تثبيت dependencies
3. تجهيز database schema
4. بناء frontend
5. بناء backend
6. تشغيل Chemidot live

## الخطوة 5
بعد النجاح، ستحصل على رابط مثل:

`https://chemidot.onrender.com`

هذا هو رابط Chemidot live.

## ملاحظة مهمة
إذا ظهر Error، انسخ أول 20 سطر من الخطأ أو أرسل Screenshot.
