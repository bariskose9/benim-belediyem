# ADR-015 — Dış bilgi servislerinin yanıtı Postgres'te önbelleklenir; sağlayıcı çökerse bayat veri sunulur

**Tarih:** 2026-08-09
**Durum:** Kabul edildi

## Bağlam

PRD §5.8 anasayfaya üç bilgi widget'ı istiyor (hava durumu, haber, piyasa) ve iki
kural koyuyor:

1. **"Çağrılar sunucu tarafında yapılır ve önbelleklenir."**
2. **"Dış servis çökerse widget hata gösterir, sayfa çalışmaya devam eder."**

Bu, projenin **ilk gerçek dış API çağrısı**. Bugüne kadarki tüm dış servisler
taklit ediliyordu (sahte KPS — ADR-003, sahte ödeme sağlayıcısı). Sahte serviste
gecikme ve hata bizim kontrolümüzdeydi; gerçek serviste değil.

Önbellek olmadan her anasayfa görüntülemesi dört dış çağrı demek. Bunun üç
somut bedeli var:

- **Sağlayıcı limitleri:** CoinGecko'nun anahtarsız ucu dakikada sınırlı ve
  Vercel'in çıkış IP'leri paylaşımlı — anasayfa birkaç kez yenilendiğinde `429`
  gelmesi beklenen bir durum, istisna değil.
- **Gecikme:** dört ardışık dış çağrı anasayfanın ilk çizimini sağlayıcıların
  en yavaşına bağlar.
- **Nezaket:** `integrations.md` "önbellek süresi dolmadan tekrar istek atılmaz"
  diyor; ücretsiz ve anahtarsız servisleri her ziyarette dövmek bu kuralın tam tersi.

Sorunun kendisi değil, **önbelleğin nerede tutulacağı** karar gerektiriyor.

## Karar

**Dış servis yanıtları `external_data_cache` adlı Postgres tablosunda,
`key → payload + fetchedAt + expiresAt` biçiminde tutulur. Sağlayıcıya
ulaşılamadığında süresi geçmiş kayıt SİLİNMEZ; "bayat" işaretiyle ekrana çıkar.**

Okuma yolu üç durumlu:

| Durum | Ne olur | Ekranda |
|---|---|---|
| Taze kayıt var (`expiresAt > şimdi`) | Dış çağrı **hiç yapılmaz** | Veri + "şu saatte güncellendi" |
| Kayıt yok veya süresi geçmiş | Çağrı yapılır, başarılıysa yazılır | Veri + saat |
| Çağrı başarısız, elde eski kayıt var | Eski kayıt döner | Veri + **"güncellenemedi, şu saatteki veri"** |
| Çağrı başarısız, eski kayıt da yok | — | **Hata durumu**; sayfa ayakta |

Yazma **tek koşullu `upsert`** ile yapılır (`key` benzersiz), yani iki istek aynı
anda ıskaladığında ikisi de yazsa bile satır bozulmaz.

Her çağrı ayrıca üç dayanıklılık kuralından geçer — bunlar önbelleğin değil
çağrı katmanının işi (`src/lib/external-fetch.ts`): **zaman aşımı**, en fazla
**2 yeniden deneme** (üstel geri çekilmeli) ve **devre kesici** (ADR-010'daki
mevcut `circuit-breaker.ts`, sağlayıcı başına ayrı devre). Devre açıkken çağrı
hiç yapılmaz; doğrudan bayat kayda veya hata durumuna düşülür.

Yanıt gövdesi **Zod ile doğrulanır** ve önbelleğe **ham gövde değil, ayrıştırılmış
ve sadeleştirilmiş şekil** yazılır. Böylece sağlayıcı şeması değişirse hata
ayrıştırma anında görülür, ekranı çizerken değil.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Postgres tablosu (bu karar)** | Sunucusuzda güvenilir; sahte saatle test edilebilir; **bayat veri sunulabiliyor**; E2E ağa hiç çıkmadan koşabiliyor; hız sınırı (ADR-006) ve devre kesici (ADR-010) zaten aynı yerde | Her ıskalamada bir yazma; tablonun temizlenmesi gerekiyor; birkaç ms ek gecikme | **Seçildi** |
| Next.js `fetch(..., { next: { revalidate } })` (Data Cache) | Kod yok denecek kadar az; altyapı bizim değil | Resmî doküman `AbortSignal` verilen isteğin memoizasyondan çıktığını söylüyor, **kalıcı önbellekle etkileşimini yazmıyor** — oysa zaman aşımı bizde zorunlu (CLAUDE.md §5.9). Davranışı birim testiyle kanıtlanamaz. **Sağlayıcı çöktüğünde eski veriyi sunma imkânı yok**: süresi dolan kayıt yenilenemezse elde bir şey kalmıyor. Local ile Vercel davranışı ayrıca farklı | Belirsiz davranışa güvenlik ve dayanıklılık kuralı bağlanamaz |
| Bellek içi `Map` | En hızlısı | Sunucusuzda her istek başka bir örneğe düşebilir; sayaç hiçbir şey saymaz — ADR-006 ve ADR-010'da aynı gerekçeyle reddedildi | Sunucusuz ortamda çalışmıyor |
| Planlı görevle (cron) tabloyu doldurmak | Kullanıcı hiç beklemez | Vercel ücretsiz planında cron **günde bir** (teknik borç #3). 5 dakikalık kripto verisi günde bir tazelenemez | Ücretsiz planda mümkün değil |
| Tarayıcıdan doğrudan sağlayıcıya istek | Sunucu hiç yorulmaz | PRD "çağrılar sunucu tarafında yapılır" diyor; ziyaretçi sayısı kadar istek limitleri anında bitirir; anahtar gerektiren bir sağlayıcıya geçilirse anahtar tarayıcıya çıkar | PRD kuralına aykırı |

## Sonuçlar

- **Olumlu:** anasayfa dış servislerin hızına bağlı değil; sağlayıcı çökse bile
  kullanıcı boş kart değil "biraz eski" veri görüyor; önbellek davranışı sahte
  saatle test ediliyor; E2E önbelleği doldurarak ağa çıkmadan koşuyor, yani
  testler dış dünyanın o günkü hâline bağlı değil.
- **Bedel 1 — tablo temizliği:** kayıtlar kendiliğinden silinmiyor. Satır sayısı
  sağlayıcı sayısı kadar sabit (bugün 4) olduğu için bugün sorun değil; yine de
  `RateLimitCounter` gibi saklama süresi tablosuna eklendi.
- **Bedel 2 — bayat veri yanıltıcı olabilir:** bu yüzden bayat gösterim
  **sessiz değil**: kartta "şu saatte güncellendi, şu an güncellenemiyor" yazıyor.
  Kur ve kripto gibi hızlı değişen veride bu ayrım önemli.
- **Bedel 3 — ilk ziyaretçi bekler:** önbellek boşken ilk isteği yapan kullanıcı
  dış çağrıyı bekler. Widget'lar `Suspense` ile ayrı ayrı akıtıldığı için sayfanın
  kalanı beklemiyor.
- **Ne zaman gözden geçirilmeli:** sık çalışan bir planlı görev mümkün olursa
  (ücretli plan veya dış zamanlayıcı), tabloyu görev doldurur ve kullanıcı hiç
  beklemez — okuma yolu aynen kalır, yalnızca yazan taraf değişir.
