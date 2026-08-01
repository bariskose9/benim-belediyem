# Sonraki oturum için hazır prompt — adım 4c

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 4c bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **4c**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu üçü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — teknik borç listesi
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 4b-3 bitti** (PR #1-#16).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt canlıda çalışıyor**: TCKN → KPS → 18 yaş → iki bağımsız OTP
- **Giriş, çıkış, oturum ve erişim kademeleri çalışıyor** (4b-2)
- **Şifre sıfırlama çalışıyor** (4b-3): `/sifremi-unuttum` → kod → yeni şifre →
  **tüm oturumlar düşer**
- Preview ve production veritabanları **dolu**: 200 KPS vatandaşı, 100 personel,
  90 üye (10'unun şifresi `Test1234!`). Gerçek kullanıcı 0
- Testler: **363** unit/entegrasyon · **36** veritabanı · **74** E2E
- Cloudflare Turnstile ve Resend **kurulu ve çalışıyor** (altyapi-durumu.md)
- **Google ile giriş HENÜZ YOK.** 4c'nin tamamı bu

## ÖNCEKİ ADIMLARDAN DEVRALINAN KARARLAR — yeniden tartışma

**Oturum Auth.js ile DEĞİL, elle yazıldı.** Gerekçe ADR-005'in 2026-08-01 tarihli
güncelleme notunda: `@auth/core` kaynağında `Credentials` sağlayıcısı JWT'yi
zorunlu kılıyor, JWT ise "çıkışta ve şifre değişiminde oturum ANINDA düşer"
sözünü tutamıyor. `next-auth` **kurulu değil**.

**4c'DE İLK KARAR VERİLECEK ŞEY BU:** Google ile giriş için Auth.js kurulacak
mı, yoksa OAuth akışı da elle mi yazılacak? İkisinin de bedeli var:
- Auth.js kurulursa iki ayrı oturum mekanizması olur (JWT + veritabanı) ya da
  yalnızca OAuth adımı için kullanılıp oturum yine elle açılır
- Elle yazılırsa PKCE, `state`, jeton değişimi ve `id_token` doğrulaması
  bizim sorumluluğumuz olur

**Kod yazmadan önce kullanıcıya sun ve onayını al** (CLAUDE.md §3 kapı 2).
`AUTH_SECRET` ve `GOOGLE_*` ortam değişkenleri **hiçbir ortamda tanımlı değil**;
gerekiyorsa kullanıcıdan istenecek.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- `issueSession()` / `readSession()` / `revokeSession()` /
  `revokeAllSessionsForUser()` (`session.service.ts`) — oturum çekirdeği
- `getCurrentSession()` / `writeSessionCookie()` / `clearSessionCookie()`
  (`session-context.ts`) — çerez tarafı
- `evaluateAccess()` (`access-control.ts`) ve `guardPage()` (`page-guard.ts`)
  — korumalı sayfa kapısı
- `matchStaffMember()` (`staff-matching.service.ts`) — personel eşleştirmesi;
  **4c'de Google ile açılan hesap KPS doğrulamasından geçince yine çağrılmalı**
- `sanitizeRedirectPath()` (`src/lib/redirect.ts`) — açık yönlendirme koruması.
  OAuth'ta yönlendirme adresleri beyaz listede olmalı (PRD §5.0)
- `issueOtp()` / `verifyOtp()` / `issueDecoyChallenge()` / `findChallengeOwner()`
  (`src/features/otp/`) — kod mekanizması. `verifyOtp` artık `consumeOnSuccess`
  seçeneği alıyor: kodu doğrulayıp başka bir kuralda takılabileceğin yerlerde
  kodu tüketmeden doğrulayabilirsin
- `checkPasswordPolicy()` · `hashPassword()` · `verifyPassword()`
- `isRegistrationOpen()` / `isPasswordResetOpen()` (`auth-availability.ts`)
- `TextField` / `FormAlert` / `TurnstileWidget` / `LoginForm` /
  `PasswordResetRequestForm` / `PasswordResetCompleteForm` — ekran bileşenleri
- `accounts` tablosu şemada **hazır** (OAuth sağlayıcı bağlantıları için)

## YAPILACAK — roadmap adım 4c

"Google ile giriş (OAuth) + hesap birleştirme + personel eşleştirmesi +
erişim kademeleri"

Dal: `feature/google-ile-giris`

### Kapsam (PRD §5.0 "Google ile giriş" ve "Hesap birleştirme kuralı")

1. **Google ile giriş**: PKCE + `state` zorunlu, yönlendirme adresleri beyaz
   listede
2. **Google KİMLİK DOĞRULAMAZ** — yalnızca e-posta sahipliğini kanıtlar. Hesap
   `identityStatus = dogrulanmamis` olarak açılır; KPS doğrulaması ayrı adım
3. **Hesap birleştirme (güvenlik açısından kritik)**: aynı e-postalı hesap varsa
   **otomatik birleştirilmez**. Yalnızca Google e-postayı doğrulanmış bildiriyorsa
   **ve** mevcut hesabın e-postası da doğrulanmışsa birleşir; aksi hâlde şifre
   veya OTP istenir
4. **Erişim kademeleri**: doğrulanmamış kullanıcı hastane ve spor salonuna
   erişemez (403, KPS adımına yönlendirme). Kademe tablosu PRD §5.0'da
5. **Bir kimlik numarası yalnızca bir hesaba bağlanabilir**
6. **Testler**: unit + entegrasyon (birleştirme kuralı, `state`/PKCE eksikse
   red) + E2E
7. **Kapılar**: CLAUDE.md §6.3 — lint/typecheck/test/build → güvenlik denetimi →
   **tarayıcıda fiilen tıklayarak** doğrulama (dark mode + 375px dahil) →
   commit önerisi raporu → onay → PR
8. **Oturum devri**: `roadmap.md`, `CHANGELOG.md`, `altyapi-durumu.md`
   güncellenir, bu dosya adım 5 için **yeniden yazılır**

### Bu adımda özellikle dikkat

- Google OAuth istemcisi **açılmamış**; kullanıcıdan istenmesi gerekecek
  (Google Cloud Console → OAuth consent screen + istemci kimliği)
- Yönlendirme adresi her ortam için ayrı tanımlanmalı (local, preview, production).
  Preview adresleri dal başına değişiyor — bu bir sorun, çözümü kararlaştırılmalı
- Şema muhtemelen değişmiyor (`accounts` tablosu hazır). Migration gerekirse
  **önce kullanıcıya söyle**

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
- **E2E'yi 15 dakika içinde üst üste koşturma.** "Aynı hedefe 3 kod / 15 dakika"
  sınırı sayaçları veritabanında tutuyor; üçüncü koşuda `register.spec.ts`
  kırmızıya döner ve bu bir regresyon DEĞİLDİR. Sayaçları görmek için
  `rate_limit_counters` tablosuna `key LIKE 'otp_send%'` ile bak.
  4b-3'ün E2E'si bu yüzden hesabını **kendisi oluşturup siliyor** ve her koşuda
  yeni bir kimlik numarası üretiyor — yeni E2E yazarken aynı deseni kullan
- **Prisma taklidi GERÇEK davranışı taşımalı.** `password-resets-route.test.ts`
  içindeki taklit, tanımadığı bir Prisma operatörüyle karşılaşınca **hata
  fırlatıyor**; sessizce yok saymak testi yanlış yeşil gösterir (yaşandı).
  Taklitteki `createdAt` de **şu ana yakın** olmalı: sabit bir tarih yazınca
  `createdAt >= X` filtreleri sessizce hiçbir şey döndürmedi
- **Playwright `getByRole("alert")` KULLANMA.** Next.js her sayfaya ekran
  okuyucular için boş bir `role="alert"` duyurucusu koyuyor; rol bazlı arama
  önce onu buluyor ve hata hiç görünmese bile test geçiyor. Mesajı METİNLE ara
- **Uzun E2E testlerine `test.slow()` koy.** Şifre sıfırlama akışı istek başına
  2 saniye sabit süre harcıyor; varsayılan 30 saniyelik test bütçesi paket
  yüklüyken yetmiyor
- **E2E `afterAll` temizliği eş zamanlı projeyi vurabilir.** Bir saatlik pay
  filtresi (`createdAt < now - 1h`) bunun için var
- **Playwright'ın `webServer.env`'i derlemeye gömülüyor.** E2E, Turnstile
  anahtarlarını boş bırakıyor; o koşudan sonra `.next` klasöründe anahtarsız bir
  derleme kalıyor ve elle tarayıcı testinde bot kutusu HİÇ görünmüyor. Elle test
  öncesi `rm -rf .next && npm run build`
- **Playwright açık kalan sunucuyu yeniden kullanıyor** (`reuseExistingServer`).
  Eski bir sunucu 3000'de duruyorsa testler ESKİ kodu test eder ve "sayfa yok"
  diye patlar. Şüphelenince: `lsof -ti:3000` ve süreci kapat
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
  anahtar): tarayıcı aracıyla tıklanamıyor. Canlıdaki tam akışı kullanıcının
  elle doğrulaması gerekiyor. Preview ve local'de aynı kod, orada otomatik
  doğrulanabiliyor

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
