# Sonraki oturum için hazır prompt — adım 18b

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 18b bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **18b**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/roadmap.md` — adım 18b satırı ve teknik borç listesi (#96-#98 YENİ)
- `docs/project/decisions/ADR-018-*.md` — hata takibinin altı kararı
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 18a bitti**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- Tüm hizmetler çalışıyor, **hizmet ızgarasında kapalı hizmet kalmadı**
- **Adım 18a (gözlemlenebilirlik) kodu yazıldı** — 285 E2E + 756 birim +
  344 veritabanı testi yeşil
- Preview ve production veritabanları dolu; gerçek kullanıcı 0

> ### 📌 ÖNCEKİ OTURUMUN KAPANIŞ NOTLARI (2026-08-11, TR ~15:30)
>
> | İş | Durum | Kim yapacak |
> |---|---|---|
> | Adım 18a kodu | ✅ yazıldı, tüm testler yeşil | PR/deploy durumu aşağıda |
> | **Sentry hesabı** | ⛔ **AÇILMADI — ZORUNLU PANEL İŞİ** | proje sahibi |
> | `LEGAL_*` panel işi | ⛔ hâlâ girilmedi (adım 17'den) | proje sahibi |
> | Toplu elle test | ⛔ **DOKUZUNCU kez ertelendi** | proje sahibi |
> | Cron ilk koşusu | ⏳ 12 Ağustos 00:00 UTC penceresi bekleniyor | aşağıya bak |
> | Kit sürüm 1.8.0 | ⏳ yazıldı, **push edilmedi** — onay bekliyor | aşağıya bak |

## 🔧 PANEL İŞİ — İKİ TANE, İKİSİ DE ZORUNLU

### 1. Sentry (YENİ — adım 18a'nın tek dış dünya işi)

**Vercel paneli → benim-belediyem → Settings → Integrations → Sentry → Add**

Dört ortam değişkenini Vercel **kendisi** enjekte eder:
`NEXT_PUBLIC_SENTRY_DSN` · `SENTRY_ORG` · `SENTRY_PROJECT` · `SENTRY_AUTH_TOKEN`

⛔ **SONRA YENİDEN DAĞITIM ŞART.** `NEXT_PUBLIC_*` derleme anında gömülüyor:
`npx vercel redeploy <dagitim-url> --scope barisss`

✅ **Ajan bunu ÖLÇEBİLİR** — ezberden "yapıldı" deme:
`npx vercel env ls production --scope barisss` → dört değişken görünmeli.

Ücretsiz katman: 5.000 hata/ay · 1 kullanıcı · 30 gün saklama.

### 2. `LEGAL_CONTROLLER_NAME` + `LEGAL_CONTACT_EMAIL` (adım 17'den DEVREDİYOR)

**2026-08-11'de panelden ÖLÇÜLDÜ: production'da 16 değişken var, bu ikisi YOK.**
Gerekçe `altyapi-durumu.md` içinde: hesap silme ekranı KVKK m.12/1-c bildirimi
yapıyor ve bildirimin muhatabı belirsiz.

## ⏰ CRON — SONRAKİ PENCERE 12 AĞUSTOS 00:00 UTC

Bu oturumda **yeni bir ölçüm yapılmadı ve yapılamazdı**: 11 Ağustos penceresi
(00:00–00:59 UTC) bir önceki oturumda 01:06'da zaten ölçülmüştü → **0 kayıt**.

**Bu oturumda bulunan yeni bilgi:** `CRON_SECRET` production'a
**10 Ağustos ~14:54 UTC'de** girilmiş — yani o günün cron penceresi geçtikten
SONRA. 10 Ağustos'un sessizliğinin sebebi bu (uç 401 dönmüş olmalı).
11 Ağustos penceresinde değişken vardı; oradaki şüpheli hâlâ 00:31'deki
PR #48 dağıtımı.

**Sonraki oturum:** 12 Ağustos 01:00 UTC'den sonra sorguyu tekrarla.
Yine 0 çıkarsa Vercel → Settings → Cron Jobs → View Logs incelenmeli.

⛔ **DERS: UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA.**

**Production veritabanına okuma erişimi:**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
Çıkan adresi `PROD_DATABASE_URL` verip **proje kökünde `.mts`** betik koştur.
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **yalnızca
okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT SÜRÜM 1.8.0 — YAZILDI, PUSH EDİLMEDİ

Adım 18a'nın dört dersi `docs/standards/` ve kit kopyasına **ikisine birden**
yazıldı; `diff` ile 17/18 dosyanın birebir aynı olduğu kanıtlandı (kapı 8).
Kit deposunda sürüm 1.7.0 → **1.8.0** yapıldı ama **push edilmedi** — proje
sahibinin onayı bekleniyor. Onaylanırsa `/plugin` ekranından güncellemesi de
hatırlatılmalı.

⚠️ **KİT DEPOSU 5 COMMIT GERİDEYDİ ve bu oturumda `git pull` yapıldı.**
Karşılaştırmadan önce daima `git fetch` + `git pull` yap; bayat bir kopyayla
karşılaştırmak sahte fark üretir.

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu bir AÇIK SORU, çözülmedi.**
Sürüm 1.7.0 istisnayı dosya değil **bölüm** seviyesine indirdi
(`<!-- ⛔ SENKRON SINIRI -->`). Ama projedeki fark **sınırın ÜSTÜNDE** kalıyor
(satır 19-68): oradaki Auth.js metni tamamen bu projeye özel. Ya sınır yanlış
yerde ya da o metin sınırın altına taşınmalı. **Adım 18a bu dosyaya dokunmadı
(CLAUDE.md §7: aynı anda tek modül)** — sonraki oturum karar versin.

## 📱 TOPLU ELLE TEST — DOKUZUNCU KEZ ERTELENDİ

> Proje sahibine bu oturumda liste **ikiye bölünmüş hâlde** sunuldu
> ("bu oturum yalnızca B5+B6+B7, kalanı sonraki") ve yine "sonraya bırak"
> dendi. Yani bölme önerisi de sorunu çözmedi.
>
> ⚠️ **DESEN ARTIK ÇOK NET.** Sonraki oturum listeyi yeniden sunmasın; bunun
> yerine **tek bir madde** önersin (örn. yalnızca B7, 5 dakika) ya da proje
> sahibine açıkça sorsun: "bu liste hiç yapılmayacaksa roadmap'ten silelim mi?"
> Sürekli büyüyen ve hiç yapılmayan bir liste, yapılmış gibi görünen bir borçtur.
>
> ⛔ **SEKİZ ADIMIN gerçek cihaz doğrulaması birikmiş durumda.** Otomatik
> testler ve `mobile-375` ölçümü hepsinde yeşil — BİLİNEN bir arıza yok.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 · 15c-2 ·
> 16 · 17 · 17b · 17c. Tamamlananları bu listeden ve roadmap'ten SİL.

**Nerede:** https://benim-belediyem.vercel.app (production) · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → "Örnek üye hesapları", şifre
`Test1234!`. **Personel olan bir hesap seç** (tabloda "✔ evet").
⛔ **#11-#16 arası hesaplar production'da YOK** (tohum 2026-08-01).

### ⏱️ ADIM 0 — ÖNCE SAYAÇLARI BAŞLAT

1. **Sipariş oluştur** (borç #50): **RESTORAN'dan** (eşik 10 dk; markette 20 dk).
   Sepet → Öde → adres → sahte kart **`4111 1111 1111 1111`** (`…0002` ve
   `…9995` bilerek BAŞARISIZ döner) → **saati not et**. Sipariş `Alındı` olmalı
2. **Destek talebi oluştur** (borç #62): Destek → yeni talep → **saati not et**

### A) ADIM 15 — PROFİL EKRANLARI (borç #73)
1. **Hesabım** → "Kayıtlarım" ve "Hesap ayarları" görünüyor mu
2. **Teslimat adreslerim** → ekle → **Düzenle** ile başlığı değiştir
3. Aynı adreste **Sil** → onay → liste güncelleniyor mu
4. **Kayıtlı kartlarım** → adım 0'daki kart burada mı, **tam numara hiçbir
   yerde görünmüyor mu** (yalnızca son 4 hane)
5. Kartı kaldırmayı dene → onay metni çıkıyor mu

### B) ADIM 15b — HAKKIMIZDA (borç #73)
1. `/hakkimizda` → şemadaki oklara dokun, birimler açılıp kapanıyor mu
2. **"Bilgi İşlem Dairesi Başkanlığı personelini listele"** → 100 kişi
3. **"İtfaiye Dairesi Başkanlığı"** → "henüz yayınlanmadı" çıkıyor mu
4. Arama kutusuna bir adı **BÜYÜK HARFLE** yaz → yine buluyor mu
5. Sayfa **yana kayıyor mu** (kaymamalı)

### B2) ADIM 15c-1 — GİRİŞ YÖNTEMLERİ
1. **Hesabım** → "Giriş yöntemleri" kartı (Şifre: Tanımlı, Google: Bağlı değil)
2. "Google'a git" → **şifresiz** bas → şifre alanı zorunlu mu
3. **Yanlış şifreyle** → "Şifreniz doğrulanamadı" diyor mu
4. Doğru şifreyle → Google'a gidiyor mu (⚠️ Google "Testing" modunda)
5. Bağladıysan: **Bağlantıyı kaldır** → onay → "Bağlı değil"e dönüyor mu

### B3) ADIM 15c-2 — KİMLİK DOĞRULAMA
> ⚠️ **Google ile açılmış, kimliği doğrulanmamış** bir hesap gerekiyor.
1. **Google ile gir** → `/hesabim` → "Kimliğiniz henüz doğrulanmadı" kartı
2. **Hastane** → "Kimlik doğrulamasına git" bağlantısı (⛔ KAYIT ekranına
   GİTMEMELİ)
3. Bağlantıya bas → bot kutusu **çiziliyor mu**
4. **Yanlış doğum yılıyla** → "Girdiğiniz bilgiler doğrulanamadı" tek tip mesaj
5. **Kendi T.C. numaran ÇALIŞMAZ** — `test-hesaplari.md` içindeki **sahte
   vatandaş** numaralarından hiçbir hesaba bağlı olmayan birini kullan
6. Doğru bilgilerle → "Kimliğiniz doğrulandı" + gerçek ad soyad
7. ⚠️ Başarı panelinde "kurum personeli olarak tanındınız" **ÇIKMAMALI**;
   yerine "kurumsal e-postanızı da doğrulamanız gerekiyor" + **"Kurum personeli
   doğrulaması"** düğmesi olmalı
8. **"Devam et"** hastaneye götürüyor ve mesaj **"yalnızca kurum personeline
   açıktır"**a DEĞİŞİYOR mu
9. `/hesabim` → kimlik numarası **maskeli** (`912******32`) mi
10. `/kimlik-dogrulama` tekrar → form YOK, "Kimliğiniz doğrulanmış" mı

### B4) ADIM 16 — PLANLI GÖREV (borç #83) — **BİLGİSAYARDAN**
1. Vercel → **Settings → Cron Jobs** → `/api/cron/daily`, zamanlama `0 0 * * *`
2. **View Logs** → gece bir çağrı düşmüş mü, yanıt **200** mü (401 = `CRON_SECRET` yok)
3. **Hastane** → gün şeridinde **14 gün** görünüyor mu

### B5) ADIM 17 — YASAL SAYFALAR VE ÇEREZ BANDI
1. **Gizli sekmede** aç → altta **"yalnızca zorunlu çerezler"** bandı çıkıyor mu
2. Bantta **yalnızca TEK düğme** ("Anladım") + "Ayrıntılar" — ⛔ "Reddet" YOK
3. **"Anladım"** → bant kayboluyor, **aynı sayfada mı kalıyorsun** → yenile,
   geri gelmemeli
4. Alt bilgide **dört yasal bağlantı** → dördünde de **yürürlük tarihi** ve
   "bu gerçek bir belediye değildir" uyarısı var mı
5. `/gizlilik` → en altta **veri sorumlusu**. ⚠️ Panel işini yaptıysan **adın**
6. `/cerez-politikasi` → tablo **8 satır** · "Ölçüm ve istatistik" ile
   "Pazarlama" **boş** diyor mu · **"Tercihimi geri al"** → bant yeniden çıkıyor mu
7. Telefonda: çerez tablosu **kendi içinde** yana kayıyor, **sayfa kaymıyor** mu
8. Kayıt akışının **son adımında** Kullanım Şartları ve KVKK bağlantıları var mı

### B6) ADIM 17b — HESAP YÖNETİMİ VE VERİ HAKLARI
> ⛔ **SON MADDEYİ (hesap silme) EN SONA BIRAK ve ayrı bir hesapla yap.**
1. **Hesabım** → "Verilerim ve hesap yönetimi" → `/hesabim/verilerim` açılıyor mu
2. **"Verilerimi indir (JSON)"** → dosya iniyor mu, adı
   `benim-belediyem-verilerim-<tarih>.json` mi
3. Dosyayı aç: **profil, siparişler, rıza kayıtları** var mı · kimlik numarası
   **maskeli** mi · ⛔ **şifre veya oturum bilgisi GEÇMEMELİ**
4. **Cep telefonum** → numarayı değiştir → rozet **"Doğrulanmadı"**a dönüyor mu
   (arıza DEĞİL — borç #80)
5. Hatalı numara (`12345`) → "Geçerli bir cep telefonu numarası girin"
6. **Kimlik bağlantım** → tohum hesabında **"Şu an çözülemiyor"** çıkmalı;
   ⛔ "Kimlik bağlantımı çöz" düğmesi ÇIKMAMALI
7. **Hesabımı sil** kartında **iki liste** yan yana · ikincisinde **"Türk
   Ticaret Kanunu m.82"** geçiyor mu
8. **"Hesabımı sil"** → **yanlış şifre** → "Şifreniz doğrulanamadı" ve hesap
   **duruyor** mu → **Vazgeç**
9. ⏱️ **(İSTEĞE BAĞLI, GERİ ALINAMAZ)** doğru şifreyle sil → `/hesap-silindi` →
   **aynı kimlik numarasıyla yeniden kayıt olabiliyor musun**
10. ⚠️ **Bilinen sorun (borç #91):** bandı hiç kapatmadıysan `/hesap-silindi`
    sayfasında bant "Saklananlar" başlığını örtüyor

### B7) ADIM 17c — PERSONEL YETKİSİ
> ⛔ **CANLIDA BU AKIŞ TAMAMLANAMAZ — BİLİNEN sınır (borç #92):** tohum
> adresleri `@ornek.test`, oraya posta teslim edilemez. "Kod gelmedi" **arıza
> değil.** Test edilecek şey ekranın bunu DÜRÜSTÇE söyleyip söylemediği.
1. **Kimliği doğrulanmış ama personel OLMAYAN** hesapla → **Hesabım** →
   "Kurum personeli doğrulaması" kartı görünüyor mu
2. **Personel olan** tohum hesabıyla → kart **ÇIKMAMALI**, "Personel durumu:
   Kurum personeli" yazmalı
3. Karta bas → `/personel-dogrulama` açılıyor mu
4. ⭐ **"Kimliğinizi doğrulamış olmanız kurum personeli olduğunuzu göstermez…"**
   cümlesi var mı
5. ⭐ **"@ornek.test… canlı ortamda teslim edilemez"** uyarısı var mı
6. `/hakkimizda`'dan bir kurumsal adres kopyala → **Kod gönder** → **"Bu adres
   kurum rehberinde kayıtlıysa…"** çıkıyor mu
7. **Var olmayan** adres (`hicyok@ornek.test`) → **AYNI cümle** çıkıyor mu
   (çıkmazsa hesap sayımı koruması bozulmuş — arıza)
8. Rastgele kod → "Kod doğrulanamadı" tek tip mesajı
9. 375px'te düzen bozuluyor mu, iki temada da okunuyor mu

### B8) ADIM 18a — HATA TAKİBİ (YENİ) — **PANEL İŞİ YAPILDIKTAN SONRA**
> ⚠️ Sentry hesabı açılıp yeniden dağıtım yapılmadan bu maddeler ANLAMSIZ.
1. Sentry panelinde proje görünüyor mu, **"Issues" listesi BOŞ** mu
2. Siteyi gez (5-6 sayfa) → Sentry'ye **hiçbir olay düşmemeli**
   (⭐ oturum izleme bilerek kapatıldı — düşerse bir gerileme var)
3. Tarayıcı konsolunda hata, network'te başarısız istek var mı
   (⚠️ `/sentry-tunnel` isteği **görünmemeli**; görünüyorsa bir hata olmuş demektir)
4. ⛔ **Bir hata düştüğünde:** olayın içinde T.C. kimlik numarası, kart
   numarası, e-posta veya şifre **GEÇMEMELİ** — hepsi `[gizlendi]` olmalı
5. Yığın izinde `src/...` dosya adları okunuyor mu (borç #98 — okunmuyorsa
   kaynak haritası yüklenmemiş)

### C) HER İKİ EKRAN İÇİN ORTAK
1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px)

### D) ⏱️ SAYAÇLARA GERİ DÖN
1. **Restoran siparişinden 10 dk sonra** (#50): `/siparislerim` →
   **`Hazırlanıyor`** ve **iptal düğmesi kaybolmalı**. 25. dk'da: **`Yolda`**
2. **Talepten 30 dk sonra** (#62): `/destek` → **`İnceleniyor`**

> **Neden bekleme gerekiyor:** durumlar kolonda tutulmuyor, **okuma anında
> zamandan türetiliyor** (ADR-013).

## ADIM 18a'DAN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/lib/log-redact.ts` YENİ VE MERKEZÎ**: log'a ve Sentry'ye giden HER
  değerin geçtiği tek süzgeç. İki bağımsız savunması var: **alan adına göre**
  ve **değerin BİÇİMİNE göre**
