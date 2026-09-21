# 05 — Kimlik Doğrulama ve Güvenlik

## Auth akışı
- Web: Auth.js oturumu **httpOnly + secure + sameSite=lax cookie** ile taşınır.
  Token localStorage/sessionStorage'da **tutulmaz** (XSS ile çalınır).
- Mobil: aynı API, `Authorization: Bearer <jwt>` ile. Access token kısa ömürlü (15 dk),
  refresh token uzun ömürlü ve döndürülebilir (rotation).
- Çıkışta oturum sunucu tarafında geçersizleştirilir.
- Şifreler `argon2` veya `bcrypt` (cost >= 12) ile hash'lenir. Düz metin veya MD5/SHA1 asla.
- Şifre kuralı: en az 8 karakter + sızmış şifre listesi kontrolü. Zorunlu periyodik değişim yok.

## Token ömürleri — KARARI AJANA BIRAKMA, bunlar sabittir
| Token | Süre | Not |
|---|---|---|
| Web oturum çerezi | 7 gün | Kayan yenileme; her istekte uzar |
| Mobil access token | 15 dakika | Kısa ömürlü, yenilenir |
| Mobil refresh token | 30 gün | Her kullanımda döndürülür (rotation) |
| E-posta doğrulama kodu | 5 dakika | 6 hane, tek kullanımlık |
| Telefon doğrulama kodu | 5 dakika | 6 hane, tek kullanımlık |
| Şifre sıfırlama kodu | 5 dakika | 6 hane, tek kullanımlık, kullanılınca iptal |
| Rezervasyon kilidi (koltuk, slot, stok) | 10 dakika | Süre dolunca kaynak serbest kalır |

**Neden bağlantı değil kod:** doğrulama ve sıfırlama akışlarının tamamı tek bir
mekanizmayla (OTP) yürür. Tek mekanizma = tek hız sınırı, tek denetim kaydı,
tek test yüzeyi. Ayrıca mobil istemcide bağlantı yakalamak (deep link) ek iş
gerektirir; kod her istemcide aynı şekilde çalışır.

Bu süreler `src/config/constants.ts` içinde adlandırılmış sabit olarak tutulur,
koda dağıtılmaz. Değiştirilecekse ADR yazılır.

## Oturum güvenliği
- Şifre değişiminde ve çıkışta tüm aktif oturumlar geçersizleşir.
- Refresh token yeniden kullanılırsa (çalınma işareti) o kullanıcının tüm oturumları düşürülür.
- JWT imza anahtarı (`AUTH_SECRET`) her ortamda farklıdır ve en az 32 bayttır.
- Algoritma sabittir (HS256); `alg: none` veya istemciden gelen algoritma kabul edilmez.

### ⛔ İPTAL KENDİLİĞİNDEN ÇALIŞMAZ — `tokenVersion` gerekir

Yukarıdaki iki kural (*"çıkışta ve şifre değişiminde tüm oturumlar geçersizleşir"*)
**kendiliğinden gerçekleşmez.** JWT kendi içinde taşınır: sunucu onu **imzasına**
bakarak doğrular, veritabanına hiç gitmez. Bu yüzden iptal edilmiş bir token,
süresi dolana kadar **geçerli görünmeye devam eder.**

**Çözüm:** kullanıcı tablosunda bir `tokenVersion` tamsayısı tutulur ve JWT'ye
yazılır. Çıkışta, şifre değişiminde ve çalınma şüphesinde bu sayı **artırılır**;
eski tokenlar artık eşleşmez.

Kontrol **her istekte yapılmaz** — bedeli her istekte veritabanına gitmektir.
Katmanlı yapılır:

