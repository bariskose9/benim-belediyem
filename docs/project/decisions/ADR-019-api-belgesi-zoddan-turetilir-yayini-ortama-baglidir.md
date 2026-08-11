# ADR-019 — API belgesi Zod şemalarından türetilir; yayınlanması ortama bağlıdır

**Tarih:** 2026-08-11
**Durum:** Kabul edildi
**İlgili:** ADR-009 (sahte KPS uçları) · teknik borç #101, #102, #103, #105, #106

## Bağlam

`docs/standards/03-api-guidelines.md` "tüm endpoint'ler OpenAPI (Swagger) ile
belgelenir" diyor. Adım 18b'ye girildiğinde projede **46 uç** (40 dosya) ve
**95 ayrı hata kodu** vardı; hiçbiri belgelenmemişti.

Karar verilmesi gereken üç ayrı soru vardı ve üçü birbirinden bağımsızdı:

1. Belge **nasıl üretilir** — elle mi, koddan mı?
2. Hangi **OpenAPI sürümü** kullanılır?
3. Belge **kime açıktır**?

## Karar 1 — Belge elle yazılmaz, Zod şemalarından türetilir

Uçların girdi sözleşmesi zaten Zod şemalarında yazılı ve o şemalar **çalışma
anında fiilen kullanılıyor**. Elle yazılan bir OpenAPI dosyası, aynı gerçeğin
ikinci bir kopyası olurdu; iki kopyadan biri güncellenmediğinde sapan taraf
her zaman belge olur.

### Yeni paket EKLENMEDİ — ölçülerek karar verildi

Devir notu bu adım için bir paket (`zod-openapi` benzeri) gerekeceğini ve proje
sahibine sorulması gerektiğini yazıyordu. **Bu artık doğru değil:** projedeki
Zod sürümü 4.4.3 ve Zod 4, JSON Schema üretimini kendi içine aldı
(`z.toJSONSchema`).

Ezberden karar verilmedi, ölçüldü: projedeki **42 şemanın tamamı** dönüştürüldü.

```
OK: 42   FAIL: 0
```

Dönüşüm "temsil edilemeyen tipi sessizce boş geç" seçeneği **kapalıyken** de
42/42 geçti — yani belgede sessiz delik kalmıyor. Sonuç: **sıfır yeni bağımlılık.**

### `io: "input"` seçildi

İstemcinin **gönderdiği** biçim belgeleniyor, sunucunun dönüştürdükten sonraki
hâli değil. `.transform()` taşıyan şemalarda ikisi farklıdır ve çıktı biçimini
belgelemek istemciyi yanlış yönlendirir.

### Şemadan okunamayan bilgi tek bir kütükte

Yol, metot, erişim seviyesi ve dönebilecek hata kodları koddan çalışma anında
okunamıyor; bunlar `src/features/api-docs/registry/` altında duruyor.

⛔ **Kütük dört ayrı testle gerçeğe bağlı** — belgenin asıl değeri burada:

| Kapı | Ne yakalar |
|---|---|
| Uç sapması | Belgelenmemiş bir uç eklenirse |
| Hayalet uç | Silinen bir uç kütükte kalırsa |
| **Erişim sapması** | Belgelenen erişim seviyesi route'daki `requireAccess` ile uyuşmazsa |
| Hata kataloğu | Yeni bir hata sınıfı katalogda unutulursa |

⭐ **Erişim sapması testi bir mutasyon deneyinden doğdu.** Önce yalnızca "kütükte
korumalı yazan uç belgede de korumalı mı" ölçülüyordu. `/api/addresses` POST'unun
erişimi deneme amaçlı `authenticated` → `public` yapıldı ve **testlerin hepsi
yeşil kaldı**: testler kütükle tutarlıydı ama gerçekle bağı yoktu. Yanlış
etiketlenmiş bir uç belgede "giriş gerekmez" diye görünebilirdi. Test artık
etiketi route dosyasındaki gerçek çağrıya bağlıyor ve aynı mutasyonda kırmızıya
dönüyor.

## Karar 2 — OpenAPI **3.1** (teknik zorunluluk)

3.1, JSON Schema 2020-12'yi olduğu gibi kullanıyor — Zod'un ürettiği biçim tam
olarak bu. 3.0 seçilseydi her şema elle dönüştürülmek zorunda kalırdı
(`exclusiveMinimum` sayı değil boolean, `nullable` ayrı alan, `$ref` yanına
başka anahtar konamıyor) ve **dönüşüm sessizce kayıplı** olurdu.

