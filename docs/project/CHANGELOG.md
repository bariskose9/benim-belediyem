# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

### Eklendi — adım 3
- `prisma/schema.prisma` — `data-model.md`'deki **37 tablonun tamamı**, 26 enum,
  yabancı anahtarlar, index'ler ve eşzamanlılık için benzersiz index'ler
- `prisma/migrations/*_add_core_data_model` — tek migration; boş baseline'ın üstüne
  yalnızca `CREATE TABLE` / `CREATE INDEX` ekler, hiçbir şey silmez
- `prisma/seed/` — modül modül tohumlama: 200 sahte KPS vatandaşı, 35 birimlik
  teşkilat şeması, 100 personel, 90 üye hesabı, 45 market ürünü, 31 menü kalemi,
  4 üyelik paketi, 26 doktor + 6552 slot, 3 mekân + 576 koltuk + 12 etkinlik.
  Sabit kimlikler ve sabit tohumlu üreteç sayesinde **idempotent ve deterministik**
- `src/lib/national-id.ts` — kimlik numarası doğrulama (kontrol basamağı),
  maskeleme, tuzlanmış özet (HMAC-SHA256) ve AES-256-GCM şifreleme.
  Bağımlılık eklenmedi; `node:crypto` kullanıldı
- `tests/db/` + `npm run test:db` — **gerçek veritabanına bağlanan** testler:
  benzersiz index'lerin çalıştığı ve tohumlamanın idempotentliği kanıtlanıyor.
  CI'da `e2e.yml` içinde, PostgreSQL servisi ayakken koşuyor
- `docs/project/test-hesaplari.md` — tohumlama tarafından üretilir; sınır durum
  kayıtlarının (18 yaş altı, tam bugün 18, timeout, error, bulunamayan numara)
  ve örnek hesapların listesi. Production'da üretilmez
- `public/images/market|restaurant/*.svg` — telifsiz, kategori başına yer tutucu görsel

### Değişti — adım 3
- `docs/project/data-model.md` — iki düzeltme: tekilliği şifreli kolon değil
  `nationalIdHash` zorlar; `idempotencyKey` `Payment` üzerindedir, `Order` üzerinde değil.
  Ayrıca `OrgUnit.unitType` altı kademeye çıktı (üst yapı için)
- `.env.example` — `NATIONAL_ID_ENCRYPTION_KEY` / `NATIONAL_ID_HASH_SALT` artık
  adım 3'ten itibaren zorunlu ve local varsayılan değerleri var; `OWNER_BIRTH_DATE` eklendi