- ⭐ **İKİNCİSİ OLMADAN BORÇ #79 KAPANMAZDI.** Prisma, argüman nesnesinin
  tamamını hata METNİNİN içine düz yazı koyuyor — değerler bir alan adının
  arkasında değil, cümlenin ortasında. Alan adına bakan süzgeç orada kör
- ⛔ **SÜZGECİ SENTRY OLAYININ TAMAMINA UYGULAMA.** `redact` derinliği 5'te
  kesiyor; olay çok daha derin. Toptan uygulamak **yığın izini yok eder**.
  `scrubEvent` yalnızca metin taşıyan alanları hedefliyor ve bir test yığın
  izinin bozulmadığını koruyor — **o testi gevşetme**
- ⛔ **SENTRY'NİN VERİ TOPLAMA VARSAYILANLARI TEHLİKELİ** ve altısı da
  kapatıldı: istek gövdesi (= kayıt formunun tamamı), çerezler, başlıklar,
  veritabanı sorgu parametreleri, yığın değişkenleri, adres parametreleri.
  `tests/unit/sentry-options.test.ts` bunu **gerileme kapısı** olarak koruyor
- ⛔ **OTURUM TEKRARI (replay) KURULMADI** — ekranlarda kimlik ve kart alanı var
- ⛔ **OTURUM İZLEME (`BrowserSession`) DE KAPATILDI.** Tarayıcıda ölçüldü:
  hatasız sayfa açılışında Sentry'ye iki istek gidiyordu. Kapatma sebebi kota
  değil **tutarlılık** — `/cerez-politikasi` "ölçüm ve istatistik yok" diyor
