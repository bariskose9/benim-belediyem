# Sonraki oturum için hazır prompt — adım 18

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 18 bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **18**'e geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — adım 18 satırı ve teknik borç listesi (#92-#95 YENİ)
- `docs/project/decisions/ADR-017-*.md` — 17b ve 17c bu ADR'den doğdu
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## DURUM

Roadmap adım **0 → 17c bitti** (15, 15b, 15c-1, 15c-2, 16, 17, 17b, 17c dahil).

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Kayıt, giriş, çıkış, oturum, şifre sıfırlama, Google ile giriş** çalışıyor
- **Hastane randevusu** · **Ortak sepet + ödeme** · **Market** · **Restoran**
  · **Sipariş takibi + bildirim** · **Etkinlik + koltuk** · **Spor salonu**
  · **Destek talebi** · **Bilgi panosu** · **Profil merkezi** · **Hakkımızda**
  · **Profilden Google bağlantısı** · **Kimlik doğrulama** · **Planlı görevler**
  · **Yasal sayfalar + çerez rızası** · **Hesap yönetimi ve veri hakları**
  · **Personel yetkisi doğrulaması** çalışıyor
- **Hizmet ızgarasında KAPALI HİZMET KALMADI**
- Preview ve production veritabanları dolu; gerçek kullanıcı 0

> ### 📌 ÖNCEKİ OTURUMUN KAPANIŞ NOTLARI (2026-08-11, TR ~04:20)
>
> | İş | Durum | Kim yapacak |
> |---|---|---|
> | PR #48 (belge notu) | ✅ merge edildi (UTC 00:31) | bitti |
> | Adım 17c kodu | ✅ yazıldı, 285 E2E + 696 birim testi yeşil | PR/deploy durumu aşağıda |
> | Cron ilk koşusu | ⛔ **ÇALIŞMAMIŞ — ÖLÇÜLDÜ** | aşağıya bak |
> | Toplu elle test | ⛔ **YEDİNCİ ve SEKİZİNCİ kez ertelendi** (oturum başında + commit kapısında) | proje sahibi |
> | `LEGAL_*` panel işi | ⛔ hâlâ girilmedi | proje sahibi |

## ⏰ CRON CANLIDA HİÇ ÇALIŞMADI — İLK GÜNDEM MADDESİ

**2026-08-11 UTC 01:06'da production veritabanından ÖLÇÜLDÜ** (pencere
00:00–00:59 UTC kapandıktan SONRA, yani bu yanıltıcı bir negatif DEĞİL):

| Ölçüm | Sonuç |
|---|---|
| `audit_logs` → `scheduled_task_run` (son 3 gün) | **0 kayıt** |
| En ileri `doctor_slots.starts_at` | **2026-08-13** (cron çalışsaydı ~2026-08-25 olmalıydı) |

**Muhtemel sebep:** PR #48 **UTC 00:31'de**, yani cron penceresinin tam
ortasında merge edildi ve production'a yeni bir dağıtım tetikledi (canlı commit
`6e05fd5`). Koşunun dağıtım sırasında düşmüş olması kuvvetle muhtemel. İkinci
ihtimal: ücretsiz planda saat garanti değil ve **kaçırılan koşu yeniden
denenmiyor, log bile üretmiyor.**

⛔ **DERS: UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA.**

**Bu oturumda yapılacak:** UTC 01:00'den sonra aynı sorguyu tekrarla. Yine 0
çıkarsa sebep dağıtım değildir; Vercel → Settings → Cron Jobs → View Logs
incelenmeli ve `CRON_SECRET` sorgulanmalı.

**Production veritabanına okuma erişimi** (bu oturumda kuruldu, çalışıyor):

```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```

Çıkan adresi `PROD_DATABASE_URL` olarak verip **proje kökünde `.mts` uzantılı**
bir betik koştur (`npx tsx betik.mts`). ⛔ Betik **yalnızca okur** ve
**commit edilmeden SİLİNİR**.

## 🔧 PANEL İŞİ — ZORUNLU, İKİ DEĞİŞKEN (adım 17'den DEVREDİYOR)

