# Sonraki oturum için hazır prompt — adım 15c

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 15c bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **15c**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/PRD.md` §5.0 ve §3 — kimlik kademeleri ve Google akışı
- `docs/project/decisions/ADR-005.md` — oturum kararı · Google için 4c notları
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 15 ve 15b bitti.** Hakkımızda sayfası çalışıyor.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** çalışıyor
- **Hakkımızda** çalışıyor ve **CANLIDA** (2026-08-10, commit `9d64199`):
  `/hakkimizda` — kurum bilgileri, teşkilat şeması (açılır kapanır ağaç),
  100 kişilik personel rehberi. **Giriş gerektirmiyor**
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31.
  **⚠️ ADIM 15c'DE İKİSİ DE ZORUNLU** — bu adım hem girişe hem Google'a
  dokunuyor. (Adım 15b'de bilerek eklenmedi: o sayfa giriş gerektirmiyordu.)
  **⚠️ Turnstile listesi 10 sınırına dayandı** — panele girildiğinde merge
  edilmiş dalların satırları toplu silinmeli (`altyapi-durumu.md`)

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi 2026-08-10'da **"hepsini sonraki oturumda topluca test edeyim"**
> dedi. Bekleyen dört elle doğrulamanın **tamamı** aşağıda, tek seferde
> koşulacak biçimde sıralı. Kod yazmadan önce bunu ona hatırlat ve
> **"şimdi mi yapalım, sonra mı?"** diye sor — cevabı "sonra" ise bu bölümü
> olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73**.
> Tamamlananları bu listeden ve roadmap'ten SİL, yarım kalanı bırak.

**Nerede:** https://benim-belediyem.vercel.app (production) · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → "Örnek üye hesapları", şifre
`Test1234!`. **Personel olan bir hesap seç** (tabloda "✔ evet") — hastane ve
spor salonu ekranları yalnızca personele açık.
⛔ **#13 Aslı Avcı ve #14 Ege Kurt production'da YOK** (tohum 2026-08-01), onları seçme.

### ⏱️ ADIM 0 — ÖNCE SAYAÇLARI BAŞLAT (sonra beklemeyesin)

İki doğrulama gerçek zamanda bekleme istiyor. Onları **en başta** tetikle,
bekleme süresini diğer testlerle doldur:

1. **Sipariş oluştur** (borç #50): **RESTORAN'dan** sipariş ver — restoran
   eşiği **10 dakika**, markette **20 dakika** (`order-timeline.ts`, koddan
   doğrulandı). Adisyona bir yemek ekle → Sepet → Öde → adres seç/ekle →
   sahte kart **`4111 1111 1111 1111`** (projenin başarılı test kartı; `…0002`
   ve `…9995` bilerek BAŞARISIZ döner), son kullanma ileri bir tarih, CVV üç hane
   → ödemeyi tamamla. **Saati not et.** Sipariş `Alındı` olmalı ve
   **iptal düğmesi görünmeli**
2. **Destek talebi oluştur** (borç #62): Destek → yeni talep → konu + açıklama
   → gönder. **Saati not et.** Talep `Açık` durumunda olmalı

### A) ADIM 15 — PROFİL EKRANLARI (borç #73)

1. **Hesabım** → "Kayıtlarım" ve "Hesap ayarları" bölümleri görünüyor mu
2. **Teslimat adreslerim** → yeni adres ekle → sonra **Düzenle** ile başlığını değiştir
3. Aynı adreste **Sil** → onay kutusu çıkıyor mu → "Evet, sil" → liste güncelleniyor mu
4. **Kayıtlı kartlarım** → adım 0'da kullandığın kart burada mı ve
   **tam numara hiçbir yerde görünmüyor mu** (yalnızca son 4 hane)
5. Kartı kaldırmayı dene → onay metni çıkıyor mu (spor salonu üyeliğin varsa
   ek uyarı da görünmeli)

### B) ADIM 15b — HAKKIMIZDA (borç #73)

1. `/hakkimizda` → şemadaki oklara dokun, birimler açılıp kapanıyor mu
2. **"Bilgi İşlem Dairesi Başkanlığı personelini listele"** → 100 kişi geliyor mu
3. **"İtfaiye Dairesi Başkanlığı"** → "henüz yayınlanmadı" mesajı çıkıyor mu
4. Arama kutusuna bir personel adını **BÜYÜK HARFLE** yaz → yine buluyor mu
5. Şema satırları taşıyor mu — sayfa **yana kayıyor mu** (kaymamalı)

### C) HER İKİ EKRAN İÇİN ORTAK

1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da metinler okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px olmalı)

### D) ⏱️ SAYAÇLARA GERİ DÖN

1. **Restoran siparişinden 10 dakika sonra** (borç #50): `/siparislerim` →
   sipariş **`Hazırlanıyor`** durumuna geçmiş olmalı ve **iptal düğmesi
   kaybolmalı**. (Market siparişi verdiysen süre **20 dakika**.)
   İstersen 25. dakikada tekrar bak: **`Yolda`** olmalı
2. **Talepten 30 dakika sonra** (borç #62): `/destek` → talep
   **`İnceleniyor`** durumuna geçmiş olmalı.
   (`Çözüldü` eşiği 180 dakika — o kadar beklemeye gerek yok)

> **Neden bekleme gerekiyor:** durumlar veritabanında bir kolonda tutulmuyor,
> **okuma anında zamandan türetiliyor** (ADR-013). Yani "ilerleme" ancak gerçek
> saat ilerleyince görülebiliyor; otomatik testlerde saat taklit ediliyor.

## ADIM 15b'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/organization/` YENİ BİR ÖZELLİK KLASÖRÜ.** İçinde:
  `services/org-tree.ts` (SAF ağaç kurma), iki repository, bir şema, üç bileşen
