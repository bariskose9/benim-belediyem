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
- Test adı davranışı anlatır: `randevu saati doluysa 409 döner`
- Testler birbirinden bağımsız; sıraya bağlı test yazılmaz.
- Her test kendi verisini kurar ve temizler. Paylaşılan global veri yok.
- Dış API'ler test ortamında mock'lanır; gerçek istek atılmaz.
- Rastgelelik ve tarih sabitlenir (`vi.setSystemTime`).
- **Süreye bağlı her kural için süre dolumu testi zorunludur** (koltuk kilidi, OTP,
  oturum, hız sınırı penceresi). Doğruluk okuma anındaki zaman koşuluna bağlı
  olduğu için (ADR-007), o koşul unutulursa test yakalamalıdır.

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
