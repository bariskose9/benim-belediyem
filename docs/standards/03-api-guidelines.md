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
  Server Action'lar da endpoint sayılır (`01-architecture.md` → *"Server Action"*).
- İstemciye güvenilmez: fiyat, indirim, kullanıcı kimliği, rol **sunucuda** belirlenir.
  İstemcinin gönderdiği `price` veya `userId` alanı reddedilir.

### Zod kuralı seçme sırası — hazır kural → regex → refine

**Zod** bir şema doğrulama kütüphanesidir: "şema" burada veritabanı şeması
değil, gelen verinin **nasıl görünmesi gerektiğinin tarifi** — başvuru
formunun kenarındaki kurallar gibi ("TCKN 11 hane, telefon 05 ile başlar").
**Regex** (düzenli ifade / regular expression / kalıp) ise bir metin kalıbı
dili — kâğıdın üstüne konan **şablon**: harfler deliklerden geçiyorsa uyar;
şekle bakar, **anlama** bakmaz. Regex Zod'un alternatifi değil, içindeki
araçlardan biridir (`.regex()`); Zod'un `.email()` kuralı bile perde arkasında
Zod ekibinin bakımını yaptığı bir regex'tir.

| Sıra | Araç | Ne zaman | Örnek |
|---|---|---|---|
| 1 | **Hazır kural** | Zod'da varsa **hep önce** — test edilmiş, bakımı Zod'da | `.email()` `.url()` `.uuid()` `.min()` `.max()` `.datetime()` `z.enum([...])` `.int().positive()` |
| 2 | **`.regex()`** | Hazır kural yok, kural **şekilsel** | TCKN 11 rakam `/^[1-9]\d{10}$/`, plaka, posta kodu |
| 3 | **`.refine()` / `.superRefine()`** | Kural **mantıksal**, şekille anlatılamaz | TCKN kontrol hanesi (10. ve 11. hane ötekilerden hesaplanır) · "bitiş tarihi başlangıçtan sonra" · "iki alandan en az biri dolu" |
| 4 | **Özel kütüphane** | Kural bir alanın bütün dünyası | Telefon için `libphonenumber-js` — `00-stack.md` yaygınlık ölçütünden geçerse |

*Gerçek hayat:* IBAN'ı gişeye verirsin; gişe önce **uzunluğuna** bakar
(şablon = regex), sonra **kontrol hanelerini hesaplar** (kural = refine).
Uzunluk doğru ama hane tutmuyorsa IBAN yanlıştır — şablon bunu göremez.

```ts
export const TcknSchema = z
  .string()
  .max(11)                                                          // önce uzunluk sınırı — regex'ten ÖNCE, aşağıdaki ReDoS notu
  .regex(/^[1-9]\d{10}$/, "TCKN 11 haneli olmalı, 0 ile başlayamaz")  // şekil
  .refine(isValidTcknChecksum, "Geçersiz TCKN");                    // mantık: hane hesabı
```

⛔ **İki regex tuzağı:**

| Tuzak | Ne olur | Kural |
|---|---|---|
| **ReDoS** (regular expression denial of service) | Kötü yazılmış regex — iç içe tekrar, `(a+)+$` gibi — özel bir girdiyle saniyeler/dakikalar sürer, sunucuyu kilitler | Regex kısa, **başı ve sonu bağlı** (`^…$`), iç içe `+`/`*` yok. `.max()` **regex'ten önce** — Zod kuralları sırayla çalışır, uzun girdi regex'e hiç ulaşmaz |
| **Türkçe harf** | `\w` yalnızca ASCII tanır — "Çağla" `\w+` kalıbına **uymaz**, kullanıcı sessizce reddedilir | Harf gerekiyorsa `\p{L}` (Unicode harf sınıfı) + `u` bayrağı: `/^[\p{L} ]+$/u` |