- **AĞAÇ TEK SORGUYLA KURULUYOR, ÖZYİNELEMELİ SQL YOK.** 35 birim tek
  `findMany` ile okunuyor, hiyerarşi bellekte kuruluyor. Yeni bir ağaç
  gerekirse bu deseni kopyala; `WITH RECURSIVE` yazma
- **PERSONEL SAYISI ALT BİRİMLERİ DE KAPSIYOR** (`totalStaffCount`). Daireye
  tıklayan kullanıcı 1 değil 100 kişi görüyor; alt birim kimlikleri
  `collectUnitIds()` ile bellekteki ağaçtan geliyor
- **`DIRECTORY_SELECT` DIŞARI AÇIK ve bu bir KARAR** (`staff.repository.ts`):
  sorgunun okuduğu alan listesi test edilebilir olmalı. Sorguya gömülü bir
  `select` nesnesine `nationalIdHash: true` eklense hiçbir test kırmızıya
  dönmezdi — ölçüldü. Kullanıcıya ait yeni bir liste sorgusu yazarken bu deseni
  düşün
- **ARAMA KATMANI ARTIK KATALOGA ÖZEL DEĞİL**: `SearchableCatalog` tipi
  `SearchableTable` oldu ve `staff_members` dalı eklendi. Aksan körü arama
  gereken her tablo buradan geçer
- **`<details>` AĞACI İSTEMCİ BİLEŞENİ DEĞİL** — açma/kapama tarayıcının işi.
  `role="tree"` BİLEREK kullanılmadı (ok tuşu yükümlülüğü doğurur)
- **ŞEMADA VARSAYILAN 4 KADEME AÇIK GELİYOR** ve bu tarayıcıda ölçülerek
  seçildi: 3 kademede dolu dairenin "personelini listele" bağlantısı kapalı
  kutuda kalıyordu
- **ÜST BİRİMİN BAĞLANTISI EYLEM OLARAK YAZILIYOR** ("… personelini listele"),
  birim adı olarak değil: adı ikinci kez yazmak satırı kopyalanmış gösteriyordu
- **KURUMSAL E-POSTA ARANMIYOR ve bu bir KARAR** — arama kutusu bir e-posta
  doğrulayıcısına dönmesin diye yalnızca ad taranıyor
- **`docs/project/test-hesaplari.md` bu adımda ÜRETİLMEDİ** — Hakkımızda hiç
  hesap kullanmıyor. Yeni test hesabı da AÇILMADI

