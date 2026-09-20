# 06 — Test Stratejisi

## Piramit
```
   E2E (Playwright)        az  — kritik kullanıcı yolculukları
 Entegrasyon (API+DB)     orta — route handler + gerçek test veritabanı
   Unit (Vitest)          çok  — servis katmanı, iş kuralları, yardımcılar
```

## Neyi test ederiz
- **Servis katmanı:** iş kuralları. "Aynı gün ikinci randevu alınamaz" testi burada.
- **API:** her endpoint için en az 3 test — mutlu yol, doğrulama hatası, yetkisiz erişim.
- **UI:** kullanıcının gördüğü davranış (metin, rol, etkileşim). İç state test edilmez.
- **E2E:** uçtan uca akış — giriş → seçim → ödeme → onay ekranı.

## Neyi test etmeyiz
Üçüncü parti kütüphanenin kendi işleyişi · sadece mock'un çağrıldığını doğrulayan testler ·
Prisma'nın kendisi · sabit metinler.

## Kurallar
- **Her hata düzeltmesi önce hatayı yakalayan testle başlar** (kırmızı → yeşil → refactor).
- **Bir KORUMA için yazılan test, koruma kaldırılarak KANITLANIR.** Kural, kısıt,
  kaçış, yetki kontrolü veya yarış koruması test ettiğinde: testi yaz, yeşil
  olduğunu gör, sonra **korumayı geçici olarak kaldır** ve testin kırmızıya
  döndüğünü **gözünle gör**. Dönmüyorsa test korumayı değil başka bir şeyi
  ölçüyordur ve seni yanlış yere güvendirir.
  *Kaç testin kırmızıya döndüğüne de bak:* beklediğinden fazlası dönüyorsa
  testler birbirine karışmıştır, azı dönüyorsa kapsam eksiktir.
- Test adı davranışı anlatır: `randevu saati doluysa 409 döner`
- Testler birbirinden bağımsız; sıraya bağlı test yazılmaz.
- Her test kendi verisini kurar ve temizler. Paylaşılan global veri yok.
- Dış API'ler test ortamında mock'lanır; gerçek istek atılmaz.
- Rastgelelik ve tarih sabitlenir (`vi.setSystemTime`).
- **Süreye bağlı her kural için süre dolumu testi zorunludur** (rezervasyon
  kilidi, OTP, oturum, hız sınırı penceresi). *Gerekçe:* süresi dolan kayıt
  tablodan **kendiliğinden silinmez**; satır yerinde durur ve geçerliliği her
  okumada zaman karşılaştırmasıyla hesaplanır. O karşılaştırma tek bir sorguda
  unutulursa süresi dolmuş kayıt geçerli gibi döner — hata vermez, sessizdir.
  Testin yakalaması gereken tam olarak budur.

## Kararsız (flaky) test — testi gevşetme, doğru bekle

Yük altında kırmızı, tek başına yeşil veren test **kodu değil kendini** bildirir.
Böyle bir testte iddiayı zayıflatmak (beklentiyi silmek, `retry` artırmak,
`skip` etmek) hatayı gizler.

- **Bir olayı bekleyen testte, kısa varsayılan zaman aşımına dayanma.** Sayfa
  yönlendirmesi, ağ isteği veya arka plan işi gibi süresi belirsiz olaylarda
  "o olayı bekleyen" API kullanılır; sabit bekleme (`sleep`) hiç kullanılmaz.
  Örnek: adres değişimini `waitForURL` ile bekle, `toHaveURL`'ün varsayılan
  sınırına güvenme.
- **Testler paralel koşuyorsa paylaşılan her kaynak çakışma adayıdır:** aynı
  hesap, aynı kayıt, aynı sayaç. Her paralel çalışana **kendi verisi** verilir.
- **Sayaç tabanlı korumalar (hız sınırı) test koşuları arasında sıfırlanır**;
  yoksa ikinci koşu, kodda olmayan bir hata bildirir.
