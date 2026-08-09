# Sonraki oturum için hazır prompt — adım 15

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 15 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **15**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.11 ve §5.0 — profil sayfasının iş kuralları
- `docs/project/data-model.md` — `User`, `Address`, `SavedCard` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 14 bitti.** Bilgi panosu çalışıyor.

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
- **Destek talebi** çalışıyor: `/destek`, `/destek/<id>` — dosya yükleme
- **Bilgi panosu** çalışıyor (anasayfa altı): hava, haber, piyasa —
  **projenin ilk gerçek dış API çağrıları**. Canlıda gerçek veriyle doğrulandı:
  hava 34°, USD 47,7099 ₺, BTC 3.109.296 ₺, 5 TRT Haber başlığı
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31.
  **⚠️ Turnstile listesi 10 sınırına dayandı** — panele girildiğinde merge
  edilmiş dalların satırları toplu silinmeli (`altyapi-durumu.md`)

## ⏰ OTURUM SONUNDA HATIRLAT — proje sahibinin bekleyen işleri

**Şu an bekleyen telefon testi YOK.** Proje sahibi bilgi panosunu 2026-08-09'da
preview'da ve telefonundan denedi — üç kart da temiz, haber bağlantıları
açılıyor, koyu tema okunabilir. Adım 14 canlıya alındı (commit `383a1df`).

**Adım 15'te yeni ekran geleceği için telefon testi yine gerekecek** — commit
önerisini sunarken hangi ekranın deneneceğini yaz.

