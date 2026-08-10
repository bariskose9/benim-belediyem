# Sonraki oturum için hazır prompt — adım 16

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 16 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **16**'ya geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — adım 16 satırı ve teknik borç listesi
- `docs/project/decisions/ADR-007.md` ve `ADR-013.md` — süresi dolan kayıtlar
  ve okuma anında türetilen durumlar (adım 16'nın tam konusu)
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 15, 15b, 15c-1 ve 15c-2 bitti.**

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Görsel iskelet** çalışıyor (marka paleti, tema düğmesi, mobil menü)
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** · **Hakkımızda**
  · **Profilden Google bağlantısı** çalışıyor ve canlıda
- **Kimlik doğrulama** (adım 15c-2, teknik borç #32 ÖDENDİ) — `/kimlik-dogrulama`.
  ⚠️ **CANLIDA MI, DOĞRULA:** `/api/health` içindeki `commit` alanına bak
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) Cloudflare Turnstile
  hostname listesine ekle (giriş gerektiren ekran varsa **ZORUNLU**) ve
  Google OAuth akışına dokunuyorsan Google redirect URI listesine de
  (`/api/auth/google/callback` ekleyerek). Teknik borç #31.
  **Adım 16'da Turnstile satırı MUHTEMELEN GEREKMİYOR** — planlı görevler
  ekran değil, ama ekranda bir şey değişecekse yeniden değerlendir

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi 2026-08-10'da **"hepsini sonraki oturumda topluca test edeyim"**
> dedi ve 15c-2 oturumunda da yapmadı. Bekleyen doğrulamaların **tamamı**
> aşağıda, tek seferde koşulacak biçimde sıralı. Kod yazmadan önce bunu ona
> hatırlat ve **"şimdi mi yapalım, sonra mı?"** diye sor — cevabı "sonra" ise
> bu bölümü olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73** + adım 15c-1 giriş yöntemleri
> ekranı + adım 15c-2 kimlik doğrulama + Turnstile panel temizliği.
> Tamamlananları bu listeden ve roadmap'ten SİL, yarım kalanı bırak.

**Nerede:** https://benim-belediyem.vercel.app (production) · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → "Örnek üye hesapları", şifre
`Test1234!`. **Personel olan bir hesap seç** (tabloda "✔ evet") — hastane ve
spor salonu ekranları yalnızca personele açık.
⛔ **#11-#16 arası hesaplar production'da YOK** (tohum 2026-08-01), onları seçme.

### ⏱️ ADIM 0 — ÖNCE SAYAÇLARI BAŞLAT (sonra beklemeyesin)

1. **Sipariş oluştur** (borç #50): **RESTORAN'dan** sipariş ver — restoran
   eşiği **10 dakika**, markette **20 dakika**. Adisyona bir yemek ekle →
   Sepet → Öde → adres seç/ekle → sahte kart **`4111 1111 1111 1111`**
   (`…0002` ve `…9995` bilerek BAŞARISIZ döner), son kullanma ileri bir tarih,
   CVV üç hane → ödemeyi tamamla. **Saati not et.** Sipariş `Alındı` olmalı ve
   **iptal düğmesi görünmeli**
2. **Destek talebi oluştur** (borç #62): Destek → yeni talep → konu + açıklama
   → gönder. **Saati not et.** Talep `Açık` durumunda olmalı

### A) ADIM 15 — PROFİL EKRANLARI (borç #73)

1. **Hesabım** → "Kayıtlarım" ve "Hesap ayarları" bölümleri görünüyor mu
2. **Teslimat adreslerim** → yeni adres ekle → **Düzenle** ile başlığını değiştir
3. Aynı adreste **Sil** → onay kutusu çıkıyor mu → "Evet, sil" → liste güncelleniyor mu
4. **Kayıtlı kartlarım** → adım 0'da kullandığın kart burada mı ve
   **tam numara hiçbir yerde görünmüyor mu** (yalnızca son 4 hane)
5. Kartı kaldırmayı dene → onay metni çıkıyor mu

### B) ADIM 15b — HAKKIMIZDA (borç #73)

1. `/hakkimizda` → şemadaki oklara dokun, birimler açılıp kapanıyor mu
2. **"Bilgi İşlem Dairesi Başkanlığı personelini listele"** → 100 kişi geliyor mu
3. **"İtfaiye Dairesi Başkanlığı"** → "henüz yayınlanmadı" mesajı çıkıyor mu
4. Arama kutusuna bir personel adını **BÜYÜK HARFLE** yaz → yine buluyor mu
5. Şema satırları taşıyor mu — sayfa **yana kayıyor mu** (kaymamalı)

### B2) ADIM 15c-1 — GİRİŞ YÖNTEMLERİ

1. **Hesabım** → "Giriş yöntemleri" kartı görünüyor mu (Şifre: Tanımlı,
   Google: Bağlı değil)
2. "Google'a git" düğmesine **şifreni girmeden** bas → şifre alanı zorunlu mu
3. **Yanlış şifreyle** dene → "Şifreniz doğrulanamadı" diyor mu
4. Doğru şifreyle dene → Google'a gidiyor mu (⚠️ Google "Testing" modunda,
   yalnızca test kullanıcısı listesindeki e-postayla girilebilir)
5. Bağladıysan: kartta "Bağlı" + tarih → **Bağlantıyı kaldır** → onay kutusu
   → kaldırınca "Bağlı değil"e dönüyor mu

### B3) ADIM 15c-2 — KİMLİK DOĞRULAMA (yeni)

> ⚠️ Bu test **Google ile açılmış, kimliği doğrulanmamış** bir hesap istiyor.
> Şifreyle giriş yapılan tohum hesaplarının kimliği ZATEN doğrulanmış — onlarda
> ekran "kimliğiniz doğrulanmış" der ve form hiç çıkmaz (bu da geçerli bir test).
> Gerçek akışı denemek için: Google ile giriş yap (Google Console'daki test
> kullanıcısı e-postanla), sonra aşağıyı uygula.

1. **Google ile giriş yap** → `/hesabim` → "Kimliğiniz henüz doğrulanmadı"
   kartı görünüyor mu, "Kimlik durumu: Doğrulanmamış" yazıyor mu
2. **Hastane**'ye git → "Kimlik doğrulaması gerekiyor" + **"Kimlik
   doğrulamasına git"** bağlantısı çıkıyor mu (⛔ bu bağlantı KAYIT ekranına
   GİTMEMELİ)
3. Bağlantıya bas → bot kutusu **çiziliyor mu** (çizilmiyorsa panel işi eksik,
   E bölümüne bak)
4. **Yanlış doğum yılıyla** dene → "Girdiğiniz bilgiler doğrulanamadı" tek tip
   mesajı çıkıyor mu
5. **Kendi T.C. kimlik numaran ÇALIŞMAZ** — sahte KPS'te yoksun.
   `docs/project/test-hesaplari.md` içindeki **sahte vatandaş** numaralarından
   HİÇBİR HESABA BAĞLI OLMAYAN birini kullan
6. Doğru bilgilerle doğrula → "Kimliğiniz doğrulandı" + **gerçek ad soyad**
   görünüyor mu → **"Devam et"** seni hastaneye geri götürüyor mu ve oradaki
   mesaj **"yalnızca kurum personeline açıktır"** olarak DEĞİŞİYOR mu
7. `/hesabim` → kimlik durumu "Nüfus kayıtlarıyla doğrulandı", ad soyad
   değişmiş, kimlik numarası **maskeli** (`912******32`) mi
8. `/kimlik-dogrulama` adresini tekrar aç → form YOK, "Kimliğiniz doğrulanmış"
   yazıyor mu

### C) HER İKİ EKRAN İÇİN ORTAK

1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da metinler okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px olmalı)

