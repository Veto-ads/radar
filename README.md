# Radar — Veto Ads Monitoring Platform

منصة داخلية لرصد الإعلانات على اللوحات والشاشات الخارجية والداخلية.

راصد ميداني يرفع مقطع فيديو للوحة، مشرف الجودة يراجع الطلب ويشغّل تحليلاً بالذكاء الاصطناعي (Gemini)،
والنتائج تُغذّي لوحة إحصائيات وتحكم كاملة للإدارة.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # ثم عبّئ GEMINI_API_KEY و SESSION_SECRET
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

## النشر على استضافة (VPS)

راجع [DEPLOY.md](./DEPLOY.md) لخطوات النشر الكاملة وربط دومين.

## التقنيات

Next.js 16 (App Router) · TypeScript · Tailwind CSS · SQLite (`better-sqlite3`) · Google Gemini API · ffmpeg (استخراج الفريمات) · Chart.js
