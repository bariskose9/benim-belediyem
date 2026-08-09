# Sonraki oturum için hazır prompt — adım 14

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 14 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **14**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.8 — bu adımın iş kuralları (hava durumu, haber,
  piyasa widget'ları ve kabul kriteri)
- `docs/project/integrations.md` — hangi dış API, hangi anahtar, hangi limit
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 13 bitti.** Destek talebi çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- **Belediye Market** ve **Belediye Restoran + adisyon** çalışıyor
- **Sipariş takibi + bildirim** çalışıyor: `/siparislerim`, `/bildirimler`
- **Etkinlik + koltuk seçimi + bilet** çalışıyor: 10 dakikalık kilit
- **Spor salonu üyeliği** çalışıyor: dört paket, aylık tahsilat, iptal
- **Destek talebi** çalışıyor: `/destek`, `/destek/<id>` — ekran görüntüsü
  yükleme, durum türetme, kapatma, bildirim
- **Hizmet ızgarasında KAPALI HİZMET KALMADI** — altı kartın altısı da açık
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31.
  **⚠️ Turnstile listesi 10 sınırına dayandı** — panele girildiğinde merge
  edilmiş dalların satırları toplu silinmeli (`altyapi-durumu.md`)

## ⏰ OTURUM SONUNDA HATIRLAT — proje sahibinin bekleyen işleri

**Şu an bekleyen telefon testi YOK.** Adım 13'te ikisi de kapatıldı: proje
sahibi destek talebini (dosya seçme + ek görselin çizilmesi) ve spor salonunu
(paket kartları + ders programı) 2026-08-09'da telefonundan denedi, ikisi de
temiz. Borç #59 ödendi.

**Adım 14'te yeni bir ekran geldiği için telefon testi yine gerekecek** —
commit önerisini sunarken hangi ekranın deneneceğini yaz.

⚠️ **20 dakika bekleme gerektiren iki iş PROJE SONUNA bırakıldı** (borç #50 ve
#62): sipariş durumunun ve destek talebi durumunun zamanla ilerlediği canlıda
elle görülmedi. **Adım 18'de tek oturumda birlikte bakılacak.** Bunları her
adımda tekrar hatırlatma — proje sahibi bilinçli olarak erteledi.

## ADIM 13'TEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **Dosya depolama VERİTABANINDA, Vercel Blob'da DEĞİL** (ADR-014 · borç #60).
  Bu bir sapma değil **karar**: proje sahibi 2026-08-09'da "şimdilik
  veritabanı kalsın" dedi. Uygulama `FileStorage` arayüzüne konuşuyor
  (`src/lib/file-storage.ts`), geçiş tek dosyalık. **Blob store açılmadı**
- **Uzak ortamlarda tohumlama GÜNCEL DEĞİL.** Adım 12'de tohuma iki demo
  personel hesabı eklendi (#11 Zehra Kılıç, #12 Esra Arslan) ve preview /
  production'da bu hesaplar YOK. Uygulama etkilenmiyor, E2E local'de koşuyor
- ⛔ **Doktor saatleri (borç #38) uzak ortamlarda tükendi sayılır** —
  tohumlama 2026-08-01, pencere 14 gün. Yeni bir seed koşusu DÜZELTİR
  (slot kimliği tarihten üretiliyor). **Etkinlikler DÜZELMEZ** — kimlik sabit
  (`seed-event-0001…12`), `skipDuplicates` mevcut satırları atlıyor ve liste
  ~2026-09-30'da boşalıyor
- **Teknik borç #50 ve #62 birlikte kapatılacak:** sipariş durumunun (20 dk) ve
  destek talebi durumunun (30 dk) zamanla ilerlediği canlıda ELLE
  doğrulanmadı. İkisi de otomatik testlerde sahte saatle kanıtlı.
  **Proje bitiminde veya adım 18'de tek oturumda bakılır**
- **Adım 13'te ŞEMA DEĞİŞTİ** — `support_tickets`'a `closed_at` ve
  `notified_status`, `ticket_attachments`'a `content_type` ve `data` (bytea)
  eklendi. Migration geriye uyumlu, veri silmiyor, Vercel deploy'da
  kendiliğinden uygulanıyor

## YAPILACAK — roadmap adım 14

"Bilgi widget'ları (hava, haber, piyasa)" → PRD §5.8

Dal: `feature/bilgi-widgetlari` (öneri)

### Kapsam

- **Hava durumu:** İzmir için güncel durum + 3 günlük tahmin
- **Haber:** güncel başlıklar, kaynağa bağlantı
- **Piyasa:** döviz kurları ve birkaç kripto/endeks değeri
- **Kural:** çağrılar SUNUCU tarafında yapılır ve **önbelleklenir**; API
  anahtarı tarayıcıya gitmez
- **Kural:** dış servis çökerse **widget hata gösterir, sayfa çalışmaya
  devam eder** (`12-operations-and-scaling.md`)

### Bu adımda özellikle dikkat

- **BU ADIM İLK GERÇEK DIŞ API ÇAĞRISI.** Bugüne kadar tüm dış servisler
  taklit ediliyordu (sahte KPS, sahte ödeme). `integrations.md` hangi
  sağlayıcıların düşünüldüğünü yazıyor — **önce oradan oku, sonra sağlayıcı
  dokümanını GÜNCELDEN doğrula**, ezberden yazma
- **Yeni API anahtarı gerekebilir** → bu bir DIŞ DÜNYA işidir ve yalnızca
  proje sahibi yapabilir. `altyapi-durumu.md`'ye bak, sonra sor
- **Timeout ve devre kesici ZORUNLU** — `src/lib/circuit-breaker.ts` HAZIR
  (ADR-010, sahte KPS için yazıldı). Yeniden yazma, kullan
- **Anahtar gerekmeyen sağlayıcı varsa tercih et** (ör. Open-Meteo) — proje
  sahibine yeni hesap açtırmamak, açtırmaktan iyidir
- **Önbellek ADR gerektirebilir:** Next.js `revalidate` mi, veritabanı tablosu
  mu? Ücretsiz planda cron günde bir (borç #3), bunu hesaba kat

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/circuit-breaker.ts`** — dış servis çökünce açılan devre (ADR-010)
- **`src/lib/file-storage.ts`** — dosya depolama adaptörü (ADR-014). İkinci
  sürücü (Vercel Blob) eklenecekse yeri burası
- **`src/lib/file-upload.ts`** — dosya türü BAYT İMZASINDAN doğrulama + ad
  sanitize. Yeni bir yükleme yüzeyi gelirse buradan başla
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/support/`** — **EN GÜNCEL DESEN BURADA**: saf durum türetme
  (`support-ticket-timeline.ts`), sahiplik sorgunun içinde repository, ek
  servis eden yetkili uç
- **`src/features/gym/`** — abonelik ve dönem aritmetiği deseni
- **`src/features/events/`** — 10 dakikalık kilit ve **YARIŞ KORUMASI DESENİ**
- **`src/features/catalog/`** — ORTAK katalog katmanı: arama, kategori şeridi,
  boş durum, Türkçe `unaccent` araması
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**.
  `order-`, `membership-` ve `support-notification.service.ts` üçü de aynı desen
- **`src/components/layout/ServiceTile.tsx`** — ana sayfa hizmet kartı
  (adım 13'te `page.tsx`'ten çıkarıldı)
- **Bildirim balonu**: `import { toast } from "sonner"`
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- **`recordAuditLog()`** — kritik işlemler denetim kaydına yazılır
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  **Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test`** — sunucuyu Playwright kendi kurar
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak, 2.5'in altına inmesini
  bekle, sonra koş. **Adım 13'te bu fiilen yandı:** yük 5.15'ken iki test
  "Execution context was destroyed" ve zaman aşımıyla düştü; yük 2.07'ye
  inince aynı set 199/199 yeşil geldi. **Kırmızı görünce ÖNCE YÜKE BAK**
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (doğum tarihleri bugüne göre kayıyor). **Commit etmeden önce
  `git status`'a bak** — dosyada gerçek bir değişiklik yoksa `git checkout` ile
  geri al. Adım 13'te yine oldu
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- **E2E'nin ürettiği veriyi temizle.** Sipariş temizliğinde SIRA:
  `refund → orderItem → order → notification → payment → cartItem → cart`.
  **Üyelikte SIRA: `membershipPayment → membership → notification → savedCard`**.
  **Destekte ek AYRICA silinmez** — `ticket_attachments` talebe `Cascade` ile bağlı
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` (hastane +
  destekte "yabancı" talep sahibi) · `mehmet.duman7`, `arda.aydin9` (ödeme) ·
  `ipek.kurt4`, `ferhat.tunc5` (etkinlik) · `gamze.toprak8`, `baris.ates10`
  (sipariş) · `zehra.kilic91`, `esra.arslan92` (spor salonu — personel) ·
  `emre.arslan1`, `nazli.mentes6` (destek). **BOŞTA HESAP KALMADI** — yeni bir
  modül ayrı hesap isterse tohuma yeni demo hesap eklemek gerekecek

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- **`getByRole("heading", { name: "Tesis" })` de ÇOK EŞLEŞİR** — kısa
  başlıklarda **`exact: true` ŞART**
- **`getByText("İptal edildi")` ve `getByText("Aktif")` ÇOK EŞLEŞİR**
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  Adım 13'te `getByText("Açık", { exact: true })` tema düğmesinin ekran okuyucu
  etiketine ("Açık temaya geç") takıldı. **Çözüm: aramayı BÖLGEYE sınırla**
  (`page.getByRole("region", { name: ... })`)
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA KULLANMA.** Adım 13'te `/destek` sayfasında h1
  ve h2 aynı metindi ve `getByRole("heading", { exact: true })` iki öğe buldu.
  Liste bölümünün başlığı ayrıldı (`support.listHeading`)

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Servis
  katmanını çağıran testlerde kaydı UYGULAMA üretiyor ve kimliği `cuid()`
  oluyor. Üyelik (adım 12) ve destek talebi (adım 13) satırları bu yüzden
  `userId` üzerinden de siliniyor. Yeni bir tablo eklersen aynı tuzağa dikkat et

**Dosya yükleme (adım 13)**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME.** `File.type` işletim sisteminin
  uzantıya bakarak ürettiği bir tahmindir: içi HTML olan bir `.png`,
  tarayıcıda `image/png` görünüyor. Tür **baytların imzasından** doğrulanır
- **TEST İÇİN GEÇERLİ BİR GÖRSEL ÜRET.** Adım 13'te elle yazılan base64 PNG
  bozuktu ve "ek görünmüyor" diye 10 dakika uygulama arandı — sorun dosyadaydı.
  **Ölçüsü: `sips -g pixelWidth <dosya>` değer döndürüyor mu**
- **`next/image` YETKİLİ bir uçtan görsel çekerken `unoptimized` ŞART.**
  Optimizasyoncu kaynağı kendi sunucusundan çeker ve o istekte kullanıcının
  oturum çerezi YOKTUR; açık bırakılırsa her ek 404 döner

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**
- Yazım hatası toleransı YOK (borç #44)

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Tutar İSTEMCİDEN ALINMAZ**

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013).
  `deriveOrderState` / `deriveMembershipState` / `deriveTicketState`'ten
  geçmeyen hiçbir ekran doğru durumu göstermez
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **`tests/db/` içinde sahte saat kullanırken kayıt tarihlerini de sabitle** —
  `created_at` veritabanının varsayılanından, yani GERÇEK şimdiden geliyor
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})`
  KULLAN.** `create` çakışmada P2002 fırlatıyor ve transaction'ı KOMPLE abort ediyor
- **Nullable + benzersiz kolon**, "kullanıcı başına tek yaşayan kayıt" kuralını
  veritabanına söyletmenin yolu (adım 12)
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 13'te iki koruma böyle ölçüldü (sahiplik ve "zaten kapalı" koşulu);
  kaldırılınca tam olarak ilgili üç test kırmızıya döndü

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA** — sınır dizesi
  (boundary) düşer ve sunucu gövdeyi ayrıştıramaz (`api-client.ts`)
- **`FormData.get` alan yoksa `null` döner**, `undefined` değil — Zod'un
  `.default()` değeri devreye girmez. `?? undefined` ile çevir

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi.** Onay gerektiren
  işlemlerde kartın içinde açılan satır içi onay kullanılıyor
- **Dar kapsayıcıya konan bileşen taşabilir.** Ölçüsü:
  `document.documentElement.scrollWidth > clientWidth`. **Giriş gerektiren
  sayfalarda bu ölçüm `layout.spec.ts`'e konamaz** — ilgili spec dosyasına koy
- **Geniş içerik (ızgara, tablo) KENDİ kapsayıcısında kaysın** (`overflow-x-auto`)
- **Olmayan renk token'ı uydurma.** `warning` yok
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`)
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü Chrome DevTools ile değil **Playwright `mobile-375` projesiyle** yap

**Turnstile**
- ⚠️ **`NEXT_PUBLIC_*` DEĞİŞKENLERİ DERLEME ANINDA GÖMÜLÜYOR.** Playwright
  `npm run build`'i boş Turnstile anahtarıyla koşuyor, yani o build'de kutu
  HİÇ ÇİZİLMİYOR. **Kutuyu elle doğrulayacaksan önce normal `npm run build`
  ile yeniden derle** — adım 13'te bu fark edilmeseydi "kutu kayboldu" diye
  boşuna kod aranacaktı
- Jeton alanı şemada **boş string kabul etmeli** (`z.string().default("")`):
  "jeton yok" durumu 422 değil, bot doğrulaması hatası olarak dönmeli

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- **`migrate dev` `prisma/migrations/migration_lock.toml`'u KENDİLİĞİNDEN
  değiştiriyor** → commit etmeden `git checkout` ile geri al
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR.** İzlenen yol:
  `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` ile SQL üret → migration klasörünü elle
  oluştur → `npx prisma migrate deploy`. Adım 13'te de aynısı yapıldı
- **`NOT NULL` kolon eklerken geçici `DEFAULT` ver, sonra `DROP DEFAULT`** —
  mevcut satırlar için güvenli, kalıcı varsayılan bırakmadan (adım 13)
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken production deploy PATLIYOR** (`P1001`). Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği (**proje kökünde**; `/tmp`'den çalışmıyor, yol çözümlenmiyor)
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
  — `/tmp`'deki dosyayı reddediyor. Geçici bir klasör aç, işi bitince sil
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır
- Uzun süren işlerde ekranın uyumaması için `caffeinate -dimsu &`; **iş bitince
  `pkill caffeinate` ile kapat**

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası:** `rate_limit_counters`'ı boşalt → `uptime` bak
(yük < 2.5) → portu boşalt (`lsof -ti:3000 | xargs kill -9`) → `npx playwright
test`. **Sunucuyu SEN başlatma.**

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