- **`no-console` ARTIK İSTİSNASIZ.** Tek kapı `@/lib/logger`. Muafiyet üç yerde:
  `src/lib/logger.ts`, `prisma/**`, `tests/**`
- **`setLogSink()` DESENİ:** logger Sentry'yi doğrudan içe aktarmıyor; kanal
  `instrumentation` dosyalarından kaydediliyor. Sebep: log katmanı Sentry
  kurulmamışken de çalışmalı ve testler Sentry kurulumu istememeli
- ⭐ **YAKALANMIŞ HATALAR DA SENTRY'YE GİDİYOR** (sink üzerinden). SDK
  kendiliğinden yalnızca yakalanmamışları görür; bu projedeki en önemli
  arızalar ise bilinçle yakalanıyor (cron, e-posta, sepet taşıma)
- **`src/app/global-error.tsx` YENİ** — kök yerleşim çökerse boş beyaz ekran
  yerine Türkçe mesaj. İçinde bilerek düz `<a>` var (`<Link>` DEĞİL): yönlendirici
  de bozuk olabilir, tam sayfa yükleme isteniyor

## TUZAKLAR — daha önce vakit kaybettirenler

**Adım 18a'da yeni öğrenilenler**
- ⛔ **DERLEME TURBOPACK İLE YAPILIYOR** (`Next.js 16.2.12 (Turbopack)`).
  Sentry'nin `webpack.*` altındaki seçenekleri (örn. `automaticVercelMonitors`)
  **SESSİZCE ETKİSİZ** kalır. Yapılandırmaya böyle bir seçenek yazıp "çalışıyor"
  sanma — borç #96