**Vercel → benim-belediyem → Settings → Environment Variables → Production:**

| Değişken | Ne yazılacak |
|---|---|
| `LEGAL_CONTROLLER_NAME` | Siteyi işleten **gerçek kişinin adı soyadı** |
| `LEGAL_CONTACT_EMAIL` | KVKK başvurularının ulaşacağı **gerçek e-posta** |

**Neden zorunlu:** kullanıcı hesabını silebiliyor ve ekranda "şu kayıtlar şu
kanun gereği saklanıyor" yazıyor — bu, KVKK Yönetmeliği m.12/1-c anlamında
resmî bir **bildirim**. Bildirimi yapan tarafın kim olduğu belli olmalı.
Değişkenler boşken bildirim var ama **muhatabı yok**.

⛔ Bu değerler koda YAZILMADI ve yazılmayacak — depo herkese açık. Girdikten
sonra **yeniden dağıtım gerekiyor**
(`npx vercel redeploy <dagitim-url> --scope barisss`) ve `/gizlilik` sayfasının
altında adının göründüğünü doğrula.

## 📱 TOPLU ELLE TEST — OTURUMUN BAŞINDA GÜNDEME GETİR

> Proje sahibi bunu **2026-08-11'de İKİ KEZ erteledi** — önce oturum başında
> ("sonraya bırak, 17c'ye geç"), sonra adım 17c'nin commit kapısında
> ("kontrolü yine sonrakilere bırakalım topluca"). Bu, listenin **YEDİNCİ ve
> SEKİZİNCİ** ertelenmesi. Liste eksilmedi; adım 17c'nin maddesi (B7) eklendi.
>
> ⚠️ **DESEN ARTIK NET:** proje sahibi elle testi her seferinde "topluca sonra"
> diye erteliyor ve liste her adımda büyüyor. Sonraki oturum bunu bir kez daha
> "yapalım mı" diye sormakla yetinmesin — **listeyi ikiye bölünmüş hâlde
> SUNSUN** (örn. "bu oturum yalnızca B5+B6+B7, kalanı sonraki") ki karar
> "hepsi mi hiçbiri mi" olmaktan çıksın.
>
> ⛔ **YEDİ ADIMIN gerçek cihaz doğrulaması birikmiş durumda.** Otomatik testler
> ve `mobile-375` ölçümü hepsinde yeşil, yani BİLİNEN bir arıza yok — eksik olan
> yalnızca gerçek parmakla dokunma deneyimi. Sonraki oturum bunu **ilk gündem
> maddesi** yapsın ve listeyi **ikiye bölmeyi ÖNERSİN** (artık tek oturumda
> bitmez).
> Kod yazmadan önce hatırlat ve **"şimdi mi yapalım, sonra mı?"** diye sor —
> cevabı "sonra" ise bu bölümü olduğu gibi bırak, adım işine geç.
>
> Kapsanan teknik borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 giriş
> yöntemleri + adım 15c-2 kimlik doğrulama + adım 16 cron + adım 17 yasal
> + adım 17b hesap yönetimi + adım 17c personel yetkisi.
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
> Şifreyle giriş yapılan tohum hesaplarının kimliği ZATEN doğrulanmış.

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
   görünüyor mu
7. ⚠️ **ADIM 17c BURAYI DEĞİŞTİRDİ:** artık başarı panelinde "kurum personeli
   olarak tanındınız" cümlesi **ÇIKMAMALI**. Onun yerine "kurum personeliyseniz
   kurumsal e-postanızı da doğrulamanız gerekiyor" cümlesi ve **"Kurum personeli
   doğrulaması"** düğmesi olmalı
8. **"Devam et"** seni hastaneye geri götürüyor mu ve oradaki mesaj **"yalnızca
   kurum personeline açıktır"** olarak DEĞİŞİYOR mu
9. `/hesabim` → kimlik durumu "Nüfus kayıtlarıyla doğrulandı", ad soyad
   değişmiş, kimlik numarası **maskeli** (`912******32`) mi
10. `/kimlik-dogrulama` adresini tekrar aç → form YOK, "Kimliğiniz doğrulanmış"
    yazıyor mu

