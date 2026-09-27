# تفعيل الدخول بحساب Google

مجاني، وبتعمله **مرة وحدة**. بعده بيصير بشاشة الدخول زر «الدخول بحساب Google» (بالتطبيق المثبّت من الـ APK، مش بـ Expo Go).

## 1. مشروع على Google Cloud
1. افتح <https://console.cloud.google.com> بحسابك على Gmail.
2. فوق: **Select a project ← New project**، والاسم `maktabatna`، وبعدين **Create**.

## 2. شاشة الموافقة (مرة وحدة)
1. من القائمة: **Google Auth Platform ← Branding ← Get started**.
2. **App name:** مكتبتنا. **User support email:** إيميلك. **Audience:** External. **Contact email:** إيميلك. وبعدين **Create**.
3. من **Audience ← Test users ← Add users**: ضيف إيميلات Gmail لأهل البيت يلي بدهم يدخلوا بـ Google.
   > بنضل على وضع **Testing**، هيك ما في داعي لمراجعة من Google، وبيكفي حتى ١٠٠ شخص.

## 3. معرّف أندرويد (Android client)
1. **Clients ← Create client ← Application type: Android**.
2. **Package name:** `com.badr.maktabatna`
3. **SHA-1 certificate fingerprint:**
   ```
   12:0E:06:1E:1E:38:57:45:82:FF:F1:66:5E:B0:BF:CC:22:6C:DE:94
   ```
   (بصمة مفتاح توقيع التطبيق بـ `apps/mobile/credentials/`، وهي نفسها بكل نسخة APK.)
4. **Create**.

## 4. معرّف الويب (Web client) للسيرفر
1. **Clients ← Create client ← Application type: Web application**، والاسم `maktabatna server`، وبعدين **Create**.
2. انسخ الـ **Client ID** (بيخلص بـ `.apps.googleusercontent.com`).

## 5. حطّه على السيرفر
1. بملف `.env` جنب `docker-compose.yml` ضيف سطر:
   ```
   GOOGLE_WEB_CLIENT_ID=الرقم-يلي-نسخته.apps.googleusercontent.com
   ```
2. شغّل:
   ```powershell
   docker compose up -d
   ```

## الاستعمال
- **حساب جديد بـ Google:** بشاشة الدخول اكبس «الدخول بحساب Google» واختار حسابك. أول مرة بيطلب **رمز الدعوة** (نفس رمز التسجيل).
- **عندك حساب قديم باسم مستخدم:** ادخل عادي، وبعدين من **الملف الشخصي ← ربط حساب Google**. من بعدها بتقدر تدخل بالطريقتين.

> ما في داعي لبناء APK جديد: التطبيق بياخد المعرّف من السيرفر.
