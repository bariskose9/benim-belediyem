# Sonraki oturum için hazır prompt — adım 4b-3

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 4b-3 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **4b-3**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu üçü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — teknik borç listesi
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 4b-2 bitti** (PR #1-#15).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt canlıda çalışıyor**: TCKN → KPS → 18 yaş → iki bağımsız OTP
- **Giriş, çıkış, oturum ve erişim kademeleri çalışıyor** (4b-2)
- Preview ve production veritabanları **dolu**: 200 KPS vatandaşı, 100 personel,
  90 üye (10'unun şifresi `Test1234!`). Gerçek kullanıcı 0
- Testler: **317** unit/entegrasyon · **36** veritabanı · **62** E2E
- Cloudflare Turnstile ve Resend **kurulu ve çalışıyor** (altyapi-durumu.md)
- **Şifre sıfırlama HENÜZ YOK.** 4b-3'ün tamamı bu

## 4b-2'DEN DEVRALINAN KARARLAR — yeniden tartışma

**Oturum Auth.js ile DEĞİL, elle yazıldı.** Gerekçe ADR-005'in 2026-08-01 tarihli
güncelleme notunda: `@auth/core` kaynağında `Credentials` sağlayıcısı JWT'yi
zorunlu kılıyor, JWT ise "çıkışta ve şifre değişiminde oturum ANINDA düşer"
sözünü tutamıyor. `next-auth` **kurulu değil** ve 4b-3'te de kurulmayacak.
Google ile giriş (4c) ayrı bir karar.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

4b-1'den gelenler hâlâ geçerli, üstüne 4b-2'nin bıraktıkları:

- `issueSession()` / `readSession()` / `revokeSession()` /
  **`revokeAllSessionsForUser()`** (`src/features/auth/services/session.service.ts`)
  — sonuncusu **şifre değişiminde çağrılacak olan fonksiyon**, hazır ve test edilmiş
- `getCurrentSession()` / `writeSessionCookie()` / `clearSessionCookie()`
  (`session-context.ts`) — çerez tarafı
- `evaluateAccess()` (`access-control.ts`) ve `guardPage()` (`page-guard.ts`)
  — korumalı sayfa kapısı
- `DUMMY_PASSWORD_HASH` + `login.service.ts` içindeki hesap sayımı koruması deseni
  — **4b-3'ün şifre sıfırlama ucu AYNI deseni kullanmalı**: kimlik numarası
  kayıtlı olsun olmasın aynı mesaj ve aynı süre (PRD §5.0)
- `peekRateLimit()` (`src/lib/rate-limit.ts`) — sayacı artırmadan okur;
  "N başarısız denemeden sonra bot doğrulaması" kuralı bunu kullanıyor
- `issueOtp()` / `verifyOtp()` (`src/features/otp/`) — `OtpPurpose.password_reset`
  enum'da **hazır**, yeni OTP mekanizması kurma
- `checkPasswordPolicy()` · `hashPassword()` · `verifyPassword()` — şifre kuralları
- `sanitizeRedirectPath()` (`src/lib/redirect.ts`) — açık yönlendirme koruması
- `TextField` / `FormAlert` / `TurnstileWidget` / `LoginForm` — ekran bileşenleri
- `AuditAction.password_reset` enum'da hazır

## YAPILACAK — roadmap adım 4b-3

"Şifre sıfırlama + hesap sayımı koruması"

Dal: `feature/sifre-sifirlama`

### Kapsam (PRD §5.0 "Şifre sıfırlama")

1. **Kod isteme ucu ve ekranı:** kullanıcı kimlik numarasını girer → kayıtlı
   e-posta adresine 6 haneli kod gider. **Bot doğrulaması ZORUNLU** (kayıttaki
   gibi, ilk denemeden itibaren — giriş ekranındaki "2 denemeden sonra" kuralı
   BURAYA GEÇMEZ, PRD burada baştan istiyor)
2. **Hesap sayımı koruması:** numara kayıtlı olsun olmasın **aynı mesaj, aynı
   yanıt süresi**. Kayıtlı değilse hiçbir kod üretilmez ama yanıt ayırt edilemez
3. **Kod doğrulama + yeni şifre:** OTP kuralları kayıttakiyle aynı (5 dk,
   3 deneme, tek kullanımlık). Yeni şifre `checkPasswordPolicy()`'den geçer
4. **Şifre değişince `revokeAllSessionsForUser()` çağrılır** — kullanıcının TÜM
   oturumları düşer (ADR-005'in varlık sebebi). Mekanizma hazır, çağrılması yeter
5. **Denetim kaydı:** `AuditAction.password_reset`, kimlik numarası YAZILMADAN
6. **Testler:** unit (süre dolumu, deneme hakkı) · entegrasyon (kayıtlı ve
   kayıtsız numara AYNI yanıt, hız sınırı, oturumların düşmesi) · E2E
   (sıfırla → yeni şifreyle giriş → eski oturumun düştüğü)
7. **Kapılar:** CLAUDE.md §6.3 — lint/typecheck/test/build → güvenlik denetimi →
   **tarayıcıda fiilen tıklayarak** doğrulama (dark mode + 375px dahil) →
   commit önerisi raporu → onay → PR
8. **Oturum devri:** `roadmap.md`, `CHANGELOG.md`, `altyapi-durumu.md` güncellenir,
   bu dosya 4c için **yeniden yazılır**

### Bu adımda özellikle dikkat

- Local ve preview'da e-posta GÖNDERİLMİYOR, kod ekranda gösteriliyor. Metin
  ortama göre değişmeli (`messages.ts` → `*Simulated`) — "kod gönderdik" demek
  o ortamlarda yalan olur
- Production'da e-posta Resend ile gerçekten gidiyor ama **doğrulanmış alan adı
  yok**: yalnızca hesabın kayıtlı adresine ulaşıyor (teknik borç #25)
- Şema muhtemelen değişmiyor. Migration gerekirse **önce kullanıcıya söyle**
- Yeni bağımlılık ve yeni ortam değişkeni **gerekmiyor**

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
  kurala uydur: her teste ayrı kimlik numarası, ayrı `x-forwarded-for` IP,
  ayrı e-posta/telefon. IP bloğu **her koşuda rastgele** olmalı
- **Prisma taklidi GERÇEK davranışı taşımalı.** 4b-2'de bir taklit yalnızca
  `where.id` ve `where.userId`'yi biliyordu; yeni bir silme yolu eklenince
  sessizce "hiçbir şey silinmedi" dedi ve testi yanlış yeşil gösterdi
- **Playwright `getByRole("alert")` KULLANMA.** Next.js her sayfaya ekran
  okuyucular için boş bir `role="alert"` duyurucusu koyuyor; rol bazlı arama
  önce onu buluyor ve hata hiç görünmese bile test geçiyor. Mesajı METİNLE ara
- **E2E `afterAll` temizliği eş zamanlı projeyi vurabilir.** "Bu hesabın tüm
  oturumlarını sil" denince masaüstü projesi bitince mobil projedeki açık
  oturumlar da silindi. Bir saatlik pay filtresi (`createdAt < now - 1h`) kondu
- **Playwright'ın `webServer.env`'i derlemeye gömülüyor.** E2E, Turnstile
  anahtarlarını boş bırakıyor; o koşudan sonra `.next` klasöründe anahtarsız bir
  derleme kalıyor ve elle tarayıcı testinde bot kutusu HİÇ görünmüyor. Elle test
  öncesi `rm -rf .next && npm run build`
- **Cold start:** `npm run build && npm run start` biter bitmez 5 işçi aynı anda
  giriş yapınca ilk isteklerin route modülü yüklemesi 10 sn'yi bulabiliyor.
  Giriş sonrası yönlendirme beklerken 15 sn pay verildi
- `AbortSignal.timeout` sahte zamanlayıcıyla ele geçirilemiyor

**Arayüz**
- shadcn `Alert` varsayılan `role="alert"` (assertive) veriyor; sayfada duran
  bilgi kutuları `role="status"` olmalı
- **Dark mode SINIF tabanlı** (`.dark`), `prefers-color-scheme` DEĞİL. Tarayıcıda
  denerken `document.documentElement.classList.add("dark")` çalıştır; DevTools'un
  renk şeması taklidi bu projede hiçbir şey değiştirmez

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** — `prisma migrate deploy`
  `P1001` verip ~5 saniyede vazgeçiyor. Canlı site eski sürümle ayakta kalır
  (kesinti yok), ama yeni sürüm çıkmaz. Merge sonrası `/api/health` içindeki
  `commit` alanının değiştiğini **mutlaka doğrula**; değişmediyse veritabanını
  uyandırıp (`curl .../api/health` → `db: ok`) `npx vercel redeploy <url>`
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** (Managed mod, gerçek
  anahtar): tarayıcı aracıyla tıklanamıyor. Canlıdaki tam giriş akışını
  kullanıcının elle doğrulaması gerekiyor. Preview ve local'de aynı kod,
  orada otomatik doğrulanabiliyor

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği.
  Betik proje kökünde olmalı; `/tmp` altından çalıştırılırsa `dotenv` bulunamıyor
- Vercel ortam değişkeni değişikliği kendiliğinden yayına girmez →
  `npx vercel redeploy <url>`
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
