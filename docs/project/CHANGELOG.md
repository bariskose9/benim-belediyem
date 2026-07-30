# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

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
