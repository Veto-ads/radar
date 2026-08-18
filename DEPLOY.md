# نشر Veto Ads على VPS + دومين GoDaddy

## نظرة سريعة للمبرمج

- **المشروع**: Next.js 16 + TypeScript، SQLite محلي (`better-sqlite3`)، استخراج فريمات فيديو عبر `ffmpeg-static` (مضمّن كـ npm package، لا يحتاج تثبيت نظامي)، وتحليل فيديو عبر Gemini API.
- **قبل التشغيل**: `npm install` ثم انسخ `.env.example` إلى `.env.local` واملأ القيمتين (سيُزوَّدان من صاحب المشروع بقناة منفصلة وآمنة — لا ترسلهما عبر نفس قناة تسليم الملف):
  - `SESSION_SECRET` — نص عشوائي طويل (التعليمات بالأسفل تولّد واحداً)
  - `GEMINI_API_KEY` — مفتاح Google Gemini API الحقيقي
- **التشغيل محلياً للتجربة**: `npm run dev`
- **الخطوات الكاملة للنشر على VPS وربط دومين GoDaddy موجودة بالأسفل بالتفصيل.**
- بيانات الدخول التجريبية الموجودة بالكود (admin/admin123 وغيرها) **لازم تتغيّر فوراً بعد أول نشر** من شاشة الإدارة → المستخدمون.

---

هذا التطبيق يحتاج **سيرفر حقيقي (VPS)** وليس استضافة serverless مثل Vercel/Netlify، لأنه يعتمد على:
- قاعدة بيانات SQLite محلية (`data/veto-ads.db`)
- ملفات مرفوعة على القرص (`public/uploads/`)

هذه تحتاج تخزين دائم — منصات serverless تمسح الملفات بين الطلبات فتفقد البيانات.

## الخطوة 1: تجهيز السيرفر (VPS)

اتصل بالسيرفر عبر SSH (مثال لأوبنتو):

```bash
ssh root@YOUR_SERVER_IP
```

ثبّت Node.js 20.9+ و git:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
```

## الخطوة 2: رفع الكود

من جهازك، ارفع مجلد `veto-ads-web` فقط (وليس المجلد الأب) عبر `scp` أو `git`:

```bash
# من جهازك (مثال بـ scp)
scp -r veto-ads-web root@YOUR_SERVER_IP:/var/www/veto-ads-web
```

أو إذا رفعت الكود على GitHub خاص:

```bash
# على السيرفر
git clone <repo-url> /var/www/veto-ads-web
```

## الخطوة 3: متغيرات البيئة

على السيرفر، أنشئ `/var/www/veto-ads-web/.env.local`:

```bash
cd /var/www/veto-ads-web
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

انسخ الناتج واستخدمه كـ `SESSION_SECRET` (لا تستخدم القيمة التطويرية الموجودة حالياً — هذه القيمة **حساسة وسرية لهذا السيرفر فقط**):

```env
SESSION_SECRET=<الصق الناتج هنا>
GEMINI_API_KEY=<مفتاح Gemini الحقيقي>
```

## الخطوة 4: البناء والتشغيل

```bash
cd /var/www/veto-ads-web
npm install
npm run build

# تشغيل دائم عبر PM2 (يعيد التشغيل تلقائياً عند الأعطال أو إعادة الإقلاع)
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # اتبع التعليمات التي تظهر لتفعيل التشغيل التلقائي عند إقلاع السيرفر
```

## الخطوة 5: nginx + شهادة SSL مجانية

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

أنشئ `/etc/nginx/sites-available/veto-ads`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 200M;  # مهم لرفع مقاطع الفيديو
}
```

فعّله واحصل على شهادة SSL:

```bash
sudo ln -s /etc/nginx/sites-available/veto-ads /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## الخطوة 6: ربط دومين GoDaddy

1. في GoDaddy → **My Products** → دومينك → **DNS** / **Manage DNS**
2. عدّل (أو أضف) هذه السجلات:
   - **Type: A** — **Name: @** — **Value: عنوان IP السيرفر** — TTL: 600 (أقل قيمة متاحة)
   - **Type: A** — **Name: www** — **Value: نفس عنوان IP السيرفر**
3. احفظ. الانتشار (propagation) عادة يأخذ من دقائق لعدة ساعات، وأحياناً حتى 24-48 ساعة.

تحقق من الانتشار:

```bash
nslookup yourdomain.com
```

## بعد النشر

- **افتح الموقع** وسجّل دخول بحساب admin، غيّر كلمات المرور الافتراضية فوراً (admin123 وغيرها تجريبية فقط)
- **نسخ احتياطي دوري** — البيانات الحقيقية الوحيدة هي `data/veto-ads.db` و `public/uploads/` — خذ نسخة منها بشكل منتظم (cron job بسيط بـ rsync أو tar كافٍ)
- **تحديث الكود لاحقاً**: `git pull` (أو رفع الملفات الجديدة) ثم `npm install && npm run build && pm2 restart veto-ads-web`