### Eklendi — adım 2
- `docker-compose.yml` — local PostgreSQL 18.4 (Neon'daki sürümle birebir aynı),
  sağlık kontrollü; `docker compose up -d --wait` bu kontrolü bekler
- `Dockerfile` — çok aşamalı build (deps → builder → runner), root olmayan kullanıcı,
  konteyner sağlık kontrolü. Vercel bu imajı kullanmaz; taşınabilirlik ve öğrenme için
- `prisma/schema.prisma` + `prisma.config.ts` — Prisma 7 kurulumu (model yok, adım 3'te gelir)
- `prisma/migrations/0_init` — boş baseline migration; migration boru hattının
  local (`migrate dev`) ve preview/production (`migrate deploy`) tarafında çalıştığını kanıtlar
- `prisma/seed.ts` — idempotent seed iskeleti
- `src/lib/db.ts` — tekil PrismaClient, `@prisma/adapter-pg` üzerinden (ADR-008)
- `npm run setup` — tek komutla kurulum: `npm ci` → Docker → migration → seed (~2,5 dk)
- `db:up`, `db:down`, `db:reset`, `db:migrate`, `db:deploy`, `db:studio` komutları
- **ADR-008** — Prisma bağlantısı için `@prisma/adapter-pg` kararı ve alternatifleri

### Değişti — adım 2
- `GET /api/health` artık veritabanını da kontrol ediyor: ulaşılabiliyorsa
  `200` + `db: "ok"`, ulaşılamıyorsa `503` + hangi parçanın düştüğü.
  Sorgunun zaman aşımı var (3 sn) — cevap vermeyen veritabanı ucu askıda bırakmaz
- `src/config/env.ts` — `DATABASE_URL` ve `DIRECT_URL` artık **zorunlu** ve
  `postgresql://` protokolü doğrulanıyor
- `next.config.ts` — `standalone` çıktısı yalnızca Docker imajı için açılıyor
  (`NEXT_OUTPUT=standalone`); `next start` bu modda çalışmadığı için kalıcı değil
- `e2e.yml` — Postgres servis kabı eklendi; E2E artık gerçek veritabanına bağlanıyor
  ve `migrate deploy` ile migration'ları uyguluyor
- `src/lib/http.ts` — hata yanıtları artık her zaman `Cache-Control: no-store` gönderiyor

### Düzeltildi — adım 2
- `prisma.config.ts` Prisma'nın `env()` yardımcısını kullanıyordu; bu, veritabanına
  hiç bağlanmayan `prisma generate` komutunu bile `DIRECT_URL` olmadan başarısız
  kılıyordu. Docker imajı derlenirken ve Vercel'in `postinstall` adımında patlıyordu

### Eklendi — adım 1
- `GET /api/health` — uygulama sağlık ucu; ortam, sürüm, commit ve zaman damgası döner.
  Yayın sonrası duman testinin ilk adımı bu (`CLAUDE.md §5.8`)
- `src/lib/errors.ts` — tiplenmiş hata sınıfları. Her hatanın makine için `code`'u ve
  kullanıcı için Türkçe mesajı var; beklenmeyen hatalar iç detay sızdırmadan
  `InternalError`'a düşer
- `src/lib/http.ts` — tek tip yanıt zarfı (`{ data }` / `{ error }`), tüm route
  handler'lar yanıtı buradan üretir
- `.github/workflows/ci.yml` — `format:check` → `lint` → `typecheck` → `test` → `build`
  + bağımlılık denetimi. Build ortam doğrulamasını gerçekten çalıştırır
- `.github/workflows/e2e.yml` — Playwright (masaüstü + 375px), tarayıcı önbellekli
- `.github/pull_request_template.md` — Definition of Done kontrol listesiyle

### Değişti — adım 1
- `src/config/env.ts` — preview ortamında `NEXT_PUBLIC_APP_URL` artık Vercel'in
  `NEXT_PUBLIC_VERCEL_URL` değişkeninden türetiliyor. Preview adresi her dalda
  değiştiği için sabit bir değer doğru olamıyordu
- `src/config/constants.ts` — `APP_VERSION` ve `BUILD_COMMIT` eklendi

### Düzeltildi — adım 1
- Sağlık ucu `Cache-Control` başlığı göndermiyordu. `export const dynamic =
  "force-dynamic"` yalnızca Next'in render davranışını değiştiriyor, yanıt başlığı
  eklemiyor — araya giren bir CDN "sağlıklı" cevabını dondurabilirdi. Artık
  `no-store` gönderiliyor ve bu üç seviyede test ediliyor (unit, entegrasyon, E2E)

### Eklendi — adım 0
- Roadmap adım 0 — proje iskeleti: Next.js 16 (App Router), TypeScript 6 (strict),
  Tailwind CSS 4, shadcn/ui (Radix tabanlı), ESLint + Prettier
- `src/config/env.ts` — ortam değişkenlerinin tek okuma noktası, Zod 4 ile doğrulanır;
  eksik değişkende uygulama açılışta Türkçe hata verip durur
- `src/components/layout/EnvBanner.tsx` — local ve preview ortamlarında ekranın
  üstünde `LOCAL` / `PREVIEW` şeridi (13-environments.md)
- `src/app/robots.ts` ve `src/app/sitemap.ts` — production dışındaki ortamlar
  arama motorlarına kapalı (`noindex`)
- `next.config.ts` — baseline güvenlik başlıkları (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Test altyapısı: Vitest 4 + Testing Library (16 unit testi) ve
  Playwright (12 E2E testi — masaüstü + 375px mobil)
- `.env.example`, `.nvmrc`, `README.md`

### Değişti
- `docs/standards/00-stack.md` — sürüm sütunu eklendi ve fiilen kurulu sürümlerle
  eşitlendi (Next 15→16, PostgreSQL 16→18); sürüm tavanlarının gerekçesi yazıldı
- `REPO-YAPISI.md` — `tailwind.config.ts` çıkarıldı (Tailwind v4 bu dosyayı
  üretmiyor), `postcss.config.mjs` ve `components.json` eklendi
- `docs/project/roadmap.md` — teknik borç tablosuna 6 yeni satır (7–12)

### Güvenlik
- `sharp` 0.34.5 → **0.35.3** ve `postcss` 8.4.31 → **8.5.25** `overrides` ile
  yükseltildi; üretim bağımlılıklarında bilinen açık kalmadı (`npm audit --omit=dev`: 0)
