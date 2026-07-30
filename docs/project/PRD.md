# Benim Belediyem — Ürün Gereksinim Dokümanı (PRD)

> **Kaynak:** Analiz birimi
> **Durum:** Taslak — eksik ve belirsiz noktalar Claude tarafından soru sorularak tamamlanacak
> **Not:** Bu dosya "ne yapılacağını" anlatır. "Nasıl yapılacağı" `docs/standards/` altındadır.

---

## 1. Amaç

Vatandaşın belediye hizmetlerine tek bir hesapla, tek bir arayüzden eriştiği bir web
uygulaması.

**Herkese açık hizmetler:** etkinliğe bilet alma, belediye marketinden ve restoranından
sipariş verme, destek talebi açma; hava durumu, haber ve piyasa bilgileri; kurumsal
bilgi ve personel rehberi.

**Yalnızca kurum personeline açık hizmetler:** hastane randevusu ve spor salonu üyeliği.
Bunlar belediyenin **personel sağlık birimi** ve **personel spor tesisi** hizmetleridir;
vatandaşa açık değildir. Erişim kuralları §5.0'daki erişim kademeleri tablosundadır.

**Bu bir portföy/öğrenme projesidir.** Ödeme, ürün, doktor, sanatçı ve kullanıcı
verilerinin tamamı sahtedir. Gerçek para akışı ve gerçek kişisel veri yoktur.