| Ne zaman kontrol edilir | Neden |
|---|---|
| ⛔ **Her yazma işleminde** (kayıt, güncelleme, silme) | İptal edilmiş oturum veri değiştirmemeli |
| ⛔ **Para, kişisel veri ve admin işlemlerinde** | Zararın geri alınamadığı yerler |
| **Token yenilenirken** — Auth.js `updateAge` **5 dakikaya** çekilir (varsayılanı 24 saat) | Okumada bayatlık penceresi en fazla 5 dakika olur |
| Sıradan okuma isteğinde | Kontrol yok; imza yeterli |

⚠️ **Bu bir ödünleşmedir ve PRD'ye yazılır:** kabul edilen bayatlık penceresi
kaç dakika? Anında iptal şartsa (bankacılık düzeyi) her istekte kontrol edilir
ve gecikme bedeli kabul edilir.

⭐ **"Session caching" (oturum önbellekleme) bu stack'te GEREKSİZDİR.** Oturum
zaten çerezin içinde taşınıyor, veritabanında değil — önbelleklenecek bir sorgu
yok. Önbellek gerekiyorsa **`tokenVersion` kontrolü** için gerekir, oturumun
kendisi için değil. Kurum modunda (NestJS + Redis varsa) `tokenVersion`
okuması Redis'te 5 dk TTL ile önbelleklenir; Redis yoksa veritabanından —
"her istekte DB'ye gitmek" kabul edilebilir bir maliyettir, tek satırlık
birincil anahtar okumasıdır.

## Yetkilendirme
- Kontrol **her zaman sunucuda**. UI'da butonu gizlemek yetkilendirme değildir.
- Rol modeli: `guest` (salt okuma) · `user` (kendi kayıtları) · `admin`.
- Her kayıt erişiminde sahiplik kontrolü (IDOR koruması).

## OWASP kontrol listesi — her feature'da geçilir
- [ ] Girdi doğrulama (Zod) her giriş noktasında var mı?
- [ ] Çıktı kaçışlama: kullanıcı içeriği `dangerouslySetInnerHTML` ile basılıyor mu?
- [ ] SQL parametreli mi?
- [ ] Yetki + sahiplik kontrolü var mı?
- [ ] Hata mesajı iç detay sızdırıyor mu?
- [ ] Yeni secret eklendi mi, `.env`'de mi, `.env.example` güncellendi mi?
- [ ] Yeni bağımlılık: `pnpm audit` temiz mi?
- [ ] Kişisel veri log'a yazılıyor mu?

## Secret yönetimi

### Sırlar depoda DEĞİL — o hâlde nerede?

Bu ayrım her yeni geliştiricinin sorduğu ilk sorudur ve cevabı yazılı olmazsa
herkes kendi yolunu uydurur:

| Ne | Nerede yaşar | Depoda mı |
|---|---|---|
| **Kod, şema, migration, doküman** | Depo | ✅ evet |
| **Anahtarın ADI ve ne işe yaradığı** | `.env.example` | ✅ evet |
| **Anahtarın DEĞERİ (local)** | Geliştiricinin kendi `.env` dosyası | ⛔ hayır |
| **Anahtarın DEĞERİ (preview/production)** | Barındırma sağlayıcısının ortam değişkeni ekranı | ⛔ hayır |

