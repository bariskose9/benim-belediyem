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
| Oturum (şifreyle giriş) | Paket yok — elle yazılmış veritabanı oturumu | — | Jeton httpOnly çerezde, oturum `sessions` tablosunda · ADR-002 · ADR-005 |
| Auth (Google ile giriş) | Auth.js (NextAuth v5) | 5 (beta) | **Henüz kurulu değil**, adım 4c'de değerlendirilecek · aşağıya bak |
| Şifre özetleme | `argon2` (argon2id) | 0.45.1 | Parametreler `src/config/constants.ts` içinde · ADR-011 |
| Bot koruması | Cloudflare Turnstile | — | Giriş gerektirmeyen formlarda zorunlu · ADR ile kabul edildi |
| Validasyon | Zod | 4 | Her API girişinde zorunlu |
| Form | React Hook Form + Zod resolver | 7.83 / 5.5 | |
| Sunucu durumu | TanStack Query | 5 | Henüz kurulu değil — ilk gerçek liste ekranında eklenir |
| İstemci durumu | Zustand (sadece gerekiyorsa) | 5 | Redux kullanılmaz |
| Tarih | date-fns (+ `tr` yerel ayarı) | 4.4.0 | `moment.js` kullanılmaz |
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

## Auth.js v5 uyarısı — artık yalnızca 4c (Google ile giriş) için geçerli

**Şifreyle giriş Auth.js kullanmıyor.** Adım 4b-2'de karar verildi ve kaynaktan
doğrulandı: `@auth/core`, `Credentials` sağlayıcısını yalnızca JWT oturum
stratejisiyle çalıştırıyor (`packages/core/src/lib/utils/assert.ts` →
_"Signing in with credentials only supported if JWT strategy is enabled"_).
JWT ise ADR-005'in tek varlık sebebini — çıkışın ve şifre değişiminin oturumu
**anında** düşürmesi — teknik olarak sağlayamıyor. Bu yüzden oturum elle
yazıldı: `sessions` tablosu, httpOnly çerezde rastgele jeton, jetonun
veritabanında yalnızca özeti. Ayrıntı: ADR-005'in 2026-08-01 tarihli güncelleme notu.

Geriye **Google ile giriş** kalıyor (adım 4c). `next-auth` v5 hâlâ **beta**
yayınlanıyor (`5.0.0-beta.*`); `latest` etiketi v4'te. OAuth sağlayıcıları
`database` stratejisiyle çalışıyor, yani Google'ı Auth.js'e yaptırıp aynı
`Session` tablosuna yazdırmak mümkün görünüyor — ama çerez adı ve biçimi
bizimkinden farklı, birleştirme gerekiyor. Karar 4c'de, dokümana bakılarak
verilecek. Şu an bir bağımlılık kurulu değil.

## Kullanılmayacaklar
- Redux / MobX — TanStack Query + Zustand yeterli
- Ayrı Express/Nest backend — tek deploy hedefi
- MongoDB — ilişkisel veri modeli kullanıyoruz
- jQuery, Bootstrap, Material UI — Tailwind + shadcn ile çakışır
- `moment.js` — yerine `date-fns`

<!-- ⛔ SENKRON SINIRI — bu satırın ÜSTÜ kitle ortaktır ve kit-senkron tarafından
     eşitlenir. Projeye özel "kullanmıyoruz" maddeleri AŞAĞIYA yazılır.
     Gerekçesiz madde yazılmaz; sonraki oturum gerekçesiz yasağı anlamaz ve
     delmeye çalışır. Sınırı SİLME — silinirse genel yasaklar da senkrondan
     düşer ve kite yazılan yeni bir yasak bu projeye hiç ulaşmaz. -->

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