## 2. Kapsam dışı
Gerçek ödeme entegrasyonu · **gerçek** e-Devlet/KPS entegrasyonu (kimlik doğrulama
sahte KPS ile taklit edilir, bkz. §5.0) · gerçek stok-lojistik · çok dillilik ·
yönetici paneli (faz 2'ye bırakıldı) · **gerçek SMS gönderimi**

> Bildirim istisnası: uygulama içi bildirimler kapsam içidir. Doğrulama kodu
> **e-postası** production'da gerçekten gönderilir; **SMS** hiçbir ortamda gerçek
> gönderilmez (sağlayıcı ücretli ve İYS/marka onayı gerektirir).

## 3. Kullanıcı rolleri

Rol tek bir alan değildir. Üç bağımsız bilgi birlikte yetkiyi belirler:
**giriş yapmış mı** · **kimliği KPS ile doğrulanmış mı** · **personel mi**.
Üçü de sunucuda hesaplanır (bkz. §5.0).

| Kademe | Nasıl olunur | Yetki |
|---|---|---|
| **Ziyaretçi** | Giriş yapmamış | Tüm sayfaları görebilir, listeleri okuyabilir. **Hiçbir kayıt oluşturamaz** |
| **Doğrulanmamış üye** | Google ile giriş, KPS doğrulaması yok | Market, restoran, etkinlik, destek: kendi kayıtlarında tam CRUD. Hastane ve spor salonu **kapalı** |
| **Doğrulanmış vatandaş** | KPS ile kimlik doğrulanmış | Yukarıdakilerin tamamı. Hastane ve spor salonu **yine kapalı** |
| **Personel** | KPS doğrulanmış **ve** personel rehberinde eşleşmiş | Tüm hizmetler açık — hastane randevusu ve spor salonu üyeliği dahil |
| **Yönetici** | Faz 2 | İçerik yönetimi — bu fazda yok |

Her kademe yalnızca **kendi** kayıtlarını görür ve yönetir; başkasının kaydına
erişim sunucuda engellenir (IDOR koruması, `03-api-guidelines.md`).

**Temel kural:** Ziyaretçi bir aksiyon butonuna bastığı anda (randevu al, sepete ekle,
rezervasyon yap, üye ol) **giriş ekranı açılır**; giriş sonrası kaldığı yerden devam eder.

## 4. Ortak özellikler

- **Tek hesap (SSO):** T.C. kimlik numarasıyla bir kez giriş yapılır,
  tüm modüller aynı oturumu kullanır.
- **Üst navigasyon barı:** Sol tarafta "Benim Belediyem" logosu (tıklayınca anasayfa),
  ortada modül bağlantıları, sağda sepet, dark mode düğmesi, profil/giriş.
- **Dark mode:** Her sayfada çalışan aç/kapa düğmesi; tercih kalıcı saklanır.
- **Responsive:** Mobil öncelikli; 375px'ten masaüstüne kadar bozulmadan çalışır.
- **Ortak sepet:** Market, restoran ve etkinlik ürünleri **tek sepette** toplanır ve
  **tek ödeme** ile tamamlanır. Ödeme anında sistem, teslimat biçimi farklı olduğu
  için arka planda **modül başına ayrı sipariş** oluşturur (aşağıya bakınız).
  **Spor salonu üyeliği sepete girmez** — abonelik
  tek seferlik bir satın alma değildir (taahhüt, otomatik yenileme ve iptal kuralları
  vardır), kendi akışıyla satın alınır (§5.6).
- **Ziyaretçi sepeti:** Giriş yapmamış kullanıcı da sepete ürün ekleyebilir; sepet
  tarayıcıdaki rastgele bir kimlikle taşınır. Kullanıcı giriş yaptığında bu sepet
  hesabındaki sepetle **birleştirilir** (aynı ürün varsa adetler toplanır, stok
  sınırı aşılmaz). Ödeme adımı giriş zorunludur. §3'teki "kaldığı yerden devam eder"
  kuralı bu mekanizmayla çalışır.
- **Ödeme:** Tek yöntem sahte kredi kartıdır. Cüzdan/bakiye sistemi yoktur.
- **Profil sayfası:** Kullanıcının tüm randevuları, rezervasyonları, siparişleri,
  üyelikleri ve destek talepleri tek yerde listelenir ve yönetilir.

## 5. Modüller

### 5.0 Kimlik Doğrulama — Sahte KPS Entegrasyonu

Gerçek belediye uygulamalarında kayıt ve giriş **KPS (Kimlik Paylaşım Sistemi)**
üzerinden yapılır: vatandaş T.C. kimlik numarasını girer, kimlik bilgileri kurumun
kendi veritabanından değil dış servisten gelir. Bu projede aynı mimari
**sahte bir KPS servisi** ile birebir taklit edilir.

**Neden böyle:** Dış kimlik servisiyle çalışmak (zaman aşımı, hata, önbellek, kimlik
doğrulama, numara taraması saldırısı) gerçek işin en kritik parçasıdır. Sahte de olsa
doğru mimariyle kurulursa ileride gerçek KPS'e geçmek yalnızca adaptör değişimi olur.

#### Mimari
- KPS, uygulamanın **dışında** bir servis gibi ele alınır: ayrı uç (`/api/mock-kps/*`),
  ayrı veri kümesi (`kps_citizens`), ayrı hata modeli, yapay gecikme (200–800 ms)
- Uygulama koduna `IdentityProvider` arayüzü üzerinden erişilir.
  `MockKpsProvider` bugünkü uygulamadır; gerçek KPS geldiğinde yalnızca bu sınıf değişir
- Zaman aşımı (3 sn), en fazla 2 yeniden deneme, üst üste hata alınırsa devre kesici
- KPS çöktüğünde: yeni kayıt alınamaz ama **mevcut kullanıcılar giriş yapabilir**
  (giriş KPS'e bağımlı değildir). Kullanıcıya net bilgi mesajı gösterilir

#### Kayıt akışı
1. Kullanıcı **T.C. kimlik numarası + doğum yılı** girer (ikinci alan doğrulama içindir)
2. Numara istemcide biçim olarak, sunucuda **kontrol basamağı algoritmasıyla** doğrulanır
3. Sahte KPS sorgulanır. Sonuç: ad, soyad, doğum tarihi, doğum yeri, baba adı, anne adı,
   nüfusa kayıtlı il/ilçe, adres
4. Doğum yılı eşleşmezse kayıt bilgisi **gösterilmez** — "bilgiler eşleşmedi" denir
4b. **Yaş kontrolü: 18 yaşını doldurmamış kişi kayıt olamaz.** KPS'ten gelen doğum
   tarihi **sunucuda** kontrol edilir (istemcinin gönderdiği yaşa güvenilmez);
   küçükse kayıt reddedilir ve "Bu hizmet 18 yaşını doldurmuş vatandaşlara açıktır"
   mesajı gösterilir. Gerekçe: uygulamada ödeme, taahhütlü sözleşme (spor salonu)
   ve teslimat var; ayrıca çocuk verisi toplanmaması KVKK açısından tercih edilir
5. Kimlik alanları ekranda **salt okunur** gelir; kullanıcı değiştiremez
6. Kullanıcı yalnızca iletişim bilgisi (e-posta, cep telefonu) ve şifre girer
7. **İki adımlı doğrulama — e-posta VE telefon.** İki ayrı 6 haneli kod üretilir:
   biri e-posta adresine, biri cep telefonuna. **İkisi de doğrulanmadan hesap açılmaz.**
   - **E-posta kodu:** production'da ücretsiz e-posta servisiyle gerçekten gönderilir
   - **Telefon kodu:** gerçek SMS sağlayıcısı yoktur; her ortamda sahte kanaldan üretilir
   - İki kod birbirinden bağımsız doğrulanır; biri geçerken diğeri geçersizleşmez
   - Kod kuralları (süre, deneme hakkı, hız sınırı) aşağıdaki
     "Doğrulama kodu (OTP) kanalı" bölümündedir
8. Hesap oluşur ve kimlik numarasına bağlanır. Aynı numarayla ikinci hesap açılamaz

#### Giriş akışı
- **T.C. kimlik numarası + şifre**, veya **Google ile giriş** (aşağıya bakınız)
- Giriş anında KPS sorgulanmaz — hız ve dayanıklılık için
- 2 başarısız denemeden sonra bot doğrulaması istenir

#### Şifre sıfırlama
- Kullanıcı kimlik numarasını girer → **kayıtlı e-posta adresine 6 haneli kod** gider
  (bağlantı değil kod; kayıt ve doğrulama ile aynı OTP mekanizması kullanılır)
- Kod kuralları kayıttakiyle aynıdır: 5 dakika, 3 deneme, tek kullanımlık
- **Hesap sayımı koruması:** kimlik numarası kayıtlı olsun olmasın **aynı mesaj**
  ve **aynı yanıt süresi** döner — "böyle bir kullanıcı yok" bilgisi sızdırılmaz
- Bot doğrulaması zorunludur
- Şifre değiştiğinde kullanıcının **tüm aktif oturumları düşer**

#### Adres ve kimlik güncelleme
- Kimlik bilgileri uygulamadan **düzenlenemez**; profil ekranında "KPS'ten güncelle"
  düğmesi vardır, yeniden sorgulanır
- Nüfus adresi ile teslimat adresi ayrıdır. Teslimat adresini kullanıcı kendi girer

#### Güvenlik kuralları (zorunlu)
- **Numara taraması (enumeration) koruması:** KPS sorgu ucu IP ve oturum bazlı
  sıkı hız sınırlıdır (örn. 5 deneme / 15 dakika). Aşılırsa geçici kilit
- Başarısız sorguda **hangi alanın tutmadığı söylenmez** — tek tip mesaj döner
- Kimlik numarası hiçbir log'a, hata takip aracına, analitiğe yazılmaz
- Veritabanında şifrelenerek saklanır; ekranda maskelenir (`123*****90`)
- **KPS'ten hangi alan kalıcı tutulur:** yalnızca hesabın çalışması için gerekli
  olanlar — ad soyad, doğum tarihi, şifreli kimlik numarası, nüfus il/ilçe ve
  son senkron tarihi. **Kalıcı tutulmayanlar:** baba adı, anne adı, doğum yeri,
  medeni hal, nüfus adresi — bunlar yalnızca kayıt ekranında gösterilir,
  veritabanına yazılmaz (veri minimizasyonu, `14-privacy-and-compliance.md`)
- Tam KPS yanıtı en fazla 15 dakika önbellekte tutulur (kayıt akışı yarıda kalırsa
  tekrar sorgu atılmasın diye). Önbellek anahtarı kimlik numarası **değil**,
  oturuma bağlı rastgele bir kimliktir
- KPS sorgu ucu yalnızca sunucu tarafından çağrılır, tarayıcıya açılmaz
- Her KPS sorgusu denetim kaydına yazılır (kim, ne zaman, sonuç — numara hariç)

#### Google ile giriş — ikinci giriş yöntemi

Google **kimlik doğrulamaz**; yalnızca bir e-posta hesabının sahibi olduğunu kanıtlar.
KPS kimliği doğrular. Personel kayıtları ise **çalışan olduğunu** gösterir.
Üçü farklı işler yapar ve hesapta **üç ayrı alan** olarak tutulur:

- **Giriş yöntemleri:** şifre, Google (biri veya ikisi)
- **Kimlik durumu:** `dogrulanmamis` / `kps_dogrulandi`
- **Personel durumu:** `isStaff` — personel rehberinde kimlik numarası eşleşiyorsa `true`

#### Erişim kademeleri

| İşlem | Doğrulanmamış (Google) | KPS doğrulanmış vatandaş | KPS + Personel |
|---|---|---|---|
| Gezinme, listeleri okuma | ✔ | ✔ | ✔ |
| Belediye Market siparişi | ✔ | ✔ | ✔ |
| Belediye Restoran siparişi | ✔ | ✔ | ✔ |
| Etkinlik bileti | ✔ | ✔ | ✔ |
| Destek talebi | ✔ | ✔ | ✔ |
| **Hastane randevusu** | ✘ | ✘ | ✔ |
| **Spor salonu üyeliği** | ✘ | ✘ | ✔ |

Hastane ve spor salonu **kurum personeline özel hizmetlerdir** — belediyenin personel
sağlık birimi ve personel spor tesisi. Bu nedenle yalnızca personel erişebilir.

Erişemeyen kullanıcıya, eksiğinin ne olduğuna göre farklı mesaj gösterilir:
- Kimlik doğrulanmamışsa → "Bu hizmet için kimlik doğrulaması gerekiyor" + KPS adımına yönlendirme
- Kimlik doğrulanmış ama personel değilse → "Bu hizmet yalnızca kurum personeline açıktır"
  (yönlendirme yapılmaz, kayıt oluşturulamaz)

#### Personel durumu nereden gelir

**KPS'ten gelmez.** KPS nüfus bilgisi verir, kimin nerede çalıştığını bilmez.
Gerçek kurumlarda bu bilgi insan kaynakları / personel sisteminden gelir.
Bu projede aynı ayrım korunur:

- Personel bilgisi `StaffMember` tablosundadır (Hakkımızda modülündeki rehberin aynısı)
- KPS doğrulaması tamamlandığında kimlik numarası personel rehberinde aranır
- Eşleşme varsa hesap `isStaff = true` olur ve hangi birime bağlı olduğu görünür
- Eşleşme yoksa hesap normal vatandaş olarak kalır
- Personel durumu **her KPS senkronizasyonunda yeniden hesaplanır** (işten ayrılma senaryosu)
- Kullanıcı bu alanı hiçbir şekilde kendisi değiştiremez

#### Tek gerçek hesap (proje sahibi)

Geliştirme ve gösterim amacıyla **bir tane gerçek hesap** bulunur: projenin sahibi.
Bu hesap personel rehberinde Bilgi İşlem Dairesi Başkanlığı / Yazılım Geliştirme
Şube Müdürlüğü altında yer alır ve hastane + spor salonu erişimine sahiptir.

**Gerçek kişisel bilgiler koda ve depoya yazılmaz.** Bu hesabın kimlik numarası,
telefonu, e-postası ve adı yalnızca ortam değişkenlerinden okunur:

```
OWNER_TCKN=          OWNER_PHONE=
OWNER_EMAIL=         OWNER_FULL_NAME=
```

- `.env.example` yalnızca anahtar adlarını içerir, değer içermez
- Bu değişkenler tanımlı değilse seed bu hesabı **oluşturmaz** — depoyu klonlayan
  başka biri projeyi sorunsuz çalıştırabilir
- Depo herkese açık olacağı için bu kural esnetilemez

#### Doğrulama kodu (OTP) kanalı

Kod gönderimi de KPS gibi **adaptör arkasındadır** (`OtpChannel`). Kayıtta iki kanal
**birlikte** kullanılır: e-posta gerçek, telefon sahte.

| Hedef | Kanal uygulaması | local / preview | production |
|---|---|---|---|
| **E-posta** | `EmailChannel` | `MockChannel` — kod ekranda gösterilir | Ücretsiz e-posta servisiyle **gerçek gönderim** |
| **Telefon** | `SmsChannel` | `MockChannel` — kod ekranda gösterilir | **`EmailSmsSimulationChannel`** — kod, "SMS simülasyonu" başlığıyla kullanıcının e-postasına gönderilir |

Türkiye'de gerçek SMS göndermek ücretsiz değildir ve marka/İYS onayı ister.
Bu yüzden production'da telefon kodu da e-posta ile taşınır: **kod hiçbir ortamda
ekranda görünmez**, böylece `05-auth-security.md` "production'da görünür kod asla"
kuralı delinmez. `SmsChannel` arayüzü hazır durur; gerçek sağlayıcı eklenirse
yalnızca bu sınıf değişir, akış aynı kalır.

**Bilinen sınır (kabul edilmiş bedel):** kod e-postadan geldiği için telefon
doğrulaması, numaranın gerçekten kullanıcıya ait olduğunu **kanıtlamaz**.
Akışın, veri modelinin ve hız sınırlarının doğru kurulması amaçlanmıştır;
gerçek sahiplik kanıtı ancak gerçek SMS sağlayıcısıyla mümkündür.
E-postaya giden iki kod birbirinden ayrı konu başlığı ve ayrı geçerlilik taşır.

#### Bot ve otomasyon koruması ("ben robot değilim")

Hız sınırı bir kişinin **çok denemesini** engeller; bot koruması **binlerce sahte
kişinin** aynı anda denemesini engeller. İkisi birbirinin yerine geçmez, birlikte çalışır.

**Zorunlu olduğu yerler** (hepsi giriş gerektirmeyen, dışarıya açık ve maliyetli uçlar):

| Yer | Neden |
|---|---|
| Kayıt formu — KPS sorgusundan **önce** | Numara taraması (enumeration) saldırısının birincil hedefi; her sorgu dış servis maliyeti |
| Giriş formu — **2 başarısız denemeden sonra** | Şifre deneme saldırısı. İlk denemede gösterilmez, gereksiz sürtünme yaratmaz |
| Şifre sıfırlama talebi | Hesap sayımı ve e-posta bombardımanı |
| "Kodu tekrar gönder" | Gönderim maliyeti ve e-posta spam'i |
| Destek talebi oluşturma | Spam içerik ve dosya yükleme suistimali |

**Gerekmediği yerler:** giriş yapılmış kullanıcının yaptığı işlemler (sepet, ödeme,
randevu, üyelik). Oturum zaten bir kimliğe bağlı; oraya doğrulama koymak
kullanıcıyı yorar, güvenlik katkısı düşüktür.

**Seçilen çözüm: Cloudflare Turnstile** (bkz. `decisions/ADR-004-bot-korumasi-turnstile.md`)
— ücretsiz, çerez koymaz, siteler arası takip yapmaz, "managed" modunda çoğu kullanıcı
hiç bulmaca görmez.

**Kurallar:**
- Doğrulama **sunucu tarafında** kontrol edilir. İstemciden gelen "doğrulandı"
  bilgisine güvenilmez; jeton her istekte Turnstile doğrulama ucuna karşı sınanır.
- Jeton **tek kullanımlıktır**; aynı jetonla ikinci istek reddedilir.
- **Managed (uyarlanabilir) mod** kullanılır: kullanıcı şüpheli değilse hiç bulmaca
  çözmez, yalnızca bir onay kutusu görür.
- Erişilebilirlik: yalnızca görsel bulmaca kullanılmaz; klavyeyle tamamlanabilir olmalı
  (`07-ui-design-system.md` WCAG 2.1 AA gereği).
- Local ortamda kapatılabilir (`.env` anahtarı yoksa doğrulama atlanır ve bu
  **yalnızca local'de** geçerlidir); preview ve production'da zorunludur.
  Turnstile'ın resmî test anahtarları local'de "her zaman geçer" modunda kullanılabilir.
- Turnstile erişilemezse (dış servis çöktü): kayıt ve şifre sıfırlama **durur**,
  kullanıcıya anlaşılır hata gösterilir. Doğrulama atlanarak açık bırakılmaz —
  bu, `12-operations-and-scaling.md`'deki "widget çökerse sayfa ayakta kalır"
  kuralının **istisnasıdır**; güvenlik kapısı bilgi widget'ı değildir.
- Kişisel veri gönderilmez, ancak Cloudflare **ABD merkezli bir işleyicidir**:
  KVKK aydınlatma metninde "yurt dışına aktarım" olarak açıkça belirtilir ve
  `14-privacy-and-compliance.md` uyarınca üçüncü parti servisler listesine yazılır.

Kod kuralları: 6 hane · **5 dakika geçerli** · 3 deneme hakkı · tek kullanımlık ·
veritabanında özetlenerek (hash) saklanır · gönderim hız sınırına tabidir
(aynı hedefe 3 kod / 15 dakika).

Süre neden 5 dakika: kod artık e-posta ile taşınıyor ve e-posta 30–60 saniye
gecikebilir. 3 dakikalık pencerede kullanıcı kodu girmeye çalışırken süre dolar,
"tekrar gönder"e basar ve gönderim hız sınırına takılır. 5 dakika hem bu sorunu
çözer hem `05-auth-security.md`'deki üst sınıra uyar.

#### Hesap birleştirme kuralı (güvenlik açısından kritik)
- Google'dan gelen e-posta ile aynı e-postaya sahip bir hesap varsa **otomatik birleştirilmez**.
- Birleştirme yalnızca Google e-postayı doğrulanmış bildiriyorsa **ve** mevcut hesabın
  e-postası da daha önce doğrulanmışsa yapılır. Aksi halde şifre veya OTP istenir.
- Profilden Google bağlantısı eklenip kaldırılabilir; son giriş yöntemi kaldırılamaz.
- KPS doğrulaması ve personel durumu **hesaba** bağlıdır, giriş yöntemine değil:
  Google ile giriş yapsa da personel yetkisi geçerlidir.
- Bir kimlik numarası yalnızca bir hesaba bağlanabilir.
- OAuth'ta PKCE ve `state` parametresi zorunludur; yönlendirme adresleri beyaz listededir.

#### Kabul kriterleri
- Geçersiz kontrol basamağına sahip numara sunucuda reddedilir (400)
- Doğrulanmamış kullanıcı randevu almaya çalışınca KPS adımına yönlendirilir (403)
- KPS doğrulanmış ama personel olmayan kullanıcı randevu alamaz (403, yönlendirme yok)
- Personel durumu istemciden gelen veriyle değiştirilemez; yalnızca sunucu hesaplar
- Aynı e-postayla Google girişi mevcut hesabı **otomatik ele geçiremez**
- `OWNER_*` ortam değişkenleri yoksa seed hatasız çalışır ve gerçek hesabı atlar
- Doğum yılı eşleşmezse hiçbir kimlik bilgisi dönmez
- 18 yaşını doldurmamış kişinin kaydı sunucuda reddedilir (403); istemcinin
  gönderdiği doğum tarihi dikkate alınmaz, KPS'ten gelen tarih esas alınır
- Kayıt sırasında 18 yaşını dolduran sınır durum (bugün doğum günü) **kabul edilir**
- 6. denemede hız sınırı devreye girer (429)
- KPS zaman aşımına uğradığında kayıt ekranı anlaşılır hata verir, sayfa çökmez
- Aynı kimlik numarasıyla ikinci kayıt 409 döner
- İki koddan yalnızca biri doğrulanmışsa hesap **açılmaz**; kullanıcı eksik olan
  adımda kalır ve hangi kanalın beklendiği ekranda yazar
- Hiçbir ortamda doğrulama kodu ekranda gösterilmez (local ve preview hariç)
- Bot doğrulaması olmadan gönderilen kayıt isteği sunucuda reddedilir (403);
  istemcinin "doğrulandı" demesi yeterli değildir
- Giriş formunda 2 başarısız denemeden sonra bot doğrulaması istenir


### 5.1 Hastane Randevu
- Branş listesi → o branştaki doktorlar → doktorun uygun gün ve saatleri
- Üye randevu oluşturur, görüntüler, iptal eder
- **Kurallar:** dolu saat seçilemez · geçmiş tarihe randevu alınamaz ·
  aynı branşta aynı gün ikinci randevu alınamaz · iptal en geç randevudan 2 saat önce
- **Kabul kriteri:** İki kullanıcı aynı saati aynı anda seçemez (409 döner)

### 5.2 Etkinlik ve Rezervasyon
- Etkinlik listesi (konser, tiyatro) → tarih, mekân, sanatçı, fiyat
- Salon planından **koltuk seçimi**; dolu koltuklar seçilemez
- Seçilen koltuk **10 dakika** kilitlenir (süre `05-auth-security.md`'de sabittir,
  `src/config/constants.ts` içinde adlandırılmış sabit olarak tutulur)
- **Süre dolumu okuma anında uygulanır:** süresi geçmiş kilit, sorgulandığı anda
  yok sayılır ve koltuk yeniden satılabilir hale gelir. Bu bir zamanlayıcıya
  bağlı değildir (bkz. ADR-007)
- **Sepette geçen süre kilidi uzatmaz.** Sepet ekranında her biletin yanında
  kalan süre geri sayar; süre dolarsa koltuk sepetten **otomatik düşer** ve
  kullanıcıya "koltuk süresi doldu, yeniden seçin" bildirimi gösterilir.
  Ödeme ekranına girmek kalan süreyi **yeniden başlatmaz**
- Ödeme sonrası sahte bilet (rezervasyon kodu) üretilir
- **Kabul kriteri:** Aynı koltuk iki kez satılamaz — iki kullanıcı aynı anda
  denerse biri 409 alır
- **Kabul kriteri:** Süresi dolmuş kilit, temizlik görevi hiç çalışmasa bile
  koltuğu satılabilir gösterir

### 5.3 Belediye Market
- Ürün listesi: görselli, kategorili (temel gıda, içecek, temizlik…), fiyatlı, stoklu
- Arama ve kategori filtresi · sepete ekleme, adet değiştirme, çıkarma
- **Paket servis:** teslimat adresi ve zaman aralığı seçilir
- Stok yetersizse sepete eklenemez
- **Kabul kriteri:** Ödeme sonrası stok düşer; stok ve sipariş tek transaction'da yazılır

### 5.4 Belediye Restoran
- Menü: ana yemek, ara sıcak, yan ürün, içecek, tatlı — görselli ve fiyatlı
- **Adisyon:** seçilen ürünler adisyona eklenir, adet ve not (örn. "az acılı") girilebilir
- Adisyon sepete aktarılır ve ödenir
- **Paket servis:** teslimat adresi + tahmini hazırlık süresi

### 5.5 Sipariş Takibi ve Bildirim (market + restoran ortak)
- Sipariş durumları: `Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi`, ayrıca
  `İptal edildi`
  *(veritabanında `received` / `preparing` / `on_the_way` / `delivered` / `cancelled` —
  enum değerleri İngilizce, ekranda gösterilen karşılıkları `src/config/` altında)*
- Ödeme tamamlandığında kullanıcıya uygulama içi bildirim düşer
- Durum değiştikçe bildirim güncellenir (bu projede durumlar zamanlayıcı ile simüle edilir)
- Profilde sipariş geçmişi ve anlık durum görünür

#### Sipariş iptali

**Yalnızca `Alındı` aşamasında iptal edilebilir.** Hazırlık başladığı anda
(`Hazırlanıyor`) iptal kapanır.

- İptal butonu yalnızca `Alındı` durumundayken görünür; sonrasında yerini
  "Hazırlık başladı, sipariş iptal edilemez" açıklaması alır
- **Yetki kontrolü sunucudadır:** butonun gizlenmesi yetki değildir. İptal isteği
  geldiğinde sunucu durumu tekrar okur; `Alındı` değilse **409** döner
- **Etkinlik bileti iptal edilemez** — koltuk satılmış sayılır ve tekrar satışa
  açılmaz. Bilet siparişi zaten doğrudan `Teslim edildi` durumunda oluşur
- İptal edildiğinde: market siparişiyse **stok geri yüklenir**, sahte iade kaydı
  oluşur, kullanıcıya bildirim düşer, işlem denetim kaydına yazılır
- Stok geri yükleme ve durum değişimi **tek transaction** içinde yapılır
- Karışık sepetten doğan siparişler **ayrı ayrı** iptal edilir; birini iptal etmek
  diğerlerini etkilemez (§6.1)

- **Kabul kriteri:** Kullanıcı sipariş sonrası bildirimi ve durumu ekranda görebilmeli
- **Kabul kriteri:** `Hazırlanıyor` durumundaki bir siparişe gönderilen iptal isteği
  409 döner — istemci butonu göstermese bile
- **Kabul kriteri:** Başkasının siparişini iptal etme isteği 403 döner
- **Kabul kriteri:** İptal sonrası ürün stoğu sipariş öncesi değerine döner

### 5.6 Spor Salonu Üyeliği
- Tesis bilgisi, ders programı ve salon saatleri görüntülenir
- **Hiçbir pakette peşin toplu ödeme yoktur.** Tüm paketler **aylık tahsilat** ile çalışır;
  uzun süreli taahhüt aylık ücreti düşürür:

  | Paket | Taahhüt | Tahsilat | Aylık ücret |
  |---|---|---|---|
  | Aylık (taahhütsüz) | yok | her ay | referans fiyat |
  | 3 Aylık | 3 ay | her ay | %10 indirimli |
  | 6 Aylık | 6 ay | her ay | %15 indirimli |
  | Yıllık | 12 ay | her ay | %25 indirimli |

- **Üyelik sepete eklenmez.** Paket seçilir → kayıtlı kart seçilir veya yeni kart
  girilir → taahhüt ve erken çıkış kuralı ekranda onaylanır → ilk ay tahsil edilir.
  Sepette bekleyen market/restoran/bilet ürünleri bu akıştan etkilenmez
- Üyelik başlarken **ilk ay tahsil edilir**; sonraki aylarda aynı gün otomatik yenilenir
- Yenilemeden **3 gün önce** hatırlatma bildirimi düşer
- **Kart reddedilirse** (yetersiz bakiye, kart geçersiz vb.): tahsilat başarısız →
  üyelik `ödeme bekliyor` durumuna geçer, bildirim gider, 3 gün içinde
  ödenmezse üyelik pasifleşir. *(Uygulamada cüzdan/bakiye yoktur; "yetersiz bakiye"
  sahte ödeme sağlayıcısının döndürdüğü bir kart hatasıdır — bkz. §6)*
- **Taahhütsüz paket** istendiği zaman iptal edilir; dönem sonunda biter
- **Taahhütlü paketlerde** (3/6/12 ay) süre dolmadan iptal edilirse tahsilat durur ancak
  o güne kadar kullanılan aylar **taahhütsüz fiyattan** yeniden hesaplanır ve fark
  son tahsilata yansır. Bu kural satın alma öncesi ekranda açıkça gösterilir
- Taahhüt bitince üyelik taahhütsüz aylık pakete döner; kullanıcı isterse yeniler
- Profilde görünür: aktif paket, taahhüt bitiş tarihi, bir sonraki tahsilat tarihi ve tutarı,
  otomatik yenileme durumu, ödeme geçmişi
- **Kurallar:** Aktif üyelik varken ikinci üyelik alınamaz — "paket değiştir" önerilir

#### Paket değişimi — kalan süre nasıl hesaplanır

**Kısmi gün/ay hesabı yapılmaz.** Üyelik aylık tahsil edildiği için paket değişimi
**bir sonraki tahsilat tarihinde** yürürlüğe girer; ödenmiş ay sonuna kadar
eski paket geçerli kalır. Böylece iade, kıst hesabı ve küsurat sorunu hiç doğmaz.

- Kullanıcı paketi değiştirdiğinde ekranda **hangi tarihte hangi tutardan**
  başlayacağı açıkça yazar
- Değişim yürürlüğe girene kadar iptal edilebilir
- **Taahhütlü pakete geçişte** taahhüt süresi, değişimin yürürlüğe girdiği
  tarihten itibaren başlar
- **Taahhütlüden taahhütsüze geçiş**, taahhüt süresi dolmadan yapılırsa
  aşağıdaki erken çıkış kuralına tabidir

**Erken çıkış farkı:** taahhütli paket süresi dolmadan iptal edilir veya
taahhütsüze düşürülürse, o güne kadar kullanılan aylar **taahhütsüz fiyattan**
yeniden hesaplanır. Aradaki fark, iptal anında **kayıtlı karttan tek seferde**
tahsil edilir (geçmiş tahsilatlar değiştirilmez). Bu tutar iptal onayından önce
ekranda gösterilir ve kullanıcı onaylamadan işlem yapılmaz. Tahsilat başarısız
olursa üyelik `ödeme bekliyor` durumuna geçer.

#### Otomatik tahsilat zamanı

Yenileme denemesi her gün **Türkiye saatiyle 03:00**'te çalışan planlı görevle yapılır
(düşük trafik saati; kart reddi durumunda kullanıcının gün içinde müdahale
edecek vakti olur). Görev o gün vadesi gelen tüm üyelikleri tarar.

- Görev **idempotenttir**: `membership_id + dönem başlangıcı` benzersiz olduğu için
  iki kez çalışsa da ikinci tahsilat yazılamaz
- Görev hiç çalışmazsa üyelik kendiliğinden pasifleşmez; vadesi geçmiş üyelik
  **okuma anında** `ödeme bekliyor` sayılır (ADR-007)
- Hatırlatma bildirimi de aynı görevde, vadeden 3 gün önce gönderilir
- Her tahsilat denemesi ve sonucu denetim kaydına yazılır

- **Kabul kriteri:** Yenileme işi iki kez çalışırsa kullanıcıdan iki kez tahsilat yapılmaz
  (idempotent); her tahsilat denemesi ve sonucu kayıt altına alınır
- **Kabul kriteri:** Paket değişimi mevcut ödenmiş dönemi kısaltmaz veya uzatmaz

### 5.7 Destek Talebi
- Üye başlık + açıklama yazar, **birden fazla ekran görüntüsü** yükleyebilir
- Talep durumları: `Açık → İnceleniyor → Çözüldü → Kapandı`
  *(veritabanında `open` / `in_review` / `resolved` / `closed`)*
- **Durumu kim değiştirir:** yönetici paneli bu fazda yok. Bu yüzden `Açık →
  İnceleniyor → Çözüldü` geçişleri, sipariş durumlarında olduğu gibi **zamanlayıcıyla
  simüle edilir**. `Kapandı` durumunu **yalnızca talebi açan üye** verebilir
- Üye kendi taleplerini listeler ve kapatabilir
- **Kural:** Yalnızca resim dosyası, en fazla 5 adet, dosya başına boyut sınırı var
- **Kural:** Talep oluşturmada bot doğrulaması istenir (bkz. §5.0 "Bot ve otomasyon koruması")
- **Kabul kriteri:** Kullanıcı başkasının talebini göremez ve göremediği doğrulanmıştır

### 5.8 Bilgi Widget'ları (anasayfa)
- **Hava durumu:** İzmir için güncel durum + 3 günlük tahmin
- **Haber:** güncel başlıklar, kaynağa bağlantı
- **Piyasa:** döviz kurları ve birkaç kripto/endeks değeri
- Veriler **gerçek ve ücretsiz** API'lerden gelir (bkz. `integrations.md`)
- **Kural:** Çağrılar sunucu tarafında yapılır ve önbelleklenir; API anahtarı tarayıcıya gitmez
- **Kural:** Dış servis çökerse widget hata gösterir, sayfa çalışmaya devam eder

### 5.9 Hakkımızda / Kurumsal
Giriş yapmadan erişilebilen, salt okunur kurumsal bilgi bölümü.

- **Kurum tanıtımı:** kısa metin, iletişim bilgileri, çalışma saatleri
- **Teşkilat şeması:** İzmir Büyükşehir Belediyesi üst yapısı gösterilir.
  Genel Sekreterlik altında **8–10 daire başkanlığı ismen** listelenir
  (Fen İşleri, İtfaiye, Park ve Bahçeler, Ulaşım vb.), ancak yalnızca
  **Bilgi İşlem Dairesi Başkanlığı** ayrıntılı olarak açılır: şube müdürlükleri,
  şeflikler ve personel onun altındadır
- Diğer dairelere tıklandığında "Bu birimin personel rehberi henüz yayınlanmadı"
  bilgi mesajı gösterilir — boş ekran bırakılmaz (`07-ui-design-system.md`
  zorunlu ekran durumları)
- Şema hiyerarşik olarak açılıp kapanabilir (ağaç görünümü);
  mobilde liste, masaüstünde ağaç olarak görünür
- **Neden böyle:** ağaç bileşeni gerçekçi genişlikte sınanır ve şema "tek çizgi"
  olmaktan çıkar, ama seed hacmi ve arama performansı yükü artmaz
- **Personel rehberi:** Bilgi İşlem Dairesi Başkanlığı'nda **100 sahte personel** bulunur.
  Hiyerarşi: `Daire Başkanı → Şube Müdürlüğü → Şeflik → Personel`
- Her personel kaydı: ad soyad, unvan, bağlı olduğu birim, kurumsal e-posta, dahili numara
- Birime ve unvana göre filtreleme, ada göre arama
- **Kural:** Tüm isimler, e-postalar ve dahili numaralar sahtedir; gerçek kişi verisi yoktur.
  Bu ekranda kişisel iletişim bilgisi (cep telefonu, özel e-posta) gösterilmez
- **Kabul kriteri:** 100 personel birimlere dağılmış şekilde seed ile gelir;
  şemadaki bir birime tıklandığında o birimin personeli listelenir

### 5.10 Yasal ve bilgilendirme sayfaları
KVKK aydınlatma metni, çerez politikası, kullanım şartları ve iletişim sayfaları
bulunur; footer'dan erişilir. Zorunlu olmayan çerez rıza alınmadan çalıştırılmaz.

- **Çerez rızası ziyaretçiden de alınır.** Giriş yapmamış kullanıcının rızası,
  çerezdeki rastgele bir kimliğe bağlanır; kullanıcı sonradan giriş yaparsa
  kayıt hesabına bağlanır. Rıza zaman damgasıyla saklanır ve geri alınabilir
- Aydınlatma metninde **yurt dışına aktarım** açıkça belirtilir: Cloudflare
  (bot koruması) ve e-posta servisi ABD merkezlidir

### 5.11 Hesap yönetimi ve veri hakları

`14-privacy-and-compliance.md` bunları zorunlu tutuyor; bu fazın kapsamındadır.

- **Verimi indir:** kullanıcı kendi verisinin tamamını JSON olarak indirebilir
  (profil, adresler, siparişler, randevular, rezervasyonlar, üyelikler, destek
  talepleri, rıza kayıtları). Hazırlama uzun sürerse istek kuyruğa alınır ve
  hazır olduğunda bildirim düşer
- **Hesabımı sil:** kullanıcı hesabını kendisi silebilir. Silme **anonimleştirmedir**:
  ad, e-posta, telefon, kimlik numarası, adresler ve kart bilgileri silinir veya
  anonimleştirilir; **mali kayıtlar** (sipariş, ödeme, üyelik tahsilatı) tutar ve
  tarih olarak yasal süre boyunca kişiselleştirilmeden korunur
- Silme **onay ister** ve geri alınamaz olduğu açıkça yazılır; işlem denetim
  kaydına düşer, tüm oturumlar kapatılır
- Aktif taahhütlü üyeliği olan kullanıcı silmeden önce uyarılır: erken çıkış farkı
  tahsil edilir veya üyelik dönem sonuna kadar sürer
- **Kabul kriteri:** silinen hesabın kimlik numarasıyla yeniden kayıt olunabilir;
  eski siparişler kişiye bağlanamaz

## 6. Ödeme akışı (sahte)

**Tek ödeme yöntemi: kredi kartı (sahte).** Cüzdan/bakiye ile ödeme yoktur.

### 6.1 Karışık sepet: tek ödeme, ayrılmış siparişler

Sepette farklı modüllerin ürünleri bir arada olabilir. Teslimat biçimleri
uyuşmadığı için (market zaman aralığı ister, restoran hazırlık süresi verir,
bilet hiç teslim edilmez) **tek bir teslimat alanı üçünü birden taşıyamaz.**

**Kural:** Kullanıcı tek sepet görür ve **bir kez öder**. Ödeme başarılı olduğunda
sistem modül başına **ayrı sipariş** oluşturur; hepsi aynı ödeme kaydına bağlanır.

| Modül | Teslimat | Sipariş durumu akışı |
|---|---|---|
| Market | Adres + zaman aralığı seçilir | `Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi` |
| Restoran | Adres + tahmini hazırlık süresi | `Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi` |
| Etkinlik bileti | Teslimat yok | Ödeme sonrası doğrudan `Teslim edildi` |

- Ödeme ekranında her modülün teslimat ayarı **kendi bölümünde** yapılır
- **Teslimat ücreti modül başına ayrı hesaplanır** (market 750 TL üzeri ücretsiz
  kuralı yalnızca market tutarına bakar, sepetin tamamına değil)
- Sepet özeti bu ayrımı satır satır gösterir; kullanıcı ödemeden önce toplamın
  neden o kadar olduğunu görebilir
- Siparişler **tek transaction içinde** oluşturulur: biri yazılamazsa hiçbiri
  yazılmaz ve ödeme yapılmaz
- Profilde her sipariş **ayrı satır** olarak görünür ve durumu ayrı ilerler
- **Kabul kriteri:** Üç modülden ürün içeren bir sepet tek ödemeyle üç sipariş
  üretir; biletin durumu doğrudan teslim edilmiş olur, market ve restoran
  siparişleri kendi akışlarını izler
- **Kabul kriteri:** Ödeme başarısız olursa hiçbir sipariş oluşmaz, sepet korunur

### 6.2 Ödeme adımları

1. Sepet özeti → toplam tutar, varsa teslimat ücreti ve indirim ayrı satırda
2. Kayıtlı kart seçilir veya yeni kart girilir ("kartımı kaydet" seçeneği)
3. Kart formu doğrulanır: Luhn algoritması, son kullanma tarihi geçmemiş, CVV formatı,
   kart sahibi adı. Kart numarası ekranda maskelenir
4. **Gerçek işlem yapılmaz.** Kart numarası veritabanına **yazılmaz**;
   yalnızca kart markası, son 4 hane, son kullanma ay/yıl ve sahte işlem kodu saklanır
5. Sahte ödeme sağlayıcısı sonucu belirler: belirli test kartları **başarısız** döner
   (yetersiz bakiye, kart reddedildi) — hata yolları da test edilebilsin diye
6. Başarılı ödeme → sipariş/rezervasyon/üyelik oluşur → bildirim + onay ekranı + sahte fiş
7. Başarısız ödeme → anlaşılır Türkçe hata, sepet korunur, tekrar denenebilir
8. Spor salonu aylık tahsilatı da kayıtlı kart üzerinden aynı akışla yapılır

## 7. Sahte veri gereksinimi (seed)

Kurallar ve referans değerler `docs/project/fake-data-guide.md` dosyasındadır.
Seed bu dosyaya uyar; fiyat ve isimler oradaki bantların dışına çıkmaz.

Kapsam: branşlar ve doktorlar · etkinlikler, sanatçılar, salon ve koltuk planı ·
market ürünleri (görselli) · restoran menüsü (görselli) · spor salonu paketleri ·
teşkilat şeması ve 100 personel · örnek üye hesapları, adresleri ve kayıtlı sahte kartları.

**Tüm veriler uydurmadır.** Gerçek kişi adı, gerçek marka, gerçek adres,
gerçek telefon veya gerçek kart numarası kullanılmaz.

## 8. Kalite gereksinimleri
- İlk anlamlı görüntü 2.5 saniyeden hızlı
- Tüm ekranlar mobil ve dark mode uyumlu
- Klavye ile tüm akışlar tamamlanabilir (WCAG 2.1 AA)
- Kullanıcıya görünen tüm metinler Türkçe
- Kritik akışlar (giriş, randevu, sipariş, ödeme) E2E testle korunur

## 9. Açık sorular

**Açık soru kalmadı.** Bu bölüm `interview-me` ile dolduruldu ve boşaltıldı
(2026-07-30). Yeni bir belirsizlik çıkarsa buraya yazılır ve cevaplanmadan
ilgili modül kodlanmaz.

### Kapatılan sorular
Aşağıdakiler cevaplandı ve ilgili bölümlere yazıldı; buraya geri dönmezler.

| Soru | Cevap | Nerede |
|---|---|---|
| Kayıt için e-posta doğrulaması mı SMS mi? | **İkisi de** — iki ayrı kod, ikisi de doğrulanmadan hesap açılmaz | §5.0 kayıt akışı |
| Koltuk rezervasyon süresi kaç dakika? | **10 dakika** — süre `05-auth-security.md`'de sabit, kararı ajana bırakılmaz | §5.2, ADR-007 |
| Otomatik yenileme tahsilatı hangi saatte? | **TR saatiyle 03:00**, günlük planlı görev, idempotent | §5.6 |
| Üyelik yükseltmesinde kalan süre nasıl hesaplanır? | **Kıst hesap yok** — değişim bir sonraki tahsilat tarihinde yürürlüğe girer | §5.6 |
| 18 yaş altı kayıt olabilecek mi? | **Hayır** — 18+ zorunlu, kontrol sunucuda KPS doğum tarihinden | §5.0 |
| Karışık sepette teslimat nasıl olacak? | **Tek ödeme, modül başına ayrı sipariş** — her biri kendi teslimatını ve durumunu taşır | §6.1 |
| Sipariş iptali hangi durumlarda mümkün? | **Yalnızca `Alındı` aşamasında.** Bilet hiç iptal edilemez; kontrol sunucuda, aksi halde 409 | §5.5 |
| Teşkilat şemasında diğer daireler görünecek mi? | **İsmen evet, içerik hayır** — 9 daire listelenir, yalnızca Bilgi İşlem açılır | §5.9 |
