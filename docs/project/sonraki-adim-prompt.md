# Sonraki oturum için hazır prompt — adım 11

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 11 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **11**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.2 — bu adımın iş kuralları (koltuk seçimi,
  **10 dakikalık kilit**, bilet ve kabul kriterleri)
- `docs/project/data-model.md` — `Event`, `Venue`, `VenueSeat`,
  `SeatReservation` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 10 bitti.** Sipariş takibi ve iptali çalışıyor.

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
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini (`benim-belediyem-git-<dal>-barisss.vercel.app`)
  **iki panele** ekle: Cloudflare Turnstile hostname listesi **ve** Google OAuth
  redirect URI listesi (sonuna `/api/auth/google/callback`). Teknik borç #31
- ⚠️ **Tohumlanmış doktor saatleri ~2026-08-21'de tükeniyor** (borç #38)

## ADIM 10'DAN DEVREDEN — ÖNCE BUNU OKU

**`tests/e2e/hospital.spec.ts` → "personel randevu alır, listede görür ve iptal
eder" testi KIRMIZI ve bu adım 10 ile İLGİSİZ.** Temiz `main`'de de kırmızı
olduğu `git stash` ile fiilen doğrulandı (2026-08-08).

- Belirti: "Yaklaşan randevular" bölgesinde "İptal et" düğmesi bulunamıyor
- Muhtemel sebep (**emin değilim, doğrulanmadı**): test ilk boş saati seçiyor;
  o saat şu anki zamana 2 saatten yakınsa `canCancelAt` kuralı gereği iptal
  düğmesi hiç çizilmiyor ve testin beklediği düğme yok. Yani test, günün
  saatine göre kırılıyor olabilir
- **Bunu adım 11'de düzelt** (veya ayrı bir `fix/` dalında): testin seçtiği
  saati zamandan bağımsız hâle getirmek gerekiyor

## YAPILACAK — roadmap adım 11

"Etkinlik + koltuk seçimi + bilet" → PRD §5.2

Dal: `feature/etkinlik-bilet` (öneri)

### Kapsam

- Etkinlik listesi ve detayı, salon planı, koltuk seçimi
- **10 dakikalık koltuk kilidi** — ADR-007'nin ta kendisi: süresi dolmuş
  `held` kayıtlar okuma anında dolu SAYILMAZ, yeni kilit transaction içinde
  benzersiz indeksle konur, iki kişi aynı anda talip olursa biri **409** alır
- Bilet siparişi: durumu doğrudan `Teslim edildi`, **iptal edilemez**
- Teknik borç **#40**: sepet satırı bugün ETKİNLİĞE bağlı, koltuğa değil —
  bu adımda `SeatReservation` kaydına bağlanacak

### Bu adımda özellikle dikkat

- `src/config/navigation.ts` → etkinlik kartının `href`'i hâlâ `null`; açılınca
  buraya `/etkinlikler` (veya seçtiğin adres) yazılacak
- **`tests/e2e/layout.spec.ts` içindeki "açılmamış hizmet tıklanabilir bağlantı
  değildir" testi şu an ETKİNLİK kartını örnek alıyor.** Etkinlik bu adımda
  açılınca örneği **destek** kartına taşı, testi SİLME (bu üçüncü taşıma)
- Koltuk kilidi yazarken **koşullu UPDATE** deseni: "önce boş mu bak, sonra
  yaz" iki adımdır ve yarışı çözmez (adım 6, 7, 8, 10'un dersi)
