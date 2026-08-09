# Sonraki oturum için hazır prompt — adım 15b

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 15b bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **15b**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` — "Hakkımızda" ve teşkilat şemasının iş kuralları
- `docs/project/data-model.md` — `OrgUnit`, `StaffMember` alanları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 15 bitti.** Profil sayfası çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** çalışıyor: branş → doktor → gün → saat, alma ve iptal
- **Ortak sepet + ödeme** çalışıyor: ziyaretçi sepeti, girişte birleştirme,
  modül başına teslimat ücreti, Luhn + sahte kart sağlayıcısı
- **Belediye Market** ve **Belediye Restoran + adisyon** çalışıyor
- **Sipariş takibi + bildirim** çalışıyor: `/siparislerim`, `/bildirimler`
- **Etkinlik + koltuk seçimi + bilet** çalışıyor: 10 dakikalık kilit
- **Spor salonu üyeliği** çalışıyor: dört paket, aylık tahsilat, iptal
- **Destek talebi** çalışıyor: `/destek`, `/destek/<id>` — dosya yükleme
- **Bilgi panosu** çalışıyor (anasayfa altı): hava, haber, piyasa — gerçek dış API
- **Profil merkezi** çalışıyor: `/hesabim` + `/hesabim/adreslerim` +
  `/hesabim/kartlarim`. Adres CRUD, kart kaldırma, iki silme de YUMUŞAK
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31.
  **⚠️ Turnstile listesi 10 sınırına dayandı** — panele girildiğinde merge
  edilmiş dalların satırları toplu silinmeli (`altyapi-durumu.md`)

## ⏰ OTURUM SONUNDA HATIRLAT — proje sahibinin bekleyen işleri

⚠️ **20 dakika bekleme gerektiren iki iş PROJE SONUNA bırakıldı** (borç #50 ve
#62): sipariş durumunun ve destek talebi durumunun zamanla ilerlediği canlıda
elle görülmedi. **Adım 18'de tek oturumda birlikte bakılacak.** Bunları her
adımda tekrar hatırlatma — proje sahibi bilinçli olarak erteledi.

## ADIM 15'TEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **ADRES VE KART SORGULARI ARTIK ÖDEMEDE DEĞİL.**
  `src/features/profile/repositories/address.repository.ts` ve
  `saved-card.repository.ts`. İkisi de kullanıcıya ait kayıt; ödeme onları
  KULLANIYOR ama sahibi değil. `payment.repository.ts` artık yalnızca
  `payments`, `orders`, `order_items` ve stok
- **SAHİPLİK SORGUNUN `WHERE` KOŞULUNDA, sonradan `if` DEĞİL.** Koşullu
  `updateMany` + etkilenen satır sayısı deseni. Yeni bir kullanıcı kaydı
  eklenecekse bu deseni kopyala
- **İKİ SİLME DE YUMUŞAK** (`deleted_at`): sert silme MÜMKÜN DEĞİL, geçmiş
  sipariş adrese / geçmiş ödeme ve üyelik karta `Restrict` ile bağlı
- **PROFİLDEN KART EKLENEMEZ ve bu bir KARAR.** Kart yalnızca gerçek ödeme
  sırasında sahte sağlayıcıdan geçtikten sonra kaydediliyor (PRD §6.2).
  Ekranda nedeni yazıyor — "eksik" sanıp eklemeye kalkma
- **PROFİLDE KAYIT SAYACI YOK ve bu da bir KARAR** (borç #70): sipariş, destek
  ve üyelik durumları okuma anında türetiliyor (ADR-013), ham sayı yanıltıcı
  olurdu. Adres ve kart sayaçları VAR — onların durumu türetilmiyor
- **TOHUMA İKİ DEMO HESAP EKLENDİ** (#13 Aslı Avcı `97425842292`, #14 Ege Kurt
  `98987802090`). Listenin **SONUNA** eklendi, 1-92 arası hiçbir hesap kaymadı.
  ⛔ **İkisi de profil E2E'sine ayrılmış — başka spec'te KULLANMA**
- ⛔ **Uzak ortamlarda tohumlama GÜNCEL DEĞİL.** Adım 12'de #11/#12, adım 15'te
  #13/#14 eklendi; preview ve production'da bu **dört hesap YOK**
- ⛔ **Doktor saatleri (borç #38) uzak ortamlarda tükendi sayılır** —
  tohumlama 2026-08-01, pencere 14 gün. Yeni bir seed koşusu DÜZELTİR.
  **Etkinlikler DÜZELMEZ** — kimlik sabit (`seed-event-0001…12`),
  `skipDuplicates` mevcut satırları atlıyor ve liste ~2026-09-30'da boşalıyor

## YAPILACAK — roadmap adım 15b

"Hakkımızda: teşkilat şeması + 100 kişilik personel rehberi"

Dal: `feature/hakkimizda` (öneri)

### Bu adımda özellikle dikkat

- `org_units` (35 satır) ve `staff_members` (100 satır) **adım 3'ten beri
  tohumlu** — yeni migration muhtemelen GEREKMİYOR, önce şemayı oku
- Teşkilat şeması **ağaç** yapısı: kendine referans veren `parentId`. Derin
  özyineleme yerine tek sorgu + bellekte ağaç kurmak daha ucuz
- **`staff_members` KİŞİSEL VERİ TAŞIMIYOR** (data-model.md: cep telefonu,
  adres, doğum tarihi TUTULMAZ) — rehbere yeni alan eklemeden önce
  "neden, ne kadar süre, kim erişir" sorusunu cevapla
- Sayfa **giriş gerektirmiyor** olmalı (ziyaretçiye açık) — erişim kademesini
  PRD §5.0 tablosundan doğrula
- **100 kişilik liste** performans sorusu doğurur: arama/sayfalama gerekiyor mu?
  Ortak katalog arama katmanı (`src/features/catalog/`) hazır

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ:
  koşullu yazma + sahiplik `WHERE`'de + yumuşak silme + denetim kaydı
- **`src/features/catalog/`** — ORTAK katalog katmanı, Türkçe `unaccent` araması
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/features/info-widgets/services/cached-external-data.ts`** — dış veri
  önbelleği; taze / bayat / hata üç durumu tek yerde (ADR-015)