⭐ Şema **tek yerde** yazılır, tarayıcı formu (React Hook Form) ve sunucu aynı
şemayı kullanır (`01-architecture.md` → *"Klasör yapısı — özellik bazlı"* →
`features/<özellik>/schemas/`; ayrı backend varsa `packages/contracts`). Tarayıcıdaki doğrulama kullanıcıya anında
hata göstermek içindir; **güvenlik sunucudakidir** — tarayıcı atlatılabilir.

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
### ⭐ Offset mü cursor mu — KARAR TABLOSU

⛔ **Bu karar her projede yeniden türetilmez.** Tabloya bak, seç, gerekçeyi yaz.

| Durumdan **biri** varsa | Yöntem |
|---|---|
| Ekranda **sayfa numarası** var ("Sayfa 7") | **offset** |
| **Toplam sayı** gösteriliyor ("48 kayıttan 1–20") | **offset** |
| Kullanıcı filtreleyip daraltıyor, derine inmiyor | **offset** |
| **Sonsuz kaydırma** (aşağı indikçe yükleniyor) | **cursor** |
| Liste **sürekli akıyor** (bildirim, olay günlüğü, akış) | ⛔ **cursor** |
| Tablo büyük **ve** derin sayfalama gerçekten oluyor | **cursor** |
| Dışa aktarma / toplu okuma (tüm kayıtları gez) | **cursor** |

**Neden böyle — iki teknik sebep:**

1. **Derin sayfa maliyeti.** `OFFSET 99980` demek, veritabanının o 99.980
   satırı **okuyup atması** demektir. Atlanan satır bedava değildir; 5.000.
   sayfa saniyelere çıkar. Cursor'da 1. sayfa ile 5.000. sayfa **aynı hızdadır**
   — ikisi de "şu noktadan sonraki N kayıt" sorusudur.
2. **Kayma (drift).** Kullanıcı 2. sayfaya bakarken listenin başına yeni kayıt
   girerse her şey bir sıra kayar: bir kaydı **iki kez** görür, bir kaydı
   **hiç** görmez. Cursor bir kaydı işaret ettiği için bundan etkilenmez.

**Cursor'ın bedeli:** *"7. sayfaya git"* diyemezsin ve toplam sayfa sayısını
gösteremezsin. Yalnızca ileri/geri gider.

⚠️ **Offset seçildiyse iki koruma zorunludur:** `limit` tavanı **ve** sayfa
parametresi doğrulaması. Aksi hâlde `?page=999999` isteği veritabanını
milyonlarca satır taramaya zorlar.

⭐ Seçim **gerekçesiyle** `docs/api.md` veya ADR'ye yazılır.

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

**Tek belgeleme istisnası:** taklit edilen dış servis uçları (`/api/mock-*`)
belgelenmez. *Gerekçe:* o uçların sözleşmesi **bizim değil**, taklit edilen
kurumundur; belgelemek başkasının API'sini kendi sözleşmemiz gibi ilan etmek
olur. Ayrıca gerçek servise bağlanıldığı gün o uçlar silinir — belgesi de
onlarla gider. Bu istisna yalnızca dış kurum taklidi için geçerlidir;
uygulamanın kendi uçlarına genişletilemez ve karar ADR'ye yazılır.

### Yanıt gövdesi de belgelenir — ve şema TELDEN doğrulanır

İstek tarafını belgelemek yetmez. Bir uç yayına girdiğinde sözleşmesi iki
yönlüdür: ne kabul ettiği **ve ne döndürdüğü**. Yanıt tarafı belgelenmezse
tüketici, gövdenin içini ancak deneyerek öğrenir.

⛔ **YANIT SÖZLEŞMESİ YALNIZCA TİP SİSTEMİYLE BELGELENEMEZ — TİP JSON'A HAYATTA
KALMAZ.** `Date` alanı derlemede `Date`, telde ISO **metindir**; `Decimal`
nesnesi telde metin; değeri `undefined` olan alan telde **hiç yoktur**. Yani
derleme yeşilken belge yanlış olabilir ve bunu hiçbir derleyici göremez.

Bu yüzden yanıt şeması üç ayrı yere bağlanır ve **her biri farklı bir hatayı**
yakalar:

