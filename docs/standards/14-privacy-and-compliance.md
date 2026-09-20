# 14 — Gizlilik, KVKK ve Denetlenebilirlik

Kamu/vatandaş odaklı uygulamalarda bu bölüm isteğe bağlı değildir.

⛔ **Proje sahte veriyle çalışıyor olsa bile kurallar birebir uygulanır.**
Sahte olan veridir, yükümlülük değil — ve sahte akış gerçeğin yerine takılacak
iskelettir (`00-stack.md` → *"SİMÜLE EDİLEN DIŞ SERVİS"*). Gevşek kurulan bir
iskelet, gerçek veri geldiği gün ihlale dönüşür.

## Veri minimizasyonu
- Gerekmeyen veri **toplanmaz**. "İleride lazım olur" gerekçesiyle alan eklenmez.
- Her yeni kişisel veri alanı için cevaplanır: neden gerekli, ne kadar saklanacak,
  kim erişebilir, nasıl silinecek.
- Sağlık verisi, din, biyometri gibi özel nitelikli veri **hiç toplanmaz**.
- Kimlik numarası yalnızca kimlik doğrulama zorunluysa toplanır — dış kimlik
  sorgulama servisi (KPS benzeri) **gerçek de olsa simüle de edilse** aynı kural
  geçerlidir; şifrelenerek saklanır, maskelenerek gösterilir, log'a yazılmaz ve
  başka hiçbir amaçla kullanılmaz — nasıl: aşağıda *"Kişisel veriyi şifreli
  saklamak — ve sonra aramak"*.

## ⭐ Kişisel veriyi şifreli saklamak — ve sonra aramak

### Sorun

Kanun (KVKK — 6698 sayılı Kişisel Verilerin Korunması Kanunu) TCKN,
ad-soyad, telefon, e-posta, adresi **kişisel veri**; sağlık, din, biyometri
gibi şeyleri **özel nitelikli** kişisel veri sayar. Bunlar veritabanında açık
duramaz: yedeği alan, sunucuya bakan, DBA — satırı açan herkes TCKN'yi olduğu
gibi görür. *Gerçek hayat:* evraklar kilitli dolapta; ama anahtarı olan her
şeyi okur. Kanun "dolabı kilitle" demiyor, "evrakın **kendisini** şifreli
yaz, anahtarı dolabın **dışında** tut" diyor.

### Şifrelemeyi kim yapar — uygulama katmanında, veritabanında değil

| Nerede | Nasıl | DBA `SELECT` deyince |
|---|---|---|
| Veritabanı katmanında (disk şifreleme, `pgcrypto`) | Disk şifreli; PostgreSQL okurken çözer | **Açık** görür — veritabanı çözmüş |
| ⭐ **Uygulama katmanında** | Uygulama veriyi veritabanına **göndermeden önce** şifreler, okurken çözer; anahtar uygulamanın ortam değişkeninde | Anlamsız baytlar görür; anahtar onda yok |

*Gerçek hayat:* mektubu postaneye vermeden önce şifrelemek — postane taşır,
okuyamaz.

**AES-256-GCM**, parça parça: **AES** en yaygın simetrik şifreleme (aynı
anahtar hem kilitler hem açar — kapı anahtarı gibi) · **256** anahtar
uzunluğu, bugün kırılamaz kabul edilen seviye · **GCM** çalışma kipi:
şifrelerken bir **bütünlük etiketi** de üretir, veri sonradan bir bayt
değişse çözerken hata verir · **nonce** (number used once): her şifrelemede
rastgele 12 bayt — aynı TCKN'yi iki kez şifrelesen iki **farklı** çıktı
çıkar. Güvenlik için şart; ve tam olarak bu, sonraki sorunu doğurur.

### Asıl tuzak — şifreli kolonda arama yapılamaz

Memur TCKN yazıp "bu vatandaşı getir" diyecek:

```sql
SELECT * FROM citizens WHERE national_id_encrypted = ?   -- çalışmaz
```

Nonce rastgele: bugün şifrelenen TCKN'nin çıktısı kayıttakinden **farklı**;
veritabanı iki anlamsız bayt dizisini karşılaştırır, eşit değil. `LIKE` ile
kısmi arama da yok — şifreli veride "başı 123 ile başlayan" diye bir şey
yoktur. "Şifrele" kuralı tek başına uygulanırsa "TCKN ile kayıt bul" ekranı
**yazılamaz**.