- ⚠️ **`tunnelRoute` ROUTE LİSTESİNDE GÖRÜNMEZ** — bir route değil, `rewrite`.
  Varlığını `.next/routes-manifest.json` içinden doğrula. Ayrıca **yalnızca DSN
  tanımlıyken** kuruluyor; DSN'siz derlemede hiç aranmasın
- ⚠️ **SAHTE DSN İLE TEST EDERKEN `/sentry-tunnel` 500 DÖNER** ve bu bir arıza
  DEĞİL: proxy var olmayan `oXXX.ingest.sentry.io` adresine ulaşamıyor.
  Tünelin çalıştığının kanıtı isteğin GİTMESİ, yanıtın 200 olması değil
- ⚠️ **`as const` SENTRY'NİN `dataCollection` TİPİNE UYMUYOR** (`readonly []`
  kabul edilmiyor) ve `DataCollection` tipi paketten dışa aktarılmıyor
- ⚠️ **`vi.resetModules()` KULLANAN TESTLERDE LOG SATIRINI METİN OLARAK
  KARŞILAŞTIRMA** — satır artık JSON; `JSON.parse` edip ALANLARINA bak
- ⭐ **BİR "NEDEN" YORUMU YAZMADAN ÖNCE İDDİAYI MUTASYONLA ÖLÇ.** Bu oturumda
  "desen sırası önemli" yazıldı, sıra ters çevrildi ve testler YEŞİL kaldı —
  gerekçe yanlıştı. Gerçek koruma lookaround'lardı. Yanlış bir gerekçe,
  yorumsuz bırakmaktan kötüdür

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test` — sunucuyu Playwright kendi kurar
- ⚠️ **PLAYWRIGHT SONRASI `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor. Elle tarayıcı testinden
  önce **`npm run build`'i yeniden koş**
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak (< 2.5)
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş.
  **Bir testin düşmesini koda yormadan ÖNCE kaç kez koştuğuna bak**
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (tarihler kayıyor). Commit öncesi `git status`'a bak ve geri al —
  adım 18a'da yine yaşandı
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: oturum satırını yazıp çereze ham
  jetonu koymak yeterli (`sessionToken` = SHA-256 özeti, çerez `bb_session`)