| Bağ | Nerede | Yakaladığı hata |
|---|---|---|
| Derleme anı | Yanıt yardımcısı şemayı `ZodType<T>` olarak alır | Yanıta alan eklenip şemanın unutulması |
| Çalışma anı | Gövde, **telden geçmiş hâliyle** şemadan geçirilir | Tipin göremediği biçim farkları (`Date`, `Decimal`, `undefined`) |
| CI | Belgedeki şema ile ucun kullandığı şema karşılaştırılır | Belgenin A'yı gösterip ucun B ile çalışması |

**Çalışma anı kontrolü production'da KAPALIDIR.** Şema uyuşmazlığı belgenin
hatasıdır, kullanıcının değil — canlıda açık olsaydı yanlış yazılmış bir şema
çalışan bir ucu `500`'e çevirirdi. Ortam değişkeni yanlış ortamda verilirse
uygulama açılmaz.

⚠️ **Yanıt şeması `.transform()` taşımaz** ve belgeye **girdi (`io: "input"`)
biçimiyle basılır. Çıktı biçimi kullanılamaz:** çıktı modu JSON Schema'ya
`additionalProperties: false` ekler, yani belge "yanıta fazladan alan konamaz"
der — oysa yanıta alan eklemek yukarıda **kırıcı olmayan** değişiklik sayılıyor.
Çıktı biçimiyle basılan bir belge, kendi uyumluluk kuralıyla çelişir.

⛔ **PARA ALANI YANIT ŞEMASINDA `z.int()` OLUR, `z.number()` DEĞİL — ve bu bir
CI kapısıdır.** İkisi derlemede aynı tiptir (`number`); fark yalnızca belgede
çıkar: `z.number()` JSON Schema'ya `"type": "number"` yazar, yani *"ondalık
olabilir"*. Belgeden tip üreten bir istemci (mobil uygulama, başka bir ekip)
`45900` kuruşu `45.900` lira sanabilir — ya da tersine, tutarı ondalık gönderir.
`z.int()` ise `"type": "integer"` yazar ve tek yorum kalır. Kural yorumda değil
kapıda yaşar: belgeye giren her yanıt şemasında adı para ekini (`…Kurus`,
`…Cents`) taşıyan alan `integer` olmak zorundadır; kapı **hiç para alanı
bulamazsa da kırmızıya döner** — ölçmeyen kapı, kapı değildir. Tek bir
paylaşılan para şeması (`kurusSchema`) hem tekrarı hem sapmayı önler.

⛔ **İÇ İÇE BİR GÖVDE `Date` TAŞIYORSA ROUTE'TA SATIR İÇİ `toISOString()`
YETMEZ — AÇIK BİR ÇEVİRMEN YAZILIR VE ALANLAR TEK TEK SAYILIR.** Tel biçimi
(`string`) ile uygulama içi biçim (`Date`) ayrı tiplerdir; derleme kapısı
(`ZodType<T>`) ikisini aynı saymaz ve şemayı gevşetmek yanlış çözümdür. Doğru
çözüm, uygulama içi nesneyi tel biçimine çeviren küçük bir fonksiyondur. O
fonksiyonda `...spread` **kullanılmaz:** çalışma anı kontrolü fazladan alanı
bilerek reddetmediği için (yanıta alan eklemek kırıcı değildir), spread ile
taşınan iç bir alan (maliyet, tedarikçi kodu…) belgeye yazılmadan API'ye
**sızar** ve hiçbir kapı görmez. Alanlar tek tek sayılınca yeni bir alan ancak
biri bilerek hem şemaya hem çevirmene yazınca dışarı çıkar. Bu iddia bir
**sızıntı deneyiyle** test edilir: fazladan alan taşıyan bir nesne verilir,
çıktıda olmadığı doğrulanır; çevirmen spread'e çevrilirse test kırmızıya döner.

### Sözleşme borcu, CI'ın okuduğu ve yalnızca KÜÇÜLEN bir listeyle kapatılır

