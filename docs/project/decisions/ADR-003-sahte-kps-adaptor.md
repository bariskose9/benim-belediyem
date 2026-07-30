# ADR-003 — Kimlik doğrulama sahte KPS servisi üzerinden, adaptör arkasında

**Tarih:** 2026-07-29
**Durum:** Kabul edildi

## Bağlam
Gerçek belediye uygulamalarında kayıt/giriş KPS (Kimlik Paylaşım Sistemi) ile yapılır.
Bu projede gerçek KPS erişimi yok, ancak mimarinin gerçeğine sadık olması isteniyor:
dış servis gecikmesi, hatası, hız sınırı ve numara taraması riski dahil.

## Karar
Kimlik doğrulama, uygulama içinde `IdentityProvider` arayüzü arkasına alınır.
Bugünkü uygulaması `MockKpsProvider`'dır ve ayrı bir uç (`/api/mock-kps/*`) ile
ayrı veri kümesi (`kps_citizens`) üzerinden çalışır; yapay gecikme ve hata üretir.
Gerçek KPS erişimi olursa yalnızca bu sınıf değiştirilir.

## Değerlendirilen alternatifler
| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| E-posta + şifre ile klasik kayıt | En basit | Gerçek senaryoyu hiç öğretmiyor | Projenin amacı gerçeğin klonu |
| Kimlik bilgilerini doğrudan `users` tablosundan okumak | Daha az kod | Dış servis davranışı (gecikme, hata, sınır) hiç yaşanmaz | Öğrenme değeri sıfır, sonradan geçiş refactor gerektirir |
| Üçüncü parti kimlik sağlayıcı (Google/Apple) | Hazır | Kurumsal senaryoya uymuyor | Vatandaş kimliği doğrulanmıyor |

## Sonuçlar
- Olumlu: gerçek entegrasyon disiplini (timeout, retry, devre kesici, hız sınırı,
  enumeration koruması) baştan öğrenilir; gerçek KPS'e geçiş tek sınıf değişimi olur
- Bedel: fazladan bir tablo ve bir sahte servis katmanı bakımı
- Gözden geçirme: gerçek KPS veya e-Devlet entegrasyonu mümkün olursa