## YAPILACAK — roadmap adım 15c

"Profilden Google bağlantısı ekleme/kaldırma + Google ile girenin KPS doğrulaması"
(teknik borç **#32** ve **#33**)

Dal: `feature/google-baglantisi` (öneri)

### Bu adımda özellikle dikkat

- **Bu adım GİRİŞ ve KİMLİK akışına dokunuyor** — CLAUDE.md §3 kapı 3
  (`security-and-hardening` + `security-auditor`) burada gerçekten kritik
- Roadmap teknik borç **#32 ve #33**'ü oku; ADR-005 ve adım 4c'nin OAuth
  notları `altyapi-durumu.md` içinde
- **Hesap birleştirme kuralı zaten var** (adım 4c) — yeniden tasarlama, oku
- Google **"Testing" modunda**: yalnızca *Audience → Test users* listesindeki
  e-postalar giriş yapabiliyor
- **İstemci parolası yenilenmedi** (kurulumda ekran görüntüsüyle sohbete girdi).
  Canlıya açılmadan önce *Clients → Add secret* ile yenilenmesi temiz olur

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/organization/`** — ağaç kurma + herkese açık okuma ekranı deseni
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ:
  koşullu yazma + sahiplik `WHERE`'de + yumuşak silme + denetim kaydı
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
- **`src/features/identity/`** — KPS sorgusu ve personel eşleştirmesi
- **`src/features/catalog/`** — ORTAK arama katmanı, Türkçe `unaccent` araması
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`src/features/profile/components/RecordLinkCard.tsx`** — tıklanabilir kapı kartı
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
  ÜRETEBİLİYOR** (doğum tarihleri bugüne göre kayıyor). **Commit etmeden önce
  `git status`'a bak** — gerçek değişiklik yoksa `git checkout` ile geri al
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER.** İstisna: hiçbir şey
  YAZMAYAN spec'ler (adım 15b'deki gibi) paylaşılan kaynak gerektirmez
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit` (`users.staff_member_id` Restrict)
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6` ·
  `asli.avci93`, `ege.kurt94`. **BOŞTA HESAP KALMADI** — yeni hesap gerekirse
  tohuma eklenmeli (adım 15'te #13/#14 böyle eklendi, listenin SONUNA)

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR** (menü, alt
  bilgi). Çözüm: `<ul>`'a `aria-label` ver, `getByRole("list", { name })` ile daralt
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ.**
  **Ayrı bilgiyi ayrı elemana koy** (`dt`/`dd` gibi)
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır** — adım 15b'de test
  kırmızıya dönmeden önce tarayıcıda fark edildi

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur

**Sınır ve bütçe testleri**
- ⚠️ **İKİ SINIR BİRBİRİNİ MASKELEYEBİLİR** (adım 15): bütçeyi GÜNCELLEMEYLE
  tüket, kayıt sayısı sabit kalsın

**Dış servis çağrısı (adım 14)**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır**

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
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR**

**Next.js**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK** —
  vurgulu bilgi için `text-brand-accent`, hata için `text-destructive`
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`)
- **Gövde metni en az 16px** (`text-base`); etiket, sayaç ve yardım metni gibi
  İKİNCİL metinler 14px kalabilir
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
  oluştur → `npx prisma migrate deploy` → `npx prisma generate`
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **PostgreSQL enum'ları TANIMLANMA SIRASINA göre sıralar** — `orderBy` ile
  hiyerarşik sıralama bedava gelir (adım 15b'de personel unvanları böyle sıralandı)
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Adım 15b'de preview ilk denemede patladı; çözüm `npx vercel redeploy
  <dagitim-url> --scope barisss` (ilk bağlantı denemesi zaten veritabanını
  uyandırıyor, ikinci deneme geçiyor). **`vercel redeploy`'a panel adresini
  (`vercel.com/...`) DEĞİL dağıtım adresini (`*.vercel.app`) ver** — panel
  adresiyle "Can't find the deployment" diyor.
  Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
  **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği. ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı**;
  ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR**, hiç kullanma
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
  — ekran görüntüsü/anlık görüntü yolu proje klasöründe olmalı, sonra sil
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