- ⚠️ **HIZ SINIRINI SAYAÇ SİLEREK DEĞİL, TAZE HEDEF KULLANARAK ÇÖZ.**
  `otp_send:` öneki kayıt ve şifre sıfırlamayla PAYLAŞILIYOR
- ⚠️ **E2E SPEC'İ `serverEnv` OKUYAN BİR MODÜLÜ IMPORT EDEMEZ**
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit`. ⚠️ `consentRecord` ve `auditLog` KULLANICIDAN ÖNCE silinmeli
- ⚠️ **SİLİNMİŞ HESABI E-POSTASINDAN BULAMAZSIN** — silme `users.email`i NULL yapıyor
- ⚠️ **SAHTE (decoy) OTP KAYITLARI `userId` TAŞIMAZ**; `registrationId`'den yakala

**Vitest**
- ⚠️ **`vi.resetModules()` + dinamik `import` ile `instanceof` ÇALIŞMAZ** —
  hata KODUNA bak

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** → `{ exact: true }`
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR** → aramayı BÖLGEYE sınırla
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(…, { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**
- ⚠️ **Yasal belgeler BİRBİRİNE de bağlantı veriyor** → `getByRole("navigation")`
  ile sınırla

**Chrome DevTools MCP ile elle test**
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR** → `evaluate_script`
  içinden gerçek DOM `click()` çağır ve `performance.getEntriesByType("resource")`
  ile isteğin gidip gitmediğini ölç
- ⚠️ **`document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** (`httpOnly`) →
  `new_page` çağrısına `isolatedContext` ver
