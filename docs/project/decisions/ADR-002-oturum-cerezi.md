# ADR-002 — Oturum tokenı localStorage yerine httpOnly cookie

**Tarih:** 2026-07-29
**Durum:** Kabul edildi

## Bağlam
Müfredat JWT'yi localStorage'da saklamayı öğretiyor. Uygulama kullanıcı içeriği
(destek talebi metni, dosya adı) render edecek; XSS yüzeyi mevcut.

## Karar
Web istemcisi oturumu **httpOnly + secure + sameSite cookie** ile taşır.
Mobil istemci aynı API'yi `Authorization: Bearer` ile kullanır; access token kısa ömürlü,
refresh token döndürülebilir.

## Değerlendirilen alternatifler
| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| localStorage'da JWT | Basit, örneği bol | JavaScript ile okunabilir → XSS'te token çalınır | Kabul edilemez risk |
| Sadece sunucu oturumu (DB session) | En güvenli, anında iptal | Mobil için ek katman | Cookie + JWT ikilisi her iki istemciyi de karşılıyor |

## Sonuçlar
- Olumlu: XSS ile token çalınamaz, CSRF sameSite ile azaltılır
- Bedel: mobil ve web için iki farklı taşıma yolu bakımı
- Gözden geçirme: yeni istemci türü eklenirse