- **Kırmızı gördüğünde önce makinenin yükünü kontrol et.** Yüksek yükte oluşan
  zaman aşımını koda yıkmak saatler yakar.
- ⛔ **BİR TESTİN DÜŞMESİNİ KODA YORMADAN ÖNCE "KAÇ KEZ KOŞTUM" DİYE SOR.**
  Art arda koşulan setlerde hız sınırı sayaçları, artık veri ve yük birikir;
  test kodda olmayan bir hata bildirir. Sıra: (1) sayaçları sıfırla,
  (2) yükün düşmesini bekle, (3) **tek sefer** koş.
- **Şüpheyi ÖLÇEREK gider, tahminle değil:** değişikliği geçici olarak kenara
  al (`git stash`) ve aynı seti **temiz kodda** koştur. Aynı yerde ya da başka
  bir yerde yine düşüyorsa sorun senin değişikliğinde değil, koşum ortamındadır.
  Bu tek deney "benim yüzümden mi" sorusunu kesin cevaplar.

## Yeşil test yanlış şeyi ölçüyor olabilir

Bir testin yeşil olması, ölçmek istediğin şeyi ölçtüğünü **kanıtlamaz**. En
tehlikeli test kırmızı olan değil, kendi verisiyle tutarlı olduğu için hep
yeşil kalan testtir.

- ⛔ **HER YENİ KAPI, MUTASYONLA KIRMIZIYA DÖNDÜRÜLEREK KANITLANIR.** Kapının
  yakalaması gereken hatayı bilerek üret (eşiği düşür, korumayı kaldır, ihlali
  ekle) ve testin **düştüğünü GÖR**. Dönmüyorsa kapı yoktur — yalnızca kapı
  görüntüsü vardır. Kanıtı gördükten sonra mutasyonu geri al.
- ⛔ **"AÇILDI" İLE "DOĞRU SAYFA AÇILDI" AYNI ŞEY DEĞİL.** Bir durum kodu
  kontrolü sayfanın kimliğini doğrulamaz: sunucu tarafında korunan bir sayfa
  `200` döndürüp yönlendirmeyi **hidrasyondan sonra** uygulayabilir. Ölçüm veya
  denetim yapan test, işi bitmeden **hangi adreste olduğunu** doğrulamak
  zorundadır — yoksa sessizce giriş sayfasını ölçer ve yeşil kalır.
- ⛔ **BİR ÖLÇÜM YAPTIYSAN SAYIYA BAK, "GEÇTİ"YE DEĞİL.** Beklenmedik biçimde
  *iyi* çıkan bir sonuç, iyi haber değil şüphe sebebidir; genellikle ölçülen
  şeyin yanlış olduğunu söyler.
- ⛔ **DEVRALDIĞIN BİR KAYDIN SEBEBİ DE BİR İDDİADIR.** Teknik borç, ADR veya
  devir notundaki "şu yüzden oluyor" cümlesi doğrulanmadan devralınmaz; ilk iş
  o sebebi ölçmektir. Yanlış sebep, doğru ölçülmüş bir soruna yanlış çözüm
  yazdırır.
- ⛔ **"KONSOL TEMİZ" BİR KANIT DEĞİLDİR.** Tarayıcı birçok şeyi **sessizce**
  bozar: bir CSP yönergesi satır içi stili bloklar, öğe DOM'da durur, sayfa
  açılır, konsola tek satır bile düşmez — ve ekran bozuktur. Konsolun boş
  olması "hata yok" değil, yalnızca "hata **raporlanmadı**" demektir.
  **Görsel veya davranışsal bir şeyi doğruluyorsan HESAPLANAN DEĞERİ ölç**
  (`getComputedStyle`, gerçek konum, `styleSheet.cssRules.length`), etiketin
  varlığını değil. Bir kez ölçülmüş örnek: nonce'lu bir politika 45 görseli ve
  14 KB'lık bir stil sayfasını öldürdü, konsol boştu.

