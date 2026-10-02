# تطبيق الأنسياب المتقدم لأندرويد

تطبيق Android أصلي يعرض كتالوج الأنسياب المتقدم عبر اتصال HTTPS، ويدعم الرجوع داخل التطبيق واختيار صور المنتجات عند دخول المشرف.

## البناء محليًا

1. افتح مجلد `android-app` في Android Studio.
2. ثبّت Android SDK API 37 وJDK 17 عندما يطلب Android Studio ذلك.
3. اختر `Build > Build APK(s)` لإخراج نسخة تجريبية، أو `Build > Generate Signed Bundle / APK` لنسخة النشر.

المعرّف الحالي للتطبيق هو `com.ensiyabco.catalog`، ويجب تأكيده قبل إنشاء أول إصدار في Google Play لأنه يصبح ثابتًا هناك.

