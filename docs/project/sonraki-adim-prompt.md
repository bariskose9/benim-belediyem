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

Roadmap adım **0 → 4b-1 bitti ve `main`'de canlıda** (PR #1-#9).
4b-1 merge commit'i `4f698ea`.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt akışı canlıda ÇALIŞIYOR**: TCKN → KPS → 18 yaş → iki bağımsız OTP
- Preview ve production veritabanları **dolu**: 200 KPS vatandaşı, 100 personel,
  90 üye. Gerçek kullanıcı 0
- Testler: **263** unit/entegrasyon · **36** veritabanı · **50** E2E
- Cloudflare Turnstile ve Resend **kurulu ve çalışıyor** (altyapi-durumu.md)

## ⚠️ 4b-1'DE DOĞRULANAN KRİTİK BULGU — 4b-2'NİN ANA MESELESİ

**Auth.js v5'in Credentials sağlayıcısı veritabanı oturumunu DESTEKLEMİYOR.**
Şifreyle girişte `strategy: "jwt"` zorunlu kılınıyor; `database` stratejisi
`UnsupportedStrategy` fırlatıyor. Bu doğrudan **ADR-005** (oturum veritabanında)
ile çakışıyor.

Bu yüzden 4b-1 bilerek **`next-auth` KURMADI** ve `User` kaydını Auth.js
adaptörüne göre şekillendirmedi. İki kapı da açık:

- **(a)** Elle yazılmış veritabanı oturumu — mevcut `Session` tablosu, ADR-005'e
  sadık. Çıkış ve şifre değişimi gerçekten tüm oturumları düşürür
- **(b)** Auth.js + JWT — **ADR-005'i değiştiren yeni bir ADR gerektirir** ve
  "çıkışta oturum sunucuda geçersizleşir" kuralı kırılır

**Kararı dokümantasyona bakarak ver, tahminle değil** (`source-driven-development`).
Emin değilsen "emin değilim" de.

## 4b-1'DE KURULAN ve HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- `hashPassword()` / `verifyPassword()` (`src/features/auth/services/password.service.ts`)
  — argon2id, ADR-011. **Hiçbir kimlik doğrulama kütüphanesine bağlı değil**,
  bilerek böyle bırakıldı
- `checkPasswordPolicy()` — uzunluk + yaygın şifre listesi + kişisel veri kontrolü
- `consumeRateLimit()` + `rateLimitKey(purpose, kind, value)` (`src/lib/rate-limit.ts`)
  — `kind` artık `"ip" | "session" | "destination"`. **Yeni hız sınırı mekanizması KURMA**
- `verifyTurnstileToken()` (`src/lib/turnstile.ts`) — bot kapısı.
  PRD giriş formunda **2 başarısız denemeden sonra** istiyor
- `recordAuditLog()` (`src/lib/audit.ts`) — `AuditAction.login` / `logout` hazır
- `secureCookieDefaults` (`src/lib/cookies.ts`) — httpOnly + sameSite + secure
- `ensureAnonymousId()` (`src/lib/anonymous-id.ts`) — hız sınırının oturum bacağı
- `issueOtp()` / `verifyOtp()` (`src/features/otp/`) — 4b-3'te şifre sıfırlama
  bunu kullanacak, `OtpPurpose.password_reset` enum'da hazır
- `Session` ve `Account` tabloları şemada **mevcut**, Auth.js şekliyle uyumlu
- Demo hesapların şifresi **var**: `Test1234!` (10 hesap, `docs/project/test-hesaplari.md`)

## YAPILACAK — roadmap adım 4b-2

"Giriş, çıkış, veritabanı oturumu (ADR-005), rol, korumalı route"

### Kapsam

1. **Giriş:** TCKN + şifre. **Giriş anında KPS sorgulanmaz** (PRD §5.0 — hız ve
   dayanıklılık için). **2 başarısız denemeden sonra bot doğrulaması**
2. **Oturum:** ADR-005 — çerez yalnızca oturum kimliği taşır, oturum
   veritabanında. Yukarıdaki (a)/(b) kararına bağlı
3. **Çıkış:** oturum sunucu tarafında geçersizleşir. Şifre değişimi **tüm**
   oturumları anında düşürür
4. **Rol ve korumalı route:** yetki **sunucuda** hesaplanır. UI'da buton gizlemek
   yetki değildir. `isStaff` / `role` / `identityStatus` istemciden gelemez
5. **Erişim kademeleri** (PRD §5.0 tablosu): ziyaretçi okur, üye kendi kaydını
   yönetir, hastane ve spor salonu **yalnızca personele** açık

### Bu adımda özellikle dikkat

- **Hesap sayımı koruması:** "böyle bir kullanıcı yok" ile "şifre yanlış"
  AYNI mesajı ve mümkünse aynı süreyi vermeli. Kayıt akışındaki 409 bilinçli bir
  istisnaydı, **buraya kopyalanmaz**
- Giriş denemesi hız sınırına tabidir (`05-auth-security.md`)
- Süreye bağlı her kural için **süre dolumu testi zorunlu**: oturum ömrü 7 gün,
  kayan yenileme
- Her giriş ve çıkış **denetim kaydına** yazılır (kimlik numarası YAZILMADAN)
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
