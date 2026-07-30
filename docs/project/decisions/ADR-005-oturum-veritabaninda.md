# ADR-005 — Web oturumu veritabanında tutulur, JWT ile değil

**Tarih:** 2026-07-30
**Durum:** Kabul edildi
**İlgili:** ADR-002 (oturum tokenı httpOnly cookie'de)

## Bağlam

ADR-002 oturumun **nerede taşınacağını** çözdü (httpOnly cookie), ama oturumun
**nerede tutulacağını** çözmedi. `05-auth-security.md` iki kural koyuyor:

- "Çıkışta oturum **sunucu tarafında geçersizleştirilir**"
- "Şifre değişiminde ve çıkışta **tüm aktif oturumlar** geçersizleşir"
- "Refresh token yeniden kullanılırsa o kullanıcının **tüm oturumları düşürülür**"

Bu üç kural, imzalı JWT ile **teknik olarak sağlanamaz**. İmzalı bir jeton kendi
kendini doğrular; sunucu onu "iptal ettim" diyemez, süresi dolana kadar geçerlidir.
İptal edilebilir JWT için zaten bir sunucu tarafı iptal listesi tutmak gerekir —
bu da JWT'nin tek avantajını (durumsuzluk) ortadan kaldırır.

Ayrıca kimlik doğrulanmış bir belediye uygulamasında "şifremi değiştirdim ama
eski oturum 7 gün daha açık kaldı" kabul edilebilir değil.

## Karar

**Web:** Auth.js `database` oturum stratejisi. Oturum kaydı Postgres'te `Session`
tablosunda tutulur; çerez yalnızca oturum kimliğini taşır. Çıkış, şifre değişimi
ve şüpheli durum, ilgili satırların silinmesiyle **anında** etkili olur.

**Mobil (Expo, faz 19):** kısa ömürlü access token (15 dk) + **veritabanında tutulan,
döndürülebilir** refresh token. Refresh token'ın kendisi de bir oturum satırıdır;
yeniden kullanım tespit edilirse o kullanıcının tüm satırları silinir.

Böylece her iki istemci de **aynı iptal mekanizmasını** kullanır: tek tablo, tek kural.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Veritabanı oturumu** | Anında iptal, "tüm cihazlardan çık" mümkün, tek mekanizma | Her istekte 1 veritabanı okuması | **Seçildi** — okuma indeksli ve ucuz; doğruluk hızdan önce gelir |
| İmzalı JWT (durumsuz) | Veritabanı okuması yok, sunucusuzda hızlı | Oturum iptal **edilemez**; standardın üç kuralı da ihlal edilir | Güvenlik gereksinimi karşılanmıyor |
| JWT + iptal listesi | Kısmen hızlı | Yine veritabanı okuması gerekiyor, üstelik iki mekanizma birden bakılıyor | JWT'nin avantajı kalmıyor, karmaşıklık artıyor |

## Sonuçlar

- **Olumlu:** çıkış ve şifre değişimi gerçekten çalışır; "tüm cihazlardan çıkış"
  özelliği bedavaya gelir; personel yetkisi düşen kullanıcının oturumu anında kesilebilir.
- **Bedel:** her korumalı istekte bir oturum okuması. `user_id` ve `expires` üzerinde
  indeks zorunludur; sunucusuz ortamda bağlantı havuzu (pooler) kullanılır.
- **Bedel:** süresi dolmuş oturum satırlarını temizleyen planlı görev gerekir
  (bkz. ADR-007 — temizlik işleri).
- **Gözden geçirme:** oturum okuması p95 yanıt süresinin anlamlı bir bölümünü
  yerse (`12-operations-and-scaling.md` SLO: API p95 < 500ms).
