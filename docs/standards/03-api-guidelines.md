# 03 — API Tasarım Kuralları

## URL ve metotlar
- Kaynak adları **çoğul ve İngilizce**: `/api/appointments`, `/api/orders`
- URL'de fiil yok. `/api/createOrder` ❌ → `POST /api/orders` ✅
- İç içe kaynak en fazla bir seviye: `/api/orders/{id}/items`
- Filtre/sıralama query string ile: `?status=pending&sort=-createdAt&page=1&limit=20`

## Status kodları
`200` başarılı · `201` oluşturuldu · `204` içerik yok (silme) ·
`400` bozuk istek · `401` giriş yapılmamış · `403` yetkisiz ·
`404` bulunamadı · `409` çakışma (slot dolu) · `422` doğrulama hatası ·
`429` çok fazla istek · `500` sunucu hatası

## Yanıt formatı (tek tip)

Başarılı:
```json
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }
```

Hatalı:
```json
{ "error": { "code": "SLOT_TAKEN", "message": "Seçtiğiniz saat dolmuş.", "details": [] } }
```

`code` makine için sabit ve İngilizce, `message` kullanıcı için Türkçe.
Stack trace, SQL, dosya yolu **asla** yanıta konmaz.

### Hata yanıtı izlenebilir bir kimlik taşır

Her hata yanıtında, o isteği sunucu log'undaki satıra bağlayan bir **istek
kimliği** bulunur (`error.requestId` veya `X-Request-Id` başlığı).

**Neden:** Kullanıcı "hata aldım" der; elinde ekran görüntüsünden başka bir şey
yoktur. İstek kimliği olmadan doğru log satırını bulmanın yolu, zaman
aralığından tahmin etmektir — ve üretimde bu, dakikalar değil saatler demektir.

⛔ Bu kimlik **rastgele ve anlamsız** olur: kullanıcı kimliği, e-posta veya
kayıt numarası buraya konmaz. İstemciye giden her değer, saldırgana da giden
bir değerdir.

## Doğrulama
- Her endpoint girişi (body, query, params) **Zod ile** doğrulanır. İstisna yok.
- İstemciye güvenilmez: fiyat, indirim, kullanıcı kimliği, rol **sunucuda** belirlenir.
  İstemcinin gönderdiği `price` veya `userId` alanı reddedilir.

## Yetki
- Her korumalı endpoint'te iki soru cevaplanır:
  1. Bu kişi giriş yapmış mı? (401)
  2. Bu kayıt bu kişiye mi ait / bu işlemi yapma yetkisi var mı? (403)
- Kayıt sahipliği kontrolü atlanırsa IDOR açığı oluşur — bu bir hata değil, güvenlik ihlalidir.

## İstek sınırları

- **Gövde boyutu üst sınırı vardır ve sunucuda uygulanır.** Sınırsız bir JSON
  gövdesi, kimlik doğrulaması bile gerektirmeyen ucuz bir hizmet dışı bırakma
  yoludur: tek bir istek belleği doldurabilir. Sınır aşılırsa `413` döner.
- Zod'un `max()` kuralları bu sınırın yerine geçmez — Zod ancak gövde **okunup
  ayrıştırıldıktan sonra** çalışır, yani maliyet zaten ödenmiştir.
- `429` yanıtı **`Retry-After` başlığı olmadan dönülmez.** Ne zaman
  deneyeceğini bilmeyen istemci ya hemen tekrar dener (sınırı büyütür) ya da
  gereğinden uzun bekler. Süreyi tahmin ettirmek istemcinin işi değildir.

## CORS

Varsayılan: **hiç CORS başlığı yok.** Bu API tarayıcıdaki kendi arayüzümüz
tarafından, oturum çerezi ile çağrılır — yani aynı kaynaktan (same-origin).
Başlık yokluğu bir eksik değil, **kararın kendisidir**: çerezle çalışan bir API'ye
çapraz kaynak izni vermek, CSRF yüzeyini bilerek açmaktır.

Çapraz kaynaktan çağıran gerçek bir tüketici çıkarsa (üçüncü taraf entegrasyon):
ADR yazılır, izin verilen kaynaklar **beyaz liste** olur (`*` asla) ve o yol
çerezle değil **taşıyıcı jetonla** çalışır.

## Sayfalama

- Liste dönen tüm endpoint'ler sayfalanır. Sınırsız liste dönülmez.
- `limit` için bir **üst tavan** vardır ve istemcinin gönderdiği değer bu tavanla
  kırpılır. Tavansız `limit`, sayfalamayı olmamış sayar.
