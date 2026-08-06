# 17 — Mobil (React Native + Expo)

> Bu dosya **her projede aynıdır**. Projede mobil yoksa okunmaz; ama
> **mobil olup olmayacağı kararı ilk gün verilir** — sebebi hemen aşağıda.

## Kararı neden baştan veriyoruz

Mobil uygulamayı **en sona bırakmak doğrudur** — web bitmeden mobile başlamak
kaynak israfıdır. Ama *"mobil olacak mı"* sorusu **birinci günde** cevaplanır,
çünkü cevabı sunucu tarafını değiştirir:

| Karar | Mobil yoksa | Mobil varsa |
|---|---|---|
| Oturum | Yalnızca httpOnly çerez yeter | Çerez mobilde yok → **jeton yolu da gerekir** |
| API | Sayfayla iç içe olabilir | **Tam REST**, istemciden bağımsız |
| Dosya yükleme | Tarayıcı `FormData` | Cihaz dosya sistemi + izinler |
| Bildirim | Yok / web push | Cihaz jetonu kaydı gerekir |

En pahalı hata şudur: kimlik doğrulama yalnızca çereze göre kurulur, mobil
geldiğinde **baştan yazılır**. Bu yüzden mobil planlanıyorsa oturum kararı
(`05-auth-security.md`) her iki istemciyi de kapsayacak şekilde alınır ve ADR'ye
yazılır.

## Stack

| Katman | Seçim | Not |
|---|---|---|
| Çatı | **Expo** (managed workflow) | Çıplak React Native ile başlanmaz; gerekirse sonra çıkılır |
| Yönlendirme | **Expo Router** (dosya tabanlı) | Web tarafındaki App Router ile aynı zihinsel model |
| Dil | TypeScript (strict) | `any` yasak |
| Sunucu durumu | TanStack Query | Web ile aynı |
| Derleme / yayın | **EAS Build** + EAS Submit | Yerel Xcode/Android Studio derlemesi zorunlu değil |
| Güvenli saklama | `expo-secure-store` | Keychain (iOS) / Keystore (Android) |
| Test | Vitest/Jest (birim) + **Maestro** (akış) | E2E az ve kritik akışla sınırlı |

**Aynı API.** Mobil kendi ucunu yazmaz, webin kullandığı REST API'yi tüketir.
İş mantığı sunucuda kalır — istemci ekran çizer (`01-architecture.md`).

## Kimlik doğrulama ve jeton

- **Çerez yok.** Mobil istemci `Authorization: Bearer <token>` kullanır.
- **Kısa ömürlü access token (≈15 dk) + veritabanında tutulan, döndürülebilir
  refresh token.** Refresh token'ın kendisi bir oturum satırıdır; böylece web ve
  mobil **aynı iptal mekanizmasını** paylaşır (tek tablo, tek kural).
- **Yeniden kullanım tespiti:** aynı refresh token ikinci kez kullanılırsa
  çalınmış sayılır ve o kullanıcının **tüm oturumları** düşürülür.
- **Jeton yalnızca `expo-secure-store`'da tutulur.** `AsyncStorage`,
  `localStorage` benzeri şifresiz depolar ve Redux/Zustand kalıcı katmanı
  **jeton taşımaz** — cihaz kök erişimi olan biri düz metin okur.
- Jeton **log'a, hata takip aracına ve analitiğe yazılmaz** (`05-auth-security.md`).
- Çıkış: sunucuda oturum satırı silinir; cihazda güvenli depo temizlenir. İkisi
  birden yapılır, biri yeterli değildir.
- Biyometrik kilit (`expo-local-authentication`) **jetonun yerine geçmez**,
  yalnızca uygulamayı açmayı zorlaştırır.

## Ağ ve dayanıklılık

- Her istekte **zaman aşımı zorunlu**; yeniden deneme en fazla 2, üstel geri çekilmeli.
- **Bağlantısızlık normaldir**, hata değil: her ekranda `yükleniyor / boş / hata /
  çevrimdışı` durumu tanımlıdır. Beyaz ekran veya sonsuz spinner kabul edilmez.