Var olan bir API'ye sözleşme kapısı eklemek çoğu zaman onlarca uca dokunmayı
gerektirir ve tek adıma sığmaz. İş bölünürken kalan uçlar **yorum satırına
değil, kodda duran ve testin okuduğu bir listeye** yazılır. Liste üç şartı
sağlamak zorunda:

1. Listede olmayan bir uç sözleşmesini beyan etmek **zorundadır** (CI kapısı)
2. Liste **yalnızca küçülebilir** — yeni bir uç eklenemez, çözülen uç listede kalamaz
3. Kalan iş **belgede de görünür** — "bu ucun şeması henüz yazılmadı" uyarısı basılır

⛔ Bu üç şart olmadan liste bir kaçış kapısına dönüşür: şema yazmak yerine adı
listeye eklemek kolaylaşır ve borç hiç kapanmaz.

## İdempotency — tekrar edilemez her yazma için anahtar

**İdempotent / idempotency / tekrar-güvenli:** aynı işlemi iki kez yapmanın
bir kez yapmakla aynı sonucu vermesi. *Gerçek hayat:* asansör düğmesi — beş
kez basınca beş asansör gelmez. Dilekçe vermek idempotent **değildir**: iki
kez verirsen iki dilekçe açılır. Okuma (GET) doğal olarak idempotent; "oluştur"
(POST) değil.

**Sorun:** cevap ağda kayboldu, kullanıcı tekrar bastı — ya da çift tıkladı.
Giriş için zararsız; başvuru gönderimi için **ikinci başvuru**, ödeme için
**ikinci tahsilat**. ⛔ Kural yalnızca ödeme için değil, **tekrar edilemez her
yazma** için: başvuru, randevu, mesaj, sipariş, ödeme.

**Çözüm — idempotency anahtarı (`Idempotency-Key`):**

| Taraf | Ne yapar |
|---|---|
| İstemci | Formu **açtığında** rastgele anahtar üretir (UUID); her göndermede `Idempotency-Key` başlığıyla yollar; başarısız tekrar **aynı anahtarla** gider; form başarıyla bitince yeni anahtar |
| Sunucu | `idempotency_keys(key, user_id, response_status, response_body, created_at)` tablosu. Anahtar daha önce görüldüyse işlemi **yeniden yapmaz**, kaydedilmiş cevabı aynen döner; görülmediyse işler ve cevabı **aynı transaction'da** kaydeder. 24 saat sonra temizlenir |
| Yarış | Aynı anahtarla iki istek **aynı anda** gelirse `key` üzerindeki unique index ikincisini durdurur; ikincisi bekler ve ilkinin cevabını döner |

*Gerçek hayat:* evrak kayıt numarası — aynı numarayla ikinci kez gelen
dilekçe "zaten kayıtlı, işte numaran" diye geri döner; ikinci dosya açılmaz.

**İstemci yeniden deneme politikası** (`07-ui-design-system.md` → yazma
durumları ile birlikte):

| İstek | Zaman aşımı | Otomatik yeniden deneme |
|---|---|---|
| Okuma (GET) | 10 sn | TanStack Query `retry: 3`, üstel bekleme (1 · 2 · 4 sn) |
| Yazma (POST/PATCH/DELETE) | 10 sn | ⛔ `retry: 0` — kullanıcı düğmeye **kendisi** basar, aynı anahtar gider; sessiz tekrar çift kayıt riskidir |
| `429` | — | `Retry-After` başlığına uyulur; öncesinde denenmez |
| `5xx` | — | Okumada yeniden dene; yazmada kullanıcıya "tekrar deneyin" |

Kuyruk işleri de idempotenttir: iş verisinde mesaj kimliği taşınır, worker
aynı kimlikle ikinci kez göndermez (`00-stack.md` → *"Kuyruğa ne zaman
atılır"* — outbox işi iki kez gönderebilir).

⭐ **Kararı veren soru:** *"Bu istek iki kez işlenirse dünya değişir mi?"*
Değişir → anahtar; değişmez → gerek yok.

## Diğer
- Uzun işlemler senkron beklemez.
