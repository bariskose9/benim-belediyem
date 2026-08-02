# Sonraki oturum için hazır prompt — adım 7

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 7 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **7**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §6.1 ve §5.3 — bu adımın iş kuralları
- `docs/project/data-model.md` — sepet, sipariş ve ödeme tabloları
  **zaten var ve tohumlu**
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 6 bitti**. Hastane randevu modülü canlıda.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt** çalışıyor: TCKN → KPS → 18 yaş → iki bağımsız OTP
- **Giriş, çıkış, oturum, erişim kademeleri, şifre sıfırlama** çalışıyor
- **Google ile giriş** çalışıyor (PKCE + `state` + `nonce`, hesap birleştirme)
- **Görsel iskelet** çalışıyor: marka paleti, kelime-logo, tema düğmesi,
  mobil menü, alt bilgi, ana sayfa hizmet ızgarası
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, randevu alma,
  görüntüleme, iptal. Dört iş kuralı da sunucuda; çift satış koruması
  `doctor_slots` üzerindeki koşullu UPDATE'te ve gerçek veritabanına karşı
  kanıtlandı
- Preview ve production veritabanları dolu: 200 KPS vatandaşı, 100 personel,
  90 üye (10'unun şifresi `Test1234!`). Gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** o dalın **dal adresini**
  (`benim-belediyem-git-<dal>-barisss.vercel.app`, dağıtım adresini değil)
  **iki panele** ekle: Cloudflare Turnstile → Hostname Management **ve**
  Google Cloud → Auth Platform → Clients → Authorized redirect URIs
  (sonuna `/api/auth/google/callback` ekleyerek). Eksikse sırasıyla
  `Error: 110200` ve `redirect_uri_mismatch` alırsın ve kodda hata ararsın.
  Kalıcı çözüm kendi alan adı → teknik borç #31

## YAPILACAK — roadmap adım 7

"Ortak sepet + sahte kart ödemesi + kayıtlı kart altyapısı" → PRD §6.1

Dal: `feature/sepet-odeme` (öneri)

### Bu adımda özellikle dikkat

- **Şema muhtemelen DEĞİŞMİYOR** — `Cart`, `CartItem`, `Order`, `OrderItem`,
  `Payment`, `SavedCard` adım 3'te kuruldu. Önce `data-model.md`'yi oku
- **Ziyaretçi sepeti** var: `Cart.userId` nullable, `anonymousId` ile taşınıyor
  ve giriş yapılınca birleştiriliyor (PRD §4). `bb_anon` çerezi zaten yazılıyor
- **Bir ödeme BİRDEN FAZLA sipariş üretebilir** (karışık sepet). Çift ödemeyi
  engelleyen yer `Payment.idempotencyKey`, `Order` değil
- **Tam kart numarası ASLA saklanmaz** — yalnızca marka + son 4 hane
- Yeni bağımlılık eklemeden önce sor (CLAUDE.md §7)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/datetime.ts`** (adım 6'da yazıldı) — İstanbul saatiyle tarih/saat
  biçimlendirme ve **gün sınırı hesabı**. Teslimat zaman aralığı bunu
  kullanacak. `Date.toISOString().slice(0,10)` YAZMA, UTC günü verir
- **`requireAccess()`** (`api-guard.ts`) — korumalı API uçlarının kapısı,
  401/403 fırlatır. Sayfalar için `guardPage()`. İkisi de aynı saf
  `evaluateAccess()` kararını kullanıyor
- **`consumeRateLimit` + `rateLimitKey(purpose, "user", userId)`** — yazma
  uçlarında hız sınırı; `user` türü kimliği özetleyerek yazıyor
- **`recordAuditLog()`** — `order_create`, `payment_attempt` enum değerleri
  şemada zaten var
- **Randevu modülü DESEN OLARAK ÖRNEK ALINABİLİR** (`src/features/appointments/`):
  errors → schemas → repositories → services → components ayrımı, koşullu
  UPDATE ile eşzamanlılık koruması, kuralların saf fonksiyonlara ayrılması
- **Tasarım token'ları** (`globals.css`) · `page-shell` · `Logo` ·
  `ThemeToggle` · `HeaderShell` · `SiteFooter` · `TextField` · `FormAlert` ·
  `TurnstileWidget` · `Button` · `Card`
- `getCurrentSession()` — istek başına tek okuma (React `cache`)
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- `src/config/navigation.ts` — hizmet kartları ve menü tek listeden geliyor.
  Market/restoran sayfası açılınca `href`'i buradan doldur (rozet "Yakında"dan
  "Açık"a kendiliğinden döner)

## TUZAKLAR — daha önce vakit kaybettirenler

**Eşzamanlılık (adım 6'da öğrenildi)**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu UPDATE
  kullan (`WHERE stock >= n`, `WHERE is_booked = false`) ve etkilenen satır
  sayısına bak. PostgreSQL ikinci güncelleyiciyi bekletip WHERE'i yeniden
  değerlendiriyor — koruma buradan geliyor, uygulama mantığından değil
- **Yarış testini yazdıktan sonra korumayı geçici olarak kaldırıp testin
  KIRMIZIYA döndüğünü gör.** Yoksa testin gerçekten bir şey ölçtüğünü bilemezsin

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz.**
  Koşullu UPDATE ve iç içe ilişki filtreleri taklit Prisma ile doğru
  kanıtlanamaz; yanlış yazılmış bir taklit testi YANLIŞ YEŞİL gösterir
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme.**
  Ayrı modül örneği geliyor, `instanceof` tutmuyor ve her iş kuralı hatası
  500'e düşüyor. Uç modülleriyle aynı aşamada, dosyanın üstünde içe aktar
- **`tests/db/helpers.ts` temizliği kimlik önekine bakıyor**, ama uygulamanın
  ürettiği kayıtlar `cuid()` alıyor. Yeni bir tablo eklersen temizliğe
  `userId`/yabancı anahtar üzerinden de bir koşul ekle, yoksa `Restrict`
  kısıtı tüm temizliği patlatır
- **E2E'de `fullyParallel` aynı dosyanın testlerini FARKLI İŞÇİLERE dağıtıyor**
  ve `beforeAll` her işçide yeniden koşuyor. Veritabanına yazan bir kancan
  varsa dosyayı `test.describe.configure({ mode: "serial" })` ile sabitle
- **Her Playwright projesine (masaüstü / 375px) AYRI test hesabı ver.**
  Projeler paralel koşuyor ve tek veritabanına yazıyor; hesap paylaşmak
  "bazen geçen" testler üretir (`hospital.spec.ts` bunu yaşadı)
- **Playwright `getByRole("alert")` KULLANMA.** Next.js her sayfaya boş bir
  `role="alert"` duyurucusu koyuyor; mesajı METİNLE ara
- **E2E'yi 15 dakika içinde üst üste koşturma.** Sayaçlar veritabanında;
  `/api/auth/google` bütçesi (10/15dk) tükenince Google testleri kırmızıya
  döner ve hata sanki kodda gibi görünür. Belirti: her koşuda BAŞKA bir
  Google testi düşüyor. Çözüm: bekle, ya da `rate_limit_counters` içindeki
  ilgili satırları sil
- **jsdom bu projede `localStorage` SAĞLAMIYOR** — `tests/helpers/local-storage.ts`
- **Testler zaman aşımına düşüyorsa önce `uptime` çalıştır.** Yük yüksekse
  argon2 pahalı olduğu için testler kırmızıya döner; testi suçlamadan önce bak

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), tercih `localStorage`'da
  (`benim-belediyem:tema`). DevTools'un renk şeması taklidi hiçbir şey
  değiştirmez — düğmeyi kullan
- shadcn `Alert` varsayılan `role="alert"`; sayfada duran bilgi kutuları
  `role="status"` olmalı
- **Aynı bağlantıyı masaüstü ve mobil için iki kez render etme**
- Dokunma hedefleri en az 44px (`min-h-11`)

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- Migration adresi `prisma.config.ts` içinde; `env()` yardımcısı kullanılmaz
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- `migrate dev` `migration_lock.toml`'daki Türkçe yorumu eziyor → `git checkout`
- `.map()` içinde enum alanı `string`'e genişliyor ve Prisma tipine uymuyor;
  enum taşıyan satırları tek tek yaz

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** (`P1001`). Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**;
  değişmediyse veritabanını uyandırıp `npx vercel redeploy <url>`
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR** — canlıdaki tam
  akışı kullanıcının elle doğrulaması gerekiyor
- **Google uygulaması "Testing" modunda** — yalnızca test kullanıcıları
  girebilir (teknik borç #34)

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ.** PR'lar `main`'e squash ile giriyor;
  önceki feature dalından açılan dal "çakışıyor" durumuna düşüyor ve
  **GitHub Actions hiç başlamıyor**. Belirti: PR'da yalnızca Vercel kontrolleri
  var. Önlem: `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği,
  betik proje kökünde olmalı
- ESLint `console.log`'u yasaklıyor; `console.error` / `console.warn` serbest
- **ESLint efekt içinde `setState` çağırmayı yasaklıyor** — `HeaderShell.tsx`
  içinde doğru deseni gör
- Prettier `.md` dosyalarını biçimlendirmiyor; `.ts`/`.tsx` yazdıktan sonra
  `npm run format` çalıştır, yoksa `format:check` kapıda durur

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası** (webServer 180 sn'de yetişmeyebilir):
`rm -rf .next && npm run build`, sonra ortam değişkenleriyle `npm run start`
(arka planda), sonra `npx playwright test`.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