## ⛔ ÖNCE ARACIN O İŞİ ÖLÇEBİLDİĞİNİ DOĞRULA

Bir ölçüm "hata var" diyorsa iki ihtimal vardır: **ürün bozuktur** ya da
**araç o işi ölçemiyordur.** İkincisi akla gelmediğinde saatler, var olmayan
bir hatanın peşinde geçer.

- ⛔ **BOT KORUMASI OTOMATİK TARAYICIYLA TEST EDİLEMEZ.** İşi zaten otomasyonu
  ayırt etmek olan bir bileşen (Turnstile, reCAPTCHA, cihaz parmak izi,
  anti-fraud) `navigator.webdriver === true` gördüğünde sessizce hiçbir şey
  yapmaz. Ölçülmüş örnek: sıkı CSP'nin bulmacayı bozduğu sanıldı; dört hipotez
  (alan adı yetkisi, nonce, `unsafe-eval`, CSP'nin tamamen kaldırılması)
  elendikten sonra sebep aracın kendisi çıktı. **Bu bileşenler gerçek bir
  tarayıcıda, gerçek bir insan tarafından doğrulanır.**
- ⚠️ **AYIRT EDİCİ İŞARET:** aracın bazı yolları çalışıp bazıları sessizce
  ölüyorsa şüphelen. Yukarıdaki örnekte sahte jeton dönen test anahtarları
  çalışıyor, gerçek doğrulama çalıştıran her anahtar ölüyordu — hata callback'i
  bile tetiklenmiyordu. Ürün hatası genelde **hata üretir**; araç engeli
  genelde **sessizdir**.
- ⛔ **İNSANIN GÖZLEMİNİ KENDİ ARACININ ÇIKTISIYLA ÇÜRÜTME.** "Ben görüyorum"
  diyen birine "muhtemelen başka bir şey gördün" demeden önce, aracının o şeyi
  görebildiğini kanıtla. Aynı örnekte proje sahibi haklıydı, ölçüm yanlıştı.
- **Aynı sınıftan diğer tuzaklar:** ödeme sağlayıcılarının 3D Secure ekranları,
  cihaz izni isteyen API'ler (kamera, bildirim), reklam engelleyiciyle bozulan
  akışlar ve e-posta teslimi. Bunlar CI'da yeşil görünüp gerçekte kırık olabilir.

## ⛔ BİR KAPIYI `NODE_ENV`'E BAĞLAMA — AÇIK OLDUĞUNU ÖLÇ

Yalnızca geliştirme ve testte çalışması istenen bir doğrulama (yanıt sözleşmesi
kontrolü, ek iddialar, ağır tutarlılık denetimi) refleksle
`if (process.env.NODE_ENV !== "production")` içine konur. **Bu çoğu projede
kapıyı tam da en çok işe yarayacağı yerde kapatır.**

Sebep: E2E setleri genellikle **üretim yapısına karşı** koşar — `next build &&
next start`, `vite preview`, derlenmiş bir konteyner. Yani E2E sırasında
`NODE_ENV === "production"`'dur ve kapı, gerçek tarayıcıdan geçen her istekte
**sessizce** devre dışı kalır. Ölçülmüş örnek: bir projede E2E sunucusu
`playwright.config.ts` içinde `next build && next start` ile kalkıyordu; kapı
tüm E2E koşusu boyunca kapalıydı ve testler yeşil yanıyordu.

⚠️ **Kendi projende ölç:** `playwright.config.ts` içindeki `webServer.command`
üretim yapısı mı başlatıyor? Öyleyse `NODE_ENV`'e bağlı her kapı E2E'de kapalıdır.

**Kural:**

- Kapının anahtarı **kendi ortam değişkeni** olur (12-factor), `NODE_ENV`
  türevi değil
- Değişken E2E ve test koşucusunun yapılandırmasında **açıkça** verilir
- Yanlış ortamda verilmesi mümkünse ortam doğrulaması onu **reddeder** —
  yorumla uyarmak yetmez
- ⛔ **Kapının fiilen açık olduğu ölçülür:** kapıyı bozan bir mutasyon yapılır
  ve testin kırmızıya döndüğü GÖRÜLÜR. Görülmediyse kapı yoktur —
  "yeşil" yalnızca kapının hiç çalışmadığı anlamına gelebilir

⚠️ Aynı tuzağın ikinci hâli: kontrolü, **tarayıcıda okunduğunda istisna
fırlatan** bir sunucu-gizli yapılandırma nesnesinden okumak. Her yerden içe
aktarılabilen bir yardımcı modül bunu okursa, teşhis aracının kendisi arıza
kaynağına dönüşür. Böyle bir modül yapılandırmayı doğrudan ve yalın biçimde
okur; doğrulama merkezî şemada zaten yapılmıştır.

## Mobil doğrulama — üç ayrı şey, karıştırılmaz

| Ne | Nasıl test edilir | Hangi aşamada |
|---|---|---|
| **Responsive web** (dar ekranda web sitesi) | Tarayıcı 375px + Playwright mobil viewport | Her modülde, baştan itibaren |
| **Gerçek telefonda web** | Preview URL'i kendi telefonunun tarayıcısında aç | Her PR'da, dokunma ve klavye davranışı için |
| **Yerel mobil uygulama** (Expo) | Expo Go ile cihazda + Maestro/Detox ile E2E | Ancak mobil uygulama fazında |

Tarayıcıyı daraltmak **gerçek telefon testinin yerine geçmez**: dokunma hedefi,
klavyenin ekranı kaplaması, `100vh` sorunu, iOS Safari farkları ancak cihazda görünür.
Bu yüzden her PR'da preview URL telefondan da açılır — 30 saniyelik iştir.

Yerel mobil uygulama geldiğinde: Playwright çalışmaz, ayrı test aracı gerekir;
API sözleşmesi (contract) testleri web ile paylaşılır.

## Eşikler
- Servis katmanı satır kapsamı **>= %80**. UI için kapsam hedefi yoktur, akış testi vardır.
- CI'da tüm testler geçmeden merge yok. "Şimdilik skip" bırakılmaz.

## E2E asgari senaryolar (her projede)
1. Kayıt ol → giriş yap → çıkış yap
2. Giriş yapmadan korumalı sayfa → giriş ekranına yönlendirme
3. Ana iş akışı baştan sona
4. Hatalı girdide doğru hata mesajı
5. Dark mode aç/kapa, 375px mobil görünüm

## ⭐ ÖZELLİK BİTİNCE — BEŞ GÖZLE DOĞRULAMA

⛔ **Test yeşil olması "bitti" demek değildir.** Otomatik testler *kodun
yaptığını* doğrular; *doğru şeyi yaptığını* doğrulamaz. Bir özellik bitince ajan
aşağıdaki beş gözden **sırayla** geçer, sonucunu kullanıcıya **öğreterek** sunar.

⚠️ **Bu liste bir test uzmanının kafasındaki listedir.** Amaç aradan uzman
çıkarmak değil, o uzmanın baktığı yerleri **bilerek** bakabilmektir.

### Sıra — atlanmaz, karıştırılmaz

| # | Göz | Ajan neyi yapar | Kullanıcı gözle neye bakar |
|---|---|---|---|
| 1 | **Backend** | Mutlu yol + hata yolları + yetkisiz erişim + boş sonuç. Sınır değerler (0, 1, çok uzun metin, Türkçe karakter). Eşzamanlılık: aynı işlem iki kez aynı anda | — (ajan kanıt sunar) |
| 2 | **Veri** | Kayıt gerçekten yazıldı mı — `prisma studio` ile **bakılır**. İlişkiler doğru mu, yetim kayıt kaldı mı | Studio ekranında kendi kaydını gör |
| 3 | **Frontend** | 375 / 768 / 1440px · açık ve koyu tema · konsol hatası · ağ hatası · dört ekran durumu (yükleniyor/boş/hata/dolu) | Ekran görüntülerine bak: metin taşıyor mu, hizalar tutuyor mu |
| 4 | **Tasarım / UX** | Tasarım yönü ADR'sine uygun mu, AI slop kalıbı var mı (`07-ui-design-system.md`). Her eylem 100ms içinde karşılık veriyor mu | ⭐ **Asıl senin katmanın:** "teknik olarak çalışıyor ama kullanıcı olarak saçma" dediğin yer |
| 5 | **Güvenlik + işletme** | Yetki ve sahiplik kontrolü · girdi doğrulama · hata mesajı iç detay sızdırmıyor · yeni sorgu N+1 üretmiyor · sayfa performans bütçesinde | — (ajan kanıt sunar) |

### ⛔ ETKİ ALANI — "başka nereyi bozdum"

Her özellik bittiğinde ajan **bu üç soruyu yazılı cevaplar**:

1. Bu değişiklik hangi **başka ekranları** etkiliyor? (aynı bileşeni kullananlar)
2. Hangi **başka API uçlarını** etkiliyor? (aynı servisi veya tabloyu kullananlar)
3. Veri modeli değiştiyse hangi **eski kayıtlar** etkilendi? (migration geri alınabilir mi)

⛔ *"Sadece şu dosyaya dokundum"* cevap değildir. Etkilenen yerler **açıkça
listelenir ve HEPSİ fiilen açılıp kontrol edilir** — ekran açılır, uç çağrılır,
ilgili test koşturulur. "En az biri" bir denetim değil örneklemedir: listedeki
üç yerden ikisi bozuksa ve bakılan tek yer sağlam olansa, kırık kod "kontrol
edildi" damgasıyla geçer. Liste uzunsa (5+) bu bir **risk sinyalidir** —
kullanıcıya bildirilir, yine hepsine bakılır; "çok yer var, bakmadım" yoktur.

### ⭐ ÖĞRETME ZORUNLULUĞU — doğrulama aynı zamanda derstir

Ajan doğrulamayı bitirince kullanıcıya şunu **Türkçe, kod göstermeden** anlatır:

| Ne söylenir | Örnek |
|---|---|
| Ne kontrol edildi, **neden o kontrol** | *"Aynı anda iki randevu denedim, çünkü iki kişi aynı saniyede tıklarsa çift kayıt oluşabilir — benzersiz index bunu veritabanı seviyesinde engelliyor"* |
| **Sen gözle neye bakmalısın** ve neden | *"Şu ekranda butona basınca 2 saniye hiçbir şey olmuyor gibi hissediliyor mu? Ölçüm 180ms diyor ama algı ölçümden farklı olabilir"* |
| Bulunan sorun varsa **kök nedeni** | *"Hata mesajı yanlış alanı gösteriyordu; sebebi tek şemadan dönen genel hata"* |

⛔ **"Test geçti" tek başına rapor değildir.** Neyin test edildiği söylenmezse
kullanıcı neyin test edilmediğini bilemez.

⭐ Öğrenilen her yeni terim `docs/kullanici/calisilacak-konular.md` → *"Artık biliyorum"*
listesine eklenir; ajan sonraki oturumda o terimi baştan açıklamaz.

### Ne zaman dış QA aracı gerekir

| Durum | Karar |
|---|---|
| Tek kişilik ekip, yukarıdaki beş göz uygulanıyor | ⛔ **Gerekmez.** Ek araç ek bakım demektir |
| Bağımsız QA yükümlülüğü var (kurum şartnamesi) | Şartname ne diyorsa o |
| Ekip büyüdü, kod yazan ile test eden ayrıldı | Değerlendirilir, ADR ile |