### D) ⏱️ SAYAÇLARA GERİ DÖN

1. **Restoran siparişinden 10 dakika sonra** (borç #50): `/siparislerim` →
   sipariş **`Hazırlanıyor`** olmalı ve **iptal düğmesi kaybolmalı**.
   25. dakikada tekrar bak: **`Yolda`** olmalı
2. **Talepten 30 dakika sonra** (borç #62): `/destek` → talep **`İnceleniyor`**
   olmalı (`Çözüldü` eşiği 180 dakika, beklemeye gerek yok)

### E) 🔧 PANELDE YAPILACAK TEK İŞ (tarayıcı, telefon değil)

**Cloudflare Turnstile → Hostname Management** listesini aç:

- **EKLE (adım 15c-2 için ZORUNLU, yoksa kimlik doğrulama ekranı preview'da
  denenemez):** `benim-belediyem-git-feature-kimlik-dogrulama-barisss.vercel.app`
  — dal merge edilip silindiyse bu satır da silinebilir
- **SİL:** adı `benim-belediyem-git-feature-...` ile başlayan ve dalı merge
  edilmiş HER satır (google-ile-giris · sifre-sifirlama · market · restoran ·
  etkinlik-bilet · spor-salonu-uyeligi · destek-talebi · bilgi-widgetlari ·
  hakkimizda · google-baglantisi)
- **KALACAK:** `benim-belediyem.vercel.app` (production)

⚠️ Ajan bu listeyi panelden GÖREMİYOR. Temizledikten sonra söyle ki
`altyapi-durumu.md` gerçeğe göre güncellensin. Sınır 10 hostname.

> **Neden bekleme gerekiyor (D bölümü):** durumlar veritabanında bir kolonda
> tutulmuyor, **okuma anında zamandan türetiliyor** (ADR-013).

## ADIM 15c-2'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/auth/services/identity-verification.service.ts` SIRAYI
  ANLATIYOR**: bot kapısı → "zaten doğrulanmış mı" → `lookupIdentity` → 18 yaş
  → "numara başka hesapta mı" → `matchStaffMember` → tek koşullu yazma →
  denetim kaydı. Sıranın her adımının gerekçesi dosyanın başında yazılı
- **YAZMA TEK KOŞULLU** (`attachVerifiedIdentity`): koşul `WHERE`'de, karar
  etkilenen satır sayısından. Koruma kaldırılıp test KIRMIZIYA döndürülerek
  ölçüldü. Testin servisi DEĞİL repository'yi çağırması bilinçli — servisteki
  ön kontrol araya girseydi asıl koruma hiç ölçülmezdi
- ⛔ **`isStaff` İSTEMCİDEN GELMEZ**: `AttachVerifiedIdentityInput` tipinde
  alanı yok, değer yalnızca `staffMemberId !== null`'dan türüyor
- **P2002 AYIRT EDİLİYOR**: yalnızca `national_id_hash` çakışması "bu numara
  başkasına ait" sayılıyor. ⚠️ **Prisma 7 + `pg` adaptöründe çakışan kolonlar
  `meta.target` altında DEĞİL**, `meta.driverAdapterError.cause.constraint
  .fields` altında — ölçülerek bulundu, ezberlenmedi
- **BOT KAPISI ve KİMLİK ŞEMASI ORTAKLAŞTI** (`bot-check.ts`,
  `identity-challenge.schema.ts`). Kayıt akışı da bunları kullanıyor; birinde
  yapılan sıkılaştırma ikisini birden etkiler
- **`sanitizeRedirectPath` KONTROL KARAKTERİ REDDEDİYOR** (güvenlik düzeltmesi):
  TAB/LF/CR taşıyan bir dönüş adresi tarayıcıda başka siteye gidiyordu.
  Yeni bir yerde dönüş adresi kullanılacaksa MUTLAKA bu fonksiyondan geçir
- **AD SOYAD KPS'TEN GELİYOR**: doğrulamadan sonra Google'ın verdiği geçici ad
  (e-postanın `@` öncesi) gerçek adla değişiyor
- ⚠️ **TELEFON BOŞ KALIYOR** (borç #80): kimlik doğrulaması telefon istemiyor

### Adım 15c-1'den devreden (hâlâ geçerli)

- **`login-methods.ts` SAF KURAL DOSYASI**: "son giriş yöntemi kaldırılamaz" ve
  "bağlama şifre ister" kararları burada
- **BAĞLAMA ŞİFRE İSTİYOR ve bu bir GÜVENLİK kararı**; **kaldırmada şifre
  sorulmuyor** ve bu da bir karar (borç #74)
- **OAUTH ÇEREZİNE `mode` EKLENDİ** (`login` / `link`). ⛔ Mod İSTEMCİDEN
  GELMİYOR
- ⛔ **Uzak ortamlarda tohumlama GÜNCEL DEĞİL — ALTI hesap eksik** (#11-#16).
  Preview ve production 2026-08-01'de tohumlandı
- ⛔ **Doktor saatleri (borç #38) uzak ortamlarda tükendi sayılır.**
  **Etkinlikler yeni seed koşusuyla DÜZELMEZ** — kimlik sabit

## YAPILACAK — roadmap adım 16

"Planlı görevler (temizlik, aidat tahsilatı, durum simülasyonu) + denetim kaydı"

Dal: `feature/planli-gorevler` (öneri)

### Bu adımda özellikle dikkat

- **Ücretsiz Vercel planında cron GÜNDE 1 kez** (teknik borç #3). Doğruluk
  okuma anında sağlanıyor (ADR-007, ADR-013); planlı görev yalnızca TEMİZLİK
  ve TAHSİLAT yapar, doğruluğun kaynağı olmaz
- **`rate_limit_counters` HİÇ TEMİZLENMİYOR** (teknik borç #18) — bu adımın
  en somut işi. Hem hız sınırı hem devre kesici satırlarını kapsamalı
- **Süresi dolan kayıtlar**: oturumlar, kayıt taslakları, OTP kayıtları,
  koltuk kilitleri — hepsinin okuma anında zaten yok sayıldığını doğrula,
  planlı görev yalnızca satırları siler
- **Aidat tahsilatı** (`membership` yenileme) para işidir: `money.ts`,
  TAM SAYI KURUŞ, tekrarlanabilirlik (aynı ay iki kez tahsilat YAPILMAMALI —
  koşullu yazma + etkilenen satır sayısı)
- **Her planlı görev denetim kaydına yazmalı** (CLAUDE.md §5.11) ve
  **tekrar çalıştırılabilir (idempotent)** olmalı

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/auth/services/identity-verification.service.ts`** — mevcut
  kayda YETKİ EKLEYEN akışın deseni (sıra + koşullu yazma + denetim kaydı)
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
- **`src/features/identity/`** — KPS sorgusu, personel eşleştirmesi, ortak şema
- **`src/features/catalog/`** — ORTAK arama katmanı, Türkçe `unaccent` araması
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ. **Ondalık sayıyla para hesabı YAPMA**
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`recordAuditLog()`** — kritik işlemler denetim kaydına yazılır
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  **Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test`** — sunucuyu Playwright kendi kurar
- ⚠️ **PLAYWRIGHT KOŞTUKTAN SONRA `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**
  (adım 15c-2'de yaşandı): Playwright derlemeyi `NEXT_PUBLIC_TURNSTILE_SITE_KEY=""`
  ile yapıyor ve `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor. Elle
  tarayıcı testinden önce **`npm run build`'i yeniden koş**, yoksa bot kutusu
  hiç çizilmez ve "kod bozuk" sanırsın
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak, 2.5'in altına inmesini
  bekle. **Kırmızı görünce ÖNCE YÜKE BAK**
- **E2E'yi 15 dakika içinde üst üste koşturma** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra tek sefer koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETEBİLİYOR.** Commit etmeden önce `git status`'a bak
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR** (adım 15c-2'de böyle yapıldı):
  oturum satırını doğrudan yazıp çereze ham jetonu koymak yeterli
  (`sessionToken` = jetonun SHA-256 özeti, çerez adı `bb_session`). Tohuma
  yeni demo hesap eklemek uzak ortamlarla farkı büyütüyor — **önce bu yolu düşün**
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit` (`users.staff_member_id` Restrict)
- **Kullanılmış test hesapları:** `nurcan.yilmaz3`, `burak.tas2` · `mehmet.duman7`,
  `arda.aydin9` · `ipek.kurt4`, `ferhat.tunc5` · `gamze.toprak8`, `baris.ates10` ·
  `zehra.kilic91`, `esra.arslan92` · `emre.arslan1`, `nazli.mentes6` ·
  `asli.avci93`, `ege.kurt94` · `kemal.guler95`, `sinan.turan96`.
  **BOŞTA HESAP KALMADI**

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** (adım 15c-2'de
  yaşandı): başlık metni açıklamanın içinde geçiyorsa strict mode patlıyor.
  **Çözüm: `{ exact: true }`**
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA** (adım
  15c-2'de yaşandı): sunucu tarafı kullanıcıyı artık "doğrulanmış" görüp
  sayfanın DİĞER dalını çiziyor ve az önce gösterdiğin sonuç paneli kayboluyor.
  Tazelemeyi kullanıcı "devam et" dediğinde yap
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur

**Dış servis çağrısı**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır**

**Dosya yükleme**
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
  ⚠️ Testin korumayı GERÇEKTEN ölçtüğünden emin ol: adım 15c-2'de ilk yazılan
  eşzamanlılık testi koruma kaldırılınca da YEŞİL kaldı, çünkü servisteki ön
  kontrol araya giriyordu. Ölçüm için repository'yi doğrudan çağırmak gerekti

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
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
- **PostgreSQL enum'ları TANIMLANMA SIRASINA göre sıralar**
- ⚠️ **P2002'nin ayrıntısı `meta.target`'ta DEĞİL**,
  `meta.driverAdapterError.cause.constraint.fields` içinde
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Çözüm `npx vercel redeploy <dagitim-url> --scope barisss`.
  **`vercel redeploy`'a panel adresini DEĞİL dağıtım adresini (`*.vercel.app`)
  ver.** Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
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
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır
- Uzun süren işlerde ekranın uyumaması için `caffeinate -dimsu &`; **oturum
  bitince `pkill caffeinate` ile kapat**

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
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
