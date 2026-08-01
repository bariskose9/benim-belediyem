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

## Güncelleme — 2026-08-01 (adım 4b-2 uygulanırken)

**Karar geçerli, mekanizma değişti: Auth.js kullanılmıyor, oturum elle yazıldı.**

Yukarıda "Auth.js `database` oturum stratejisi" yazıyor. Uygulamaya geçerken
`@auth/core` kaynak kodunda şu kontrol bulundu
(`packages/core/src/lib/utils/assert.ts`):

> `"Signing in with credentials only supported if JWT strategy is enabled"`

Yani Auth.js'in `Credentials` (şifreyle giriş) sağlayıcısı **JWT'yi zorunlu
kılıyor** ve `database` stratejisiyle çalışmıyor. JWT'ye geçmek bu ADR'nin tek
varlık sebebini ortadan kaldırırdı: şifresini değiştiren kullanıcının eski
oturumu 7 gün daha açık kalırdı.

Bu yüzden `next-auth` **kurulmadı** ve oturum elle yazıldı:

- `sessions` tablosu, çerezde yalnızca 32 baytlık rastgele jeton
- Jetonun **özeti** saklanıyor (veritabanı sızsa bile çerez üretilemez)
- Çıkış, şifre değişimi ve "tüm cihazlardan çık" satır silmekle **anında** etkili

Kararın özü (oturum veritabanında, anında iptal edilebilir) korunduğu için yeni
bir ADR yazılmadı. **Google ile giriş (adım 4c) hâlâ Auth.js ile yapılabilir** —
OAuth sağlayıcıları `database` stratejisini destekliyor; ama çerez adı ve biçimi
bizimkinden farklı, birleştirme gerekiyor. O karar 4c'de verilecek.

## Sonuçlar

- **Olumlu:** çıkış ve şifre değişimi gerçekten çalışır; "tüm cihazlardan çıkış"
  özelliği bedavaya gelir; personel yetkisi düşen kullanıcının oturumu anında kesilebilir.
- **Bedel:** her korumalı istekte bir oturum okuması. `user_id` ve `expires` üzerinde
  indeks zorunludur; sunucusuz ortamda bağlantı havuzu (pooler) kullanılır.
- **Bedel:** süresi dolmuş oturum satırlarını temizleyen planlı görev gerekir
  (bkz. ADR-007 — temizlik işleri).
- **Gözden geçirme:** oturum okuması p95 yanıt süresinin anlamlı bir bölümünü
  yerse (`12-operations-and-scaling.md` SLO: API p95 < 500ms).