- ⚠️ **React kontrollü `<input>`'a `value` ATAMAK YETMİYOR** — React'in kendi
  setter'ını çağır + `new Event("input",{bubbles:true})`
- ⚠️ **macOS'ta pencere 375px'e İNMİYOR** (alt sınır ~485px) → `mobile-375`
  Playwright projesiyle ölç
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI gösteriyor**
  → `document.elementFromPoint` ile ölç
- ⚠️ **YENİ: `get_network_request` dosya yolu ÇALIŞMA ALANI İÇİNDE olmalı** —
  scratchpad'e yazamıyor. Depo köküne yaz ve **hemen sil**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** (borç #84)
- **Sunucuda çizilen sayfa istemci yazdıktan sonra tazelenmez** → `router.refresh()`.
  ⛔ **Ama hesabı SİLDİKTEN sonra çağırma**
- **Formu sıfırlamak için bileşene `key` ver**
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ** → `Referer` (ama aynı alan
  adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)

**Dosya indirme**
- ⛔ **DÜZ `<a download>` KULLANMA** · **`revokeObjectURL` ŞART** ·
  **DOSYA ADINI SUNUCU BAŞLIĞINDAN OKUMA**

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ** — `userId`/
  `anonymousId` üzerinden yakala

**Dış servis çağrısı**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır**

