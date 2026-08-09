# Sonraki oturum için hazır prompt — adım 13

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 13 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **13**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.7 — bu adımın iş kuralları (destek talebi, dosya
  yükleme sınırları, durum akışı ve kabul kriteri)
- `docs/project/data-model.md` — `SupportTicket`, `TicketAttachment` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 12 bitti.** Spor salonu üyeliği çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı, tek
  transaction'da ödeme + modül başına sipariş + stok düşümü, sahte fiş
- **Belediye Market** ve **Belediye Restoran + adisyon** çalışıyor
- **Sipariş takibi + bildirim** çalışıyor: `/siparislerim`, `/bildirimler`,
  iptal + stok iadesi + sahte iade kaydı
- **Etkinlik + koltuk seçimi + bilet** çalışıyor: 10 dakikalık kilit
- **Spor salonu üyeliği** çalışıyor: `/spor-salonu`, `/spor-salonu/paket/<id>`,
  `/spor-salonu/uyelik` — dört paket, ilk ay tahsilatı, paket değişimi, iptal,
  erken çıkış farkı, yenileme hatırlatması
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31

## ADIM 12'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **Uzak ortamlarda tohumlama GÜNCEL DEĞİL.** Adım 12'de tohuma iki demo
  personel hesabı eklendi (#11 Zehra Kılıç, #12 Esra Arslan) ve preview /
  production'da bu hesaplar YOK. Uygulama etkilenmiyor, E2E local'de koşuyor
- ⛔ **"Tek seed koşusu doktor saatlerini ve etkinlikleri birden çözer" İDDİASI
  YANLIŞTI; adım 12'de kod okunarak düzeltildi.** Doğrusu:
  - **Doktor saatleri (borç #38) DÜZELİR** — slot kimliği tarihten üretiliyor,
    yeni koşu bugünden itibaren 14 günlük yeni satır yazıyor
  - **Etkinlikler DÜZELMEZ** — etkinlik kimliği sabit (`seed-event-0001…12`),
    `skipDuplicates` mevcut satırları atlıyor. Tarihleri 2026-08-01'e göre
    kalmaya devam ediyor ve ~2026-09-30'da liste boşalıyor
- **Teknik borç #50 hâlâ açık:** sipariş durumunun zamanla ilerlemesi canlıda
  ELLE doğrulanmadı. Otomatik testlerde sahte saat ileri sarılarak dört aşama
  da kanıtlı. **Proje bitiminde bakılacak**
- **Adım 12'de ŞEMA DEĞİŞTİ** — `memberships` tablosuna iki nullable kolon
  eklendi (`active_user_id` benzersiz, `renewal_reminder_for_billing_at`).
  Migration geriye uyumlu, veri silmiyor, Vercel deploy'da kendiliğinden
  uygulanıyor

## YAPILACAK — roadmap adım 13

"Destek talebi + dosya yükleme" → PRD §5.7

Dal: `feature/destek-talebi` (öneri)

### Kapsam

- Üye başlık + açıklama yazar, **birden fazla ekran görüntüsü** yükler
- Durumlar: `Açık → İnceleniyor → Çözüldü → Kapandı`. İlk üç geçiş
  **zamanlayıcıyla simüle edilir** (sipariş durumundaki desen); `Kapandı`
  durumunu **yalnızca talebi açan üye** verir
- **Kural:** yalnızca resim, en fazla 5 adet, dosya başına boyut sınırı
- **Kural:** talep oluşturmada **bot doğrulaması** istenir (PRD §5.0)
- **Kabul kriteri:** kullanıcı başkasının talebini göremez ve bu doğrulanmış olur

### Bu adımda özellikle dikkat

- **`tests/e2e/layout.spec.ts` içindeki "açılmamış hizmet tıklanabilir bağlantı
  değildir" testi DESTEK kartını örnek alıyor.** Adım 13 destek kartını
  açacağı için o test **taşınmalı** — kalan tek kapalı hizmet kalmazsa test
  yeniden düşünülmeli (dördüncü taşıma olacak)
- **`tests/e2e/login.spec.ts` de kırılabilir**: adım 12'de spor salonunun
  "Bu hizmet henüz açılmadı" beklentisi güncellendi; destek için benzer bir
  bağ varsa aynısı gerekir
- **Dosya yükleme yeni bir güvenlik yüzeyi**: tip, boyut, uzantı doğrulanır,
  dosya adı sanitize edilir (CLAUDE.md §5.5). Nereye yükleneceği (Vercel Blob?
  yeni hesap?) **altyapı kararıdır ve ADR gerektirebilir** — önce
  `altyapi-durumu.md`'ye bak, sonra kullanıcıya sor
- Durum simülasyonu için **sipariş modülündeki `order-timeline.ts` desenine
  bak**: kural tablosu + saf `derive*` fonksiyonu (ADR-013)

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/payment/`** — `card-resolver.ts`, `mock-payment-provider.ts`,
  `payment.repository.ts` ve **`components/CardPicker.tsx`** (ödeme ve üyelik
  ekranlarının ORTAK kart alanı — üçüncü bir ekran gerekirse bunu kullan)
- **`src/features/gym/`** — **ABONELİK DESENİ BURADA**: durum türetme
  (`membership-state.ts`), dönem aritmetiği (`billing-period.ts`), saf
  fiyat/fark hesabı (`plan-pricing.ts`) ve **HTTP bilmeyen tahsilat çekirdeği**
  (`membership-billing.ts` → `renewMembershipPeriod`). Adım 16 bunu çağıracak
- **`src/features/events/`** — 10 dakikalık kilit ve **YARIŞ KORUMASI DESENİ**
- **`src/features/catalog/`** — ORTAK katalog katmanı: arama, kategori şeridi,
  boş durum, Türkçe `unaccent` araması. Yeni liste ekranı buradan başlar
- **`src/features/orders/`** — sipariş listesi, durum türetme, iptal
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**.
  `support_ticket_update` enum'da **HAZIR**. `order-notification.service.ts` ve
  `membership-notification.service.ts` desenine bak
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
  bekle, sonra koş. Adım 12'de yük 4.3'ten 2.3'e düşene kadar beklendi ve tam
  set tek seferde 191/191 yeşil geldi
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- ⚠️ **KIRMIZI GÖRÜNCE ÖNCE YÜKE VE HIZ SINIRINA BAK.** Sıra:
  `rate_limit_counters`'ı boşalt → `uptime` < 2.5 olsun → **tek sefer** koş
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (doğum tarihleri bugüne göre kayıyor). **Commit etmeden önce
  `git status`'a bak** — dosyada gerçek bir değişiklik yoksa `git checkout` ile
  geri al
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER.** Ayrı hesap bazen
  yetmiyor: hastanede ayrı BRANŞ, etkinlikte ayrı ETKİNLİK gerekti. **Adım
  12'de ayrı HESAP zorunluydu** çünkü "bir kullanıcıya tek üyelik" kuralı
  hesabı paylaşılamaz kılıyor
- **E2E'nin ürettiği veriyi temizle.** Sipariş temizliğinde SIRA:
  `refund → orderItem → order → notification → payment → cartItem → cart`.
  **Üyelikte SIRA: `membershipPayment → membership → notification → savedCard`**
  (üyelik kayıtlı karta `Restrict` ile bağlı)
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` (hastane) ·
  `mehmet.duman7`, `arda.aydin9` (ödeme) · `ipek.kurt4`, `ferhat.tunc5`
  (etkinlik) · `gamze.toprak8`, `baris.ates10` (sipariş) · `zehra.kilic91`,
  `esra.arslan92` (spor salonu — **personel**). **Boşta:** `emre.arslan1`
  (personel), `nazli.mentes6` (vatandaş)

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- **`getByRole("heading", { name: "Tesis" })` de ÇOK EŞLEŞİR** — "Belediye
  Personel Spor **Tesisi**" ve "**Tesis**te neler var" ile çakıştı (adım 12'de
  fiilen yandı). Kısa başlıklarda **`exact: true` ŞART**
- **`getByText("İptal edildi")` ÇOK EŞLEŞİR** → `exact: true`
- **`getByText("Aktif")` de öyle**: "Aktif üyeliğiniz yok" ile eşleşiyor

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Servis
  katmanını çağıran testlerde kaydı UYGULAMA üretiyor ve kimliği `cuid()`
  oluyor. Üyelik ve tahsilat satırları adım 12'de bu yüzden `userId` üzerinden
  de siliniyor. Yeni bir tablo eklersen aynı tuzağa dikkat et

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**
- Yazım hatası toleransı YOK (borç #44)

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Teslimat ücreti modül başına bir KURAL TABLOSUNDAN okunuyor**
  (`cart-pricing.ts` → `DELIVERY_RULES`)
- **Tutar İSTEMCİDEN ALINMAZ.** İstemcinin gönderdiği rakam yalnızca
  "kullanıcının gördüğü ekran güncel miydi" diye karşılaştırılır
  (`expectedTotalKurus`, `acknowledgedFeeKurus`)

**Zaman ve durum**
- **Sipariş durumu `orders.status` kolonunda DEĞİL** (ADR-013)
- **Üyelik durumu `memberships.status` kolonunda DEĞİL** — aynı desen;
  `deriveMembershipState`'ten geçmeyen hiçbir ekran doğru durumu göstermez
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`): sabit gün eklemek
  tahsilat gününü her ay kaydırır
- **`tests/db/` içinde sahte saat kullanırken kayıt tarihlerini de sabitle**
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})`
  KULLAN.** `create` çakışmada P2002 fırlatıyor ve PostgreSQL transaction'ı
  KOMPLE abort ediyor
- **Nullable + benzersiz kolon, "kullanıcı başına tek yaşayan kayıt" kuralını
  veritabanına söyletmenin yolu** (adım 12: `memberships.active_user_id`).
  PostgreSQL benzersiz indekste birden çok `NULL` kabul ediyor
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 12'de iki koruma böyle ölçüldü (dönem ilerletme koşulu ve iptal koşulu);
  ikisi kaldırılınca tam olarak ilgili iki test kırmızıya döndü

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz**
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme**
- **Testin varsayımı gerçekçi mi diye sor.** Adım 12'de "13 ay sonra iptal et"
  testi kırmızı verdi çünkü aradaki 12 tahsilat hiç yapılmamıştı ve üyelik
  pasifleşmişti — kod doğruydu, senaryo yanlıştı. Düzeltme: 12 ayı gerçekten
  yenilemek

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi.** Onay gerektiren
  işlemlerde kartın içinde açılan satır içi onay kullanılıyor
- **Dar kapsayıcıya konan bileşen taşabilir.** Ölçüsü:
  `document.documentElement.scrollWidth > clientWidth`. **Giriş gerektiren
  sayfalarda bu ölçüm `layout.spec.ts`'e konamaz** (orası girişsiz koşuyor) —
  ilgili spec dosyasının içine koy
- **Geniş içerik (ızgara, tablo) KENDİ kapsayıcısında kaysın** (`overflow-x-auto`)
- **Olmayan renk token'ı uydurma.** `warning` yok
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`)
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü Chrome DevTools ile değil **Playwright `mobile-375` projesiyle**
  yap — adım 12'de bu fark edildi

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- **`migrate dev` `prisma/migrations/migration_lock.toml`'u KENDİLİĞİNDEN
  değiştiriyor** → commit etmeden `git checkout` ile geri al
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR** ("environment is
  non-interactive"). Adım 12'de izlenen yol: `npx prisma migrate diff
  --from-config-datasource --to-schema prisma/schema.prisma --script` ile SQL
  üret → migration klasörünü elle oluştur → `npx prisma migrate deploy`
- **`prisma migrate reset --force` bayrağı yutuluyor** (prisma.config.ts
  sarmalıyor). Local'i sıfırlamak için `docker compose down -v` + `npm run db:up`

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
