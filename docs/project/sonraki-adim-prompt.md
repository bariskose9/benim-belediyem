# Sonraki oturum için hazır prompt — adım 17c

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 17c bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **17c**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — adım 17c satırı ve teknik borç listesi
- `docs/project/decisions/ADR-017-*.md` — **ilke 2 bu adımın tam konusu**
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

> ### 📌 ÖNCEKİ OTURUMUN KAPANIŞ NOTLARI (2026-08-11, TR 03:20)
>
> **Adım 17b canlıya çıktı ve duman testi geçti.** Kapanışta yarım kalan
> yalnızca şunlar:
>
> | İş | Durum | Kim yapacak |
> |---|---|---|
> | PR #47 (adım 17b) | ✅ merge edildi, dal silindi, canlıda | bitti |
> | PR #48 (belge notu) | ⏳ **açık bırakıldı** — Playwright ve Docker kontrolleri hâlâ koşuyordu | **sen: `gh pr checks 48` → yeşilse merge et** |
> | 17b elle testi (B6) | ⛔ hiç yapılmadı | proje sahibi |
> | Cron ilk koşusu (B4) | ⏳ bakılmadı — sebebi aşağıda | proje sahibi |
> | `LEGAL_*` panel işi | ⛔ hâlâ girilmedi | proje sahibi |
>
> **Canlıda fiilen doğrulananlar** (2026-08-11, commit `1b853cf`):
> `/hesap-silindi` 200 · girişsiz `/hesabim/verilerim` 307 · girişsiz
> `GET /api/account/export` 401 · `POST /api/account/deletions` 401 ·
> `POST /api/account/identity-unlinks` 401 · `PUT /api/account/phone` 401 ·
> sağlık ucu `db: ok`.
>
> ⏰ **CRON NEDEN KONTROL EDİLMEDİ — bu bir atlama değil, zamanlama kararı:**
> oturum UTC 00:20'de kapandı ve cron penceresi **00:00–00:59 UTC** arası.
> Yani koşu ya birkaç dakika önce olmuştu ya da henüz olmamıştı. O anda bakıp
> "log yok" görmek **yanıltıcı bir negatif** üretirdi ve "cron çalışmıyor"
> sanılabilirdi. Doğrusu pencere kapandıktan sonra bakmak.

Roadmap adım **0 → 17b bitti** (15, 15b, 15c-1, 15c-2, 16, 17, 17b dahil).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** · **Hakkımızda**
  · **Profilden Google bağlantısı** · **Kimlik doğrulama** · **Planlı görevler**
  · **Yasal sayfalar + çerez rızası** · **Hesap yönetimi ve veri hakları**
  çalışıyor