**Dosya yükleme**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME** — bayt imzasından doğrula
- **`next/image` YETKİLİ uçtan görsel çekerken `unoptimized` ŞART**

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` KULLANMA** →
  `findIdsMatchingQuery`
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**

**Para**
- **Her yerde tam sayı kuruş** · **Tutar İSTEMCİDEN ALINMAZ** ·
  **DÖVİZ KURU PARA DEĞİLDİR**

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013)
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)
- ⚠️ **Türkiye'nin UTC farkı `slot-calendar.ts` içinde SABİT +3**

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez** → tek koşullu yazma +
  etkilenen satır sayısı
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA** → `createMany({skipDuplicates})`
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog YOK ve bilerek eklenmedi** — onay SATIR İÇİ
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
- **Geniş tablo `overflow-x-auto` sarmalayıcıya girer** + `tabIndex={0}`
- ⚠️ **ÇEREZ BANDI SAYFA ALTINDAKİ İÇERİĞİ ÖRTEBİLİYOR** (borç #91)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **İstemci `@prisma/client`'tan DEĞİL `@/generated/prisma/client`'tan gelir**
  ve `PrismaPg` adaptörü verilmek zorunda
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR** — migration klasörünü
  elle oluşturup `migrate deploy` + `generate` koş
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **`prisma migrate reset --force` bayrağı yutuluyor** → `docker compose down -v`
- ⚠️ **`auditLog` modelinde `metadata` ALANI YOK** — `entityType` ve `entityId` var

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — production'da da preview'da da.
  Çözüm `npx vercel redeploy <dagitim-url> --scope barisss` (panel adresini
  DEĞİL dağıtım adresini ver). Merge sonrası `/api/health` içindeki `commit`
  alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**
- ⛔ **UTC 00:00–00:59 ARASINDA MERGE ETME** — o pencere cron'un penceresi

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ**
- ⛔ **AÇIK BİR PR VARKEN DAL AÇMA; önce onu merge et.** Çakışan bir PR'da
  GitHub `refs/pull/<N>/merge` üretemiyor ve `pull_request` iş akışları HİÇ
  BAŞLAMIYOR — **hata SESSİZ**. Teşhis: `gh pr view <N> --json
  mergeable,mergeStateStatus` → `CONFLICTING`/`DIRTY`. Çözüm (force-push YOK):
  `git merge origin/main` → çakışmayı çöz → commit → push

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → `npx tsx` + Prisma betiği (proje kökünde, `.mts`,
  commit edilmeden SİLİNİR). `--env-file=.env` ile koştur
- ⚠️ **ESLint geçici `.mts` betiklerdeki `console.log`'u da yakalıyor** →
  `console.error` kullan veya betiği lint'ten önce sil
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- **`.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır**
- Uzun süren işlerde `caffeinate -dimsu &`; **oturum bitince `pkill caffeinate`**.
  ⚠️ **Bu oturumda makine uyudu ve caffeinate ÖLDÜ** — uzun beklemeden sonra
  `pgrep -x caffeinate` ile hâlâ ayakta mı diye BAK

