# Sonraki oturum için hazır prompt — adım 15c-2

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 15c-2 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **15c-2**'ye geçiyoruz. Başlamadan önce
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
- **Profilden Google bağlantısı** çalışıyor ve **CANLIDA** (2026-08-10, commit
  `40ca7c9`) — adım 15c-1, teknik borç #33 ÖDENDİ: `/hesabim` → "Giriş
  yöntemleri" kartı. Bağlama şifre istiyor, son giriş yöntemi kaldırılamıyor
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında ilk iş:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) **iki panele** ekle:
  Cloudflare Turnstile hostname listesi **ve** Google OAuth redirect URI
  listesi (sonuna `/api/auth/google/callback`). Teknik borç #31.
  **⚠️ ADIM 15c-2'DE TURNSTILE ZORUNLU** (KPS doğrulaması giriş gerektiriyor);
  Google satırı bu adımda ŞART DEĞİL — OAuth akışına dokunulmuyor.
  ⚠️ **Adım 15c-1'in dal adresleri iki panele de EKLENDİ** (proje sahibi
  2026-08-10'da yaptı); o dal merge edilince satırları silinebilir.
  **⚠️ Turnstile listesi 10 sınırına dayandı** — panele girildiğinde merge
  edilmiş dalların satırları toplu silinmeli (`altyapi-durumu.md`)

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi 2026-08-10'da **"hepsini sonraki oturumda topluca test edeyim"**
> dedi. Bekleyen dört elle doğrulamanın **tamamı** aşağıda, tek seferde
> koşulacak biçimde sıralı. Kod yazmadan önce bunu ona hatırlat ve
> **"şimdi mi yapalım, sonra mı?"** diye sor — cevabı "sonra" ise bu bölümü
> olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73** + adım 15c-1 giriş yöntemleri
> ekranı ve Turnstile panel temizliği.
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

### B2) ADIM 15c-1 — GİRİŞ YÖNTEMLERİ (yeni)

1. **Hesabım** → "Giriş yöntemleri" kartı görünüyor mu (Şifre: Tanımlı,
   Google: Bağlı değil)
2. "Google'a git" düğmesine **şifreni girmeden** bas → şifre alanı zorunlu mu
3. **Yanlış şifreyle** dene → "Şifreniz doğrulanamadı" diyor mu
4. Doğru şifreyle dene → Google'a gidiyor mu (bağlamayı tamamlaman ŞART DEĞİL;
   ⚠️ Google "Testing" modunda, yalnızca test kullanıcısı listesindeki
   e-postayla girilebilir)
5. Bağladıysan: kartta "Bağlı" + tarih görünüyor mu → **Bağlantıyı kaldır** →
   onay kutusu çıkıyor mu → kaldırınca "Bağlı değil"e dönüyor mu

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

### E) 🔧 PANELDE YAPILACAK TEK İŞ (tarayıcı, telefon değil)

**Cloudflare Turnstile → Hostname Management** listesini aç ve **merge edilmiş
dalların satırlarını sil.** Sınır 10 hostname ve liste sınıra dayandı; her yeni
adım bir satır ekliyor.

- **KALACAK:** `benim-belediyem.vercel.app` (production)
- **SİLİNECEK:** adı `benim-belediyem-git-feature-...` ile başlayan ve dalı
  merge edilmiş olan HER satır (google-ile-giris · sifre-sifirlama · market ·
  restoran · etkinlik-bilet · spor-salonu-uyeligi · destek-talebi ·
  bilgi-widgetlari · hakkimizda · google-baglantisi)
- Silmenin tek bedeli: o eski dalın preview adresine geri dönülürse orada bot
  kutusu çizilmez. Merge edilmiş dallarda böyle bir ihtiyaç yok.

⚠️ Ajan bu listeyi panelden GÖREMİYOR. Temizledikten sonra söyle ki
`altyapi-durumu.md` gerçeğe göre güncellensin.

> **Neden bekleme gerekiyor:** durumlar veritabanında bir kolonda tutulmuyor,
> **okuma anında zamandan türetiliyor** (ADR-013). Yani "ilerleme" ancak gerçek
> saat ilerleyince görülebiliyor; otomatik testlerde saat taklit ediliyor.

## ADIM 15c-1'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/auth/services/login-methods.ts` SAF KURAL DOSYASI**: "son
  giriş yöntemi kaldırılamaz" ve "bağlama şifre ister" kararları burada.
  Yeni bir giriş yöntemi (ör. telefon) eklenirse kural BU dosyada büyür
- **BAĞLAMA ŞİFRE İSTİYOR ve bu bir GÜVENLİK kararı**: çalınmış bir oturumla
  saldırgan kendi Google hesabını bağlarsa, kurban şifresini değiştirip tüm
  oturumları düşürse bile içeride kalırdı. Yeni bir "kalıcı erişim ekleyen"
  ekran yazılırsa aynı soruyu sor