### B4) ADIM 16 — PLANLI GÖREV (borç #83) — **BİLGİSAYARDAN**

> ⚠️ **BU MADDE TELEFONDAN DEĞİL.** Yukarıdaki "CRON CANLIDA HİÇ ÇALIŞMADI"
> bölümünü oku — bu artık bir doğrulama değil, bir **arıza araştırması**.

1. Vercel → proje → **Settings → Cron Jobs** → `/api/cron/daily` satırı
   görünüyor mu, zamanlaması `0 0 * * *` mi
2. Aynı satırda **View Logs** → gece bir çağrı düşmüş mü, yanıt **200** mü
   (401 görürsen `CRON_SECRET` production'da yok demektir)
3. **Hastane**'ye gir → gün şeridinde **14 gün** görünüyor mu

### B5) ADIM 17 — YASAL SAYFALAR VE ÇEREZ BANDI

1. Siteyi **temiz bir tarayıcıda** (veya gizli sekmede) aç → altta
   **"Bu sitede yalnızca zorunlu çerezler var"** bandı çıkıyor mu
2. Bantta **yalnızca TEK düğme** ("Anladım") ve bir "Ayrıntılar" bağlantısı
   olmalı — ⛔ "Reddet" düğmesi ÇIKMAMALI
3. **"Anladım"**a bas → bant kayboluyor ve **aynı sayfada mı kalıyorsun**
   → sayfayı yenile, bant geri gelmemeli
4. Alt bilgide **dört yasal bağlantı** görünüyor mu → dördünü de aç, hepsinde
   **yürürlük tarihi** ve "bu gerçek bir belediye değildir" uyarısı var mı
5. `/gizlilik` → en altta **veri sorumlusu** kutusu. ⚠️ Panel işini yaptıysan
   **adın ve e-postan** görünmeli
6. `/cerez-politikasi` → tablo **8 satır** listeliyor mu · "Ölçüm ve istatistik"
   ile "Pazarlama" grupları **boş** diyor mu · **"Tercihimi geri al"**a bas →
   durum değişiyor ve bant yeniden çıkıyor mu
7. Telefonda: çerez tablosu **kendi içinde yana kayıyor** mu, **sayfa yana
   kaymıyor** mu
8. Kayıt akışının **son adımında** Kullanım Şartları ve KVKK bağlantıları var mı

### B6) ADIM 17b — HESAP YÖNETİMİ VE VERİ HAKLARI

> ⛔ **SON MADDEYİ (hesap silme) EN SONA BIRAK ve ayrı bir hesapla yap** —
> geri alınamaz.

1. **Hesabım** → "Verilerim ve hesap yönetimi" kartı görünüyor mu, tıklayınca
   `/hesabim/verilerim` açılıyor mu
2. **"Verilerimi indir (JSON)"** → dosya iniyor mu, adı
   `benim-belediyem-verilerim-<tarih>.json` mi
3. Dosyayı aç (bilgisayardan): içinde **profil, siparişler, rıza kayıtları**
   var mı · kimlik numarası **maskeli** mi · ⛔ **şifre veya oturum bilgisi
   GEÇMEMELİ**
4. **Cep telefonum** → numarayı değiştir → kaydet → rozet **"Doğrulanmadı"**a
   dönüyor mu (bu bir arıza DEĞİL, bilinçli karar — borç #80)
5. Hatalı numara yaz (`12345`) → "Geçerli bir cep telefonu numarası girin"
   çıkıyor mu
6. **Kimlik bağlantım** → şifreyle giriş yapan tohum hesabında **"Şu an
   çözülemiyor"** kutusu çıkmalı. ⛔ "Kimlik bağlantımı çöz" düğmesi ÇIKMAMALI
7. **Hesabımı sil** kartında **iki liste** yan yana görünüyor mu:
   "Silinenler" ve "Saklananlar ve sebebi" → ikincisinde **"Türk Ticaret
   Kanunu m.82"** geçiyor mu (yasal bildirim, kaybolursa arıza)
8. **"Hesabımı sil"** → onay paneli açılıyor mu, **şifre alanı** çıkıyor mu →
   **yanlış şifre** yaz → "Şifreniz doğrulanamadı" diyor mu ve hesap **duruyor**
   mu → **Vazgeç**'e bas
9. ⏱️ **(İSTEĞE BAĞLI, GERİ ALINAMAZ)** Gözden çıkarabileceğin bir hesapla:
   doğru şifreyle sil → `/hesap-silindi` açılıyor mu → **aynı kimlik
   numarasıyla yeniden kayıt olabiliyor musun**
10. ⚠️ **Bilinen sorun (borç #91):** bandı hiç kapatmadıysan `/hesap-silindi`
    sayfasında çerez bandı "Saklananlar" başlığını örtüyor

### B7) ADIM 17c — PERSONEL YETKİSİ (YENİ)

> ⛔ **CANLIDA BU AKIŞ TAMAMLANAMAZ ve bu BİLİNEN bir sınır (borç #92):**
> tohum personel adresleri `@ornek.test` uzantılı ve oraya posta teslim
> edilemez. Yani "kod gelmedi" **arıza değil, beklenen sonuç.** Test edilecek
> şey ekranın bunu DÜRÜSTÇE söyleyip söylemediği.

1. **Kimliği doğrulanmış ama personel OLMAYAN** bir hesapla gir (Google ile
   açıp kimliğini doğruladığın hesap) → **Hesabım** → "Kurum personeli
   doğrulaması" kartı görünüyor mu
2. **Personel olan** bir tohum hesabıyla gir → bu kart **ÇIKMAMALI**, "Personel
   durumu: Kurum personeli" yazmalı
3. Karta bas → `/personel-dogrulama` açılıyor mu
4. ⭐ Ekranda **"Kimliğinizi doğrulamış olmanız kurum personeli olduğunuzu
   göstermez…"** cümlesi var mı (bu ADR-017'nin kullanıcıya anlatılmış hâli,
   kaybolursa kullanıcı neden iki adım olduğunu anlayamaz)
5. ⭐ **"Bu bir gösterim uygulamasıdır… @ornek.test… canlı ortamda teslim
   edilemez"** uyarısı var mı (borç #92'nin kullanıcıya söylenmiş hâli)
6. `/hakkimizda` rehberinden bir kurumsal adres kopyala → forma yaz → **Kod
   gönder** → **"Bu adres kurum rehberinde kayıtlıysa…"** cümlesi çıkıyor mu
7. **Var olmayan** bir adres yaz (örn. `hicyok@ornek.test`) → **AYNI cümle**
   çıkıyor mu (çıkmazsa hesap sayımı koruması bozulmuş demektir — arıza)
8. Rastgele bir kod gir → "Kod doğrulanamadı" tek tip mesajı çıkıyor mu
9. 375px'te düzen bozuluyor mu, açık/koyu iki temada da okunuyor mu

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

## ADIM 17c'DEN DEVREDEN NOTLAR — ÖNCE BUNLARI OKU

- **`src/features/staff-verification/` YENİ BİR KATMAN**:
  `repositories/staff-claim.repository.ts` (**`users.is_staff` ve
  `users.staff_member_id` alanlarına YAZAN TEK YER**),
  `services/staff-verification.service.ts` (iki adımlı akış),
  `schemas/`, `components/`, `errors.ts`
- ⛔ **`matchStaffMember` SİLİNDİ.** Kimlik doğrulaması ve kayıt akışı artık
  personel yetkisi VERMİYOR; `isStaff` ve `staffMemberId` o iki yazma
  girdisinden tamamen çıkarıldı (alan yoksa yanlışlıkla yazılamaz)
- ⛔ **İKİ YERİ BİRDEN KESMEK ŞARTTI.** Yalnızca kimlik doğrulamayı kapatmak
  kapıyı kayıt tarafından açık bırakırdı: saldırgan kurbanın numarasıyla YENİ
  hesap açar ve yetkiyi oradan alırdı
- ⭐ **KANITIN DEĞERİ TEK BİR SATIRDA:** kod `staff_members.work_email`
  adresine gidiyor, kullanıcının kendi adresine DEĞİL. ADR-017'nin
  "güvenlik tiyatrosu" diye reddettiği OTP'de kod saldırganın KENDİ kanalına
  gidiyordu; buradaki fark kanalın sahibi
- ⛔ **İKİNCİ ADIMDA HEDEF BAĞLAMA KONTROLÜ VAR**
  (`pendingChallengeMatchesDestination`). Olmasaydı: kendi adresine kod alan
  biri o kodu BAŞKA bir personelin adresiyle gönderip onun yetkisini alırdı.
  E2E ve db testi bu gerilemeyi yakalıyor — **testi gevşetme**
- **ÖN KOŞUL `kps_verified`:** kimlik yetki VERMEZ ama yetkinin ÖN KOŞULUDUR.
  `access-control.ts`'teki "personel kademesi kimlik kademesini kapsar"
  cümlesinin GEREKÇESİ değişti — artık kendiliğinden değil, KURAL olarak doğru
- **HESAP SAYIMI KORUMASI:** rehberde yok / işten ayrılmış / zaten bağlı üçü de
  SAHTE akışa düşüyor (`issueDecoyChallenge`) ve aynı cümleyi üretiyor.
  Kurumsal adresler `/hakkimizda`'da zaten açık; gizlenen şey adresin varlığı
  değil **o personelin bu sitede hesabı olup olmadığı**
- ⛔ **HIZ SINIRI GERÇEK/SAHTE AYRIMINDAN ÖNCE TÜKENİYOR.** Sonra olsaydı
  dördüncü istekte 429 almak "bu adres rehberde ve boşta" demeye gelirdi
- ⛔ **GÖNDERİM HATASI KULLANICIYA SÖYLENMİYOR** (borç #93) ve bu şifre
  sıfırlamadaki karardan BİLEREK ayrılıyor: orada `unavailable` NADİR bir
  arıza, burada production'ın BEKLENEN durumu (borç #92)
- **MEVCUT PERSONEL HESAPLARINA DOKUNULMADI.** Toplu `is_staff = false`
  canlıdaki personeli hastane ve spor salonundan atardı ve geri dönüşü bugün
  imkânsızdı. Tohumun bağladığı yetki zaten İŞVERENİN verisinden geliyor
- **`OtpChallengeRow`'a `destinationHash` EKLENDİ** — bağlama kontrolü bunu
  okuyor. Düz hedef hiçbir yerde saklanmıyor
- **`EmailChannel` artık AÇIK EŞLEME kullanıyor** (`Record<OtpPurpose, …>`):
  enum'a yeni amaç eklenirse TypeScript derlemede durduruyor. Üçlü koşul
  zinciri olsaydı yeni amaç sessizce yanlış metni alırdı

## YAPILACAK — roadmap adım 18

"Güvenlik denetimi, E2E test seti, Swagger (`/api/docs`), performans bütçesi
ölçümü, Sentry, axe"

Dal: `feature/uretime-hazirlik` (öneri)

### Bu adımda özellikle dikkat

- **BU ADIM ÇOK GENİŞ — proje sahibine BÖLMEYİ ÖNER.** Altı ayrı iş var ve
  CLAUDE.md §7 "aynı anda tek modül" diyor. Muhtemel bölme: 18a (Sentry +
  yapılandırılmış log), 18b (Swagger), 18c (performans bütçesi + axe),
  18d (güvenlik denetimi raporu)
- **PERFORMANS ÖLÇÜMÜ İÇİN BEKLEYEN BİR BORÇ VAR (#84):** çerez bandı kök
  yerleşimde `cookies()` okuduğu için **hiçbir sayfa artık statik değil**.
  Ölçüm hedefi (2,5 sn) aşıyorsa bant bir ara katmana taşınacak
- **SENTRY YENİ BİR DIŞ HESAP DEMEK** — proje sahibine sormadan açtırma;
  `altyapi-durumu.md`'deki hesap tablosuna bak, ADR-016'nın gerekçesi
  ("proje sahibine yeni hesap açtırmamak, açtırmaktan iyidir") burada da geçerli
- ⛔ **LOG'A ŞİFRE, TOKEN, KART, KİMLİK NUMARASI YAZILMAZ** (CLAUDE.md §5.11).
  Sentry'ye giden veri de log'dur

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- **`src/features/staff-verification/`** — iki adımlı doğrulama deseni:
  hesap sayımı koruması + hedef bağlama + tek koşullu yazma + denetim kaydı
- **`src/features/account/`** — geri alınamaz işlem deseni: ortak bütçe +
  şifre yeniden doğrulaması + CSRF kapısı
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** — günlük iş eklemenin deseni
- **`src/features/profile/`** — kullanıcıya ait kayıt yönetiminin DESENİ
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
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
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş.
  ⛔ **ADIM 17c'DE YİNE YAŞANDI ve yarım saat yedi:** `hospital.spec.ts` üst
  üste koşularda "iptal işlemi gerçekleşmedi" diye düştü, tek başına koşunca
  geçti. Değişikliği stash'leyip TEMİZ kodda koşunca bu kez `register.spec.ts`
  düştü — yani sorun kodda değil, **art arda koşmaktaydı.** Sayaçlar boşaltılıp
  yük düşünce 285 test tek seferde yeşil geçti. **Bir testin düşmesini koda
  yormadan ÖNCE kaç kez koştuğuna bak**
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETEBİLİYOR** (tarihler bir gün kayıyor). Commit etmeden önce `git status`'a
  bak — adım 17c'de bu dosya bilerek geri alındı
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: oturum satırını doğrudan yazıp
  çereze ham jetonu koymak yeterli (`sessionToken` = jetonun SHA-256 özeti,
  çerez adı `bb_session`)
- ⚠️ **YENİ (adım 17c): HIZ SINIRINI SAYAÇ SİLEREK DEĞİL, TAZE HEDEF KULLANARAK
  ÇÖZ.** `otp_send:` öneki kayıt ve şifre sıfırlama akışlarıyla PAYLAŞILIYOR;
  toplu silmek paralel koşan başka bir testin sınırını sessizce gevşetir.
  `personel-dogrulama.spec.ts` her koşuda rastgele bir kurumsal adres üretiyor
- ⚠️ **YENİ (adım 17c): E2E SPEC'İ `@/lib/rate-limit` GİBİ `serverEnv` OKUYAN
  BİR MODÜLÜ IMPORT EDEMEZ** — Playwright süreci `NEXT_PUBLIC_*` değişkenlerini
  yüklemiyor ve `env.ts` açılışta patlıyor ("No tests found" ile biter)
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit` (`users.staff_member_id` Restrict).
  ⚠️ `consentRecord` ve `auditLog` KULLANICIDAN ÖNCE silinmeli (ikisi Restrict)
- ⚠️ **SİLİNMİŞ HESABI E-POSTASINDAN BULAMAZSIN** — silme `users.email` alanını
  NULL yapıyor. E2E temizliği `userId`'yi saklamak zorunda
- ⚠️ **SAHTE (decoy) OTP KAYITLARI `userId` TAŞIMAZ**, yani kullanıcı silinince
  basamaklı gitmezler. Akış kimliğinden (`registrationId`) yakala

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
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**
- ⚠️ **Yasal belgeler BİRBİRİNE de bağlantı veriyor.** Alt bilgi bağlantısını
  ararken `page.getByRole("navigation", { name: ... })` ile sınırla

**Chrome DevTools MCP ile elle test**
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR.** Çözüm: `evaluate_script`
  içinden gerçek DOM `click()` çağır ve `performance.getEntriesByType
  ("resource")` ile isteğin GİDİP GİTMEDİĞİNİ ölç
- ⚠️ **YENİ (adım 17c): `document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** —
  mevcut `bb_session` çerezi `httpOnly` ve JS onu ezemiyor. **Çözüm:
  `new_page` çağrısına `isolatedContext` ver** (temiz çerez kavanozu), sonra
  `document.cookie` çalışıyor
- ⚠️ **YENİ (adım 17c): React kontrollü `<input>`'a `value` ATAMAK YETMİYOR** —
  React'in kendi setter'ını çağır:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(el,v)`
  ve ardından `new Event("input",{bubbles:true})` gönder
- ⚠️ **macOS'ta tarayıcı penceresi 375px'e İNMİYOR** (alt sınır ~485px).
  Mobil ölçümü **Playwright `mobile-375` projesiyle** yap
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI
  gösteriyor.** Gerçekten üstte ne var sorusunu `document.elementFromPoint`
  ile ölç

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA** — sunucu
  yeni durumu görüp paneli siler. Kullanıcı "devam et" deyince çağır
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** (borç #84)
- **Sunucuda çizilen sayfa istemci bir şey yazdıktan sonra tazelenmez** —
  `router.refresh()` çağır. ⛔ **Ama hesabı SİLDİKTEN sonra çağırma**
- **Formu sıfırlamak için alanları tek tek temizleme**, bileşene `key` ver
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ.** Çözüm `Referer` başlığı
  (ama MUTLAKA aynı alan adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)

**Dosya indirme**
- ⛔ **DÜZ `<a download>` KULLANMA**: uç hata döndüğünde tarayıcı ham JSON
  hata gövdesini yeni sekmede açar. `fetch` ile al, yanıtı kontrol et
- ⛔ **`URL.createObjectURL` SONRASI `revokeObjectURL` ŞART**
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
  `tabIndex={0}` verilir
- ⚠️ **ÇEREZ BANDI SAYFA ALTINDAKİ İÇERİĞİ ÖRTEBİLİYOR** (borç #91)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR.** Enum değeri eklemek
  gibi basit değişikliklerde migration klasörünü **elle oluşturup**
  `npx prisma migrate deploy` + `npx prisma generate` koşmak yeterli
  (adım 17c'de böyle yapıldı)
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **`prisma migrate reset --force` bayrağı yutuluyor.** Local'i sıfırlamak için
  `docker compose down -v` + `npm run db:up`
- ⚠️ **`auditLog` modelinde `metadata` ALANI YOK** — `entityType` ve `entityId`
  var. Ezberden alan yazma, şemaya bak

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — **production'da da PREVIEW'da
  da**. Çözüm `npx vercel redeploy <dagitim-url> --scope barisss`.
  **`vercel redeploy`'a panel adresini DEĞİL dağıtım adresini (`*.vercel.app`)
  ver.** Merge sonrası `/api/health` içindeki `commit` alanının değiştiğini
  **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**
- ⛔ **YENİ (adım 17c): UTC 00:00–00:59 ARASINDA MERGE ETME** — o pencere
  cron'un penceresi ve dağıtım zamanlanmış koşuyu düşürüyor. 2026-08-11'de
  yaşandı

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ:**
  `git checkout main && git pull && git checkout -b <yeni-dal>`
- ⛔ **YENİ (adım 17c) — 25 DAKİKA YEDİ, EN SİNSİ TUZAKLARDAN BİRİ:**
  **AÇIK BİR PR VARKEN DAL AÇMA; önce onu merge et.**

  Adım 17c'de dal, PR #48 (belge PR'ı) **merge edilmeden önce** `main`'den
  açıldı. #48 tam da bu adımda baştan yazılan iki devir belgesine dokunuyordu,
  yani PR açılınca **çakışma** doğdu. Sonuç:

  ⚠️ **GitHub, çakışan bir PR'da `refs/pull/<N>/merge` referansını
  ÜRETEMİYOR — ve `pull_request` iş akışları o referans üzerinde koştuğu için
  HİÇ BAŞLAMIYOR.**

  ⛔ **BU HATA SESSİZ.** PR'da kırmızı bir kontrol görünmüyor (kontrol hiç
  oluşmuyor), Actions sayfasında uyarı yok, `gh run list` boş dönüyor.
  "Actions bozulmuş" veya "faturalandırma sorunu" sanılıyor. Adım 17c'de üç
  tetikleyici boşuna denendi (PR aç, kapat-yeniden aç, boş commit iterek
  `synchronize`) — üçü de hiçbir koşu başlatmadı.

  **TEŞHİS TEK KOMUT:**
  `gh pr view <N> --json mergeable,mergeStateStatus`
  → `CONFLICTING` / `DIRTY` görüyorsan sebep budur. CI'ı kurcalama.

  **ÇÖZÜM (force-push YOK):** `git merge origin/main` → çakışmayı çöz →
  commit → push. PR anında `MERGEABLE` olur ve iş akışları saniyeler içinde
  başlar.

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → uzak sorgu için `npx tsx` + Prisma betiği.
  ⚠️ **Betik PROJE KÖKÜNDE ve `.mts` uzantılı olmalı** ve **commit edilmeden
  SİLİNMELİ**; ⚠️ **boş `-e ""` çağrısı ASILI KALIYOR** (dosya yaz, `-e` kullanma)
- ⚠️ **ESLint geçici `.mts` betiklerdeki `console.log`'u da yakalıyor** —
  `console.error` kullan veya betiği lint'ten önce sil
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- ESLint `console.log`'u ve efekt içinde `setState`'i yasaklıyor
- `.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır
- Uzun süren işlerde ekranın uyumaması için `caffeinate -dimsu &`; **oturum
  bitince `pkill caffeinate` ile kapat**

## PROJE KİTİ (`proje-kiti` plugin)

> ⛔ **KİTE KURAL YAZMAK BU PROJEYİ GÜNCELLEMİYOR — İKİ AYRI KOPYA VAR.**
>
> | Nerede | Ne işe yarar |
> |---|---|
> | `benim-belediyem/docs/standards/` | **Bu projenin bağlayıcı kuralları.** `CLAUDE.md` §1 hiyerarşisinde 1. sırada; oturum bunu okur |
> | `proje-kiti` plugin'i | **Yeni proje kurulurken kopyalanan şablon.** Mevcut projelere kendiliğinden ulaşmaz |
>
> Bir ders öğrenildiğinde **İKİSİNE DE** yazılmalı. Kitte `kit-senkron` skill'i
> bu iş için var ama **elle çağrılması gerekiyor** — otomatik değil.
> Adım 17c'de bu atlandı ve proje sahibi fark etti: kurallar yalnızca kite
> yazılmıştı, yani `/clear` sonrası yeni oturum onları görmeyecekti.

- **Sürüm 1.6.0 GitHub'a yayınlandı** (2026-08-11) — "iki kopya" sorununun
  KALICI çözümü: `CLAUDE.md`'ye **8. kapı** eklendi (öğrenilen kuralı iki
  kopyaya da yaz + `diff` ile kanıtla), `15-oturum-devri.md`'ye gerekçesi ve
  sırası yazıldı, ve **`kit-senkron` onarıldı** — artık karşılaştırmayı bayat
  kurulu önbellekten değil **kaynak depodan** yapıyor, önbellek geride ise
  durup uyarıyor. ✅ Hepsi bu projeye de senkronlandı ve 17/18 standart
  dosyasının birebir aynı olduğu `diff` ile kanıtlandı (`00-stack.md` bilerek
  hariç — sürüm tablosu projeye özel).
- **Sürüm 1.5.0 GitHub'a yayınlandı** (2026-08-11) — adım 17c'nin üç dersi:
  çakışan PR'ın CI'ı sessizce durdurması (`08-git-workflow`), kimlik≠yetki
  ilkesi (`05-auth-security`), testi koda yormadan önce koşum sayısına bakmak
  (`06-testing`). ✅ **Aynı üçü bu projenin `docs/standards/` klasörüne de
  senkronlandı** (commit `d95c223`).
- **Sürüm 1.4.0 GitHub'a yayınlandı** (2026-08-10)
- ⚠️ **Proje sahibinin kurulu sürümü 1.2.0'dı**; güncellemesi gerekiyordu.
  Sonraki oturum, kite bir kural yazacaksa **sürümü yine artırıp push etmeli**
  ve kullanıcıya `/plugin` ekranından güncellemesini hatırlatmalı.
  ✅ **Adım 17c'nin üç kuralı 1.5.0 ile yazıldı ve projeye de senkronlandı.**

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