## YAPILACAK — roadmap adım 18b

"Swagger / OpenAPI (`/api/docs`)" — `docs/standards/03-api-guidelines.md`
"endpoint'ler OpenAPI/Swagger ile belgelenir" diyor.

Dal: `feature/api-belgeleri` (öneri)

### Bu adımda özellikle dikkat
- **Yeni bir paket gerekecek** (`zod-openapi` / `@asteasolutions/zod-to-openapi`
  benzeri). ⛔ **Proje sahibine SOR ve gerekçe göster** (CLAUDE.md §7).
  Şemalar zaten Zod ile yazılı, yani el yazımı bir OpenAPI belgesi ikinci bir
  gerçek kaynağı olurdu — otomatik türetme tercih edilmeli
- **`/api/docs` KİMİN ERİŞİMİNE AÇIK?** Depo zaten public ama belge, uçları ve
  hata kodlarını tek yerde toplar. Ziyaretçiye açık olacaksa bilinçli bir karar
  olmalı; `noindex` konusu da düşünülmeli
- ⛔ **BELGE ÜRETİRKEN ÖRNEK DEĞER OLARAK GERÇEK KİŞİSEL VERİ KOYMA** — sahte
  vatandaş numaraları bile `test-hesaplari.md`'de yaşıyor, belgeye kopyalanmaz

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/lib/logger.ts` + `src/lib/log-redact.ts`** — log ve kişisel veri süzgeci
- **`src/lib/sentry-options.ts`** — hata takibine giden verinin sınırı
- **`src/lib/http.ts`** — `ok`/`created`/`noContent`/`fail`, tek tip hata biçimi
- **`src/features/staff-verification/`** — iki adımlı doğrulama deseni
- **`src/features/account/`** — geri alınamaz işlem deseni
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** — günlük iş eklemenin deseni
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
- **`src/features/identity/`** — KPS sorgusu, ortak şema
- **`src/features/otp/`** — iki kanallı doğrulama kodu altyapısı
- **`src/features/catalog/`** — ORTAK arama katmanı, Türkçe `unaccent`
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`recordAuditLog()`** · **`requireAccess()`** uçlar · **`guardPage()`** sayfalar
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler (tek istisna
  `messages-legal.ts`)
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## PROJE KİTİ (`proje-kiti` plugin)

> ⛔ **KİTE KURAL YAZMAK BU PROJEYİ GÜNCELLEMİYOR — İKİ AYRI KOPYA VAR.**
> Bir ders öğrenildiğinde **İKİSİNE DE** yazılır ve `diff` ile kanıtlanır
> (CLAUDE.md kapı 8).

- **Sürüm 1.8.0 YAZILDI ama PUSH EDİLMEDİ** (2026-08-11) — adım 18a'nın dört
  dersi: `no-console` istisnasız yasak (`12-operations`), süzgeç değerin
  biçimine de bakar (`12-operations`), üçüncü taraf SDK varsayılanları
  denetlenir + replay/oturum izleme kapalı (`14-privacy`), bir "neden" yorumu
  yazmadan önce iddiayı mutasyonla ölç (`02-coding-standards`).
  ✅ **Kapı 8 geçildi:** 17/18 standart dosyasının birebir aynı olduğu `diff`
  ile kanıtlandı. ⛔ Proje sahibi onaylarsa push edilecek ve `/plugin`
  ekranından güncellemesi hatırlatılacak
- **Sürüm 1.7.0** (2026-08-11) — `00-stack.md` istisnası bölüm seviyesine indi
- **Sürüm 1.6.0** (2026-08-11) — 8. kapı eklendi, `kit-senkron` onarıldı
- **Sürüm 1.5.0** (2026-08-11) — adım 17c'nin üç dersi

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**Planlı görevi elle tetikleme (local):**
`npm run build && npm run start`, sonra
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`

**E2E'yi elle koşturma sırası:** `rate_limit_counters`'ı boşalt → `uptime` bak
(yük < 2.5) → portu boşalt (`lsof -ti:3000 | xargs kill -9`) → `npx playwright
test`. **Sunucuyu SEN başlatma.**

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
