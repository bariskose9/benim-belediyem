# ADR-006 — Hız sınırı sayacı Postgres'te tutulur, ayrı Redis kurulmaz

**Tarih:** 2026-07-30
**Durum:** Kabul edildi

## Bağlam

`05-auth-security.md` ve PRD §5.0 birden fazla yerde hız sınırı zorunlu kılıyor:
KPS sorgusu (5 deneme / 15 dakika), giriş denemesi, şifre sıfırlama, OTP gönderimi
(3 kod / 15 dakika), destek talebi, sipariş oluşturma.

**Sorun:** uygulama Vercel'de sunucusuz olarak çalışıyor ve `12-operations-and-scaling.md`
"süreç durumsuzdur" diyor. Her istek ayrı bir örnek üzerinde çalışabilir; örnekler
paylaşılan bellek görmez ve istek bitince yok olabilir. Bu yüzden **bellekte tutulan
bir sayaç hiçbir şey saymaz** — saldırgan yeterince istek atarsa her seferinde
"sıfırdan başlamış" bir örneğe düşer. Sayacın süreçler arasında paylaşılan,
kalıcı bir yerde durması zorunludur.

## Karar

Hız sınırı sayaçları **projenin mevcut Postgres veritabanında** tutulur:
`rate_limit_counters` tablosu, anahtar + pencere başlangıcı üzerinde benzersiz
indeks, sayaç artışı tek atomik `UPSERT` ile yapılır.

Ayrı bir Redis/Upstash servisi **şimdilik kurulmaz**.

Anahtar üretimi: `<amaç>:<kimlik>` biçiminde ve **kişisel veri içermez** —
kimlik numarası anahtar olarak kullanılmaz, IP adresi tuzlanmış özet (hash)
olarak saklanır (`05-auth-security.md` → "önbellek anahtarına kimlik yazılmaz").

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Postgres tablosu** | Yeni servis/hesap yok, tek yedek, tek bağlantı, işlem (transaction) garantisi | Redis'ten yavaş; sayaç yazımı veritabanına yük bindirir | **Seçildi** |
| Upstash Redis | Bu iş için tasarlanmış, çok hızlı, otomatik süre dolumu (TTL) | Yeni hesap, yeni anahtar seti, üç ortam için üç yapılandırma, ücretsiz katman sınırlı | Bu ölçekte kazancı, kurulum ve bakım maliyetini karşılamıyor |
| Bellek içi sayaç | Sıfır altyapı | **Sunucusuzda çalışmaz** — koruma sağladığı sanılır, sağlamaz | Yanlış güvenlik hissi, en tehlikeli seçenek |
| Vercel WAF / kenar hız sınırı | Uygulamaya hiç ulaşmadan durdurur | Ücretli plan gerektirir; uç bazlı ince kural yazılamaz | Bütçe dışı |

## Sonuçlar

- **Olumlu:** koruma gerçekten çalışır; ek servis, ek hesap ve ek aylık maliyet yok;
  sayaçlar yedeğe dahil; test ortamında kurulum gerektirmez.
- **Bedel:** her korumalı istekte bir veritabanı yazımı. Yalnızca korumalı uçlarda
  (giriş, kayıt, KPS, OTP, şifre sıfırlama, destek, sipariş) uygulanır; listeleme
  uçlarına konmaz.
- **Bedel:** süresi geçmiş sayaç satırlarını temizleyen planlı görev gerekir
  (bkz. ADR-007).
- **Gözden geçirme:** `12-operations-and-scaling.md` büyütme sırasına göre —
  ölçüm hız sınırı yazımının darboğaz olduğunu gösterirse 2. adım (önbellek/Redis)
  devreye alınır. Önce ölç, sonra taşı.
