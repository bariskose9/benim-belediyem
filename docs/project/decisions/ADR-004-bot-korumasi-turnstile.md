# ADR-004 — Bot koruması için Cloudflare Turnstile

**Tarih:** 2026-07-30
**Durum:** Kabul edildi

## Bağlam

Giriş gerektirmeyen formlar (kayıt, giriş, şifre sıfırlama, kod tekrar gönderme,
destek talebi) otomatik saldırıya açıktır. Hız sınırı **bir kişinin çok denemesini**
engeller; binlerce farklı IP'den gelen dağıtık bot trafiğini engellemez. İkisi
farklı işler yapar ve birlikte gerekir.

Bu proje için özel risk: kayıt formu sahte KPS servisini sorgular. Korumasız bırakılırsa
numara taraması (enumeration) saldırısı hem veri sızdırır hem de dış servis maliyeti üretir
(`05-auth-security.md` → "Kimlik sorgulama uçları").

`00-stack.md` tabloda olmayan her paket için onay ve ADR şartı koyuyor.

## Karar

Bot koruması olarak **Cloudflare Turnstile** kullanılır, **managed (uyarlanabilir)**
modda. Jeton her zaman **sunucu tarafında** doğrulanır ve tek kullanımlıktır.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Cloudflare Turnstile** | Ücretsiz (1M çözüm/ay), çerez yok, siteler arası takip yok, çoğu kullanıcı bulmaca görmez | ABD merkezli işleyici; Cloudflare hesabı gerekir | **Seçildi** |
| Google reCAPTCHA | En yaygın, bol örnek | 2026'da tüm siteler Enterprise'a taşındı: ücretsiz kota ayda 10.000 değerlendirme, üstü için kart + 8 $ sabit ücret. Çerez kullanır, KVKK yükü ağır | Artık pratikte ücretsiz değil ve gizlilik maliyeti yüksek |
| hCaptcha | Gizlilik odaklı, ücretsiz katman var | Çerez kullanır, erişilebilirlik tarafı zayıf | Turnstile aynı işi çerezsiz yapıyor |
| Yalnızca bal küpü + süre ölçümü | Sıfır bağımlılık, sıfır dış servis, sıfır KVKK yükü | Basit botları durdurur, hedefli saldırıyı durdurmaz | Kayıt ucu KPS sorgusu tetiklediği için daha güçlü kapı gerekiyor |

## Sonuçlar

- **Olumlu:** kayıt ve giriş uçları dağıtık bot trafiğine karşı korunur; kullanıcı
  deneyimi bozulmaz (managed modda çoğu kişi bulmaca çözmez); maliyet sıfır.
- **Bedel 1:** Cloudflare ABD merkezli bir işleyicidir. KVKK aydınlatma metninde
  yurt dışına aktarım olarak belirtilmek zorundadır.
- **Bedel 2:** Turnstile erişilemezse kayıt ve şifre sıfırlama **durur**. Bu,
  `12-operations-and-scaling.md`'deki "dış servis çökerse sayfa ayakta kalır"
  kuralının bilinçli istisnasıdır: güvenlik kapısı açık bırakılarak atlanmaz.
- **Bedel 3:** Deploy öncesi ücretsiz Cloudflare hesabı ve her ortam için ayrı
  anahtar çifti gerekir.
- **Gözden geçirme:** Turnstile ücretlendirme politikası değişirse veya
  KVKK açısından yurt içi işleyici zorunluluğu doğarsa.
