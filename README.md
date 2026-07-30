# benim-belediyem

İzmir Büyükşehir Belediyesi temalı örnek hizmet portalı — randevu, market, restoran,
etkinlik ve üyelik akışlarını tek çatı altında toplayan bir öğrenme/portföy projesi.

> **Tüm veriler sahtedir.** Gerçek kişi, gerçek TCKN, gerçek ödeme yoktur.
> Bu site hiçbir kamu kurumuyla ilişkili değildir.

## Durum

Proje `docs/project/roadmap.md`'deki adımlara göre ilerliyor.
Şu an **adım 1 tamamlandı**: iskelet ayakta, canlıya çıktı, CI çalışıyor.
Hizmet sayfaları henüz yok.

- Canlı: **https://benim-belediyem.vercel.app**
- Sağlık ucu: **https://benim-belediyem.vercel.app/api/health**

## Gereksinimler

| Araç | Sürüm | Not |
| --- | --- | --- |
| Node.js | **24** (LTS) | `.nvmrc` ile sabit. `nvm use` yeterli |
| npm | 10+ | Node ile birlikte gelir |
| Docker | 24+ | Local Postgres için — **adım 2'de** gerekecek |

## Kurulum

```bash
git clone https://github.com/bariskose9/benim-belediyem.git
cd benim-belediyem
nvm use                 # .nvmrc'deki Node sürümüne geçer
npm ci                  # bağımlılıkları kilit dosyasından kurar
cp .env.example .env    # sonra .env içindeki değerleri doldur
npm run dev             # http://localhost:3000
```

`.env` doldurulmadan uygulama **açılışta** hangi değişkenin eksik olduğunu
söyleyerek durur — çalışma anında gizemli hata vermez.
Adım 0 için yalnızca şu ikisi zorunludur:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENV_LABEL=local
```

## Ortam değişkenleri

Tam liste ve açıklamaları **`.env.example`** içindedir; o dosya her zaman günceldir.
Doğrulama tek yerden yapılır: `src/config/env.ts` (Zod).

- `.env` **asla commit edilmez**; `.env.example` commit edilir
- Aynı anahtarın local / preview / production değeri **farklıdır**; canlı anahtar local'de kullanılmaz
- Preview ve production değerleri Vercel panelinden ortam seçilerek girilir

Ayrıntı: `docs/standards/13-environments.md`

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu (http://localhost:3000) |
| `npm run build` | Üretim yapısını derler |
| `npm run start` | Derlenmiş üretim yapısını çalıştırır |
| `npm run lint` | ESLint |
| `npm run format` | Prettier ile biçimlendirir |
| `npm run typecheck` | TypeScript tip denetimi |
| `npm run test` | Unit + entegrasyon testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright, masaüstü + 375px) |

Commit öncesi kapı: `npm run lint && npm run typecheck && npm run test && npm run build`

## Ortamlar

| Ortam | Nerede | Ekranda | Arama motoru |
| --- | --- | --- | --- |
| local | Kendi bilgisayarın | `LOCAL` şeridi | kapalı (`noindex`) |
| preview | Vercel Preview (her PR) | `PREVIEW` şeridi | kapalı (`noindex`) |
| production | Vercel Production (`main`) | şerit yok | açık |

Ayrı "test projesi" açılmaz — aynı kod, farklı ortam değişkenleri.

- Canlı: https://benim-belediyem.vercel.app
- Preview: her PR'da otomatik oluşur, PR sayfasında görünür.
  Preview adresi dala göre değiştiği için `NEXT_PUBLIC_APP_URL` elle girilmez —
  `src/config/env.ts` bunu Vercel'in `NEXT_PUBLIC_VERCEL_URL` değişkeninden türetir.

## Sürekli entegrasyon

Her PR'da iki iş akışı çalışır; ikisi de yeşil olmadan merge edilmez.

| Akış | Ne çalışır |
| --- | --- |
| `ci.yml` | `format:check` → `lint` → `typecheck` → `test` → `build` + bağımlılık denetimi |
| `e2e.yml` | Playwright (masaüstü + 375px), rapor artifact olarak yüklenir |

Bağımlılık denetiminde **üretim** bağımlılıkları kapıdır (`npm audit --omit=dev`);
geliştirme bağımlılıkları bilgi amaçlı raporlanır (gerekçe: roadmap teknik borç #12).

`build` adımı ortam değişkenlerini gerçekten doğrular — `SKIP_ENV_VALIDATION` gibi
bir kaçış kapısı yoktur.

## Klasör yapısı

```
src/
├── app/          Next.js App Router — sayfalar ve /api route handler'ları
├── features/     Her modül kendi klasöründe (components / services / repositories / schemas)
├── components/   ui/ → shadcn bileşenleri · layout/ → Navbar, EnvBanner ...
├── lib/          db, auth, http, errors, logger, utils
└── config/       env.ts (Zod ile env doğrulama) · constants.ts · messages.ts
tests/            unit / integration / e2e / fixtures
prisma/           schema.prisma · migrations · seed.ts
docs/
├── standards/    Mühendislik kuralları — her projede aynı, bağlayıcı
└── project/      PRD, veri modeli, yol haritası, ADR'ler — sadece bu proje
```

Tam ve bağlayıcı şema: `REPO-YAPISI.md`

## Katkı ve çalışma kuralları

- Çalışma protokolü: **`CLAUDE.md`** (repo kökünde)
- Mühendislik standartları: `docs/standards/` — bağlayıcıdır
- Ürün gereksinimleri: `docs/project/PRD.md`
- `main` korumalıdır; her iş kendi dalında açılır ve PR ile birleşir
- CI yeşil olmadan merge yok

## Teknoloji

Next.js 16 (App Router) · TypeScript 6 (strict) · Tailwind CSS 4 · shadcn/ui ·
Prisma 7 · PostgreSQL 18 · Auth.js · Zod 4 · Vitest · Playwright · Vercel · Neon

Tam liste ve "neyi kullanmıyoruz": `docs/standards/00-stack.md`

## Lisans

Bu bir öğrenme projesidir. Kurumsal kimlik öğeleri temsilidir.
