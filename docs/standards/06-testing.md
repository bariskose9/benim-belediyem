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