- Büyüyen veya sık değişen listelerde **imleç (cursor/keyset)** tabanlı sayfalama
  kullanılır, `offset` değil. `offset` ile ilerlerken araya yeni kayıt girerse
  kullanıcı bir kaydı iki kez görür ya da hiç görmez; ayrıca büyük `offset`
  değerleri veritabanına atlanan satırların hepsini saydırır.
- Kısa ve durağan listelerde `offset` yeterlidir — seçim gerekçesiyle yazılır.

## Sözleşme ömrü — sürüm, kırıcı değişiklik, emeklilik

Bir uç yayına girdiği anda **sözleşmeye** dönüşür. Sözleşmeyi tek taraflı bozmanın
bedelini kullanıcı öder.

**Kırıcı (breaking) değişiklik sayılanlar:** alan silmek · alan adını değiştirmek ·
bir alanı isteğe bağlıdan zorunluya çevirmek · tipini değiştirmek · dönen hata
`code` değerini değiştirmek · durum kodunu değiştirmek · doğrulama kuralını
**daraltmak**.

**Kırıcı olmayanlar:** yeni bir isteğe bağlı alan eklemek · yanıta yeni alan
eklemek · doğrulama kuralını gevşetmek · yeni bir uç eklemek.
*(Bu ayrım, istemcinin tanımadığı alanları yok saydığı varsayımına dayanır —
istemci tarafında "bilinmeyen alan varsa hata ver" davranışı kullanılmaz.)*

**Kırıcı değişiklik gerekiyorsa sıra:**
1. Yeni davranış **yeni bir sürüm veya yeni bir alan** olarak eklenir; eskisi çalışmaya devam eder
2. Eski uç `Deprecation` ve `Sunset` yanıt başlıklarıyla işaretlenir
   ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html) ve
   [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html); `Sunset` tarihi
   `Deprecation` tarihinden **önce olamaz**)
3. Kullanım ölçülür — trafiği sıfırlanmadan uç kapatılmaz
4. Sunset tarihinden sonra kaldırılır ve belgeden düşer

### Sürüm YOL SEGMENTİNDE taşınır: `/api/v1/<kaynak>`

Başlık (`Accept-Version`) veya medya tipi tabanlı sürümleme **kullanılmaz.**
Gerekçe ezberden değil kamu sektörü standardından geliyor —
[GOV.UK API teknik standardı](https://www.gov.uk/guidance/gds-api-technical-and-data-standards)
sürümü URI'ye koymayı söylüyor ve diğer iki yöntem için açıkça *"avoid these
approaches because they can lead to your API being blocked by proxies or
firewalls"* diyor.

Bu projeye özel dört kazanç:

| | Yol segmenti | Başlık tabanlı |
|---|---|---|
| Yanlış sürüme giden eski istemci | `404` — **gürültülü** | `200` + yanlış sürüm — **sessiz** |
| Yeni sürüm eklemek | Yeni klasör; eski dosyaya dokunulmaz | Her route'a elle dallanma |
| "Kim hâlâ eski sürümü çağırıyor?" | Erişim log'unda **zaten var** | Başlık ayrıca log'lanmalı |
| CDN / proxy / güvenlik duvarı | Yolu anlar | Özel başlığı çoğu tanımaz |

**Ne zaman başlık tabanlı meşrudur:** yalnızca tüketicilerinin **hepsini** sen
güncelleyebiliyorsan (servisten servise dahilî çağrı). Mobil uygulama, üçüncü
taraf veya tarayıcı önbelleği varsa yol segmenti.

### ⛔ Adresini DIŞARIDA biri sabitlemiş uç sürümlenmez

Sürümleme, istemciyle aramızdaki **sözleşmeyi** korur. Bir ucun adresi bizim
dışımızda bir yerde kayıtlıysa o adres sözleşme değil **kayıt**tır; taşımak
sözleşmeyi korumaz, çalışan bir şeyi kırar. Tipik olanlar:

- sağlık / hazırlık ucu (izleme aracı, yük dengeleyici, duman testi)
- planlı görev ucu (⛔ platform yapılandırmasında sabit — taşımak görevi
  **sessizce** durdurur, hata bile üretmez)
- OAuth `redirect_uri` (⛔ sağlayıcının panelinde kayıtlı — düzeltmesi kodda değil)
- belgenin kendi adresi
- taklit edilen bir **üçüncü tarafın** API'si (onu kendi sürümünle etiketlemek
  yanlış bir iddiadır)

