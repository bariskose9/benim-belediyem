# Sonraki oturum için hazır prompt — adım 5

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 5 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **5**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/standards/07-ui-design-system.md` — bu adımın ana kural kaynağı
- `docs/project/roadmap.md` — teknik borç listesi (34 madde)
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 4c bitti** (PR #1-#20). PR #20 **2026-08-02'de merge edildi**;
Google ile giriş canlıda.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt** çalışıyor: TCKN → KPS → 18 yaş → iki bağımsız OTP
- **Giriş, çıkış, oturum, erişim kademeleri** çalışıyor
- **Şifre sıfırlama** çalışıyor — şifre değişince tüm oturumlar düşer
- **Google ile giriş** çalışıyor: PKCE + `state` + `nonce`, hesap birleştirme
  kuralı, `dogrulanmamis` kademesinde açılan hesap
- Testler: **401** unit/entegrasyon · **36** veritabanı · **92** E2E
- Preview ve production veritabanları dolu: 200 KPS vatandaşı, 100 personel,
  90 üye (10'unun şifresi `Test1234!`). Gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** o dalın **dal adresini**
  (`benim-belediyem-git-<dal>-barisss.vercel.app`, dağıtım adresini değil)
  **iki panele** ekle: Cloudflare Turnstile → Hostname Management **ve**
  Google Cloud → Auth Platform → Clients → Authorized redirect URIs
  (sonuna `/api/auth/google/callback` ekleyerek). Eksikse sırasıyla
  `Error: 110200` ve `redirect_uri_mismatch` alırsın ve kodda hata ararsın.
  Kalıcı çözüm kendi alan adı → teknik borç #31

## YAPILACAK — roadmap adım 5

"Layout: navbar, logo, dark mode, responsive iskelet, tasarım token'ları"
→ çıktı: **görsel iskelet**

Dal: `feature/layout` (öneri)

### Bu adımın doğası öncekilerden FARKLI

4a-4c güvenlik ve iş mantığıydı; bu adım **görsel**. Bunun iki sonucu var:

1. **"Testler yeşil" yetmez.** Bu adımın kanıtı ekran görüntüsüdür. Tarayıcıda
   fiilen bak: masaüstü + 375px, açık + karanlık tema. Dördünü de göster
2. **Kullanıcı kodu okuyamıyor ama ekranı görebiliyor** — bu adımda ona
   gösterilecek şey var. Erken ve sık göster, sonunda topluca değil

### Kapsam

1. **Tasarım token'ları**: renk, boşluk, tipografi, yuvarlaklık, gölge.
   Sayısal değerler bileşenlere dağıtılmaz (`07-ui-design-system.md`)
2. **Dark mode SINIF tabanlı** (`.dark`) — zaten böyle kurulu, `prefers-color-scheme`
   DEĞİL. Token seviyesinde desteklenmeli, bileşen bileşen `dark:` yamalarıyla değil
3. **Navbar**: giriş yapmış / yapmamış iki durum. Oturum bilgisi zaten var
   (`getCurrentSession()`), yeniden yazma
4. **Logo**: henüz yok. Kullanıcıya sor — hazır bir görsel mi verecek, yoksa
   metin tabanlı geçici bir işaret mi koyalım
5. **Responsive iskelet**: mobile-first, 375px'te düzen bozulmayacak
6. **Erişilebilirlik**: klavye ile gezinilebilirlik, odak halkası, kontrast
   (WCAG 2.1 AA), `role="status"` / `role="alert"` ayrımı
7. **Kapılar**: CLAUDE.md §6.3 — lint/typecheck/test/build → güvenlik denetimi
   → **tarayıcıda fiilen tıklayarak** doğrulama → commit önerisi raporu → onay → PR
8. **Oturum devri**: `roadmap.md`, `CHANGELOG.md`, `altyapi-durumu.md`
   güncellenir, bu dosya adım 6 için **yeniden yazılır**

### Bu adımda özellikle dikkat

- **Mevcut ekranları bozma.** `/giris`, `/kayit`, `/sifremi-unuttum`,
  `/hesabim`, `/hastane`, `/spor-salonu` çalışıyor ve E2E testleri var.
  Layout değişikliği bu testleri kırarsa **testi değil layout'u düzelt**
- Şema değişmiyor, migration yok
- Yeni bağımlılık eklemeden önce sor (CLAUDE.md §7)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- `TextField` / `FormAlert` / `TurnstileWidget` / `Button` — mevcut bileşenler
- `getCurrentSession()` (`session-context.ts`) — sunucu tarafında oturum okuma
- `evaluateAccess()` (`access-control.ts`) · `guardPage()` (`page-guard.ts`)
- `EnvBanner` — preview/local ortam etiketi, layout'a yerleşecek
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma

## TUZAKLAR — daha önce vakit kaybettirenler

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`). Tarayıcıda denerken
  `document.documentElement.classList.add("dark")` çalıştır; DevTools'un renk
  şeması taklidi bu projede hiçbir şey değiştirmez
