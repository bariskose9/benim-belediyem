# Sonraki oturum için hazır prompt — adım 4b-2

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 4b-2 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **4b-2**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu üçü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — teknik borç listesi
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 4b-1 bitti ve `main`'de canlıda** (PR #1-#11).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt akışı canlıda ÇALIŞIYOR**: TCKN → KPS → 18 yaş → iki bağımsız OTP
- Preview ve production veritabanları **dolu**: 200 KPS vatandaşı, 100 personel,
  90 üye. Gerçek kullanıcı 0
- Testler: **263** unit/entegrasyon · **36** veritabanı · **50** E2E
- Cloudflare Turnstile ve Resend **kurulu ve çalışıyor** (altyapi-durumu.md)
- **Giriş / çıkış / oturum HENÜZ YOK.** 4b-2'nin tamamı bu.

## ÖNCE ÇÖZÜLECEK MESELELER

**Yok — 4b-2'nin tek açık kararı verildi.** Aşağıyı oku ve uygula, yeniden tartışma.

### Oturum stratejisi kararı (verildi, kaynaktan doğrulandı)

Soru şuydu: şifreyle giriş Auth.js ile mi yapılacak, elle mi?

`@auth/core` kaynak kodunda (`packages/core/src/lib/utils/assert.ts`) şu kontrol
var ve hata fırlatıyor:

> `"Signing in with credentials only supported if JWT strategy is enabled"`

Yani **Auth.js'in `Credentials` sağlayıcısı `database` oturum stratejisiyle
çalışmıyor** — JWT'yi zorunlu kılıyor. Bu doğrudan **ADR-005** ile çakışıyor
(oturum veritabanında, çünkü çıkış ve şifre değişimi oturumu **gerçekten**
düşürebilsin).

**KARAR: (a) elle yazılmış veritabanı oturumu.** ADR-005 yürürlükte kalıyor,
yeni ADR yazılmıyor, **`next-auth` KURULMUYOR**.

Gerekçe:
- ADR-005'in tek varlık sebebi anında iptal edilebilirlik. JWT'ye geçmek o sözü
  bozardı: kullanıcı şifresini değiştirse bile eski oturum 7 gün açık kalırdı
- `Session` tablosu, güvenli çerez varsayılanları, hız sınırı, denetim kaydı ve
  argon2id şifre doğrulama **zaten yazılmış**; eksik parça küçük
- CLAUDE.md: bir ADR'ye aykırı kod yazılmaz

**Bu kararın 4c'ye etkisi (Google ile giriş) — HENÜZ BELİRSİZ.** Auth.js OAuth
sağlayıcılarıyla `database` stratejisini destekliyor, yani Google'ı Auth.js'e
yaptırıp aynı `Session` tablosuna yazdırmak mümkün görünüyor; ama çerez adı ve
biçimi bizimkinden farklı, birleştirme gerekir. **Emin değilim** — 4c'de yine
dokümana bakılarak karar verilecek. 4b-2'yi engellemez.

**Yan iş:** karar verildiğine göre `docs/standards/00-stack.md` içindeki
"Auth" satırı ve "Auth.js v5 uyarısı" bölümü 4b-2 PR'ında güncellenmeli —
şu an "Auth.js kullanılacak" diyor, artık yalnızca 4c için geçerli.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- `hashPassword()` / `verifyPassword()` (`src/features/auth/services/password.service.ts`)
  — argon2id, ADR-011. **Hiçbir kimlik doğrulama kütüphanesine bağlı değil**,
  bilerek böyle bırakıldı
- `checkPasswordPolicy()` — uzunluk + yaygın şifre listesi + kişisel veri kontrolü
- `consumeRateLimit()` + `resetRateLimit()` + `rateLimitKey(purpose, kind, value)`
  (`src/lib/rate-limit.ts`) — `kind`: `"ip" | "session" | "destination"`.
  **Yeni hız sınırı mekanizması KURMA**
- `hashActorIp()` / `readActorIp()` — denetim kaydı ve hız sınırı için IP işleme
- `verifyTurnstileToken()` (`src/lib/turnstile.ts`) — bot kapısı.
  PRD giriş formunda **2 başarısız denemeden sonra** istiyor
