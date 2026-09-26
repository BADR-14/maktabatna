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

## تشغيل التطبيق على موبايلك (لابتوب الشغل، ويندوز)

**مرة وحدة بس:**
1. نزّل **Git** و**Node.js LTS** (القسم 5 بملف المشروع).
2. نزّل **Expo Go** على الموبايل من Play Store.
3. افتح **PowerShell** وجيب المشروع:
   ```powershell
   git clone https://github.com/BADR-14/maktabatna.git
   cd maktabatna
   npm install
   ```

**كل مرة:**
```powershell
cd maktabatna
git pull
npm install
npm run mobile
```
- رح يطلعلك **QR code** بالـ PowerShell. افتح Expo Go على الموبايل وامسحه.
- **لازم** الموبايل واللابتوب يكونوا على **نفس الواي فاي**.
- **أول مرة** التطبيق رح يعيد تشغيل حاله مرة وحدة مشان يقلب لليمين لليسار. هاد طبيعي.

> إذا ما اشتغل المسح بسبب الشبكة، شغّل `npm run start -w @maktabatna/mobile -- --tunnel`.

---

## تشغيل السيرفر (مرحلة 4، مش ضروري هلأ)

**للتجربة على لابتوب الشغل** (بيحتاج Docker Desktop):
```powershell
docker compose up -d --build
```
بعدها افتح `http://localhost:3000/health` بالمتصفح، ولازم يطلعلك `{"status":"ok"}`.

**على لابتوب السيرفر:** نفس الأمر، وبعد كل تحديث:
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