**Çözüm: ikinci kolon — aranabilir özet (hash).** Hash / özet / tek yönlü
özet fonksiyonu: veriden sabit uzunlukta bir parmak izi üretir; aynı girdi
**her zaman aynı** çıktı, ama çıktıdan girdiye dönüş yok. *Gerçek hayat:*
parmak izi kimliği doğrular, parmak izinden yüz çizilemez.

| Kolon | İçerik | Ne işe yarar |
|---|---|---|
| `national_id_encrypted BYTEA` | AES-256-GCM ile şifreli TCKN | **Göstermek** — okurken çözülür, maskelenir |
| `national_id_hash VARCHAR(64)` **unique** | TCKN'nin **tuzlu HMAC-SHA256** özeti | **Aramak ve tekilliği zorlamak** — `WHERE national_id_hash = hmac(girilen)`; aynı TCKN iki kez kayıt olamaz |

Arama akışı: girilen TCKN'nin özetini al → hash kolonunda ara → bulunan
satırın şifreli kolonunu çöz → maskele → göster.

**Neden düz SHA-256 değil, tuzlu HMAC:** TCKN 11 hane — olası numara sayısı
~10¹¹. Düz SHA-256'da saldırgan **bütün** olası TCKN'lerin özetini önceden
hesaplar (modern GPU'da saatler), hash kolonunu ele geçirince tabloya bakıp
TCKN'yi geri bulur — **rainbow table / önceden hesaplanmış özet tablosu**.
**HMAC** (hash-based message authentication code) özeti **gizli bir
anahtarla** üretir; anahtarı bilmeyen önceden hesaplayamaz. *Gerçek hayat:*
parmak izi kartlarını herkesin bildiği mürekkeple değil, yalnızca senin
bildiğin mürekkeple basmak.

**Bedel: kısmi arama yok** — ve KVKK mantığında istenmez de: kişisel veriyle
tarama değil, tam eşleşme yapılır. Kısmi aranması gereken alan (ad-soyad)
şifrelenirse aranamaz, şifrelenmezse kişisel veri açıkta kalır; uzlaşma:
arama TCKN / başvuru no gibi tam eşleşen anahtarlarla yapılır, ad-soyad
şifreli durur. ⛔ Bu yüzden *"hangi alanla arama yapılacak"* PRD'de **baştan**
sorulur (`kurumdan-ogrenilecekler.md` → *"BÖLÜM 6 — Hedef kitle"*).

### Diğer parçalar

| Konu | Kural | Neden |
|---|---|---|
| Kolon tipi | `BYTEA` (ham bayt); base64 metin değil | Base64 %33 yer israfı; metin kolonunda `LIKE` ile arayan geliştirici sessizce boş sonuç alır, `BYTEA` bunu yapısal olarak engeller |
| Anahtar | `ENCRYPTION_KEY` — 32 bayt, base64; `.env`'de, ortam başına farklı; kodda ve veritabanında **asla**. `src/config/env.ts`'te Zod `refine` ile uzunluğu doğrulanır | Anahtar verinin yanında durursa şifreleme yoktur |
| **Anahtar döndürme** (rotation) | Şifreli değerin başına anahtar sürümü yazılır (`v1:…`); yeni anahtara geçince eski kayıt hangi anahtarla çözüleceğini bilir, okunurken yeniden şifrelenir | Sürümsüz proje ilk anahtar sızıntısında **bütün veriyi yeniden şifreleyemez** |
| Maskeleme | Ekranda `12*******67`, telefon `54* *** ** 90`; açık değer yalnızca yetkili ekranda ve **"görüntüledi"** olayı audit'e yazılır | Kişisel veriye bakmak da bir işlemdir |
| Kapsam | Yalnızca KVKK kapsamındaki alanlar şifrelenir, tüm tablo değil; liste `data-model.md`'de tablo tablo | Her satırda CPU maliyeti; gereksiz şifreleme aramayı da öldürür |
| Log | Hata mesajına, Sentry'ye, konsola kişisel veri düşmez | Aşağıda *"Log ve hata takibinde gizlilik"* |

⭐ **Kararı veren soru — alan alan:** *"Bu alanı göstermem mi gerekiyor,
aramam mı, ikisi de mi?"* Göstermek → şifreli kolon · aramak → hash kolonu ·
ikisi → iki kolon · hiçbiri → **toplama** (veri minimizasyonu).

Kurum modunda kolon adları kurum standardında (`tckn_sifrelenmis`,
`tckn_ozet`); hangi alanların kapsamda olduğu ve anahtarın nerede duracağı
DB birimine sorulur (`kurumdan-ogrenilecekler.md` → *"BÖLÜM 4 — Veritabanı
birimi"* satır 4.8).

## Saklama ve silme
- Her tablo için saklama süresi tanımlıdır (örn. destek eki 1 yıl, sipariş kaydı 10 yıl).
- Kullanıcı hesabını **kendisi** silebilir.
- Kullanıcı kendi verisini dışa aktarabilir (JSON indirme).
- Süresi dolan veriyi temizleyen planlı görev tanımlıdır.

### Hesap silme — KVKK'nın gerçekten istediği davranış

> Bu bölüm bir projede araştırıldı ve her projede geçerlidir. Kaynak:
> *Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi
> Hakkında Yönetmelik* (RG 28.10.2017/30224).

**ÜÇ İŞLEM BİRBİRİNİN YERİNE GEÇMEZ.** Yönetmelik üç ayrı şey tanımlıyor ve
hangisini yaptığını doğru adlandırmak yükümlülüğün parçasıdır:

| İşlem | Madde | Tanım |
|---|---|---|
| **Silme** | m.8 | Veri **ilgili kullanıcılar** için hiçbir şekilde erişilemez ve tekrar kullanılamaz hâle gelir |
| **Yok etme** | m.9 | Veri **hiç kimse** tarafından erişilemez, geri getirilemez ve tekrar kullanılamaz hâle gelir |
| **Anonim hale getirme** | m.10 | Veri, **başka verilerle eşleştirilse bile** kimliği belirli veya belirlenebilir bir gerçek kişiyle ilişkilendirilemez |

⛔ **EN SIK YAPILAN HATA: kişisel alanları boşaltıp satırı bırakmaya
"anonimleştirme" demek.** Satır hâlâ bir kullanıcı kimliği üzerinden
siparişlere, denetim kayıtlarına, IP özetlerine ve teslimat adresine bağlıysa
yeniden ilişkilendirme yolu kapanmamıştır — bu **takma adlaştırmadır**,
anonimleştirme değil. Anonimleştirme **geri döndürülemez** olmak zorundadır.
Doğru ad ne yapıldığını söyler: *"kişisel alanlar silindi, mali kayıtlar
kişiselleştirilmeden saklanıyor."*

**SİLME TALEBİ GELDİĞİNDE:**

- **Kural (m.12/1-a):** işleme şartlarının **tamamı** ortadan kalkmışsa veri
  silinir, yok edilir veya anonim hale getirilir. Talep **en geç 30 gün** içinde
  sonuçlandırılır.
- **İstisna (m.12/1-c):** şartlardan bir kısmı devam ediyorsa talep
  **gerekçesi açıklanarak** reddedilebilir ve ret 30 gün içinde yazılı ya da
  elektronik olarak bildirilir.
- Yani **"her şeyi sil" doğru cevap değildir.** Başka bir kanun saklamayı
  emrediyorsa o kayıt silinmez — ama bu kullanıcıya **açıkça söylenir.**
- Türkiye'de en sık çarpılan iki saklama yükümlülüğü: **TTK m.82** → ticari
  defter, belge ve ticari yazışmalar **10 yıl**; **VUK m.253** → defter ve
  vesikalar **5 yıl**. İkisi çakıştığında uzun olan uygulanır.
- **Self-service silme en iyi yoldur:** 30 günlük süreyi kendiliğinden karşılar,
  kullanıcı e-posta yazıp cevap beklemez.

**BU YÜZDEN "HESABIMI SİL" EKRANI ÜÇ ŞEYİ BİRDEN YAPAR:**

1. **Siler:** ad, e-posta, telefon, kimlik numarası (şifreli/özetli/maskeli üç
   hâli de), doğum tarihi, adresler, kart bilgileri, şifre, tüm oturumlar, dış
   hesap bağlantıları, bildirimler, sepetler.
2. **Saklar ama kişiselleştirmez:** yasal saklama yükümlülüğü olan mali kayıtlar
   (sipariş, ödeme, iade, tahsilat) tutar ve tarih olarak durur; kişi bağı
   okunamaz hâle gelir.
3. **Söyler:** ekranda ve aydınlatma metninde **neyin silindiği** ve **neyin
   hangi kanun gereği ne kadar süre saklandığı** yazılır. m.12/1-c'nin
   "gerekçesi açıklanarak" şartı tam olarak budur — sessizce saklamak ihlaldir.

**SİLİNEMEYEN KAYITLAR VE SEBEBİ:**

- **Rıza kayıtları ve denetim kayıtları silinmez.** İkisi de bir yükümlülüğün
  **kanıtıdır**; silinirse veri sorumlusu "rıza almıştım" ya da "bu işlemi
  kullanıcının kendisi yaptı" diyemez hâle gelir.
- **İmha işleminin kendisi kayda geçer** (m.7/3): yapılan bütün işlemler kayıt
  altına alınır ve kayıtlar **en az üç yıl** saklanır. Yani "hesabımı sil"
  işleminin denetim kaydı silmenin bir parçasıdır — hesapla birlikte silinemez.

**SAKLAMA SÜRESİ BİTİNCE:**

- Süre dolunca veri **gerçekten** yok edilir veya anonim hale getirilir.
  "10 yıl saklıyoruz" deyip 11. yılda hâlâ tutmak yükümlülüğün ihlalidir.
- **Periyodik imha aralığı altı ayı geçemez** (m.11/2). Günlük çalışan bir
  temizlik görevi bunu fazlasıyla karşılar.
- ⚠️ Yeni bir projede "10 yıl sonra ne olacak" sorusunun kodu henüz yoktur ve bu
  **kabul edilebilir** — ama **teknik borç olarak yazılır.** Kendiliğinden
  hatırlanmaz ve hatırlandığında geç olur.

### Verimi indir (taşınabilirlik)

- Kullanıcı kendi verisinin tamamını makine okunur biçimde (JSON) indirebilir.
- ⛔ **DOSYAYA KONMAZ:** şifre özeti, oturum jetonu, ham veya şifreli kimlik
  numarası, bot/CSRF jetonları, başka kullanıcıların verisi. Kimlik numarası
  **maskeli** hâliyle verilir. Bu dosya indirildiği andan itibaren kullanıcının
  cihazında, indirilenler klasöründe ve muhtemelen e-postasında dolaşacaktır —
  içine ne koyduğun senin kontrolünden çıkar.
- Uç **önbelleklenmez** (`Cache-Control: no-store`) ve indirme **denetim kaydına
  düşer** (kim, ne zaman kendi verisini dışa aktardı).

## Aydınlatma ve rıza
- KVKK aydınlatma metni, çerez politikası, kullanım şartları ve iletişim/başvuru
  sayfaları bulunur (`/gizlilik`, `/cerez-politikasi`, `/kullanim-sartlari`,
  `/iletisim`) ve **alt bilgiden** erişilir.
- Zorunlu olmayan çerez/analitik **rıza alınmadan** çalıştırılmaz.
- Rıza kaydı zaman damgasıyla saklanır.

### Yasal sayfaların yazım kuralları

Bu maddeler bir projede öğrenildi ve her projede geçerlidir.

- **ÇEREZ LİSTESİ ELLE YAZILMAZ, TEK KAYNAKTAN ÜRETİLİR.** Tarayıcıda saklanan
  her şey (çerez + `localStorage` + üçüncü taraf) bir katalog dosyasında durur;
  politika sayfasının tablosu, bandın kipi ve aydınlatma metnindeki "otomatik
  yollarla toplananlar" bölümü hep o kataloğu okur. Üç yerde ayrı ayrı yazılan
  bir liste, ilk değişiklikte gerçeğe aykırı düşer — ve yayımlanmış yanlış bir
  aydınlatma metni, hiç olmamasından ağırdır.
- **ZORUNLU OLMAYAN ÇEREZ YOKSA BANT "KABUL ET/REDDET" DEĞİL, BİLGİLENDİRMEDİR.**
  Reddedilecek bir şey yokken reddet düğmesi göstermek kullanıcıyı yanıltır ve
  rızayı anlamsızlaştırır. Kataloğa rıza gerektiren bir satır eklendiği anda
  **kırmızıya dönen bir test** yazılır; böylece onay arayüzü yazılmadan analitik
  eklenemez.
- **RIZA TABLOSU EKLEMELİDİR (append-only).** Geri alma, eski satırı
  güncellemek değil üzerine `isGranted = false` yazmaktır. Güncellenen bir
  satır "ne zaman verildi" bilgisini yok eder ve kayıt kanıt olmaktan çıkar.
- **RIZA ZİYARETÇİDEN DE ALINIR.** Giriş yapmamış kullanıcının rızası çerezdeki
  rastgele kimliğe bağlanır; kullanıcı sonradan giriş yaptığında kayıt **aynı
  satır üzerinden** hesaba bağlanır. Yeni satır yazılırsa rızanın tarihi giriş
  anına kayar ve kayıt yanlış bir şey söyler.
- **RIZANIN KANITI VERİTABANINDA, ARAYÜZ DURUMU ÇEREZDE.** Bandın çizilip
  çizilmeyeceğine çerez karar verir (her sayfada bir sorgu olmasın diye);
  kanıt tabloda durur. Çerezin değeri, kullanıcının gördüğü metnin **sürümüdür**
  — metin değişince sürüm artar ve bant herkese yeniden çıkar.
- **BANT SIFIR JAVASCRIPT OLMALIDIR.** Her sayfada çizilen bir bileşenin
  istemci paketine girmesi, tüm siteye bedel yükler. Düz bir `<form method="post">`
  + 303 yönlendirme (POST/Redirect/GET) hem betikleri kapalı tarayıcıda çalışır
  hem de bedava gelir. ⚠️ Bandın çerez okuması sayfaları istek anında çizilir
  hâle getirebilir; bu bedel **ölçülür**, varsayılmaz.
- **DÜZ FORM KABUL EDEN UÇTA CSRF KAPISI ŞART.** `Origin` başlığı varsa kendi
  alan adımızla eşleşmelidir. Aksi hâlde saldırganın sayfasındaki gizli bir
  form, kurbanın ziyaretçi kimliğini sıfırlayabilir.
- **VERİ SORUMLUSUNUN KİŞİSEL VERİSİ KODA YAZILMAZ.** Ad ve başvuru e-postası
  ortam değişkeninden okunur. Depo herkese açıksa koda yazılan bir ad git
  geçmişinden çıkarılamaz. Değişken eksikse sayfa **yine çizilir** ve ikincil
  bir başvuru kanalı gösterir — aydınlatma yükümlülüğü "e-postam yok" diye
  ortadan kalkmaz.
- **METNİN İDDİALARI ÖLÇÜLEREK YAZILIR.** Sunucuların hangi ülkede olduğu,
  hangi işleyicilere veri gittiği ve saklama sürelerinin ne olduğu; panelden,
  yanıt başlığından ve veri modeli belgesinden **doğrulanır**, ezberden yazılmaz.
- **YÜRÜRLÜK TARİHİ HER BELGEDE GÖRÜNÜR.** "Hangi metni okumuştum" sorusunun
  başka cevabı yok.
- **GÖSTERİM/PORTFÖY PROJESİNDE FERAGAT HER YASAL SAYFADA TEKRARLANIR.** Bu
  sayfalar arama sonucundan doğrudan açılır; alt bilgideki genel uyarıyı o
  kullanıcı hiç görmemiş olabilir.
- **SEO:** her yasal sayfanın kendi `title` ve `description`'ı, kendi canonical
  adresi ve **tek bir `h1`'i** olur; hepsi `sitemap.xml`'e aynı katalogdan
  eklenir. Giriş gerektiren adresler site haritasına yazılmaz.
- **ADRESTEN GELEN HATA KODU EKRANA BASILMAZ**, bilinen kodlar tablosunda
  aranır. Doğrudan yazılırsa sayfaya istediği metni gösteren bir bağlantı
  dağıtılabilir (içerik enjeksiyonu / kimlik avı).

## Denetim kaydı (audit log)
Tablo yapısı, before-image kuralı ve yazan mekanizma `04-database.md` →
*"Denetim kaydı ve saklama"*; burada yalnızca gizlilik yönü:
- Kapsam: giriş/çıkış, yetki değişikliği, ödeme, iptal, silme, yönetici işlemleri.
- Kayıt **değiştirilemez ve silinemez** (append-only).
- `before_image` satırın tamamını taşır — içindeki kişisel veri ana tablodaki
  ile **aynı** şifreleme/maskeleme ve saklama süresine tabidir; audit, kişisel
  verinin "arka kapıdan" açık kaldığı yer olamaz.

## Log ve hata takibinde gizlilik
- Log'a asla: şifre, token, kart numarası, kimlik numarası, adres, e-posta gövdesi.
- Hata takip aracına gönderilen veriler maskelenir.
- Üçüncü parti bir servise veri gönderiliyorsa bu listelenir ve gerekçelendirilir.

### ⛔ BİR "ÇALIŞIYOR MU" KONTROLÜ, İKİ DURUMDA DA DENENMEDEN YAZILMAZ

Bir teşhis komutu ("şu adres 404 dönüyorsa kurulu değildir") belgeye
yazılmadan önce **hem ÇALIŞIR hem ÇALIŞMAZ durumda** ölçülmelidir. Yalnızca
başarısız durumda denenen bir kontrol, iki durumu da aynı cevapla geçiştirip
**yanlış güven** üretir.

Bir projede aynı kontrol üç kez yanlış yazıldı: adres parametresi eksikti,
sonra sahte kimlikler kullanıldı, sonunda gerçek kimliklerle bile yanlış
çıktı — çünkü hedef uç yalnızca `POST` kabul ediyordu ve `GET`'e 404
dönüyordu. Üçünde de "kurulu değil" cevabı doğru görünüyordu, ama kontrol
kurulu durumda da aynı cevabı veriyordu.

⚠️ Ayrıca: bir bileşenin **varlığı** onun **çalıştığını göstermez.** Aynı
projede tünel yolu, hata takibi hiç yapılandırılmamışken de kuruluyordu —
kaynak kodundan okundu. "Var mı" ile "çalışıyor mu" ayrı sorulardır.

**Kural:** teşhis komutu yerine **uçtan uca ölçüm** yaz — gerçek bir olay
üret ve sonucunu (yanıt kodu, dönen kimlik, giden gövde) oku.

### ⛔ ÜÇÜNCÜ TARAF SDK'SININ VARSAYILANLARI DENETLENİR VE TESTLE KİLİTLENİR

Hata takibi ve analitik SDK'larının varsayılan ayarı genellikle **"elinden
geleni topla"**dır. Kurulum sihirbazına güvenmek, kişisel veriyi sessizce
yurt dışına göndermek demek olabilir. Bir projede SDK'nın kendi tip tanımından
okunan varsayılanlar:

| Ayar | Varsayılan | Ne anlama gelirdi |
|---|---|---|
| HTTP istek gövdesi | toplanır | Kayıt formunun tamamı: şifre + kimlik numarası |
| Çerezler | toplanır | Oturum çerezi |
| HTTP başlıkları | toplanır | `Authorization`, `Cookie` |
| Veritabanı sorgu verisi | toplanır | Sorgunun PARAMETRE DEĞERLERİ |
| Yığın çerçevesi değişkenleri | toplanır | Yereldeki `password`, `nationalId` |
| Adres sorgu parametreleri | toplanır | Tek kullanımlık jetonlar |

**Yapılacak:** her birini açıkça kapat ve **bir birim testiyle kilitle**. Test
bir gerileme kapısıdır: SDK yükseltmesi veya bir başkasının "şunu da açalım"
demesi kırmızıya döner.

### ⛔ OTURUM TEKRARI (session replay) kişisel veri toplayan ekranlarda AÇILMAZ
Kullanıcının ekranını kaydeder. Maskeleme seçenekleri açık olsa bile **kaydın
kendisi** yeni bir işleme faaliyetidir ve aydınlatma metninde yazmıyorsa
hukuki dayanağı yoktur. Açılacaksa sıra: ADR → aydınlatma metni → rıza → kod.

### ⛔ HER SAYFA GÖRÜNTÜLEMESİNDE ÜÇÜNCÜ SERVİSE PİNG ATILMAZ
Hata takip SDK'ları varsayılan olarak "oturum izleme" yapar: hiçbir hata
olmadan, her sayfa yüklemesinde olay gönderir. Çerez politikasında "ölçüm ve
istatistik yapılmıyor" yazan bir sitede bu, yazdığın cümleyi yanlışlar.
**Kapat; üçüncü servise yalnızca gerçek bir hata olduğunda istek gitsin.**
Tarayıcıda ölçerek doğrula: temiz sayfa açılışında sıfır istek olmalı.

## Erişim
- En az yetki ilkesi: her rol yalnızca işini yapacak kadar erişir.
- Üretim veritabanına doğrudan erişim istisnadır; yapıldığında kaydedilir.
- Yetki değişiklikleri denetim kaydına düşer.

## Erişilebilirlik yükümlülüğü
Kamu hizmeti sunan arayüzlerde erişilebilirlik yasal bir beklentidir.
WCAG 2.1 AA hedefi `07-ui-design-system.md` altında tanımlıdır ve
otomatik denetim (axe) CI'da çalışır.
