# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

### Eklendi — yeni proje başlangıç kiti
- `docs/standards/16-yeni-proje-kurulumu.md` — **her projede aynı**: yeni bir
  projeye başlarken hangi dosyanın nereye kopyalanacağı, hangisinin projeye göre
  değişip hangisinin değişmediği. Amaç: iskeleti kurmak kullanıcının işi olmasın;
  kullanıcı yalnızca analiz dokümanını ve (varsa) farklı stack'i versin
- `docs/standards/sablonlar/` — dokuz doldurulabilir şablon (`PRD`, `roadmap`,
  `altyapi-durumu`, `CHANGELOG`, `sonraki-adim-prompt`, `data-model`,
  `integrations`, `fake-data-guide`, `ADR-000`) + klasör indeksi `OKUBENI.md`.
  Her şablonun başında **neden var olduğu** ve **ne zaman güncellendiği** yazıyor;
  doldurulunca o açıklama bloğu siliniyor
- `16-yeni-proje-kurulumu.md` içine **"proje hafızası — dört dosya"** tablosu:
  "hangi teknolojiyi kullandık" (`00-stack.md`), "hangi hesabı açtık"
  (`altyapi-durumu.md`), "neden böyle yaptık" (ADR'ler), "nerede kaldık"
  (`roadmap.md`). Gerekçe: oturum hafızasızdır, bu dört soru dosyaya yazılmazsa
  bir daha cevaplanamaz

### Değiştirildi — adım 4b-2 kararı
- **Auth.js `Credentials` sağlayıcısının veritabanı oturumunu desteklemediği
  kaynak koddan doğrulandı** (`@auth/core` → `assert.ts`: *"Signing in with
  credentials only supported if JWT strategy is enabled"*). Bu yüzden 4b-2'de
  şifreyle giriş **elle yazılmış veritabanı oturumuyla** yapılacak; ADR-005
  (oturum veritabanında) yürürlükte kalıyor ve `next-auth` kurulmuyor.
  Karar gerekçesi ve sonuçları `sonraki-adim-prompt.md` içinde

### Eklendi — oturum devri altyapısı
- `docs/standards/15-oturum-devri.md` — **her projede aynı**: bir bilginin
  hangi dosyaya yazılacağını söyleyen yönlendirme tablosu ve oturum sonu
  protokolü. Gerekçesi gerçek bir hata: bir oturumda Cloudflare hesabı açılmıştı,
  sonraki oturum bunu bilmediği için kullanıcıya aynı işi tekrar yaptırdı
- `docs/project/altyapi-durumu.md` — **projeye özel**: hangi hesap açık, panelde
  ne yapılandırılmış, hangi ortam değişkeni hangi ortamda tanımlı, ajan hangi
  araçlara erişebiliyor. Gizli anahtar DEĞERİ yazılmaz, yalnızca adı ve yeri
- `CLAUDE.md` kaynak hiyerarşisine `altyapi-durumu.md` eklendi: kullanıcıya
  "şunu aç" demeden önce okunması zorunlu

### Değiştirildi — canlı ortam
- Cloudflare Turnstile **gerçek anahtarlarla** devrede (preview + production);
  canlıda gerçek onay kutusu çıktığı doğrulandı. Teknik borç #21 kapandı
- Resend anahtarı production'a girildi, **canlıda kayıt açıldı**.
  Teknik borç #22 kapandı, yerine #25 doğdu (doğrulanmış alan adı olmadığı için
  yalnızca hesabın kayıtlı e-postasına gönderim yapılabiliyor)

### Eklendi — adım 4b-1 (TCKN ile kayıt)
- `src/app/kayit/` — üç adımlı kayıt akışı: kimlik doğrulama →
  salt okunur kimlik + iletişim/şifre → **iki bağımsız doğrulama kodu**.
  Her adım gerçek bir adres; geri tuşu çalışıyor, her adımın kendi
  yükleniyor/hata durumu var
- `POST /api/registrations` + `GET|PATCH|DELETE /api/registrations/current` +
  `.../current/otp-challenges` + `.../current/verifications`.
  **Taslak kimliği URL'de geçmez**, httpOnly çerezde taşınır
- `src/features/otp/` — `OtpChannel` adaptörü ve üç uygulaması:
  `MockChannel` (local/preview, kodu ekrana döndürür), `EmailChannel`,
  `EmailSmsSimulationChannel`. **Telefon kodu e-postaya gider ve simülasyon
  olduğu ekranda da e-postada da açıkça yazar** (teknik borç #1)
- `src/features/auth/` — kayıt servisi, **18 yaş kontrolü** (KPS'ten gelen
  tarihten, İstanbul takvim günüyle), argon2id şifre özetleme, şifre
  politikası, personel eşleştirme
- `registration_drafts` tablosu (ADR-012) — KPS yanıtının 15 dakikalık şifreli
  önbelleği. Düz metin kimlik numarası, e-posta, telefon veya kod hiçbir
  kolonda yok; çerez yalnızca rastgele bir jeton taşıyor
- `src/lib/turnstile.ts` — bot koruması, kayıt formunda **KPS sorgusundan önce**
  (ADR-004). Cloudflare'a ulaşılamazsa akış DURUR, kapı atlanmaz
- `src/lib/audit.ts` — `audit_logs` tablosuna ilk yazan. `src/lib/anonymous-id.ts` —
  hız sınırının oturum bacağını besleyen rastgele ziyaretçi kimliği
- Yeni bağımlılıklar: `argon2` (ADR-011), `react-hook-form`,
  `@hookform/resolvers`, `date-fns`
- Yeni ADR: **011** (argon2id) ve **012** (kayıt taslağı sunucuda şifreli)

### Değiştirildi
- `NATIONAL_ID_ENCRYPTION_KEY` artık **zorunlu** ve 32 bayt olduğu açılışta
  doğrulanıyor. Opsiyonel bırakılsaydı uygulama açılır, kayıt ucu çalışma
  anında ham bir kripto hatasıyla 500 dönerdi
- Ortam doğrulaması **production'da sahte OTP kanalını reddediyor**: sahte kanal
  kodu ekrana bastığı için yanlış yapılandırılmış bir production dağıtımının
  hiç açılmaması tercih edildi
- CSP'ye `challenges.cloudflare.com` eklendi (`script-src`, `frame-src`,
  `connect-src`). Bu satırlar olmadan Turnstile SESSİZCE bozuluyordu
- `created()` yanıtları artık her zaman `Cache-Control: no-store` taşıyor
- Tohumlama demo hesaplara argon2id şifresi yazıyor (teknik borç #15 kapandı)

### Düzeltildi
- `getRegistrationState` yanıtı **tam kimlik numarasını sızdırıyordu**: kimlik
  görünümü saklanan yükü olduğu gibi yayıyordu, o yük ise düz numarayı taşıyor.
  Artık alanlar tek tek beyaz listeden geçiyor
- Kontrol basamağı hatalı numara 422 yerine PRD'nin istediği **400** dönüyor;
  farklı bir durum kodu, tek tip mesajın sildiği ayrımı geri sızdırıyordu
- Doğrulama panelleri artık adlandırılmış bölge (`<section aria-labelledby>`);
  bilgi kutuları ekran okuyucuyu kesen `role="alert"` yerine `role="status"`

### Eklendi — adım 4a (sahte KPS servisi)
- `src/app/api/mock-kps/identity-queries/` — taklit edilen DIŞ KURUM ucu.
  Yalnızca POST (kimlik numarası URL'e değil gövdeye yazılır), yapay gecikme
  200–800 ms, `simulationBehavior` alanına göre `timeout` / `error` /
  `not_found` üretimi. **Paylaşılan gizli başlık olmadan 401 döner** (ADR-009)
- `src/features/identity/` — `IdentityProvider` arayüzü + `MockKpsProvider`.
  Zaman aşımı 3 sn, en fazla 2 yeniden deneme (üstel geri çekilme), devre
  kesici. **Yeniden deneme yalnızca zaman aşımı ve 5xx'te**; `not_found`,
  `mismatch` ve 4xx iş sonucudur, tekrarlanmaz
- `src/features/identity/services/identity-lookup.service.ts` — numara taraması
  koruması: tek tip başarısızlık mesajı, **sabit yanıt süresi** (bulundu /
  eşleşmedi / bulunamadı aynı sürer), her sorgu `KpsQueryLog`'a **numara
  yazılmadan** kaydedilir
- `src/lib/rate-limit.ts` — Postgres üzerinde hız sınırı sayacı (ADR-006).
  5 deneme / 15 dakika, IP + oturum bazlı. IP tuzlanmış özet olarak saklanır.
  **Sayaç kullanıcı denemesi başına artar**, iç yeniden denemeler artırmaz
- `src/lib/circuit-breaker.ts` — devre kesici, mevcut `rate_limit_counters`
  tablosu üzerinde (ADR-010). Yeni migration yok
- `MOCK_KPS_API_KEY` ortam değişkeni — **zorunlu**, her ortamda farklı
- `docs/project/decisions/ADR-009-*`, `ADR-010-*`
- Testler: 54 yeni unit/entegrasyon + 6 veritabanı + 5 E2E. E2E, derlenmiş ve
  çalışan uygulamaya dışarıdan başlıksız istek atıp 401 aldığını kanıtlıyor

### Değişti — adım 4a
- `NATIONAL_ID_HASH_SALT` artık **zorunlu** (IP özeti bunu kullanıyor)
- `src/lib/crypto.ts` — `hashPseudonym()` eklendi: kimlik numarası dışındaki
  tanımlayıcılar için alan ayrımlı (domain-separated) takma ad özeti
- `src/app/robots.ts` — production'da `/api/mock-kps` açıkça kapatıldı

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
