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
| Koltuk rezervasyon kilidi | 10 dakika | Süre dolunca koltuk serbest kalır |

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
- [ ] Yeni bağımlılık: `npm audit` temiz mi?
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

## Dosya yükleme
Tip + boyut + uzantı doğrulanır (sadece istemci tarafında değil).
Dosya adı sanitize edilir, orijinal ad kullanılmaz. Yüklenen dosya uygulama
sunucusundan değil ayrı depolamadan (Vercel Blob) servis edilir.

## Ödeme (bu proje: sahte)
Gerçek kart verisi **hiçbir koşulda** saklanmaz. Sahte ödeme akışında bile
kart numarası veritabanına yazılmaz; sadece son 4 hane ve sahte işlem kimliği tutulur.
