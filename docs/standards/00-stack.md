# 00 — Teknoloji Stack'i

Bu dosya "neyi kullanıyoruz, neyi kullanmıyoruz" sorusunun tek cevabıdır.
Burada olmayan bir kütüphane projeye eklenmeden önce **onay alınır** ve ADR yazılır.

## Zorunlu stack

Sürüm sütunu **fiilen kurulu** olanı gösterir; `package.json` ile birebir aynıdır.

| Katman | Seçim | Sürüm | Not |
|---|---|---|---|
| Framework | Next.js (App Router) | 16 | Pages Router kullanılmaz |
| Dil | TypeScript (strict) | 6 | JavaScript dosyası eklenmez · TS 7 henüz kullanılamıyor, aşağıya bak |
| Stil | Tailwind CSS | 4 | v4 CSS-first: `tailwind.config.ts` yok, token'lar `src/app/globals.css` içinde |
| UI bileşen | shadcn/ui (Radix tabanlı) | CLI 4 | Bileşen repoya kopyalanır, paket olarak bağlanmaz |
| Backend | Next.js Route Handlers (`src/app/api/**`) | — | Ayrı Express sunucusu kurulmaz |
| ORM | Prisma | 7 | Ham SQL sadece performans gerekçesiyle, ADR ile |
| Veritabanı | PostgreSQL | 18 | Local Docker imajı Neon'daki yama sürümüyle eşitlenir |
| Auth | Auth.js (NextAuth v5) | 5 (beta) | Web: httpOnly cookie · Mobil: Bearer JWT · aşağıya bak |
| Bot koruması | Cloudflare Turnstile | — | Giriş gerektirmeyen formlarda zorunlu · ADR ile kabul edildi |
| Validasyon | Zod | 4 | Her API girişinde zorunlu |
| Form | React Hook Form + Zod resolver | — | |
| Sunucu durumu | TanStack Query | 5 | |
| İstemci durumu | Zustand (sadece gerekiyorsa) | 5 | Redux kullanılmaz |
| Tarih | date-fns (+ `tr` yerel ayarı) | 4 | `moment.js` kullanılmaz |
| Unit test | Vitest + Testing Library | 4 | |
| E2E test | Playwright | 1.62 | Masaüstü + 375px mobil viewport |
| Erişilebilirlik denetimi | `@axe-core/playwright` | — | CI'da kritik ihlal = kırmızı |
| Performans denetimi | Lighthouse CI + `size-limit` | — | Performans bütçesi kapısı (`07-ui-design-system.md`) |
| Hata takibi | Sentry (`@sentry/nextjs`) | — | Ücretsiz katman |
| Hız sınırı | Ayrı paket yok — Postgres sayaç tablosu | — | Sunucusuzda bellek sayacı çalışmaz · ADR ile kabul edildi |
| Lint/Format | ESLint + Prettier | 9 / 3 | ESLint 10 kullanılamıyor, aşağıya bak |
| CI | GitHub Actions | — | |
| Hosting | Vercel | — | |
| Dosya depolama | Vercel Blob | — | Repoya dosya yüklenmez |
| Konteyner | Docker + Docker Compose | — | Sadece local geliştirme ve öğrenme amaçlı |
| Mobil | Expo (React Native) | — | Aynı REST API'yi tüketir |

## Sürüm tavanları — neden en yenisi değil

Bunlar tercih değil, **kısıt**. Kısıt kalkınca yükseltilir.

| Paket | Kullanılan | En yenisi | Neden yükseltilmedi |
|---|---|---|---|
| TypeScript | 6 | 7 | `typescript-eslint` TS 7'yi desteklemiyor (peer aralığı `<6.1.0`). TS 7'ye çıkmak lint kapısını tamamen devre dışı bırakırdı |
| ESLint | 9 | 10 | `eslint-config-next`'in içindeki `eslint-plugin-import` ve `eslint-plugin-jsx-a11y` en fazla ESLint 9 kabul ediyor |
| Node.js | 24 | 26 | 24 Active LTS; 26 henüz LTS değil (`00-stack.md` "Node.js LTS" kuralı) |

## Auth.js v5 uyarısı

`next-auth` v5 hâlâ **beta** yayınlanıyor (`5.0.0-beta.*`); `latest` etiketi v4'te.
Adım 4b'ye gelindiğinde "beta ile devam mı, v4 mü" kararı verilecek ve gerekirse
ADR yazılacak. Şu an bir bağımlılık kurulu değil.

## Kullanılmayacaklar
- Redux / MobX — TanStack Query + Zustand yeterli
- Ayrı Express/Nest backend — tek deploy hedefi
- MongoDB — ilişkisel veri modeli kullanıyoruz
- jQuery, Bootstrap, Material UI — Tailwind + shadcn ile çakışır
- `moment.js` — yerine `date-fns`
- Ödeme sağlayıcısı (Stripe/iyzico) — bu projede **fake ödeme** kullanılır

## Sürüm politikası
- Node.js LTS (>=20). Sürüm `.nvmrc` ile sabitlenir.
- Bağımlılıklar `package-lock.json` ile kilitlenir; `^` ile geniş aralık bırakılmaz.
  `package.json` içinde sürümler **tam** yazılır (`16.2.12`, `^16.2.12` değil).
- Major sürüm yükseltmesi ayrı PR olur, feature PR'ına karıştırılmaz.
- Bir bağımlılıkta yamalanmış sürüm varsa ama bağımlılık ağacı eskisini çekiyorsa,
  `package.json` → `overrides` ile yükseltilir ve gerekçesi PR'da yazılır.

## Yeni bağımlılık ekleme kuralı
Eklemeden önce sor ve şunu göster: ne işe yarıyor, alternatifi ne, paket boyutu,
son güncelleme tarihi, açık güvenlik uyarısı var mı. Tek fonksiyon için paket eklenmez.
