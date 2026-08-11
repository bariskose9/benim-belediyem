# benim-belediyem

İzmir Büyükşehir Belediyesi temalı örnek hizmet portalı — randevu, market, restoran,
etkinlik ve üyelik akışlarını tek çatı altında toplayan bir öğrenme/portföy projesi.

> **Tüm veriler sahtedir.** Gerçek kişi, gerçek TCKN, gerçek ödeme yoktur.
> Bu site hiçbir kamu kurumuyla ilişkili değildir.

## Durum

Proje `docs/project/roadmap.md`'deki adımlara göre ilerliyor.
Şu an **adım 2 tamamlandı**: iskelet ayakta, canlıya çıktı, CI çalışıyor,
local veritabanı ve migration boru hattı hazır. Hizmet sayfaları henüz yok.

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
cp .env.example .env    # local için hazır değerlerle gelir
npm run setup           # tek komut: kurulum + Docker Postgres + migration + seed
npm run dev             # http://localhost:3000
```

`npm run setup` sırayla şunları yapar: `npm ci` → Docker Postgres'i ayağa kaldırıp
sağlıklı olmasını bekler → migration'ları uygular → seed çalıştırır.
Sıfırdan yaklaşık **2–3 dakika** sürer. Docker'ın açık olması gerekir.

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
| `npm run setup` | Sıfırdan kurulum: bağımlılık + Docker + migration + seed |
| `npm run db:up` / `db:down` | Local Postgres'i başlat / durdur |
| `npm run db:migrate` | Şema değişikliğinden migration üretir (**yalnızca local**) |
| `npm run db:deploy` | Mevcut migration'ları uygular (preview/production'ın komutu) |
| `npm run db:reset` | Veritabanını sıfırlar, migration + seed'i baştan çalıştırır |
| `npm run db:studio` | Prisma Studio — veritabanını tarayıcıdan gör |

Commit öncesi kapı: `npm run lint && npm run typecheck && npm run test && npm run build`

## Veritabanı

| Ortam | Nerede | Migration komutu |
| --- | --- | --- |
| local | Docker (`postgres:18.4-alpine`) | `prisma migrate dev` — migration **üretir** |
| preview | Neon `preview` dalı | `prisma migrate deploy` — sadece **uygular** |
| production | Neon `production` dalı | `prisma migrate deploy` |

Üretimde `migrate dev` veya `db push` **asla** çalıştırılmaz.
Vercel derleme komutu `vercel.json` içinde tanımlıdır ve her dağıtımda
`prisma migrate deploy` çalıştırır — migration'ı elle uygulamak gerekmez.

Local Docker imajının sürümü Neon'daki sürümle (PostgreSQL 18.4) bilerek aynı tutulur:
sürüm farkı "local'de çalışıyordu canlıda çalışmıyor" sorununun en yaygın kaynağıdır.

İki ayrı bağlantı adresi vardır ve karıştırılmaz:

- `DATABASE_URL` — **havuzlu**, uygulamanın çalışma anı bağlantısı
- `DIRECT_URL` — **havuzsuz**, migration'lar için (havuzlayıcı DDL çalıştıramaz)

Gerekçe: `docs/project/decisions/ADR-008-prisma-driver-adapter.md`

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

[MIT](LICENSE) — kodu kullanabilir, değiştirebilir ve ticari olarak
kullanabilirsin; tek şart telif notunu ve lisans metnini korumak.

⚠️ **Bu gerçek bir belediye uygulaması değildir.** Bir öğrenme ve portföy
projesidir; kurumsal kimlik öğeleri temsilidir, kimlik sorgulama ve ödeme
sağlayıcıları taklit edilmiştir (ADR-003, ADR-009). Lisans koda verilir,
temsil edilen kuruma değil.
