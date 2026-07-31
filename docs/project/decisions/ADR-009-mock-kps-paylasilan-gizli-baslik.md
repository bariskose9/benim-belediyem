# ADR-009 — Sahte KPS ucu gerçek HTTP ile çağrılır, paylaşılan gizli başlıkla korunur

**Tarih:** 2026-07-31
**Durum:** Kabul edildi

## Bağlam

ADR-003 sahte KPS'i "dış servis gibi" ele almayı, PRD §5.0 ise ayrı bir uç
(`/api/mock-kps/*`) açmayı kararlaştırdı. Adım 4a'da bu uç hayata geçerken iki
soru cevaplanmadan kod yazılamazdı:

1. **Uç dışarıdan erişilebilir olacak mı?** Vercel'de `/api/*` altındaki her
   route varsayılan olarak herkese açıktır ve depo public'tir. Korunmazsa
   internetteki herkes sahte kimlik veritabanını numara numara tarayabilir.
   Veri sahte olsa bile bu, `05-auth-security.md`'nin "kimlik sorgulama uçları"
   bölümündeki tüm kuralları anlamsızlaştırır — kurallar yazılır ama uygulanmaz.
2. **Uygulama bu uca nasıl gidecek?** Gerçek bir HTTP isteğiyle mi, yoksa
   doğrudan fonksiyon çağrısıyla mı?

## Karar

**Uygulama sahte KPS'e GERÇEK bir HTTP isteği atar** (`MockKpsProvider` →
`POST /api/mock-kps/identity-queries`).

**Uç, paylaşılan gizli bir başlıkla korunur:** `x-mock-kps-key`. Değer
`MOCK_KPS_API_KEY` ortam değişkeninden gelir, her ortamda farklıdır ve
`serverEnv` şemasında **zorunludur** — eksikse uygulama açılışta durur.
Başlıksız veya yanlış başlıklı istek, hiçbir ipucu vermeden **401** alır.

Karşılaştırma **sabit zamanlıdır** (`timingSafeEqual`, iki değer önce SHA-256'dan
geçirilir): düz `===` ilk farklı karakterde durduğu için yanıt süreleri
ölçülerek anahtar karakter karakter bulunabilirdi.

**Bu uç OpenAPI/Swagger'a (`/api/docs`) belgelenmez.** `03-api-guidelines.md`
"tüm endpoint'ler belgelenir" diyor; burada bilinçli bir istisna yapılıyor,
çünkü taklit edilen bir dış kurumun sözleşmesini kendi belgemizde yayınlamak
saldırganın işini kolaylaştırmaktan başka bir işe yaramaz.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Gerçek HTTP + gizli başlık** | Zaman aşımı, yeniden deneme ve devre kesici GERÇEKTEN çalışır ve test edilebilir; ADR-003 ile PRD §5.0'ın "ayrı uç" şartı karşılanır | Her sorgu ikinci bir fonksiyon çağrısı; üç ortama ayrı anahtar girmek gerekir | **Seçildi** |
| HTTP ucu hiç açılmasın, doğrudan modül çağrısı | Sızma riski matematiksel olarak sıfır, daha hızlı, ek anahtar yok | Kesilecek bir bağlantı olmadığı için timeout/retry/devre kesici test edilemeyen süslemeye dönüşür; ADR-003 ve PRD §5.0 güncellenmek zorunda kalır | Adımın öğrenme amacı tam olarak bu mekanizmalar |
| Uç yalnızca local + preview'da açık olsun | Production'da hiç yüzey yok | Canlıda kayıt akışı çalışmaz — kimlik doğrulaması production'da kırık kalır | Uygulamanın ana akışını canlıda devre dışı bırakıyor |
| Yalnızca `robots.txt` ve "gizli" bir URL | Sıfır yapılandırma | Belirsizlikle güvenlik (security by obscurity); `robots.txt` saldırganın ilk okuduğu dosyadır | Koruma değil, koruma illüzyonu |

## Sonuçlar

- **Olumlu:** koruma testle kanıtlanıyor — E2E, derlenmiş ve çalışan uygulamaya
  dışarıdan başlıksız istek atıp 401 aldığını doğruluyor. Kod okumaya dayalı
  "korunuyor olmalı" iddiası yok.
- **Olumlu:** gerçek ağ atlaması sayesinde zaman aşımı ve yeniden deneme
  ölçülebilir davranışlar; yerel doğrulamada `timeout` davranışlı bir numara
  3 denemede ~9,8 saniyede `unavailable` döndü.
- **Bedel:** `MOCK_KPS_API_KEY` eksik olduğu her yerde build kırılır — CI,
  Playwright webServer ve Vercel'in üç ortamı. Bu bilinçli: sessizce korumasız
  çalışan bir uçtan iyidir.
- **Bedel:** her kimlik sorgusu Vercel'de ikinci bir fonksiyon çağrısı üretir.
- **Bilinen simülasyon artefaktı:** `simulationBehavior` alanı `timeout` veya
  `error` olan numaralar doğal olarak daha uzun sürer, yani bu numaralar
  zamanlamadan ayırt edilebilir. Gerçek KPS'te böyle bir korelasyon yoktur;
  bu, mock'un varlık sebebinin kaçınılmaz yan etkisidir. Numaraya bağlı asıl
  üç sonuç (bulundu / eşleşmedi / bulunamadı) sabit süreye doldurulur.
- **Gözden geçirme:** gerçek KPS entegrasyonu mümkün olursa bu ADR ile birlikte
  uç, sözleşme dosyası ve anahtar tamamen kaldırılır.