- **`src/lib/rss.ts`** · **`src/lib/circuit-breaker.ts`** · **`src/lib/file-storage.ts`**
- **`src/lib/file-upload.ts`** — dosya türü BAYT İMZASINDAN doğrulama
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/support/`** — saf durum türetme + sahiplik sorgunun içinde
- **`src/features/gym/`** — abonelik ve dönem aritmetiği deseni
- **`src/features/events/`** — 10 dakikalık kilit ve **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`src/components/layout/ServiceTile.tsx`** — ana sayfa hizmet kartı
- **`src/features/profile/components/RecordLinkCard.tsx`** — tıklanabilir kapı kartı
- **`src/features/info-widgets/components/WidgetCard.tsx`** — üç durumlu kart kabuğu
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
  bekle, sonra koş. **Kırmızı görünce ÖNCE YÜKE BAK.**
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (doğum tarihleri bugüne göre kayıyor). **Commit etmeden önce
  `git status`'a bak** — gerçek değişiklik yoksa `git checkout` ile geri al
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER.** Adım 15'te bu iki
  yeni tohum hesabı gerektirdi (`asli.avci93`, `ege.kurt94`)
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME.** Profil
  spec'i testin eklediği adresi siliyor (`isSeedData: false`) ve testin
  sildiği tohum kartının `deletedAt`'ini `null`'a çeviriyor. Yumuşak silme
  onarımı mümkün kılıyor; sert silseydi tohumu yeniden koşturmak gerekirdi
  (`createMany({skipDuplicates})` mevcut satırı atlar, geri getirmez)
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6` ·
  `asli.avci93`, `ege.kurt94`. **BOŞTA HESAP KALMADI**

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR** (menü, alt
  bilgi). Adım 15'te çözüm: `<ul>`'a `aria-label` verildi ve arama
  `getByRole("list", { name: ... })` ile daraltıldı — hem test hem ekran
  okuyucu için doğrusu bu
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ.**
  **Ayrı bilgiyi ayrı elemana koy**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA KULLANMA.** Aynısı erişilebilir AD için de
  geçerli: adım 15'te kart listesinin adı sayfa başlığından farklı seçildi

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur

**Sınır ve bütçe testleri**
- ⚠️ **İKİ SINIR BİRBİRİNİ MASKELEYEBİLİR** (adım 15): adres üst sınırı 20,
  yazma bütçesi 30. Bütçeyi yalnızca EKLEYEREK ölçmek imkânsız — 20'de adres
  sınırı önce dolar ve test yanlış hatayı yakalar. Çözüm: bütçeyi
  GÜNCELLEMEYLE tüket, kayıt sayısı sabit kalsın

**Dış servis çağrısı (adım 14)**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır** · sağlayıcı dizileri farklı uzunlukta gelebilir

**Dosya yükleme (adım 13)**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME** — tür baytların imzasından doğrulanır
- **`next/image` YETKİLİ bir uçtan görsel çekerken `unoptimized` ŞART**

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` kombinasyonunu KULLANMA.**
  `findIdsMatchingQuery` (`catalog-search.repository.ts`) çağır
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**

**Para**
- **Ondalık sayıyla para hesaplama.** Her yerde tam sayı kuruş
- **Tutar İSTEMCİDEN ALINMAZ** · **DÖVİZ KURU PARA DEĞİLDİR**

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013)
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN**
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR.**
  Adım 15'te iki sahiplik koruması böyle ölçüldü (adres ve kart)

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver —
  React bileşeni sıfırdan kurar ve unutulacak alan kalmaz (adım 15)
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan** — sunucu ve istemci aynı değeri üretir

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor (odak tuzağı/kaçış tuşu yükümlülüğü doğmuyor)
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK** —
  vurgulu bilgi için `text-brand-accent`, hata için `text-destructive`
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
  (`break-words` DEĞİL) — ESLint eklentisi uyarıyor
- Dokunma hedefleri en az 44px (`min-h-11`)
- **Gövde metni en az 16px** (`text-base`); etiket, sayaç ve yardım metni gibi
  İKİNCİL metinler 14px kalabilir (adım 15'te borç #35 böyle ödendi)
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
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR** (adım 15): PostgreSQL'de
  `DROP VALUE` yok. PG 12+ transaction içinde `ADD VALUE`'ya izin verir; şart,
  değerin AYNI transaction'da kullanılmaması
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
  satır içi kod "top-level await CJS'te desteklenmiyor" hatası veriyor;
  ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR**, hiç kullanma
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
