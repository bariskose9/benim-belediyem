# Sonraki oturum için hazır prompt — adım 6

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 6 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **6**'ya geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.1 — bu adımın iş kuralları
- `docs/project/data-model.md` — randevu tabloları **zaten var ve tohumlu**
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 5 bitti**. Google ile giriş ve görsel iskelet canlıda.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt** çalışıyor: TCKN → KPS → 18 yaş → iki bağımsız OTP
- **Giriş, çıkış, oturum, erişim kademeleri, şifre sıfırlama** çalışıyor
- **Google ile giriş** çalışıyor (PKCE + `state` + `nonce`, hesap birleştirme kuralı)
- **Görsel iskelet** çalışıyor: marka paleti (lacivert + turkuaz), kendi
  kelime-logomuz, açık/koyu tema düğmesi, mobil açılır menü, alt bilgi,
  ana sayfa hizmet ızgarası
- Preview ve production veritabanları dolu: 200 KPS vatandaşı, 100 personel,
  90 üye (10'unun şifresi `Test1234!`). Gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** o dalın **dal adresini**
  (`benim-belediyem-git-<dal>-barisss.vercel.app`, dağıtım adresini değil)
  **iki panele** ekle: Cloudflare Turnstile → Hostname Management **ve**
  Google Cloud → Auth Platform → Clients → Authorized redirect URIs
  (sonuna `/api/auth/google/callback` ekleyerek). Eksikse sırasıyla
  `Error: 110200` ve `redirect_uri_mismatch` alırsın ve kodda hata ararsın.
  Kalıcı çözüm kendi alan adı → teknik borç #31

## YAPILACAK — roadmap adım 6

"Hastane randevu modülü (personele özel)" → PRD §5.1

Dal: `feature/hastane-randevu` (öneri)

### Kapsam (PRD §5.1'den birebir)

1. Branş listesi → o branştaki doktorlar → doktorun uygun gün ve saatleri
2. Üye randevu **oluşturur, görüntüler, iptal eder**
3. **Kurallar — hepsi SUNUCUDA doğrulanır:**
   - dolu saat seçilemez
   - geçmiş tarihe randevu alınamaz
   - aynı branşta aynı gün ikinci randevu alınamaz
   - iptal en geç randevudan **2 saat** önce
4. **Kabul kriteri:** iki kullanıcı aynı saati aynı anda seçemez → **409**.
   Bu bir yarış durumu testi demek; tek başına uygulama mantığı yetmez,
   veritabanı seviyesinde benzersizlik kısıtı gerekir
5. **Erişim:** yalnızca personel (`guardPage("staff")` zaten hazır ve çalışıyor)
6. **IDOR:** her randevu okuma/iptalinde "bu kayıt bu kullanıcıya mı ait"

### Bu adımda özellikle dikkat

- **Şema muhtemelen DEĞİŞMİYOR** — randevu tabloları adım 3'te kuruldu ve
  tohumlandı. Önce `data-model.md`'yi oku; migration yazmadan önce var olanı gör
- **Dolu slotların çoğunda randevu kaydı YOK** (teknik borç #17, bilinçli).
  "Boş görünen slot" ile "gerçekten boş slot" aynı şey olmayabilir
- Mevcut ekranları bozma; `/hastane` bugün erişim kapısını gösteren bir iskelet
- Yeni bağımlılık eklemeden önce sor (CLAUDE.md §7)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **Tasarım token'ları** (`globals.css`): renk, boşluk, yuvarlaklık, tipografi.
  Sayısal renk/ölçü değeri bileşene yazma. Marka vurgusu için `bg-brand-surface`
  / `text-brand-surface-foreground`, ana renk için `primary`
- **`page-shell`** yardımcı sınıfı — üst menü, içerik ve alt bilgi aynı hizada
- `Logo` · `ThemeToggle` · `HeaderShell` · `SiteFooter` — çerçeve hazır
- `src/config/navigation.ts` — hizmet kartları ve menü **tek listeden** geliyor.
  Hastane sayfası artık hazırsa kartın rozetini "Yakında"dan çıkarmak için
  buraya bakılır
- `TextField` / `FormAlert` / `TurnstileWidget` / `Button` / `Card`
- `getCurrentSession()` — **istek başına tek okuma** (React `cache`), istediğin
  yerden çağır, ikinci sorgu açmaz
- `evaluateAccess()` · `guardPage()` — erişim kapıları
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma

## TUZAKLAR — daha önce vakit kaybettirenler

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`). Tema tercihi `localStorage`'da
  (`benim-belediyem:tema`) ve sayfa boyanmadan önce `<head>`'deki satır içi
  betikle uygulanıyor. DevTools'un renk şeması taklidi bu projede hiçbir şey
  değiştirmez — düğmeyi kullan veya `document.documentElement.classList.add("dark")`
- shadcn `Alert` varsayılan `role="alert"` (assertive); sayfada duran bilgi
  kutuları `role="status"` olmalı
- **Menü bağlantısı ile kart bağlantısı aynı sayfaya gidiyor.** Testte
  "Hastane" diye aradığında ikisini birden bulur. Menü içinde ara:
  `page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", ...)`
- **Aynı bağlantıyı masaüstü ve mobil için iki kez render etme.** Tek liste var,
  CSS ile açılıp kapanıyor; ikinci kopya hem ekran okuyucuyu hem testi bozar

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **jsdom bu projede `localStorage` SAĞLAMIYOR** — global boş bir nesne geliyor,
  `getItem` bile yok. Tarayıcı depolamasına dokunan testler
  `tests/helpers/local-storage.ts` içindeki taklidi kullanır
- **Playwright `getByRole("alert")` KULLANMA.** Next.js her sayfaya boş bir
  `role="alert"` duyurucusu koyuyor; mesajı METİNLE ara
- **E2E kendi korumalarımıza takılır ve bu doğrudur.** Her teste ayrı kimlik
  numarası, ayrı `x-forwarded-for` IP, ayrı e-posta/telefon
- **E2E'yi 15 dakika içinde üst üste koşturma** — OTP sayaçları veritabanında
- **Playwright'ın `webServer`'ı 180 saniyede build + start yetiştiremeyebilir.**
  Ortam değişkeni değişikliği (`webServer.env`) derleme önbelleğini geçersiz
  kılıyor ve tam derleme gerekiyor. Çözüm: aynı ortam değişkenleriyle elle
  `npm run build` + `npm run start`, sonra `npx playwright test`
  (`reuseExistingServer` çalışan sunucuyu kullanır)
- **Elle tarayıcı testinden önce `rm -rf .next && npm run build`** — E2E koşusu
  `.next` içinde Turnstile'ı boş bırakan bir derleme bırakıyor
- **Testler zaman aşımına düşüyorsa önce `uptime` çalıştır.** 2026-08-02'de
  makine yükü 130'a çıkmıştı (arka planda %420 CPU yiyen bir masaüstü
  uygulaması) ve argon2 pahalı olduğu için testler kırmızıya döndü; tek tek
  koşturulduklarında hepsi geçiyordu. Yükü kontrol etmeden testi suçlama
- **Prisma taklidi GERÇEK davranışı taşımalı** — tanımadığı operatörde hata fırlatmalı

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- Migration adresi `prisma.config.ts` içinde; `env()` yardımcısı kullanılmaz
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- `migrate dev` `migration_lock.toml`'daki Türkçe yorumu eziyor → `git checkout`

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** (`P1001`). Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**;
  değişmediyse veritabanını uyandırıp `npx vercel redeploy <url>`
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** — canlıdaki tam akışı
  kullanıcının elle doğrulaması gerekiyor
- **Google uygulaması "Testing" modunda** — yalnızca test kullanıcıları girebilir
  (teknik borç #34)

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği,
  betik proje kökünde olmalı
- ESLint `console.log`'u yasaklıyor; `console.error` / `console.warn` serbest
- **ESLint efekt içinde `setState` çağırmayı yasaklıyor.** Adres değişince durum
  sıfırlanacaksa React'in "render sırasında ayarla" desenini kullan
  (`HeaderShell.tsx` içinde örneği var)
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