- shadcn `Alert` varsayılan `role="alert"` (assertive) veriyor; sayfada duran
  bilgi kutuları `role="status"` olmalı
- **Playwright `getByRole("alert")` KULLANMA.** Next.js her sayfaya boş bir
  `role="alert"` duyurucusu koyuyor; rol bazlı arama önce onu buluyor ve hata
  hiç görünmese bile test geçiyor. Mesajı METİNLE ara

**Ortam adresleri (adım 4c'de bir tur kaybettirdi)**
- Vercel iki preview adresi üretir: **dal adresi** (`...-git-<dal>-...`, dal
  boyunca sabit) ve **dağıtım adresi** (`...-<rastgele>-...`, her commit'te
  değişir). Panellere yazılacak olan **dal adresi**. Uygulama `env.ts` →
  `resolveVercelAppUrl` ile artık dal adresini tercih ediyor
- Dal adresini tahmin etme: `npx vercel inspect <dagitim-url> --scope barisss`
  çıktısındaki **Aliases** satırından oku

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u
  ŞART; yoksa `serverEnv` hata veriyor
- **E2E kendi korumalarımıza takılır ve bu doğrudur.** Sınırı kapatma, testi
  kurala uydur: her teste ayrı kimlik numarası, ayrı `x-forwarded-for` IP,
  ayrı e-posta/telefon. IP bloğu **her koşuda rastgele** olmalı
- **E2E'yi 15 dakika içinde üst üste koşturma.** "Aynı hedefe 3 kod / 15 dakika"
  sınırı sayaçları veritabanında; üçüncü koşuda `register.spec.ts` kırmızıya
  döner ve bu bir regresyon DEĞİLDİR. Sayaçlar: `rate_limit_counters` tablosu,
  `key LIKE 'otp_send%'`
- **Playwright'ın `webServer.env`'i derlemeye gömülüyor.** E2E, Turnstile
  anahtarlarını boş bırakıyor ve Google için **sahte** kimlik veriyor; o koşudan
  sonra `.next` klasöründe o yapılandırmayla bir derleme kalıyor. Elle tarayıcı
  testinden önce `rm -rf .next && npm run build`
- **Playwright açık kalan sunucuyu yeniden kullanıyor** (`reuseExistingServer`).
  Şüphelenince `lsof -ti:3000` ve süreci kapat
- **Prisma taklidi GERÇEK davranışı taşımalı** — tanımadığı operatörde hata
  fırlatmalı, sessizce yok saymamalı; taklitteki `createdAt` şu ana yakın olmalı
- `AbortSignal.timeout` sahte zamanlayıcıyla ele geçirilemiyor

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok**; bağlantı driver adapter'dan
  (`@prisma/adapter-pg`, ADR-008)
- Migration adresi `prisma.config.ts` içinde; `env()` yardımcısı **kullanılmaz**
- `migrate dev` üretilen istemciyi her zaman tazelemiyor → `npx prisma generate`
- `migrate dev` `migration_lock.toml`'daki Türkçe yorumu eziyor → commit öncesi
  `git checkout` ile geri al

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** — `prisma migrate deploy`
  `P1001` verip ~5 saniyede vazgeçiyor. Canlı site eski sürümle ayakta kalır
  (kesinti yok), ama yeni sürüm çıkmaz. Merge sonrası `/api/health` içindeki
  `commit` alanının değiştiğini **mutlaka doğrula**; değişmediyse veritabanını
  uyandırıp (`curl .../api/health` → `db: ok`) `npx vercel redeploy <url>`
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** (Managed mod, gerçek
  anahtar): tarayıcı aracıyla tıklanamıyor. Canlıdaki tam akışı kullanıcının
  elle doğrulaması gerekiyor
- **Google uygulaması "Testing" modunda** — yalnızca Google Console → Audience →
  Test users listesindeki e-postalar giriş yapabilir (teknik borç #34)

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