- Bilet siparişi **zaman çizgisine girmez** (ADR-013): `ORDER_TIMELINE_RULES`
  içinde `ticket: null` — yeni bir modül eklenirse tabloya satır ekle

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/catalog/`** — ORTAK katalog katmanı: arama kutusu, kategori
  şeridi, boş durum, adres parametresi şeması ve Türkçe `unaccent` araması.
  Yeni bir liste ekranı yazacaksan buradan başla
- **Sepet katmanı** (`src/features/cart/`) ve **ödeme katmanı**
  (`src/features/payment/`): `checkout.service.ts` siparişleri modül başına ve
  tek transaction'da yazıyor
- **`src/features/orders/`** — sipariş listesi, durum türetme
  (`order-timeline.ts`) ve iptal. **Durum kural tablosu burada**
- **`src/features/notifications/`** — bildirim yazma ve tembel senkronizasyon.
  Yeni bir bildirim türü (`seat_hold_expired` enum'da HAZIR) eklenecekse
  `order-notification.service.ts`'in desenine bak
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
  set 10 teste kadar kırmızı verdi; tek tek koşunca hepsi yeşildi. **Önce
  `uptime` bak**, 3'ün altına inmesini bekle, sonra tek sefer koş
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **E2E'nin ürettiği sepet/sipariş verisini temizle.** Sipariş temizliğinde
  SIRA: `refund → orderItem → order → notification → payment → cartItem → cart`
  (iade siparişe ve ödemeye `Restrict` ile bağlı)
- **Her Playwright projesine (masaüstü / 375px) AYRI test hesabı ver.**
  Kullanılmış hesaplar: `nurcan.yilmaz3`, `burak.tas2`, `mehmet.duman7`,
  `arda.aydin9`, `gamze.toprak8`, `baris.ates10`. Boşta kalanlar:
  `emre.arslan1` (personel), `ipek.kurt4`, `ferhat.tunc5`, `nazli.mentes6`

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- **`getByText(<modül adı>)` de çok eşleşir** → `getByRole("heading")` kullan
- **`getByText("İptal edildi")` ÇOK EŞLEŞİR**: hem durum rozetinde hem
  "İptal edildi: <tarih>" satırında geçiyor → `exact: true` (adım 10'da yandı)

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**
- Yazım hatası toleransı YOK (borç #44)

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Teslimat ücreti modül başına bir KURAL TABLOSUNDAN okunuyor**
  (`cart-pricing.ts` → `DELIVERY_RULES`)

**Zaman ve durum (adım 10'un dersi)**
- **Sipariş durumu `orders.status` kolonunda DEĞİL** — siparişin yaşından
  hesaplanıyor (ADR-013). Kolona doğrudan bakan sorgu akmakta olan siparişi
  "Alındı"da görür. Durum okuyan her yol `deriveOrderState`'ten geçmeli
- **`tests/db/` içinde sahte saat kullanırken `orders.created_at`'i de
  sabitle.** Kolon veritabanının varsayılanından (gerçek şimdi) geliyor; testin
  `now`'u ileride ise sipariş daha doğduğu anda "teslim edilmiş" görünür
  (adım 10'da 9 test bu yüzden kırmızı oldu, `pinCreatedAt` yardımcısı yazıldı)

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu UPDATE
  kullan ve etkilenen satır sayısına bak
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 10'da iki koruma böyle ölçüldü (IDOR → 403 testi kırmızı; zaman penceresi
  → önce YEŞİL kaldı çünkü koşullu UPDATE ikinci kemer olarak tuttu, ikisi
  birden kaldırılınca kırmızıya döndü). Bu ölçüm, iki katmanın gerçekten iki
  katman olduğunu kanıtladı

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **`next/image` `.svg` kaynağında optimizasyonu KENDİLİĞİNDEN atlıyor**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır. **Dev modda bu tazeleme yeniden derleme yüzünden
  saniyeler sürebilir**; prod build'de anlık (adım 10'da elle testte yanıltıcı
  göründü, E2E'de sorunsuzdu)

**Test**
- Sunucu tarafı test dosyalarına `/** @vitest-environment node */` docblock'u ŞART
- **İş kuralı testlerini `tests/db/` içinde GERÇEK veritabanına karşı yaz**
- **Vitest'te hata sınıflarını test gövdesinin İÇİNDE `await import()` etme**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi.** Onay gerektiren
  işlemlerde kartın içinde açılan satır içi onay kullanılıyor (randevu ve
  sipariş iptali aynı deseni paylaşıyor)
- **Dar kapsayıcıya konan bileşen taşabilir.** Ölçüsü:
  `document.documentElement.scrollWidth > clientWidth`. Giriş gerektiren
  sayfalarda bu ölçüm `layout.spec.ts`'e konamaz (orası girişsiz koşuyor) —
  ilgili spec dosyasının içine koy (`orders.spec.ts` örneği)
- **Olmayan renk token'ı uydurma.** `warning` yok
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- `migrate dev` üretilen istemciyi tazelemiyor → `npx prisma generate`
- **`migrate dev` iki dosyayı KENDİLİĞİNDEN değiştiriyor** ve ikisi de adım 10
  ile ilgisizdi: `prisma/migrations/migration_lock.toml` (projenin Türkçe
  yorumunu kendi standart yorumuyla eziyor) ve seed'in ürettiği
  `docs/project/test-hesaplari.md` (doğum tarihleri bugüne göre kayıyor).
  **Commit etmeden önce `git status`'a bak ve ikisini `git checkout` ile geri al**

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