İstisna listesi **isim isim yazılır ve testle kilitlenir**; "şimdilik" diye
eklenmez. ⭐ Test, istisnayı gerekçesine bağlamalıdır: cron yolu platform
yapılandırma dosyasından, callback adresi `redirect_uri`'yi üreten sabitten
okunup karşılaştırılır. Yoksa "adresi panelde kayıtlı" cümlesi doğrulanmamış
bir iddia olarak kalır.

### ⚠️ `Deprecation` bir HTTP-date DEĞİLDİR

RFC 9745 §2 bu başlığı bir **Structured Field Date** olarak tanımlıyor: değeri
`@<unix-saniye>` biçiminde yazılır. `Sunset` ise sıradan bir HTTP-date'tir.

```
Deprecation: @1788220799
Sunset: Sun, 01 Mar 2026 23:59:59 GMT
Link: </api/v2/appointments>; rel="successor-version"
```

İkisini karıştırmak **hiçbir yerde yakalanmayan** bir hatadır: başlık yazılır,
yanıt 200 döner, istemci değeri okuyamaz. Bu yüzden emeklilik başlıklarını üreten
kod ilk emeklilikten **önce** yazılır ve biçimi testle kilitlenir — ilk emeklilik
günü RFC okumak için doğru an değildir.

⛔ **Mobil uygulama geldiği gün bu bölüm zorunlu hâle gelir.** Web istemcisini
tek deploy'la güncellersin; **kullanıcının telefonundaki eski sürümü
güncelleyemezsin.** Kaldırılan bir uç, güncellemeyi almamış herkes için
uygulamanın çökmesi demektir.

## Belgeleme (OpenAPI)

- **Tüm endpoint'ler OpenAPI ile belgelenir.** Belge elle yazılmaz; uçların
  fiilen kullandığı doğrulama şemalarından **türetilir**. Elle yazılan belge
  ikinci bir doğruluk kaynağıdır ve kaçınılmaz olarak eskir.
- Belge ile gerçek uçlar arasındaki sapma **CI'da testle yakalanır**: belgelenmemiş
  bir uç eklenirse yapı kırmızıya döner. Kapısı olmayan belge, birkaç ay içinde
  yanlış belgeye dönüşür — ve **yanlış belge, belgesizlikten kötüdür**.
- Belgeye **örnek değer olarak gerçek veya gerçeğe benzer kişisel veri konmaz**
  (kimlik numarası, kart numarası, gerçek e-posta). Örnekler açıkça sahte olur.

### ⛔ Belgeyi yayınlamak ile üretmek AYRI kararlardır

Belgenin **üretilmesi** her zaman zorunludur. **Herkese açık yayınlanması**
değildir ve varsayılan olarak yapılmaz.

| API'nin türü | Belge nerede açık |
|---|---|
| Kendi arayüzümüzün çağırdığı iç API (BFF) | local + preview açık · **production'da kapalı** |
| Üçüncü tarafların kullanması için sunulan **ürün** API | her yerde açık — belge ürünün parçasıdır |

**Neden:** İç bir API'nin belgesi hiçbir dış tüketiciye hizmet etmez; buna
karşılık tüm uçları, kabul edilen alanları, doğrulama kurallarını ve hata
kodlarını tek sayfada, taranabilir biçimde saldırgana sunar. Kazanç sıfır,
bedel gerçektir.

⚠️ **Bu bir "gizlilikle güvenlik" (security by obscurity) argümanı değildir** ve
öyle savunulmaz: depo açıksa aynı bilgi zaten okunabilir. Argüman **saldırı
yüzeyi hijyenidir** — kimseye faydası olmayan bir yüzeyi açık tutmamak. Güvenlik
her zaman yetkilendirmeden gelir, belgenin kapalı olmasından değil.

Production'da açılması istenirse: ortam değişkeniyle açılır (varsayılan kapalı),
`noindex` verilir ve karar ADR'ye yazılır.

**Tek belgeleme istisnası:** taklit edilen dış servis uçları (`/api/mock-kps/*`)
belgelenmez — gerekçe ADR-009. Bu istisna yalnızca dış kurum taklidi için
geçerlidir; uygulamanın kendi uçlarına genişletilemez.

## Diğer
- Ödeme/sipariş gibi tekrarlanmaması gereken işlemlerde idempotency anahtarı kullanılır.
- Uzun işlemler senkron beklemez.