- `recordAuditLog()` (`src/lib/audit.ts`) — `AuditAction.login` / `logout` hazır
- `secureCookieDefaults` (`src/lib/cookies.ts`) — httpOnly + sameSite=lax + secure
  (`secure` local'de bilerek kapalı, gerekçesi dosyada yazılı)
- `ensureAnonymousId()` (`src/lib/anonymous-id.ts`) — hız sınırının oturum bacağı
- `ok()` / `created()` / `noContent()` / `fail()` (`src/lib/http.ts`) ve
  `src/lib/errors.ts` hata sınıfları — **tek tip hata formatı**, yeniden kurma
- `matchStaffMember()` (`src/features/auth/services/staff-matching.service.ts`)
  — `isStaff` hesaplaması
- `issueOtp()` / `verifyOtp()` (`src/features/otp/`) — 4b-3'te şifre sıfırlama
  bunu kullanacak, `OtpPurpose.password_reset` enum'da hazır
- `Session` tablosu şemada **mevcut** (`session_token` benzersiz, `expires_at`,
  `user_id` index'li, kullanıcı silinince cascade)
- Kayıt akışı bileşenleri (`TextField`, `FormAlert`, `TurnstileWidget`,
  `StepHeader`) — giriş ekranı bunları kullanır, yenisini yazma
- Demo hesapların şifresi **var**: `Test1234!` (10 hesap, `docs/project/test-hesaplari.md`)

## YAPILACAK — roadmap adım 4b-2

"Giriş, çıkış, veritabanı oturumu (ADR-005), rol, korumalı route"

Dal: `feature/giris-oturum`

### Kapsam — onaylanmış sıra

1. **Oturum çekirdeği:** oturum aç / oku / kapat servisi. Kriptografik rastgele
   oturum jetonu, **7 gün ömür, kayan yenileme** (`05-auth-security.md`).
   Çerez yalnızca oturum kimliğini taşır, içinde kullanıcı bilgisi olmaz
2. **Giriş ucu ve ekranı:** TCKN + şifre. **Giriş anında KPS sorgulanmaz**
   (PRD §5.0 — hız ve dayanıklılık). Hız sınırı + **2 başarısız denemeden sonra
   bot doğrulaması**
3. **Çıkış:** oturum satırı silinir, çerez düşer. **Şifre değişimi kullanıcının
   TÜM oturumlarını düşürür** — mekanizma bu adımda kurulur, ekranı 4b-3'te gelir
4. **Yetki:** `role` / `isStaff` / `identityStatus` **her istekte sunucuda
   veritabanından** okunur. İstemciden asla gelmez. UI'da buton gizlemek yetki
   değildir
5. **Korumalı route + erişim kademeleri** (PRD §5.0 tablosu): ziyaretçi okur,
   üye kendi kaydını yönetir, **hastane ve spor salonu yalnızca personele**.
   Erişemeyen kullanıcıya eksiğine göre **farklı mesaj** (kimlik doğrulanmamış →
   yönlendirme · personel değil → yönlendirme YOK)
6. **`00-stack.md` güncellemesi** — yukarıdaki "yan iş"
7. **Testler:** unit (jeton üretimi, **süre dolumu**, kayan yenileme, hesap
   sayımı koruması) · entegrasyon (giriş/çıkış uçları, IDOR, yetki reddi) ·
   E2E (giriş → korumalı sayfa → çıkış, ve giriş yapmadan korumalı sayfa)
8. **Kapılar:** CLAUDE.md §6.3 — lint/typecheck/test/build → güvenlik denetimi →
   **tarayıcıda fiilen tıklayarak** doğrulama (dark mode + 375px dahil) →
   commit önerisi raporu → onay → PR
9. **Oturum devri:** `roadmap.md`, `CHANGELOG.md`, `altyapi-durumu.md` güncellenir,
   bu dosya 4b-3 için **yeniden yazılır**

### Bu adımda özellikle dikkat

- **Hesap sayımı koruması:** "böyle bir kullanıcı yok" ile "şifre yanlış"
  AYNI mesajı ve mümkünse **aynı süreyi** vermeli (kullanıcı yoksa da sahte bir
  argon2 doğrulaması çalıştırılır, yoksa yanıt süresi hesabın varlığını ele verir).
  Kayıt akışındaki 409 bilinçli bir istisnaydı, **buraya kopyalanmaz**
- Giriş denemesi hız sınırına tabidir (`05-auth-security.md`: 5 deneme / 15 dk)
- **Süreye bağlı her kural için süre dolumu testi zorunlu**
- Her giriş ve çıkış **denetim kaydına** yazılır — **kimlik numarası YAZILMADAN**
- Yeni bağımlılık **kurulmuyor**, yeni ortam değişkeni **gerekmiyor**.
  `AUTH_SECRET` / `GOOGLE_*` hâlâ 4c'nin işi
- Şema muhtemelen değişmiyor (`Session` hazır). Migration gerekirse **önce
  kullanıcıya söyle**
- Bu adımda EKRAN VAR: CLAUDE.md §6.3 1c tarayıcı kapısı geçerli

## TUZAKLAR — daha önce vakit kaybettirenler

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok**; bağlantı driver adapter'dan
  (`@prisma/adapter-pg`, ADR-008)
- Migration adresi `prisma.config.ts` içinde; `env()` yardımcısı **kullanılmaz**
- `migrate dev` üretilen istemciyi her zaman tazelemiyor → `npx prisma generate`
- `migrate dev` `migration_lock.toml`'daki Türkçe yorumu eziyor → commit öncesi
  `git checkout` ile geri al

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u
  ŞART; yoksa `serverEnv` hata veriyor
- **E2E kendi korumalarımıza takılır ve bu doğrudur.** Sınırı kapatma, testi
  kurala uydur: her teste ayrı kimlik numarası (paylaşılırsa taslaklar
  birbirini siler), ayrı `x-forwarded-for` IP (5 deneme/15 dk), ayrı
  e-posta/telefon (3 kod/15 dk). IP bloğu **her koşuda rastgele** olmalı, yoksa
  ikinci koşu birincinin sayacını devralır
- `AbortSignal.timeout` sahte zamanlayıcıyla ele geçirilemiyor
- Playwright `webServer.env` Next'in `.env` değerlerini **ezer**

**Arayüz**
- shadcn `Alert` varsayılan `role="alert"` (assertive) veriyor; sayfada duran
  bilgi kutuları `role="status"` olmalı
- **Metin ortama göre değişmeli.** "Kod gönderdik" demek local/preview'da
  yalandır — hiçbir e-posta gönderilmiyor. Kullanıcı bu yüzden bir kez
  gelmeyecek postayı bekledi. Gönderim ima eden her metnin test ortamı
  karşılığı var (`messages.ts` → `*Simulated`)

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği
- Vercel ortam değişkeni değişikliği kendiliğinden yayına girmez →
  `npx vercel redeploy <url>`
- `fish` kabuğu `VAR=deger komut` sözdizimini desteklemiyor → scratchpad'e
  `.sh` yazıp `bash dosya.sh`
- ESLint `console.log`'u yasaklıyor; `console.error` / `console.warn` serbest
- Prettier `.md` dosyalarını biçimlendirmiyor

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · lint · typecheck · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
