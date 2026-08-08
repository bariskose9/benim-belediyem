# Sonraki oturum için hazır prompt — adım 12

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 12 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **12**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.6 — bu adımın iş kuralları (paketler, **aylık
  tahsilat**, taahhüt, erken çıkış, yenileme ve kabul kriterleri)
- `docs/project/data-model.md` — `MembershipPlan`, `Membership`,
  `MembershipPayment` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 11 bitti.** Etkinlik bileti çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- **Belediye Market** ve **Belediye Restoran + adisyon** çalışıyor
- **Sipariş takibi + bildirim** çalışıyor: `/siparislerim` durum çizgisi,
  `/bildirimler`, iptal + stok iadesi + sahte iade kaydı
- **Etkinlik + koltuk seçimi + bilet** çalışıyor: `/etkinlikler`, salon planı,
  10 dakikalık kilit, sepette geri sayım, ödemede `held → sold`
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini (`benim-belediyem-git-<dal>-barisss.vercel.app`)
  **iki panele** ekle: Cloudflare Turnstile hostname listesi **ve** Google OAuth
  redirect URI listesi (sonuna `/api/auth/google/callback`). Teknik borç #31

## ÖNCE ÇÖZÜLECEK — TOHUM VERİSİ TÜKENİYOR

⚠️ **Uzak ortamlarda (preview + production) seed'i yeniden koşturmak gerekiyor.**
Tohumlama 2026-08-01'de yapıldı ve iki takvim ona göre üretiliyor:

- **Doktor saatleri ~2026-08-15'te bitiyor** (borç #38) — hastane ekranı
  "boş saat kalmamış" der, çökmez
- **Etkinlikler ~2026-09-30'da bitiyor** (`EVENT_WINDOW_DAYS = 60`) — etkinlik
  listesi boşalır, çökmez

İkisini tek seed koşusu çözer. Adım 11'de yapılmadı çünkü kapsam dışıydı.

## ADIM 11'DEN DEVREDEN NOTLAR

- **Teknik borç #50 hâlâ açık:** sipariş durumunun zamanla ilerlemesi canlıda
  ELLE doğrulanmadı (20 dakika ekran başında beklemek gerekiyor). Otomatik
  testlerde sahte saat ileri sarılarak dört aşamanın dördü de kanıtlı. **Proje
  bitiminde bakılacak**; daha hızlısı isteniyorsa restoran siparişinde eşik
  10 dakika
- **Hastane E2E testi ADIM 10'DA DÜZELTİLDİ ve yeşil** — eski devir notu
  "kırmızı" diyordu, artık geçerli değil. Test yarının gününü seçerek zamandan
  bağımsız hâle getirilmiş
- **Adım 11'de şema DEĞİŞMEDİ**, migration yazılmadı

## YAPILACAK — roadmap adım 12

"Spor salonu üyeliği (personele özel)" → PRD §5.6

Dal: `feature/spor-salonu-uyeligi` (öneri)

### Kapsam

- Tesis bilgisi, ders programı, salon saatleri
- Dört paket: aylık (taahhütsüz), 3 / 6 / 12 aylık — **hepsi AYLIK tahsilat**,
  uzun taahhüt aylık ücreti düşürüyor (%10 / %15 / %25)
- **Üyelik SEPETE GİRMEZ** — kendi akışı var: paket seç → kart seç/gir →
  taahhüt ve erken çıkış kuralını onayla → **ilk ay tahsil et**
- Yenilemeden 3 gün önce hatırlatma bildirimi · kart reddedilirse
  `payment_pending`
- Erişim: **personele özel** (`requireAccess("staff")` / `guardPage("staff")`)

### Bu adımda özellikle dikkat

- `src/config/navigation.ts` → spor salonu kartı ZATEN `/spor-salonu`'a bağlı
  ve sayfa var; adım 12 o sayfanın içini dolduruyor
- **`tests/e2e/layout.spec.ts` içindeki "açılmamış hizmet tıklanabilir bağlantı
  değildir" testi artık DESTEK kartını örnek alıyor** (adım 11'de etkinlikten
  taşındı, üçüncü taşımaydı). Destek adım 13'te açılacak — o zaman taşınacak,
  şimdi DOKUNMA
- **Otomatik yenileme tahsilatı planlı görev işi (adım 16).** Adım 12'de
  yalnızca ilk ay tahsil edilir; yenileme mantığı saf bir fonksiyona konmalı ki
  adım 16 onu çağırabilsin