**Kural:** `.env` **asla** commit edilmez (`.gitignore`'da). `.env.example`
**her zaman güncel** tutulur ve şunları içerir: değişkenin adı · bir cümlelik
"ne işe yarar" · zorunlu mu · yerel ortamda hangi değerin kullanılacağı.

⭐ **`.env.example` bir liste değil, KURULUM TALİMATIDIR.** Depoyu ilk kez
klonlayan biri (veya sen, altı ay sonra başka bir bilgisayarda) yalnızca ona
bakarak çalışan bir ortam kurabilmeli:

- **Uydurulabilir değerler** (local veritabanı adresi, test tuzu, sahte
  sağlayıcı anahtarı) örnek değeriyle **birlikte** yazılır — kimse tahmin
  etmek zorunda kalmaz
- **Uydurulamayan değerler** (gerçek sağlayıcı anahtarı) boş bırakılır ve
  **nereden alınacağı** yazılır: "X panelinden üret"
- Bir değişken **eksikken uygulama açılıyorsa** bu bilinçli bir karardır ve
  gerekçesi yazılır; açılmıyorsa hata mesajı **hangi değişkenin** eksik
  olduğunu ve ne yapılacağını söyler

⛔ **"Anahtarı bana özelden gönderirim" bir sistem değildir.** Ekip
büyüdüğünde paylaşılan sırlar bir **parola yöneticisinde** (1Password, Bitwarden,
Vault) veya sağlayıcının kendi sır deposunda tutulur; sohbet uygulamasında,
e-postada veya ekran görüntüsünde asla.

### Kural yetmez, MEKANİZMA gerekir

⛔ **".env commit etmeyiz" bir NİYETTİR.** Niyeti kural yapan şey onu uygulayan
otomasyondur — insanlar yorulur, acele eder ve `git add -A` yazar.

Zorunlu olanlar:
- **Sır taraması** ve **push koruması** depoda **açık** olur. Push koruması,
  anahtarı depoya girmeden önce durdurur; tarama, girmiş olanı bulur
- **Bağımlılık güvenlik uyarıları** ve otomatik düzeltme PR'ları açık olur
- Bunlar **her yeni depoda kurulum adımıdır**, sonradan hatırlanacak bir iş değil

### Sır sızarsa — SIRA DEĞİŞMEZ

1. **Önce iptal et / yenile.** Sızan anahtar artık geçersiz olmalı
2. **Sonra** git geçmişini temizle

⛔ Ters sıra işe yaramaz: geçmiş temizlenene kadar anahtar çoktan kopyalanmıştır.
Depo public ise dakikalar, private ise de erişimi olan herkes kadar risk vardır.

### Diğer
- Anahtar koda gömülmez. İstemci tarafına sadece `NEXT_PUBLIC_` ile açıkça
  işaretlenenler geçer — ve o değerler **gizli değildir**, tarayıcıda görünür.
- Her ortamın kendi anahtarı vardır. Canlı anahtar local'de kullanılmaz.

## Ağ ve başlıklar
- Sadece HTTPS. HSTS açık.
- CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` ayarlanır.
- CORS beyaz liste ile; `*` kullanılmaz.
- Rate limit: giriş denemesi, şifre sıfırlama, destek talebi, sipariş oluşturma.
- Brute force koruması: art arda başarısız girişte gecikme/kilit.

## Kimlik sorgulama uçları (KPS benzeri dış servisler)
Kimlik numarası, telefon veya e-postayla kişi bilgisi dönen her uç
**numara taraması (enumeration) saldırısının birincil hedefidir.**
- İkinci bir doğrulama alanı zorunludur (doğum yılı gibi). Tek alanla veri dönülmez.
- Sıkı hız sınırı: IP + oturum bazlı, örn. 5 deneme / 15 dakika, sonra geçici kilit.
- Başarısız sonuçta **tek tip mesaj** döner; hangi alanın tutmadığı söylenmez.
- Yanıt süresi sabitlenir; "bulundu" ile "bulunamadı" arasında zamanlama farkı yaratılmaz.
- Uç yalnızca sunucudan çağrılır, tarayıcıya açılmaz.
- Her sorgu denetim kaydına yazılır — **sorgulanan numara yazılmadan**.

## Yetki kaynağı
Rol, personel durumu, doğrulama seviyesi gibi yetki belirleyici alanlar **yalnızca
sunucuda hesaplanır**. İstemciden gelen böyle bir alan varsa yok sayılır, hata döner.
Bu alanlar kullanıcının düzenleyebildiği hiçbir formda bulunmaz.

### ⛔ KİMLİK DOĞRULAMASI YETKİ VERMEZ

**"Kim olduğun" ile "ne yapmaya yetkili olduğun" AYRI sorulardır ve AYRI kanıt
ister.** Bir kişinin bir kuruma/role ait olduğu, o kişinin kimliğinden
**türetilemez** — o bağı **yetkiyi veren tarafın** (işveren, kurum, yönetici)
doğrulaması gerekir.

⛔ **Sık yapılan hata:** kimlik doğrulama akışının sonunda "bu kimlik şu
listede de var mı" diye bakıp yetkiyi AYNI İŞLEMDE vermek. Kimlik bilgisi
(T.C. kimlik numarası, doğum tarihi, e-posta) **gizli bilgi değildir**;
kurbanın bilgisini bilen biri onun yetkisini de kazanır.

**Doğrusu:**
- Kimlik doğrulaması hesabı yalnızca "doğrulanmış kimlik" kademesine taşır.
- Yetki **ayrı bir akıştan** gelir ve kanıtı **yetkiyi veren tarafın kontrol
  ettiği bir kanaldan** üretilir (kurumsal e-posta adresine gönderilen kod,
  yönetici onayı, kurumun kimlik sağlayıcısıyla federasyon).
- Kimlik **ön koşul** olabilir (yetkinin kime verildiği belirsiz kalmasın) ama
  **yeterli koşul asla değildir**.
- ⛔ **Kanıtın kanalı, kanıtın kendisidir.** Kod kullanıcının KENDİ adresine
  gidiyorsa hiçbir şey kanıtlamaz — güvenlik tiyatrosudur. Kanal, yetkiyi veren
  tarafın kaydında olmalıdır.
- Yetki alanına yazan **tek bir katman** olur; kimlik ve kayıt akışlarının
  yazma girdilerinde o alan **hiç bulunmaz** (olmayan alana yanlışlıkla yazılamaz).

Yetki kaynağı değiştiğinde (örn. personel listesinden çıkma) yeniden değerlendirilir.

## Tek kullanımlık kod (OTP) kuralları
- 6 hane, en fazla 5 dakika geçerli, 3 deneme, tek kullanımlık.
- Veritabanında **özetlenerek** saklanır; düz kod ve hedef adres tutulmaz.
- Gönderim hız sınırına tabidir (aynı hedefe 3 kod / 15 dakika).
- Kod doğrulanınca aynı anda tüm bekleyen kodlar geçersizleşir.
- Kod hiçbir zaman URL'de, log'da veya hata mesajında görünmez.
- Local ve preview ortamlarında sabit kod kullanılabilir; production'da **asla**.

## Kimlik verisinin saklanması
- Kimlik numarası veritabanında şifrelenerek saklanır; arama için ayrıca
  tuzlanmış özet (hash) tutulur. Düz metin kolon bulunmaz.
- Ekranda daima maskelenir (`123*****90`). Tam hali hiçbir listede gösterilmez.
- Log'a, hata takip aracına, analitiğe, URL'ye, önbellek anahtarına **asla** yazılmaz.
- Dış servisten gelen kimlik verisi kalıcı kopyalanmaz; yalnızca gerekli alanlar
  ve son senkron tarihi tutulur.

## Dosya yükleme ve depolama

### Sorun — kaybolur mu, herkes görebilir mi, iki sunucu olunca ne olur?

Vatandaş dilekçesine PDF ekler, memur panelden görsel yükler. Dosya bir
yerde durmak zorunda ve o yerin üç sorusu vardır: **kaybolur mu · kim
görebilir · iki sunucu kopyası olunca ne olur?**

**Konteyner geçicidir.** Uygulama Docker konteynerinde çalışır; konteyner her
yayına almada **sıfırdan açılan** kutudur — içine sonradan yazılan dosya, kutu
yeniden açılınca **kaybolur** (ephemeral). *Gerçek hayat:* otel odası — her
misafirde temizlenir. Yüklenen dosyayı konteynerin içine yazmak, eşyayı otel
odasına bırakmaktır. **Kalıcı disk / volume** DevOps'un dışarıdan bağladığı
klasördür (resepsiyondaki kasa); çalışır ama üç derdi vardır:

| Dert | Ne olur |
|---|---|
| **İki kopya** (replica — aynı uygulamanın iki sunucuda çalışan örneği) | Dosya A'nın diskine yazıldı, istek B'ye düştü: "dosya yok". Çözüm ortak ağ diski (NFS) — yavaş, kilit dertli |
| **Yedek** | DB yedeklenir, disk **ayrıca** yedeklenmeli; unutulursa DB "ek var" der, ek yoktur |
| ⛔ **`public/` tuzağı** | Next.js `public/` altındaki her şeyi **herkese**, yetki sormadan servis eder. Dilekçe eki `public/uploads/x.pdf`'deyse URL'i tahmin eden herkes okur — KVKK ihlali. **Yüklenen dosya asla `public/` altına yazılmaz** |

**Nesne depolama / object storage / blob storage:** dosyaların bir **anahtar**
(key — `ekler/2026/09/3f2a….pdf`) ile saklandığı, HTTP ile erişilen,
sunucudan **bağımsız** depo — Amazon S3, Cloudflare R2, Vercel Blob, kurumların
içeride kurduğu **MinIO** (S3 ile aynı dili konuşan açık kaynak). *Gerçek
hayat:* kargo deposu — fişle verirsin, fişle alırsın; hangi binada olduğu
seni ilgilendirmez, iki dükkânın da aynı depoyu kullanır. Üç dert birden
çözülür.

**Dosyayı veritabanına koymak** (`BYTEA` kolon): küçük hacimde meşrudur —
yedek DB ile gelir, yetki DB'de, ikinci servis yok. Ama DB şişer, her okuma
DB'yi yorar. Yalnızca küçük ve az dosya (profil fotoğrafı, ikon); büyüyen
ekler için değil.

### Karar — uygulama depoyu bilmez: adaptör

Uygulama bir `FileStorage` **arayüzüne** konuşur (`put` · `get` · `delete`);
hangi sürücünün devrede olduğunu ortam değişkeni (`FILE_STORAGE_DRIVER`)
seçer. *Gerçek hayat:* priz — cihaz arkasında santral mi jeneratör mü bilmez.

| Sürücü | Nerede | Ne zaman |
|---|---|---|
| `s3` (S3-uyumlu: MinIO · R2 · AWS S3) | Kurum ve kendi proje | ⭐ **Varsayılan** — S3 dili taşınabilir: bugün R2, yarın MinIO, aynı kod |
| `blob` (Vercel Blob) | Kendi proje, Vercel'de | Kabul edilebilir; SDK'sı yalnızca Vercel'de çalışır, taşınmaz |
| `local` (kalıcı disk) | Kurum, nesne deposu yoksa | Tek kopya şartıyla; volume ve yedek sorumluluğu `altyapi-durumu.md`'de DevOps'a yazılı |
| `db` (`BYTEA`) | Her ikisi | Küçük/az dosya; local ve CI'da **her zaman** çalışan sürücü — testler bununla koşar |

Kurumda MinIO/nesne deposu var mı, kaç replica çalışacak, yedek kimde —
`kurumdan-ogrenilecekler.md` → *"BÖLÜM 5"* satır 5.6.

### Yükleme güvenliği — her modda sekiz kural

| # | Kural | Neden |
|---|---|---|
| 1 | **Boyut, baytlar okunmadan önce** (`Content-Length` / `File.size`), okununca **ikinci kez** | Sınırsız gövde belleği doldurur; `File.size` da istemcinin beyanıdır |
| 2 | **Tür baytlardan** — ilk baytlar (**magic bytes / dosya imzası**: PDF `%PDF`, PNG `\x89PNG`) türü söyler; istemcinin MIME'ı ve uzantı **iddiadır** | `.jpg` adlı `.exe` |
| 3 | Uzantı + MIME + imza **üçü birden** tutarlı | Biri uymuyorsa reddet |
| 4 | **Dosya adı yeniden üretilir** — UUID + zaman; kullanıcının adı diske hiç yazılmaz, yalnızca gösterim için DB'de | `../../etc/passwd` adlı dosya — **path traversal** (`..` ile klasör dışına çıkma) |
| 5 | **Hedef klasör beyaz listeden**, istemciden gelmez | Keyfi yol yok |
| 6 | **Özel dosya yetkili uçtan servis edilir** — `GET /api/attachments/:id` kimlik + sahiplik kontrolü yapar, sonra depodan okur ya da **kısa ömürlü imzalı URL** (signed URL, 5 dk) üretir. İndirirken `Content-Disposition: attachment; filename*=UTF-8''…` + `X-Content-Type-Options: nosniff` — tarayıcı yüklenen HTML/SVG'yi sayfa gibi **açmaz** (depolanmış XSS). ⚠️ *İddia — ilk kullanan ölçer* | Tahmin edilen URL = KVKK ihlali; içeriği tarayıcıda çalışan ek |
| 7 | **Görseller normalize edilir** (`sharp`): yeniden kodlanır, boyut sınırlanır, **EXIF silinir** | Telefon fotoğrafındaki GPS konumu kişisel veridir; yeniden kodlama gömülü zararlıyı da temizler |
| 8 | **Virüs taraması** — kurumda ClamAV benzeri varsa yükleme sonrası kuyruğa; yoksa sorulur (5.6) | Vatandaştan gelen PDF |

⭐ **Kararı veren soru — dosya türü başına:** *"Bunu kim görebilmeli, kaç
sunucu kopyası olacak, kaybolursa ne olur?"* Herkes + yeniden üretilir (site
logosu) → `public/`; belirli kişi + kaybolamaz (dilekçe eki) → adaptör +
yetkili uç + nesne deposu.

## Ödeme

Gerçek kart verisi **hiçbir koşulda** saklanmaz: kart numarası, CVV ve son
kullanma tarihi veritabanına yazılmaz. Tutulan tek şey **son 4 hane** ve
**sağlayıcının işlem kimliğidir**.

⛔ **Bu kural ödemenin gerçek mi simüle mi olduğuna BAKMAZ.** Simüle akışta da
aynen uygulanır — sahte akış, gerçeğin yerine takılacağı iskelettir. Simülasyon
kararı, gerçeğine geçiş yolu ve geçiş kontrol listesi:
`00-stack.md` → *"SİMÜLE EDİLEN DIŞ SERVİS"*.

- Tutar, indirim ve para birimi **sunucuda** belirlenir; istemcinin gönderdiği
  tutar reddedilir (`03-api-guidelines.md` → *"Doğrulama"*).
- Ödeme uçları **idempotency anahtarı** taşır — aynı anahtar iki kez tahsilat
  üretmez (kural ve istemci politikası `03-api-guidelines.md` → *"İdempotency"*).
- Kart verisi mümkünse **hiç sunucumuza uğramaz**: sağlayıcının barındırdığı
  form veya jetonlaştırma (tokenization) kullanılır. Uğramayan veri sızmaz.
- Simüle akışta ekranda **açıkça** yazar: *"Bu bir test ödemesidir."*

### Bu projede — ödeme SAHTE (ADR-009)

Gerçek ödeme sağlayıcısı yok; akış simüle ediliyor. Yine de yukarıdaki kural aynen
geçerli: **gerçek kart verisi hiçbir koşulda saklanmaz.** Sahte akışta bile kart
numarası veritabanına yazılmaz; yalnızca son 4 hane ve sahte işlem kimliği tutulur.
Gerçeğine geçiş: `00-stack.md` → "SİMÜLE EDİLEN DIŞ SERVİS".