⚠️ **20 dakika bekleme gerektiren iki iş PROJE SONUNA bırakıldı** (borç #50 ve
#62): sipariş durumunun ve destek talebi durumunun zamanla ilerlediği canlıda
elle görülmedi. **Adım 18'de tek oturumda birlikte bakılacak.** Bunları her
adımda tekrar hatırlatma — proje sahibi bilinçli olarak erteledi.

## ADIM 14'TEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **DIŞ SERVİS ÇAĞRISI İÇİN HAZIR KATMAN VAR: `src/lib/external-fetch.ts`.**
  Zaman aşımı + 2 yeniden deneme + sağlayıcı başına devre kesici + Zod
  doğrulaması. **Yeni bir dış servis eklenirse buradan geç, `fetch`'i elle
  çağırma.** `429` bilerek yeniden DENENMİYOR
- **ÖNBELLEK POSTGRES'TE, Next.js `revalidate` DEĞİL** (ADR-015). Sebep:
  `revalidate` sahte saatle test edilemiyor ve **sağlayıcı çökünce eski veriyi
  sunamıyor**. `loadCachedExternalData()` üç durumu birden yönetiyor
- **Bilgi widget'ları HİÇBİR ANAHTAR İSTEMİYOR** (ADR-016). `NEWS_API_KEY` ve
  `NEWS_API_PROVIDER` şemadan **kaldırıldı** — "anahtar girilmesi gerekiyor"
  sanma
- **Adım 14'te ŞEMA DEĞİŞTİ** — yeni `external_data_cache` tablosu. Migration
  geriye uyumlu, veri silmiyor, Vercel deploy'da kendiliğinden uygulanıyor
- **`src/lib/rss.ts` GENEL BİR XML AYRIŞTIRICI DEĞİL.** Yalnızca RSS 2.0'ın
  `<item>` listesini ve üç alanı tanır; başka biçim verilirse boş liste döner
- **Uzak ortamlarda tohumlama GÜNCEL DEĞİL.** Adım 12'de tohuma iki demo
  personel hesabı eklendi (#11 Zehra Kılıç, #12 Esra Arslan) ve preview /
  production'da bu hesaplar YOK
- ⛔ **Doktor saatleri (borç #38) uzak ortamlarda tükendi sayılır** —
  tohumlama 2026-08-01, pencere 14 gün. Yeni bir seed koşusu DÜZELTİR.
  **Etkinlikler DÜZELMEZ** — kimlik sabit (`seed-event-0001…12`),
  `skipDuplicates` mevcut satırları atlıyor ve liste ~2026-09-30'da boşalıyor

## YAPILACAK — roadmap adım 15

"Profil sayfası: tüm kayıtların tek yerden yönetimi"

Dal: `feature/profil-sayfasi` (öneri)

### Bu adımda özellikle dikkat

- **`/hesabim` ZATEN VAR** ve adım 4b-2'den beri çalışıyor. Bu adım onu
  sıfırdan yazmak değil, **genişletmek** — önce mevcut sayfayı oku
- **Teknik borç #35 burada ödenebilir:** kimlik doğrulama ekranlarının
  tipografisi (`/giris`, `/kayit`, `/hesabim`, `/sifremi-unuttum`) hâlâ
  `text-sm` kullanıyor; standart en az 16px istiyor
- Adres ve kayıtlı kart yönetimi **kişisel veri** demek: her sorguda sahiplik,
  her yazmada denetim kaydı (`recordAuditLog`)
- **Kart numarası hiçbir yerde açık tutulmuyor** — mevcut `SavedCard` desenine
  bak, yeni bir saklama biçimi icat etme

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/features/info-widgets/services/cached-external-data.ts`** — dış veri
  önbelleği; taze / bayat / hata üç durumu tek yerde (ADR-015)
- **`src/lib/rss.ts`** — minimal RSS 2.0 okuyucu (ADR-016)
- **`src/lib/circuit-breaker.ts`** — dış servis çökünce açılan devre (ADR-010)
- **`src/lib/file-storage.ts`** — dosya depolama adaptörü (ADR-014)
- **`src/lib/file-upload.ts`** — dosya türü BAYT İMZASINDAN doğrulama
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/support/`** — saf durum türetme + sahiplik sorgunun içinde
- **`src/features/gym/`** — abonelik ve dönem aritmetiği deseni
- **`src/features/events/`** — 10 dakikalık kilit ve **YARIŞ KORUMASI DESENİ**
- **`src/features/catalog/`** — ORTAK katalog katmanı, Türkçe `unaccent` araması
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`src/components/layout/ServiceTile.tsx`** — ana sayfa hizmet kartı
- **`src/features/info-widgets/components/WidgetCard.tsx`** — yükleniyor /
  bayat / hata üç durumunu taşıyan ortak kart kabuğu
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
  bekle, sonra koş. **Kırmızı görünce ÖNCE YÜKE BAK.** Adım 14'te `google-login`
  spec'i tam sette 4 test düşürdü, tek başına koşturulunca 18/18 yeşil geldi —
  o spec Google'ın `.well-known` belgesini ağdan okuyor ve yük altında
  kararsızlaşıyor
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (doğum tarihleri bugüne göre kayıyor). **Commit etmeden önce
  `git status`'a bak** — gerçek değişiklik yoksa `git checkout` ile geri al.
  Adım 14'te yine oldu
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER** — ama bilgi
  panosunda bu MÜMKÜN DEĞİL: önbellek anahtarları `constants.ts` içinde sabit.
  Çözüm: iki proje de AYNI değerleri yazıyor (yarış zararsız) ve satırlar
  testten sonra **silinmiyor** (silen taraf, okuyan tarafı kırardı)
- **E2E'nin ürettiği veriyi temizle.** Sipariş temizliğinde SIRA:
  `refund → orderItem → order → notification → payment → cartItem → cart`.
  **Üyelikte SIRA: `membershipPayment → membership → notification → savedCard`**
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6`.
  **BOŞTA HESAP KALMADI** — yeni modül ayrı hesap isterse tohuma eklemek gerek

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- **`getByRole("heading", { name: "Tesis" })` de ÇOK EŞLEŞİR**
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`).
  Adım 14'te üç widget da adlandırılmış `<section>` olduğu için bu kolaydı
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ.**
  Adım 14'te sıcaklık `<p>37°<span>İzmir</span></p>` biçimindeydi; en dar
  kapsayıcının metni "37°İzmir" olduğu için test bulamadı. **Ayrı bilgiyi ayrı
  elemana koy** — hem ekran okuyucu hem test için doğrusu bu
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA KULLANMA**

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur. Üyelik, destek talebi ve **dış veri
  önbelleği** (adım 14 — `key` üzerinden) bu yüzden başka alandan siliniyor

**Dış servis çağrısı (adım 14)**
- **`429` YENİDEN DENENMEZ** — sınıra takılmışken tekrar sormak sınırı
  derinleştirir. Kaybedilen tur bayat veriyle kapatılır
- **Sağlayıcının paralel dizileri farklı uzunlukta gelebilir** (Open-Meteo).
  En kısasına göre kes, yoksa ekrana `NaN` çıkar
- **Önbelleğe HAM GÖVDE yazma**, sadeleştirilmiş şekil yaz — sağlayıcı şeması
  değişirse hata ayrıştırmada görünsün, ekran çizilirken değil
- **Önbellekten OKURKEN de Zod çalıştır**: satır önceki sürümün şeklinde olabilir

**Dosya yükleme (adım 13)**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME** — tür baytların imzasından doğrulanır
- **TEST İÇİN GEÇERLİ BİR GÖRSEL ÜRET** (`sips -g pixelWidth <dosya>`)
- **`next/image` YETKİLİ bir uçtan görsel çekerken `unoptimized` ŞART**

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Tutar İSTEMCİDEN ALINMAZ**
- ⚠️ **DÖVİZ KURU PARA DEĞİLDİR** (adım 14): iki para birimi arasındaki oran
  kuruşa yuvarlanmaz. `money.ts` yalnızca TUTARLAR için

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013)
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **`tests/db/` içinde sahte saat kullanırken kayıt tarihlerini de sabitle**
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN**
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 14'te iki koruma böyle ölçüldü (taze önbellek ve bayat yaş sınırı)

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **`FormData.get` alan yoksa `null` döner**, `undefined` değil

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi**
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK** (adım
  14'te `text-success` yazıldı ve geri alındı — artış `text-brand-accent`,
  azalış `text-destructive`)
- Tailwind v4 kanonik biçimi `aspect-4/3`, `aspect-[4/3]` değil
- Dokunma hedefleri en az 44px (`min-h-11`)
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü **Playwright `mobile-375` projesiyle** yap

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR.** İzlenen yol:
  `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` ile SQL üret → migration klasörünü elle
  oluştur → `npx prisma migrate deploy` → `npx prisma generate`.
  ⚠️ **`--to-schema-datamodel` bayrağı KALDIRILMIŞ**, `--to-schema` kullan
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
  betiği. ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı** — `tsx -e` ile
  satır içi kod "top-level await CJS'te desteklenmiyor" hatası veriyor
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
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