- ✅ **Adım 17b CANLIDA** (2026-08-11, commit `1b853cf`, PR #47). Sağlık ucu
  `db: ok`; canlıda doğrulandı: `/hesap-silindi` 200, girişsiz
  `/hesabim/verilerim` 307, girişsiz `GET /api/account/export` ve üç yazma
  ucunun hepsi 401. `feature/hesap-yonetimi` dalı merge edilip **silindi**
- ⚠️ **17b GERÇEK CİHAZDA HİÇ DENENMEDİ** — proje sahibi elle testi sonraki
  oturuma bıraktı (aşağıdaki B6 listesi)
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0
- ⚠️ **Yeni dal açtığında:** dal adresini
  (`benim-belediyem-git-<dal>-barisss.vercel.app`) Cloudflare Turnstile
  hostname listesine ekle — **yalnızca o ekranda BOT KUTUSU varsa.**
  Teknik borç #31. **Liste hâlâ 10 sınırında.**
  ⛔ **ADIM 15c-2, 16, 17 VE 17b'DE PANELE HİÇ GİRİLMEDİ** — proje sahibi
  preview'ı atlayıp doğrudan production'a çıkıyor.
  ✅ **Adım 17b'de gerekmedi:** `/hesabim/verilerim` giriş gerektiriyor ama
  bot kutusu TAŞIMIYOR. Turnstile yalnızca kayıt, giriş ve kimlik doğrulama
  ekranlarında var — bu ayrımı bilmek gereksiz panel işini önlüyor

## 🔧 PANEL İŞİ — ZORUNLU, İKİ DEĞİŞKEN (adım 17'den DEVREDİYOR)

**Vercel → benim-belediyem → Settings → Environment Variables → Production:**

| Değişken | Ne yazılacak |
|---|---|
| `LEGAL_CONTROLLER_NAME` | Siteyi işleten **gerçek kişinin adı soyadı** |
| `LEGAL_CONTACT_EMAIL` | KVKK başvurularının ulaşacağı **gerçek e-posta** |

**Neden zorunlu ve neden ADIM 17b'DEN SONRA DAHA ÖNEMLİ:** artık kullanıcı
hesabını silebiliyor ve ekranda "şu kayıtlar şu kanun gereği saklanıyor"
yazıyor — bu, KVKK Yönetmeliği m.12/1-c anlamında resmî bir **bildirim**.
Bildirimi yapan tarafın (veri sorumlusu) kim olduğunun belli olması gerekiyor.
Değişkenler boşken bildirim var ama **muhatabı yok**.

⛔ **Bu değerler koda YAZILMADI ve yazılmayacak** — depo herkese açık. Ajan
panele giremiyor, bu iş sende. Girdikten sonra **yeniden dağıtım gerekiyor**
(`npx vercel redeploy <dagitim-url> --scope barisss`) ve `/gizlilik` sayfasının
altında adının göründüğünü doğrula.

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi bunu **2026-08-10'da ALTINCI kez erteledi.** Önce oturum
> başında ("sonra — listeyi koru"), sonra adım 17b'nin commit kapısında
> ("kontrolü yine sonraki session'a"). Liste eksilmedi; adım 17b'nin maddesi
> (B6) eklendi ve o da **hiç elle denenmedi**.
>
> ⛔ **BU ARTIK KÜÇÜK BİR EKSİK DEĞİL.** Altı adımın (15, 15b, 15c-1, 15c-2,
> 16, 17, 17b) gerçek cihaz doğrulaması birikmiş durumda. Otomatik testler ve
> `mobile-375` ölçümü hepsinde yeşil, yani BİLİNEN bir arıza yok — eksik olan
> yalnızca gerçek parmakla dokunma deneyimi. Ama liste büyüdükçe tek oturumda
> bitirmek de zorlaşıyor. Sonraki oturum bunu **ilk gündem maddesi** yapsın ve
> gerekirse listeyi ikiye bölmeyi önersin.
> Kod yazmadan önce hatırlat ve **"şimdi mi yapalım, sonra mı?"** diye sor —
> cevabı "sonra" ise bu bölümü olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 giriş
> yöntemleri + adım 15c-2 kimlik doğrulama + adım 16 cron + adım 17 yasal
> + adım 17b hesap yönetimi.
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

### B3) ADIM 15c-2 — KİMLİK DOĞRULAMA

> ✅ **PRODUCTION'DA ÇALIŞIYOR, panel işi GEREKMİYOR.**
> ⚠️ Bu test **Google ile açılmış, kimliği doğrulanmamış** bir hesap istiyor.
> Şifreyle giriş yapılan tohum hesaplarının kimliği ZATEN doğrulanmış — onlarda
> ekran "kimliğiniz doğrulanmış" der ve form hiç çıkmaz (bu da geçerli bir test).

1. **Google ile giriş yap** → `/hesabim` → "Kimliğiniz henüz doğrulanmadı"
   kartı görünüyor mu, "Kimlik durumu: Doğrulanmamış" yazıyor mu
2. **Hastane**'ye git → "Kimlik doğrulaması gerekiyor" + **"Kimlik
   doğrulamasına git"** bağlantısı çıkıyor mu (⛔ bu bağlantı KAYIT ekranına
   GİTMEMELİ)
