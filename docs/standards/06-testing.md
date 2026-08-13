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
- **Süreye bağlı her kural için süre dolumu testi zorunludur** (koltuk kilidi, OTP,
  oturum, hız sınırı penceresi). Doğruluk okuma anındaki zaman koşuluna bağlı
  olduğu için (ADR-007), o koşul unutulursa test yakalamalıdır.

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
**sessizce** devre dışı kalır. Ölçülmüş örnek: bu projede E2E sunucusu
`playwright.config.ts` içinde `next build && next start` ile kalkıyor.

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