- Üyelik durumu ekranda gösterilirken **ADR-013'ün dersini hatırla**: durumu
  saklanan bir kolondan değil, kuraldan türetmek daha sağlam olabilir

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/payment/`** — `card-resolver.ts` (yeni kart / kayıtlı kart),
  `mock-payment-provider.ts` (Luhn + sahte sağlayıcı), `payment.repository.ts`.
  Üyelik tahsilatı bu parçaları çağırmalı, kendi kart mantığını yazmamalı
- **`src/features/events/`** — **10 dakikalık kilit ve YARIŞ KORUMASI DESENİ
  burada**: `seat-reservation.repository.ts` tek ifadeli koşullu yazmanın en
  temiz örneği (`updateMany` + `createMany({skipDuplicates})`)
- **`src/features/catalog/`** — ORTAK katalog katmanı: arama kutusu, kategori
  şeridi, boş durum, adres parametresi şeması ve Türkçe `unaccent` araması.
  Yeni bir liste ekranı yazacaksan buradan başla
- **Sepet katmanı** (`src/features/cart/`) ve **ödeme katmanı**
  (`src/features/payment/`): `checkout.service.ts` siparişleri modül başına ve
  tek transaction'da yazıyor
- **`src/features/orders/`** — sipariş listesi, durum türetme
  (`order-timeline.ts`) ve iptal. **Durum kural tablosu burada**
- **`src/features/notifications/`** — bildirim yazma ve tembel senkronizasyon.
  `membership_renewal_reminder` ve `membership_payment_failed` enum'da **HAZIR**;
  `order-notification.service.ts` ve `seat-expiry.service.ts` desenine bak
- **`SeatHoldCountdown`** — geri sayan bir sayaç gerekirse hazır bileşen
- **`CartLines`** bileşeni dar kapsayıcıda da çalışıyor
- **Bildirim balonu**: `import { toast } from "sonner"`
- **`readCartOwner()`** sunucu bileşenleri için, **`getCartContext()`** uçlar için
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
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** Adım 10'da yük 7-85 arasındayken tam
  set 10 teste kadar kırmızı verdi; tek tek koşunca hepsi yeşildi. Adım 11'de
  aynısı `npm run test`te oldu (2 test zaman aşımına uğradı, yük düşünce 542'si
  de yeşildi). **Önce `uptime` bak**, 3'ün altına inmesini bekle, sonra koş
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- ⚠️ **KIRMIZI GÖRÜNCE ÖNCE YÜKE VE HIZ SINIRINA BAK — ADIM 11'İN DERSİ.**
  Tam set üç kez arka arkaya koşturulunca sırayla `layout.spec.ts` (yatay
  kaydırma), `google-login.spec.ts`, `register.spec.ts` ve `login.spec.ts`
  kırmızı verdi. Hiçbiri gerçek hata değildi:
  - `layout.spec.ts` kırmızısının **temiz `main`'de de çıktığı** `git stash -u`
    ile fiilen doğrulandı — yani koda bakmanın anlamı yoktu
  - Giriş/kayıt testleri **hız sınırına** takılmıştı (`rate_limit_counters`
    554 satır birikmişti)
  - **Sayaçlar boşaltılıp yük 2.5'in altına inince tam set 179/179 YEŞİL**
  Sıra: `rate_limit_counters`'ı boşalt → `uptime` < 2.5 olsun → **tek sefer** koş
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (`seed.test.ts` tohumlamayı koşturuyor ve doğum tarihleri bugüne
  göre kayıyor). **Commit etmeden önce `git checkout` ile geri al** — `migrate
  dev` tuzağının aynısı
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER.** Sadece ayrı hesap
  yetmiyor: adım 11'de iki proje de "ilk boş koltuk"a tıkladı, aynı koltuğu
  istedi, biri 409 aldı ve test uygulama doğru çalıştığı hâlde kırmızıya döndü.
  Çözüm `EVENT_INDEX_BY_PROJECT` — projeye ayrı ETKİNLİK. Hastane testindeki
  "ayrı branş" çözümünün aynısı
- **E2E'nin ürettiği sepet/sipariş/kilit verisini temizle.** Sipariş
  temizliğinde SIRA: `refund → orderItem → order → notification → payment →
  cartItem → cart` (iade siparişe ve ödemeye `Restrict` ile bağlı).
  `seatReservation` da silinmeli (`status: "held"`)
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2`,
  `mehmet.duman7`, `arda.aydin9`, `gamze.toprak8`, `baris.ates10`,
  `ipek.kurt4`, `ferhat.tunc5`. **Boşta kalanlar:** `emre.arslan1` (personel),
  `nazli.mentes6`. **Adım 12 PERSONELE ÖZEL** → `emre.arslan1` personel, ikinci
  proje için başka bir personel hesabı gerekecek (`test-hesaplari.md`'ye bak)

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- **`getByText(<modül adı>)` de çok eşleşir** → `getByRole("heading")` kullan
- **`getByText("İptal edildi")` ÇOK EŞLEŞİR**: hem durum rozetinde hem
  "İptal edildi: <tarih>" satırında geçiyor → `exact: true` (adım 10'da yandı)

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Servis
  katmanını çağıran testlerde kaydı UYGULAMA üretiyor ve kimliği `cuid()`
  oluyor. Adım 11'de `seat_reservations` bu yüzden silinemedi ve `events`
  silme işlemi `Restrict` ile patladı — çözüm `eventId`/`seatId`/`userId`
  üzerinden de silmek. Yeni bir tablo eklersen aynı tuzağa dikkat et

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır. Yeni bir tablo
  aranacaksa oraya AYRI VE SABİT bir sorgu dalı ekle — tablo adı parametre
  yapılamaz (tanımlayıcı bağlanamaz, enjeksiyon kapısı açardı)
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**
- Yazım hatası toleransı YOK (borç #44)

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Teslimat ücreti modül başına bir KURAL TABLOSUNDAN okunuyor**
  (`cart-pricing.ts` → `DELIVERY_RULES`)

**Zaman ve durum**
- **Sipariş durumu `orders.status` kolonunda DEĞİL** — siparişin yaşından
  hesaplanıyor (ADR-013). Durum okuyan her yol `deriveOrderState`'ten geçmeli
- **`tests/db/` içinde sahte saat kullanırken `orders.created_at`'i de
  sabitle** (`pinCreatedAt` yardımcısı)
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007). Adım
  11'de bu koşul `blockingReservationWhere` içinde tek yere toplandı; üç sorgu
  da oradan geçiyor. Koşulun unutulduğu tek bir sorgu, süresi dolmuş bir kaydı
  geçerli sayardı

**Eşzamanlılık — ADIM 11'İN EN ÖNEMLİ DERSİ**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve etkilenen satır sayısına bak
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN.**
  `create` çakışmada P2002 fırlatıyor ve PostgreSQL'de bir transaction
  içindeki hata o transaction'ı KOMPLE abort ediyor — hatayı yakalayıp devam
  etmek mümkün değil, sonraki her ifade "current transaction is aborted" alıyor.
  `skipDuplicates` hiç istisna üretmiyor ve `{count: 0}` dönüyor
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 11'de üç koruma böyle ölçüldü: ADR-007 zaman koşulu kaldırılınca kabul
  kriteri testi kırmızı, `markSeatSold`'daki süre ve sahiplik koşulları
  kaldırılınca iki test birden kırmızı

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır. **Dev modda bu tazeleme yeniden derleme yüzünden
  saniyeler sürebilir**; prod build'de anlık
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** (geri sayım gibi):
  `suppressHydrationWarning` React'in bu durum için önerdiği yol

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz**
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme** —
  ayrı modül örneği veriyor, `instanceof AppError` tutmuyor ve her iş kuralı
  hatası 500'e düşüyor

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi.** Onay gerektiren
  işlemlerde kartın içinde açılan satır içi onay kullanılıyor
- **Dar kapsayıcıya konan bileşen taşabilir.** Ölçüsü:
  `document.documentElement.scrollWidth > clientWidth`. Giriş gerektiren
  sayfalarda bu ölçüm `layout.spec.ts`'e konamaz (orası girişsiz koşuyor) —
  ilgili spec dosyasının içine koy
- **Geniş içerik (ızgara, tablo) KENDİ kapsayıcısında kaysın**
  (`overflow-x-auto`), sayfada değil
- **Olmayan renk token'ı uydurma.** `warning` yok
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`) — salon planındaki 36px'lik
  koltuklar bilinçli bir sapma ve gerekçesi kodda yazılı (borç #52)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- **`migrate dev` iki dosyayı KENDİLİĞİNDEN değiştiriyor**:
  `prisma/migrations/migration_lock.toml` ve seed'in ürettiği
  `docs/project/test-hesaplari.md`. **Commit etmeden önce `git status`'a bak ve
  ikisini `git checkout` ile geri al**

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
  betiği (proje kökünde; scratchpad'den çalışmıyor, yol çözümlenmiyor)
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**E2E'yi elle koşturma sırası:** `uptime` bak (yük < 3), portu boşalt
(`lsof -ti:3000 | xargs kill -9`), sonra `npx playwright test`.
Sunucuyu SEN başlatma.

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun ve onayımı bekle** (CLAUDE.md §3 kapı 2).
