# مكتبتنا

تطبيق موبايل لأرشفة وتنظيم مكتبة البيت. بيعرّفك كل كتاب شو هو، ووين موجود بالضبط (الغرفة، والمكتبة، والقسم، والرف)، مع عرض 3D للمكتبات.

- **المرجع الكامل** للمشروع وكل القرارات: [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md)
- **ترقيم المكتبات:** [`docs/rooms/`](docs/rooms)
- **إدخال الكتب:** قالب الإكسل [`data/books-template.xlsx`](data/books-template.xlsx)، وتعليمات محادثة الصوت [`docs/VOICE_ENTRY_PROMPT.md`](docs/VOICE_ENTRY_PROMPT.md)

## هيكل المشروع

```
apps/mobile      تطبيق الموبايل (Expo + SQLite)
apps/server      السيرفر (NestJS + PostgreSQL)
packages/shared  كود مشترك: تطبيع النص العربي، والأرقام العربية، والقوائم الثابتة
```

---

## التشغيل على لابتوب الشغل (ويندوز)

التطبيق بيحتاج شغلتين شغّالين على اللابتوب:
1. **السيرفر**، مشان تسجيل الدخول.
2. **سيرفر التطوير تبع Expo**، يلي بيبعت التطبيق للموبايل.

### مرة وحدة بس
1. نزّل **Git** و**Node.js LTS** و**Docker Desktop** (القسم 5 بملف المشروع)، وشغّل Docker Desktop.
2. نزّل **Expo Go** على الموبايل من Play Store، و**وقّف التحديث التلقائي** إلو.
3. بـ PowerShell:
   ```powershell
   git clone https://github.com/BADR-14/maktabatna.git
   cd maktabatna
   npm install
   ```
4. اعمل ملف الإعدادات `.env`، وغيّر `bayt2026` لرمز الدعوة يلي بدك ياه:
   ```powershell
   $secret = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
   Set-Content .env "JWT_SECRET=$secret`nINVITE_CODE=bayt2026`nPOSTGRES_PASSWORD=maktabatna"
   ```
   رمز الدعوة هو يلي بيحتاجه أهل البيت ليفتحوا حساب.

### كل مرة
**1. شغّل السيرفر** (Docker Desktop لازم يكون شغّال):
```powershell
cd maktabatna
git checkout -- package-lock.json
git pull
npm install
docker compose up -d --build
```
للتأكد، افتح `http://localhost:3000/health` بالمتصفح، ولازم يطلع `{"status":"ok"}`.

**2. شغّل التطبيق:**
```powershell
npm run mobile -- --clear
```
- امسح الـ **QR** بـ Expo Go. الموبايل لازم يكون على **نفس الواي فاي**، **والـ VPN مطفي**.
- أول مرة: اكبس **«افتح حساب جديد»**، وحط رمز الدعوة.
- إذا طلب Windows Firewall إذن لـ Docker أو Node، اختار **Allow**.

> إذا ما قدر التطبيق يوصل للسيرفر، اكبس «عنوان السيرفر» بشاشة الدخول. لازم يكون `http://<عنوان اللابتوب>:3000`، وهو نفس العنوان يلي بيطلع جنب `exp://` بالـ PowerShell.

## لابتوب السيرفر (لاحقاً)

نفس خطوات السيرفر فوق، وبعد كل تحديث:
```powershell
git pull
docker compose up -d --build
```
البيانات بتنحفظ بـ Docker volume اسمه `db-data`، وما بتضيع لما تعيد بناء السيرفر.

---

## للمطوّر

| الأمر | شو بيعمل |
|---|---|
| `npm test` | اختبارات الكود المشترك |
| `npm run typecheck` | فحص TypeScript لكل المشروع |
| `npx eslint .` (جوا `apps/mobile`) | فحص الكود |
| `npx drizzle-kit generate` (جوا `apps/mobile`) | migration جديدة بعد تعديل `src/db/schema.ts` |
| `node scripts/build-seed-sql.mjs` (جوا `apps/mobile`) | إعادة توليد بيانات الغرف والمكتبات |
| `npx prisma migrate dev` (جوا `apps/server`) | migration جديدة للسيرفر بعد تعديل `prisma/schema.prisma` |