## Karar 3 — Belge üretilir, ama production'da varsayılan olarak YAYINLANMAZ

⭐ **Üretmek ile yayınlamak ayrı kararlardır.** Belge her ortamda üretiliyor ve
CI'da sapma testinden geçiyor; doğruluğu ortamdan bağımsız. Karara bağlanan tek
şey onu herkese açmak.

| Ortam | Durum |
|---|---|
| local · preview | **Açık** — belgenin görülmesi gereken yer |
| production | **Kapalı** (`404`). `API_DOCS_PUBLIC=true` ile açılır |

**Gerekçe:** Bu API üçüncü taraflara sunulan bir ürün değil, kendi arayüzümüzün
arka ucu (BFF). Tek tüketicisi sunucuyla aynı deploy'da güncellenen web
arayüzümüz. Belgesi hiçbir dış tüketiciye hizmet etmezken tüm uçları, kabul
edilen alanları, doğrulama kurallarını ve 95 hata kodunu tek sayfada,
**taranabilir** biçimde sunar. Kazanç sıfır, bedel gerçek.

⚠️ **Bu bir "gizlilikle güvenlik" argümanı DEĞİLDİR** ve öyle savunulmuyor: depo
herkese açık, aynı bilgi zaten okunabilir. Argüman **saldırı yüzeyi hijyeni** —
kimseye faydası olmayan bir yüzeyi açık tutmamak. Güvenlik yetkilendirmeden
geliyor, belgenin kapalı olmasından değil.

**Neden bayrak, neden koda gömülü değil:** kapatmayı koda gömseydik açmak bir
dağıtım gerektirirdi. Belge bir gün gerçekten paylaşılmak istendiğinde (iş
görüşmesi, portföy) tek değişkenle açılabilmeli. Varsayılan kapalı olduğu için
bugün hiçbir panel işi gerektirmiyor.

**Neden `403` değil `404`:** `403` "burada bir şey var ama giremezsin" der ve
ucun varlığını doğrular. Kapalıyken uç hiç yokmuş gibi davranmalı — durum kodu
da, mesaj da olmayan bir adresle aynı.

## Reddedilen seçenekler

| Seçenek | Neden reddedildi |
|---|---|
| Elle yazılmış OpenAPI dosyası | İkinci bir doğruluk kaynağı; kaçınılmaz olarak sapar |
| `zod-openapi` benzeri paket | Gereksiz — Zod 4 aynı işi yapıyor, ölçüldü (42/42) |
| Hazır arayüz (Swagger UI / Scalar) gömmek | CDN'den script çekiyorlar; mevcut `script-src 'self'` CSP'si düşürürdü. CSP'yi belge için gevşetmek yanlış takas |
| Belgeyi production'da herkese açmak | Yukarıdaki gerekçe (BFF · saldırı yüzeyi hijyeni) |
| Yanıtı `{ data }` zarfına sarmak | OpenAPI araçları belgeyi kökte arar; zarf onu geçersiz bir OpenAPI dosyası yapardı. Tek ve bilinçli zarf istisnası |

## Sonuçlar

**Kazanılan**
- 46 ucun tamamı belgelendi; girdi sözleşmeleri gerçek şemalardan türetiliyor
- Belge ile kod arasındaki sapma CI kapısı hâline geldi
- Gizlilik kapısı: belge, adım 18a'nın kişisel veri süzgecinden geçiriliyor —
  "belgeye gerçek veri koyma" artık dilek değil test

**Bedeli / bilinen sınırlar**
- **Yanıt gövdelerinin şeması belgelenmedi**, yalnızca zarf ve Türkçe tarif var.
  Yanıtların Zod şeması yok; yazmak 40 route'a dokunmayı gerektirirdi
  (CLAUDE.md §7). Elle yazılsaydı sapan bir iddia olurdu — teknik borç #107
- Belgeleme sırasında **üç sözleşme kusuru bulundu**: aynı hata kodunun iki farklı
  durum kodu dönmesi (#105), iki uçta yol parametresinin Zod'dan geçmemesi (#106),
  `429`'da `Retry-After` olmaması (#101). Üçü de belgede **gizlenmedi**, açıkça yazıldı