- **KALDIRMADA ŞİFRE SORULMUYOR** ve bu da bir karar (borç #74): kaldırma yetki
  ARTIRIMI değil azaltımı
- **OAUTH ÇEREZİNE `mode` EKLENDİ** (`login` / `link`). ⛔ Mod İSTEMCİDEN
  GELMİYOR; çereze yazan yer ucun kendisi. Tanınmayan değer `login` sayılıyor
  (daha DAR yetkili akış)
- **CALLBACK BAĞLAMA AKIŞINDA İKİ ŞEY DOĞRULUYOR**: kullanıcı hâlâ girişli mi
  VE akışı başlatan kullanıcı mı. İkincisi olmasaydı araya giren bir hesap
  değişikliğinde bağlantı yanlış hesaba kurulurdu
- **DENETİM KAYDINA GOOGLE KİMLİĞİ YAZILMIYOR** (`entityId` null) — olayın
  kendisi yeterli, kişisel veri log'a girmez
- **TOHUMA İKİ DEMO HESAP DAHA EKLENDİ** (#15 Kemal Güler `93587078210`,
  #16 Sinan Turan `91269889192`). Listenin **SONUNA** eklendi, 1-94 arası
  hiçbir hesap kaymadı. ⛔ **İkisi de Google bağlantısı E2E'sine ayrılmış —
  başka spec'te KULLANMA**
- ⛔ **Uzak ortamlarda tohumlama GÜNCEL DEĞİL — artık ALTI hesap eksik**
  (#11-#16). Preview ve production 2026-08-01'de tohumlandı
- ⛔ **Doktor saatleri (borç #38) uzak ortamlarda tükendi sayılır.**
  **Etkinlikler yeni seed koşusuyla DÜZELMEZ** — kimlik sabit

### Adım 15b'den devreden (hâlâ geçerli)

- **`src/features/organization/`** — 35 birim TEK sorguda okunup ağaç bellekte
  kuruluyor; `WITH RECURSIVE` yazma
- **`DIRECTORY_SELECT` DIŞARI AÇIK ve bu bir KARAR**: sorgunun okuduğu alan
  listesi test edilebilir olmalı — gömülü bir `select`'e kişisel veri alanı
  eklense hiçbir test kırmızıya dönmezdi (ölçüldü)
- **Arama katmanı katalog dışına açıldı**: `SearchableTable` (`staff_members`
  dahil). Aksan körü arama gereken her tablo buradan geçer

## YAPILACAK — roadmap adım 15c-2

"Google ile girenin KPS doğrulaması" (teknik borç **#32**)

Dal: `feature/kimlik-dogrulama` (öneri)

Bugün Google ile açılan hesap `dogrulanmamis` kalıyor: hastane ve spor salonuna
giremiyor, doğru mesajı görüyor ama **gidecek bir sayfası yok**. Bu adım mevcut
hesaba kimlik bağlıyor.

### Bu adımda özellikle dikkat

- **Akış KAYIT AKIŞINDA ZATEN VAR ama mevcut hesap için yazılmamış**:
  `registration.service.ts` içindeki KPS adımını oku — sıra şu: `lookupIdentity`
  (hız sınırı + devre kesici + denetim kaydı) → 18 yaş → "bu numara başka
  hesapta mı" → personel eşleştirme (`matchStaffMember`)
- ⛔ **BİR KİMLİK NUMARASI YALNIZCA BİR HESABA BAĞLANABİLİR** (PRD §5.0).
  `users.national_id_hash` benzersiz; çakışmada kullanıcıya anlaşılır bir cümle
  gösterilmeli, ham kısıt hatası değil
- ⛔ **`isStaff` İSTEMCİDEN GELMEZ**, yalnızca `matchStaffMember` hesaplar
- **Doğrulama sonrası ad soyad KPS'ten gelmeli**: Google ile açılan hesapta
  `fullName` geçici (e-postanın `@` öncesi) — `google-account.repository.ts`
  bunu açıkça yazıyor
- **Bu adım GİRİŞ ve KİMLİK akışına dokunuyor** — CLAUDE.md §3 kapı 3
  (`security-and-hardening` + `security-auditor`) burada gerçekten kritik
- Kimlik doğrulama ekranı `authenticated` kademesinde olmalı, `kps_verified`
  değil (doğrulanmamış kullanıcı zaten oraya gidecek)

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
- ⚠️ **HIZ SINIRI TUZAĞI ADIM 15c-1'DE YİNE YAŞANDI**: tam set ikinci kez
  koşulunca `google-login` ve `register` spec'leri kırmızıya döndü. Sebep kod
  değil, `google_oauth_start` bütçesinin (IP başına 15 dakikada 10) dolmasıydı.
  **Kırmızı görünce önce YÜKE, sonra HIZ SINIRINA bak**
- ⚠️ **YÜK 3'ÜN ÜZERİNDEYKEN TEK BİR SPEC BİLE KAYABİLİR**: adım 15c-1'de
  `hospital` spec'i yük 3.58'de kırmızı döndü, tek başına koşunca geçti
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6` ·
  `asli.avci93`, `ege.kurt94` · `kemal.guler95`, `sinan.turan96`.
  **BOŞTA HESAP KALMADI** — yeni hesap gerekirse
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
