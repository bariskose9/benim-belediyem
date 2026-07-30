# 00 — Teknoloji Stack'i

Bu dosya "neyi kullanıyoruz, neyi kullanmıyoruz" sorusunun tek cevabıdır.
Burada olmayan bir kütüphane projeye eklenmeden önce **onay alınır** ve ADR yazılır.

## Zorunlu stack

| Katman | Seçim | Not |
|---|---|---|
| Framework | Next.js 15 (App Router) | Pages Router kullanılmaz |
| Dil | TypeScript (strict) | JavaScript dosyası eklenmez |
| Stil | Tailwind CSS | Ayrı CSS dosyası ancak global token için |
| UI bileşen | shadcn/ui (Radix tabanlı) | Bileşen repoya kopyalanır, paket olarak bağlanmaz |
| Backend | Next.js Route Handlers (`src/app/api/**`) | Ayrı Express sunucusu kurulmaz |
| ORM | Prisma | Ham SQL sadece performans gerekçesiyle, ADR ile |
| Veritabanı | PostgreSQL 16 | Local: Docker · Uzak: Neon |
| Auth | Auth.js (NextAuth v5) | Web: httpOnly cookie · Mobil: Bearer JWT |
| Bot koruması | Cloudflare Turnstile | Giriş gerektirmeyen formlarda zorunlu · ADR ile kabul edildi |
| Validasyon | Zod | Her API girişinde zorunlu |
| Form | React Hook Form + Zod resolver | |
| Sunucu durumu | TanStack Query | |
| İstemci durumu | Zustand (sadece gerekiyorsa) | Redux kullanılmaz |
| Tarih | date-fns (+ `tr` yerel ayarı) | `moment.js` kullanılmaz |
| Unit test | Vitest + Testing Library | |
| E2E test | Playwright | |
| Erişilebilirlik denetimi | `@axe-core/playwright` | CI'da kritik ihlal = kırmızı |
| Performans denetimi | Lighthouse CI + `size-limit` | Performans bütçesi kapısı (`07-ui-design-system.md`) |
| Hata takibi | Sentry (`@sentry/nextjs`) | Ücretsiz katman |
| Hız sınırı | Ayrı paket yok — Postgres sayaç tablosu | Sunucusuzda bellek sayacı çalışmaz · ADR ile kabul edildi |
| Lint/Format | ESLint + Prettier | |
| CI | GitHub Actions | |
| Hosting | Vercel | |
| Dosya depolama | Vercel Blob | Repoya dosya yüklenmez |
| Konteyner | Docker + Docker Compose | Sadece local geliştirme ve öğrenme amaçlı |
| Mobil | Expo (React Native) | Aynı REST API'yi tüketir |

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
- Major sürüm yükseltmesi ayrı PR olur, feature PR'ına karıştırılmaz.

## Yeni bağımlılık ekleme kuralı
Eklemeden önce sor ve şunu göster: ne işe yarıyor, alternatifi ne, paket boyutu,
son güncelleme tarihi, açık güvenlik uyarısı var mı. Tek fonksiyon için paket eklenmez.