- Yeniden denenebilir istek **idempotent** olmalı; ödeme ve sipariş gibi uçlarda
  istemci `Idempotency-Key` gönderir.
- API adresi **koda gömülmez**, ortam yapılandırmasından gelir.

## Arayüz

- **Dokunma hedefi en az 44×44 pt.** Fare hassasiyeti varsayılmaz.
- `SafeAreaView` / `useSafeAreaInsets` — çentik ve alt çubuk her cihazda farklı.
- Klavye açıldığında form alanı görünür kalır (`KeyboardAvoidingView`).
- Platform farkı gizlenmez: geri hareketi iOS'ta kaydırma, Android'de donanım
  geri tuşudur; ikisi de çalışır.
- Erişilebilirlik: `accessibilityLabel`, `accessibilityRole`, ekran okuyucu ile
  gezilebilirlik. WCAG kontrast kuralı burada da geçerli (`07-ui-design-system.md`).
- Karanlık mod ilk günden token seviyesinde desteklenir.
- Metinler ölçeklenebilir yazı tipi ayarına saygı duyar (sabit `fontSize` + sabit
  yükseklik kutusu taşmaya yol açar).

## İzinler ve gizlilik

- **Minimum izin.** Her izin için "neden gerekli" cevabı yoksa istenmez.
- İzin **kullanılacağı anda** istenir, açılışta topluca değil; öncesinde neden
  gerektiği bir cümleyle anlatılır.
- İzin reddedilirse uygulama **çalışmaya devam eder**, ilgili özellik kapanır.
- `Info.plist` / Android manifest açıklamaları Türkçe ve dürüsttür — mağaza
  incelemesi buradan takılır.
- Toplanan her veri `14-privacy-and-compliance.md` envanterine işlenir; mağaza
  gizlilik formu (App Privacy / Data Safety) bu envanterle **aynı** olmalıdır.
- Reklam kimliği ve cihaz parmak izi **toplanmaz**.

## Ortamlar ve yayın

- Üç ortam web ile aynıdır (`13-environments.md`): `development` · `preview` ·
  `production`. EAS build profilleri bu üçe birebir karşılık gelir.
- Her ortamın **kendi API adresi ve kendi anahtarları** vardır. Canlı anahtar
  geliştirme derlemesinde kullanılmaz.
- Gizli anahtar **uygulama paketine gömülmez.** Mobil paket açılabilir; içine
  konan her sır sızmış sayılır. Sunucu tarafı sır sunucuda kalır.
- Sürüm: `version` + `runtimeVersion` yönetilir; native değişiklik yapıldığında
  `runtimeVersion` artar.
- **OTA güncellemenin sınırı:** EAS Update yalnızca JavaScript tarafını
  güncelleyebilir. Native bağımlılık eklendiyse mağaza derlemesi zorunludur.
  "OTA ile düzeltiriz" varsayımı native değişiklikte geçersizdir.
- Geri dönüş planı: önceki update kanalına dönmek **denenmiş** olmalı.

## Test

- Piramit web ile aynı: çok birim, orta entegrasyon, az akış testi.
- Akış testleri (Maestro) yalnızca kritik yollar: giriş, ana iş akışı, ödeme.
- İş mantığı sunucuda olduğu için mobil testleri **ekran davranışını** doğrular;
  sunucu kuralları sunucu testlerinde kanıtlanır, iki yerde tekrarlanmaz.
- CI'da en az bir gerçek derleme (EAS) koşar — "yerelde çalışıyordu" kanıt değildir.

## Yayın öncesi kontrol listesi

1. Üç ortamın adresleri ve anahtarları ayrı, canlı anahtar sızmamış
2. Jeton yalnızca güvenli depoda, log'da jeton/kimlik numarası yok
3. İzin metinleri dolu ve dürüst, mağaza gizlilik formu envanterle uyumlu
4. Çevrimdışı ve hata durumları her ekranda görünüyor
5. En küçük desteklenen cihazda düzen bozulmuyor, dokunma hedefleri yeterli
6. Karanlık mod okunabilir
7. Çıkış hem sunucuda hem cihazda oturumu bitiriyor
8. `runtimeVersion` doğru, geri dönüş yolu denenmiş
