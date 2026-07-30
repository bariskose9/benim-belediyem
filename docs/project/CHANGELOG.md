# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

### Eklendi
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