3. Bağlantıya bas → bot kutusu **çiziliyor mu** (production'da çizilmeli)
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

### B4) ADIM 16 — PLANLI GÖREV (borç #83) — **BİLGİSAYARDAN**

> ⚠️ **BU MADDE TELEFONDAN DEĞİL.** Ekranı yok; kanıt Vercel panelinde.
> ✅ **Deploy 2026-08-10 18:22'de yapıldı**, yani ilk cron koşusu
> **2026-08-11 gecesi** (TR 03:00–04:00).
> 📌 **PROJE SAHİBİNİN NOTU (2026-08-10 gecesi): "cron'un ilk canlı koşusu bu
> gece; YARIN bakılacak."** Yani bu madde **2026-08-11 sabahından itibaren**
> yapılabilir durumda — sonraki oturum bunu ilk gündem maddesi yapsın.
> ⚠️ **UTC 01:00'DEN ÖNCE BAKMA.** Pencere 00:00–00:59 UTC; içindeyken "log
> yok" görmek koşunun hiç olmayacağı anlamına GELMEZ. 2026-08-11 00:20'de tam
> bu sebeple bakılmadı.
> ⛔ **VERCEL LOGLARI TEK KANIT DEĞİL.** Ücretsiz planda kaçırılan koşu log
> bile üretmiyor; "bu iş bugün çalıştı mı" sorusunun güvenilir cevabı
> `audit_logs` tablosundaki `scheduled_task_run` satırları. Panelde log
> göremezsen production veritabanına bakmadan "çalışmadı" deme.

1. Vercel → proje → **Settings → Cron Jobs** → `/api/cron/daily` satırı
   görünüyor mu, zamanlaması `0 0 * * *` mi
2. Aynı satırda **View Logs** → gece bir çağrı düşmüş mü, yanıt **200** mü
   (401 görürsen `CRON_SECRET` production'da yok demektir — ama girildi,
   `altyapi-durumu.md` ortam değişkeni matrisine bak)
3. Yanıt gövdesinde `"failedCount": 0` ve **dokuz görev** var mı
4. **Hastane**'ye gir → gün şeridinde **14 gün** görünüyor mu. ⛔ Adım 16'dan
   önce production'da saatler 2026-08-15'te bitiyordu (borç #38); cron ilk kez
   çalıştıktan sonra takvim her gün 14 güne tamamlanıyor olmalı

### B5) ADIM 17 — YASAL SAYFALAR VE ÇEREZ BANDI

1. Siteyi **temiz bir tarayıcıda** (veya gizli sekmede) aç → altta
   **"Bu sitede yalnızca zorunlu çerezler var"** bandı çıkıyor mu
2. Bantta **yalnızca TEK düğme** ("Anladım") ve bir "Ayrıntılar" bağlantısı
   olmalı — ⛔ "Reddet" düğmesi ÇIKMAMALI (zorunlu olmayan çerez yok)
3. **"Anladım"**a bas → bant kayboluyor ve **aynı sayfada mı kalıyorsun**
   (ana sayfaya atmamalı) → sayfayı yenile, bant geri gelmemeli
4. Alt bilgide **dört yasal bağlantı** görünüyor mu (KVKK · Çerez · Kullanım
   Şartları · İletişim) → dördünü de aç, hepsinde **yürürlük tarihi** ve
   "bu gerçek bir belediye değildir" uyarısı var mı
5. `/gizlilik` → en altta **veri sorumlusu** kutusu. ⚠️ Panel işini yaptıysan
   **adın ve e-postan** görünmeli; yapmadıysan "işleten gerçek kişi" yazar
6. `/cerez-politikasi` → tablo **8 satır** listeliyor mu · "Ölçüm ve istatistik"
   ile "Pazarlama" grupları **boş** diyor mu · **"Tercihimi geri al"**a bas →
   durum değişiyor ve bant yeniden çıkıyor mu
7. Telefonda: çerez tablosu **kendi içinde yana kayıyor** mu, **sayfa yana
   kaymıyor** mu
8. Kayıt akışının **son adımında** (doğrulama kodları ekranı) "Kaydınızı
   tamamladığınızda Kullanım Şartları'nı ve KVKK Aydınlatma Metni'ni …"
   cümlesi ve iki bağlantı görünüyor mu

### B6) ADIM 17b — HESAP YÖNETİMİ VE VERİ HAKLARI (YENİ)

> ⛔ **SON MADDEYİ (hesap silme) EN SONA BIRAK ve ayrı bir hesapla yap** —
> geri alınamaz. Silinen hesabın kimlik numarası serbest kalıyor, yani o
> numarayla yeniden kayıt olabilirsin, ama şifresi ve adresleri gitmiş olur.

1. **Hesabım** → "Verilerim ve hesap yönetimi" kartı görünüyor mu, tıklayınca
   `/hesabim/verilerim` açılıyor mu
2. **"Verilerimi indir (JSON)"** → dosya iniyor mu, adı
   `benim-belediyem-verilerim-<tarih>.json` mi
3. Dosyayı aç (telefonda zor olabilir, bilgisayardan bak): içinde **profil,
   siparişler, rıza kayıtları** var mı · kimlik numarası **maskeli** mi
   (`978******68`) · ⛔ **şifre veya oturum bilgisi GEÇMEMELİ**
4. **Cep telefonum** → numarayı değiştir → kaydet → rozet **"Doğrulanmadı"**a
   dönüyor mu. ⚠️ Bu bir arıza DEĞİL, bilinçli karar (borç #80 açıklaması)
5. Hatalı numara yaz (`12345`) → "Geçerli bir cep telefonu numarası girin"
   çıkıyor mu
6. **Kimlik bağlantım** → şifreyle giriş yapan tohum hesabında **"Şu an
   çözülemiyor"** kutusu çıkmalı ve sebebi yazmalı (Google bağlantısı yok).
   ⛔ "Kimlik bağlantımı çöz" düğmesi ÇIKMAMALI
7. **Hesabımı sil** kartında **iki liste** yan yana görünüyor mu:
   "Silinenler" ve "Saklananlar ve sebebi" → ikincisinde **"Türk Ticaret
   Kanunu m.82"** geçiyor mu (bu bir yasal bildirim, kaybolursa arıza)
8. **"Hesabımı sil"** → onay paneli açılıyor mu, **şifre alanı** çıkıyor mu →
   **yanlış şifre** yaz → "Şifreniz doğrulanamadı" diyor mu ve hesap **duruyor**
   mu → **Vazgeç**'e bas
9. ⏱️ **(İSTEĞE BAĞLI, GERİ ALINAMAZ)** Gözden çıkarabileceğin bir hesapla:
   doğru şifreyle sil → `/hesap-silindi` sayfası açılıyor mu, "Saklananlar"
   listesi orada da var mı → `/hesabim` adresini yaz → giriş ekranına
   atıyor mu → **aynı kimlik numarasıyla yeniden kayıt olabiliyor musun**
10. ⚠️ **Bilinen sorun (borç #91):** bandı hiç kapatmadıysan `/hesap-silindi`
    sayfasında çerez bandı "Saklananlar" başlığını örtüyor. Bandı kapatınca
    görünüyor — bu bilinen bir eksik, yeni bir arıza değil

### C) HER İKİ EKRAN İÇİN ORTAK

1. Tema düğmesiyle **açık/koyu** geçiş → iki temada da metinler okunuyor mu
2. Düğmelere parmakla rahat basılıyor mu (hedefler 44px olmalı)

### D) ⏱️ SAYAÇLARA GERİ DÖN

1. **Restoran siparişinden 10 dakika sonra** (borç #50): `/siparislerim` →
   sipariş **`Hazırlanıyor`** olmalı ve **iptal düğmesi kaybolmalı**.
   25. dakikada tekrar bak: **`Yolda`** olmalı
2. **Talepten 30 dakika sonra** (borç #62): `/destek` → talep **`İnceleniyor`**
   olmalı (`Çözüldü` eşiği 180 dakika, beklemeye gerek yok)

> **Neden bekleme gerekiyor (D bölümü):** durumlar veritabanında bir kolonda
> tutulmuyor, **okuma anında zamandan türetiliyor** (ADR-013).

## ADIM 17b'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/account/` YENİ BİR KATMAN**: `repositories/
  data-export.repository.ts` (indirilecek veriyi okur),
  `repositories/account-erasure.repository.ts` (SİLME ve KİMLİK ÇÖZME —
  `users` satırına yazan tek yer), `services/account-guards.ts` (ortak bütçe +
  şifre yeniden doğrulaması), `services/*` (iş kuralları), `components/`
- ⛔ **"ANONİMLEŞTİRME" KELİMESİNİ KULLANMA.** KVKK Yönetmeliği m.10 anlamında
  anonimleştirme GERİ DÖNDÜRÜLEMEZ olmak zorunda; bizim yaptığımız kişisel
  alanları silip mali kayıtları saklamak, yani **takma adlaştırma**. Kural ve
  gerekçe `docs/standards/14-privacy-and-compliance.md` → "Hesap silme"
- ⛔ **SİLME EKRANINDAKİ "SAKLANANLAR" LİSTESİ SÜS DEĞİL, YASAL BİLDİRİM**
  (Yönetmelik m.12/1-c). Bir "ayrıntılar" düğmesinin arkasına saklanırsa
  bildirim yapılmamış olur. E2E testi bu gerilemeyi yakalıyor — **testi
  gevşetme**
- ⛔ **SİLMENİN DENETİM KAYDI HESAPLA BİRLİKTE SİLİNMİYOR** (m.7/3: imha
  işlemlerinin kaydı en az üç yıl saklanır)
- **KABUL KRİTERİ TESTİ `national_id_hash` KISITI ÜZERİNDEN ÖLÇÜYOR**: silme
  sonrası aynı numarayla yeni bir satır YAZILIYOR. "Alan null oldu mu" diye
  bakmak yetmezdi — asıl soru benzersiz kısıtın serbest kalması
- ⛔ **KİMLİK ÇÖZME, GOOGLE BAĞLANTISI OLMAYAN HESAPTA ENGELLİ.** Giriş
  kullanıcıyı T.C. numarasının özetinden buluyor (`findAuthUserByNationalIdHash`);
  bağ koparsa şifreyle giriş de ölür. Bu kural `login-methods.ts`'teki "son
  giriş yöntemi kaldırılamaz" korumasının aynısı
- **ÇÖZME, ARTIK ÇALIŞMAYAN ŞİFREYİ DE SİLİYOR** — ekranda "Şifre: Tanımlı"
  yazıp çalışmayan bir yöntem göstermek yalan olurdu
- ⛔ **ÜYELİK SİLMEDE İPTAL EDİLMİYOR, yalnızca otomatik yenilemesi
  kapatılıyor.** İptal, taahhüt varsa ERKEN ÇIKIŞ FARKI TAHSİL EDERDİ — yani
  silme düğmesi kullanıcının kartından habersizce para çekerdi
- **TELEFON DOĞRULANMAMIŞ YAZILIYOR** ve ekranda öyle görünüyor. OTP eklemek
  ADR-017'nin reddettiği "güvenlik tiyatrosu" olurdu (kod kullanıcının kendi
  e-postasına gidiyor)
- **`src/lib/same-origin.ts` YENİ ORTAK KAPI**: `Origin` başlığı kontrolü.
  Adım 17'de `/api/consents` içinde yazılmıştı, 17b'de ortak yere taşındı.
  ⛔ **JSON gövdeli uçlarda da GEREKLİ:** `request.json()` `content-type`
  başlığına BAKMIYOR, yani `enctype="text/plain"` ile gönderilmiş bir HTML
  formunun gövdesi de geçerli JSON olarak ayrıştırılır
- ⚠️ **YENİ EKRAN EKLERKEN BAŞLIK ÇAKIŞMASINA DİKKAT**: "Verilerim ve hesabım"
  başlığı, `login.spec.ts`'teki `getByRole("heading", { name: "Hesabım" })`
  seçicisiyle eşleşip testi kırdı (substring eşleşmesi). Başlık "Verilerim ve
  hesap yönetimi" oldu ve eski seçiciye `exact: true` eklendi. **YAŞANDI**

## YAPILACAK — roadmap adım 17c

"Personel yetkisini kimlik doğrulamasından ayır (ADR-017): `isStaff` artık KPS
eşleşmesinden değil, işveren kontrollü bir kanaldan (kurumsal e-posta
doğrulaması) geliyor"

Dal: `feature/personel-yetkisi` (öneri)

### Bu adımda özellikle dikkat

- **ADR-017 İLKE 2 BU ADIMIN TAMAMI**: "Kim olduğun" ile "ne yapmaya yetkili
  olduğun" ayrı sorulardır ve ayrı kanıt ister. Bir kişinin kurum personeli
  olduğu, kimliğinden TÜRETİLEMEZ — **işverenin** doğrulaması gerekir
- **BUGÜN `verifyIdentity` İKİSİNİ TEK İŞLEMDE VERİYOR**: kimlik bağlanınca
  `matchStaffMember(nationalIdHash)` çalışıyor ve eşleşme varsa `isStaff`
  açılıyor. Bu ayrılmalı
- ⛔ **KAYIT AKIŞINDA DA AYNI ŞEY VAR** (`registration.service.ts` →
  `createVerifiedUser`, `staffMemberId`). İki yerde birden ayrılmalı, yoksa
  kapı bir taraftan açık kalır
- **KURUMSAL E-POSTA DOĞRULAMASI** için `OtpChannel` adaptörü zaten var
  (`src/features/otp/`). ⚠️ Ama Resend'de doğrulanmış alan adı YOK (borç #25):
  production'da yalnızca hesabın kayıtlı adresine gönderim yapılıyor. Bu adımın
  canlıda uçtan uca denenebilirliğini SORGULA — belki de kurumsal e-posta
  yerine başka bir işveren kanalı gerekiyor
- **`staff_members` TABLOSUNDA E-POSTA ALANI VAR MI?** `data-model.md`'ye bak:
  bugün `nationalIdHash` (unique, nullable) ve `extensionNumber` var. Kurumsal
  e-posta ile eşleştirme yapılacaksa **şema değişikliği gerekebilir** —
  geriye uyumlu adımlara böl (önce kolon ekle, sonra kullan)
- **HASTANE VE SPOR SALONU EKRANLARI `isStaff`'A BAĞLI.** Kapıyı değiştirirken
  o iki modülün erişim testleri kırmızıya dönmeli ve sonra doğru sebeple
  yeşile dönmeli
- ⛔ **`isStaff` HÂLÂ İSTEMCİDEN GELMEYECEK.** Yeni kanal ne olursa olsun,
  yetki yalnızca sunucuda hesaplanır (`05-auth-security.md`)
- **`role_change` denetim işlemi ZATEN ENUM'DA VAR** — yeni migration
  gerekmeyebilir

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/account/`** — geri alınamaz işlem deseni: ortak bütçe +
  şifre yeniden doğrulaması + CSRF kapısı + tek koşullu yazma
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** — günlük iş eklemenin deseni
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`),
  `staff-matching.service.ts` (**bu adımda değişecek olan**)
- **`src/features/identity/`** — KPS sorgusu, ortak şema
- **`src/features/otp/`** — iki kanallı doğrulama kodu altyapısı
- **`src/features/catalog/`** — ORTAK arama katmanı, Türkçe `unaccent` araması
- **`src/lib/external-fetch.ts`** — dış servis çağrısı (zaman aşımı + deneme +
  devre kesici + Zod). **Yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — bildirim yazma ve **tembel senkronizasyon**
- **`recordAuditLog()`** — kritik işlemler denetim kaydına yazılır
- **`requireAccess()`** uçlar için, **`guardPage()`** sayfalar için
- `messages.ts` — kullanıcıya görünen tüm Türkçe metinler burada, dağıtma
  (tek istisna `messages-legal.ts`, gerekçesi dosyanın başında)
- Tasarım token'ları (`globals.css`) · `page-shell` · `TextField` · `FormAlert`

## TUZAKLAR — daha önce vakit kaybettirenler

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  **Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test`** — sunucuyu Playwright kendi kurar
- ⚠️ **PLAYWRIGHT KOŞTUKTAN SONRA `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  Playwright derlemeyi `NEXT_PUBLIC_TURNSTILE_SITE_KEY=""` ile yapıyor ve
  `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor. Elle tarayıcı testinden
  önce **`npm run build`'i yeniden koş**
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak. **Kırmızı görünce ÖNCE
  YÜKE BAK**
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETEBİLİYOR.** Commit etmeden önce `git status`'a bak
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: oturum satırını doğrudan yazıp
  çereze ham jetonu koymak yeterli (`sessionToken` = jetonun SHA-256 özeti,
  çerez adı `bb_session`)
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit` (`users.staff_member_id` Restrict).
  ⚠️ `consentRecord` ve `auditLog` KULLANICIDAN ÖNCE silinmeli (ikisi Restrict)
- ⚠️ **YENİ (adım 17b): SİLİNMİŞ HESABI E-POSTASINDAN BULAMAZSIN** — silme
  `users.email` alanını NULL yapıyor. E2E temizliği `userId`'yi saklamak zorunda
- ⚠️ **TÜM TABLOYA YAZAN BİR GÖREVİ TEST EDERKEN YAN ETKİYİ GERİ AL**

**Vitest**
- ⚠️ **`vi.resetModules()` + dinamik `import` KULLANIRKEN `instanceof` ÇALIŞMAZ**
  — hata sınıfı her yüklemede yeniden oluşuyor. **Çözüm: hata KODUNA bak**

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** → `{ exact: true }`
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR — GÖRÜNMEZ ÖĞELER DE EŞLEŞİYOR.**
  **Çözüm: aramayı BÖLGEYE sınırla** (`page.getByRole("region", { name: ... })`)
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(..., { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA** —
  **adım 17b'de YİNE YAŞANDI**: yeni kart başlığı "Verilerim ve hesabım",
  `login.spec.ts`'teki `name: "Hesabım"` seçicisiyle substring olarak eşleşti
  ve o test strict mode ihlaliyle düştü. Ders çift taraflı: **yeni başlığı
  çakışmayacak seç** VE **eski seçiciye `exact: true` ver**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**
- ⚠️ **Yasal belgeler BİRBİRİNE de bağlantı veriyor.** Alt bilgi bağlantısını
  ararken `page.getByRole("navigation", { name: ... })` ile sınırla

**Chrome DevTools MCP ile elle test**
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR** (React yeniden
  çizdikten sonra `uid` bayatlıyor; hata dönmüyor ama istek de gitmiyor).
  **Adım 17b'de yaşandı ve "arıza var" sanıldı.** Çözüm: `evaluate_script`
  içinden gerçek DOM `click()` çağır ve `performance.getEntriesByType
  ("resource")` ile isteğin GİDİP GİTMEDİĞİNİ ölç
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü **Playwright `mobile-375` projesiyle** yap
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI
  gösteriyor.** Gerçekten üstte ne var sorusunu `document.elementFromPoint`
  ile ölç

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR** — route handler
  veya server action gerekir
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR**
  (adım 17'de yaşandı, borç #84)
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır. ⛔ **Ama hesabı SİLDİKTEN sonra çağırma** —
  oturum yok, kullanıcı giriş ekranına düşer. Yerine `router.replace()`
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ.** Çözüm `Referer` başlığı
  (ama MUTLAKA aynı alan adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)

**Dosya indirme (adım 17b)**
- ⛔ **DÜZ `<a download>` KULLANMA**: uç hata döndüğünde tarayıcı ham JSON
  hata gövdesini yeni sekmede açar. `fetch` ile al, yanıtı kontrol et
- ⛔ **`URL.createObjectURL` SONRASI `revokeObjectURL` ŞART** — yoksa dosyanın
  tamamı (kişisel veri) sekme kapanana kadar bellekte kalır
- ⛔ **DOSYA ADINI SUNUCU BAŞLIĞINDAN OKUMA**, istemcide yeniden üret

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ.** Kaydı UYGULAMA
  üretiyorsa kimliği `cuid()` olur — `userId`/`anonymousId` üzerinden yakala

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
- ⚠️ **Türkiye'nin UTC farkı `slot-calendar.ts` içinde SABİT +3**

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez.** Tek koşullu yazma
  kullan ve **etkilenen satır sayısına bak**
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA, `createMany({skipDuplicates})` KULLAN**
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog bileşeni YOK ve bilerek eklenmedi** — yıkıcı işlem onayı
  SATIR İÇİ yapılıyor
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
- **Geniş tablo `overflow-x-auto` sarmalayıcıya girer** ve sarmalayıcıya
  `tabIndex={0}` verilir; yoksa 375px'te SAYFANIN TAMAMI yana kayar
- ⚠️ **ÇEREZ BANDI SAYFA ALTINDAKİ İÇERİĞİ ÖRTEBİLİYOR** (borç #91)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR.** İzlenen yol:
  `npx prisma migrate diff --from-config-datasource --to-schema
  prisma/schema.prisma --script` ile SQL üret → migration klasörünü elle
  oluştur → `npx prisma migrate deploy` → `npx prisma generate`.
  ⚠️ **`--to-schema-datamodel` BAYRAĞI KALDIRILDI**, `--to-schema` kullan
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Çözüm `npx vercel redeploy <dagitim-url> --scope barisss`.
  **`vercel redeploy`'a panel adresini DEĞİL dağıtım adresini (`*.vercel.app`)
  ver.** Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
  **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx --env-file=.env` + Prisma
  betiği. ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı** ve
  **commit edilmeden SİLİNMELİ**; ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR**
  (dosya yaz, `-e` kullanma)
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır
- Uzun süren işlerde ekranın uyumaması için `caffeinate -dimsu &`; **oturum
  bitince `pkill caffeinate` ile kapat**

## PROJE KİTİ (`proje-kiti` plugin)

- **Sürüm 1.4.0 GitHub'a yayınlandı** (2026-08-10) — KVKK hesap silme kuralları,
  PRD/roadmap/data-model şablonlarındaki zorunlu veri hakları bölümü
- ⚠️ **Proje sahibinin kurulu sürümü 1.2.0'dı**; güncellemesi gerekiyordu.
  Sonraki oturum, kite bir kural yazacaksa **sürümü yine artırıp push etmeli**
  ve kullanıcıya `/plugin` ekranından güncellemesini hatırlatmalı

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
