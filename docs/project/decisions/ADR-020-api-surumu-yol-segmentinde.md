# ADR-020 — API sürümü yol segmentinde taşınır; adresi dışarıda sabitlenmiş uçlar sürümlenmez

**Tarih:** 2026-08-13
**Durum:** Kabul edildi
**İlgili:** ADR-019 (API belgesi) · ADR-003 / ADR-009 (sahte KPS) · teknik borç #103, #107 ·
`docs/standards/03-api-guidelines.md` → "Sözleşme ömrü"

## Bağlam

`03-api-guidelines.md` bir ucun yayına girdiği anda **sözleşmeye** dönüştüğünü ve
kırıcı değişikliğin yeni bir sürümle yapılması gerektiğini zaten yazıyordu. Kural
yazılıydı; **uygulaması yoktu.** Adım 18b'de ölçüldü ve borç #103 açıldı: uçlar
`/api/<kaynak>` biçimindeydi, sürüm segmenti yoktu ve `Deprecation` / `Sunset`
başlıkları kaynak ağacında **hiç** geçmiyordu.

Bugüne kadar bunun bedeli sıfırdı ve bu bilinçliydi: API'nin tek tüketicisi kendi
web arayüzümüz ve o, sunucuyla **aynı deploy'da** güncelleniyor. Sözleşmeyi bozmak
tek bir commit'le düzelen bir iş.

**Adım 19 (Expo mobil uygulama) bu dengeyi tersine çeviriyor.** O günden itibaren
istemcinin bir kısmı kullanıcının telefonunda yaşayacak ve **güncellenmesi bizim
elimizde olmayacak**. Kaldırılan ya da biçimi değişen her uç, güncellemeyi almamış
herkes için uygulamanın çökmesi demektir. Bu yüzden karar mobilden **önce**
alınmak zorunda.

⭐ Bu aynı zamanda kararın **en ucuz** olduğu an: bugün tek tüketici var ve o
bizimle aynı deploy'da. Yarın iki tüketici olacak ve biri geri alınamaz.

## Karar 1 — Sürüm **yol segmentinde** taşınır: `/api/v1/<kaynak>`

Başlık tabanlı (`Accept-Version: 1`) ve medya tipi tabanlı sürümleme
**reddedildi.**

### Neden — kaynak

[GOV.UK API teknik standardı](https://www.gov.uk/guidance/gds-api-technical-and-data-standards),
yani kamu sektörü için yazılmış bir standart, iki cümleyle karar veriyor:

> "If you cannot keep older versions working you should expose a new version of
> your API by adding the version number into the URI, for example
> `https://myapi.service.gov.uk/v1`."

> "Other ways to version an API include using a custom header or defining a custom
> media type. **Avoid these approaches** because they can lead to your API being
> blocked by proxies or firewalls."

Sektör pratiği de aynı yeri gösteriyor ve ayrımı net koyuyor: **tüketicisini
kontrol edebiliyorsan** (yalnızca kendi servislerin) başlık tabanlı sürümleme
kabul edilebilir; **kontrol edemediğin bir tüketici varsa** yol segmenti. Mobil
uygulama tanım gereği kontrol edilemeyen tüketicidir.

### Bu projeye özel dört gerekçe

| Gerekçe | Ölçülen karşılığı |
|---|---|
| **Hata gürültülü olur** | Eski telefon yanlış sürüme giderse `404` alır. Başlık tabanlıda başlığı göndermeyen istemci `200` + **yanlış sürüm** alır — sessiz ve teşhis edilemez |
| **Sürüm = klasör** | Next App Router'da `v2` hiç dallanma kodu yazmadan `v1`'in yanına konur. Başlık tabanlıda aynı dallanma **36 route'a** ayrı ayrı yazılırdı |
| **Kullanım ÖLÇÜLEBİLİR** | Standardın 4. adımı "trafiği sıfırlanmadan uç kapatılmaz" diyor. Yol, erişim log'unda ve Vercel panelinde zaten var; başlık ayrıca log'lanmalıydı |
| **Ara katmanlar yolu anlar** | CDN, güvenlik duvarı ve proxy sürüm başına önbellek ve yönlendirme yapabilir; özel başlığı çoğu tanımaz (GOV.UK'in "engellenebilir" uyarısı) |

### Eski adresler takma ad olarak BIRAKILMADI

`/api/<kaynak>` adresleri geriye dönük alias olarak tutulmadı. Bugün o adresleri
çağıran tek şey kendi arayüzümüz ve o aynı commit'te güncelleniyor — yani takma
ad **hiç kimseyi korumaz**, yalnızca iki adresli bir yüzey ve sapan bir belge
üretirdi. Temiz kesmenin bedava olduğu tek an bu an.

## Karar 2 — Adresi bizim dışımızda sabitlenmiş uçlar sürümlenmez

Sürümleme, **istemcimizle aramızdaki sözleşmeyi** korumak içindir. Bir ucun
adresini bizim dışımızda biri sabitlemişse, o adres bir sözleşme değil bir
**kayıt**tır ve taşınması sözleşmeyi korumaz, aksine çalışan bir şeyi kırar.

**Kural:** *Adresini bizim dışımızda biri sabitlemişse sürümlenmez.*

| Sürümsüz kalan uç | Adresi kim sabitlemiş |
|---|---|
| `GET /api/health` | İzleme araçları, duman testi, `README.md`, `CLAUDE.md` §5.9 ("her projede `GET /api/health` bulunur") |
| `GET /api/cron/daily` | `vercel.json` → `crons[].path`. ⛔ Taşımak görevi **sessizce** durdururdu: hata üretmez, yalnızca hiç çalışmaz |
| `GET /api/docs` | Belgenin kendisi; OpenAPI araçları belgeyi kökte arar (ADR-019) |
| `GET /api/auth/google/callback` | ⛔ **Google Cloud Console → Authorized redirect URIs.** `altyapi-durumu.md`'de üç adres kayıtlı. Taşımak canlı Google girişini `redirect_uri_mismatch` ile kırar ve düzeltmesi bizde değil panelde |
| `* /api/mock-kps/identity-queries` | Bir **üçüncü tarafın** (KPS) API'sini taklit ediyor (ADR-003 · ADR-009). Başkasının sözleşmesini bizim sürüm numaramızla etiketlemek yanlış bir iddia olurdu |

Kalan **36 uç** `/api/v1/` altına taşındı.

⚠️ **`/api/auth/google` (akışı başlatan uç) taşındı, `callback` taşınmadı.** Kural
harfiyen uygulandı: Google yalnızca `callback` adresini biliyor, başlangıç ucunu
bilmiyor. İstisnayı "auth ile ilgili" diye genişletmek kuralı ölçülemez hâle
getirirdi.

## Karar 3 — Emeklilik `Deprecation` + `Sunset` + `Link` ile bildirilir

Standardın 2. adımı için mekanizma yazıldı (`src/lib/api-deprecation.ts`):

```
Deprecation: @1788220799
Sunset: Sun, 01 Mar 2026 23:59:59 GMT
Link: </api/v2/appointments>; rel="successor-version"
```

- `Deprecation` — [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745.html). ⚠️ Bir
  **Structured Field Date**'tir, HTTP-date değil: değeri `@<unix-saniye>` biçiminde
  yazılır. Bu, RFC okunmadan **kesinlikle tahmin edilemeyecek** bir ayrıntı ve
  mekanizmanın bugün yazılmasının asıl sebebi
- `Sunset` — [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html), HTTP-date
- RFC 9745 `Sunset`in `Deprecation`dan **önce olamayacağını** şart koşuyor; bu
  fonksiyonun içinde doğrulanıyor ve ihlâlde hata fırlatıyor

⚠️ **Bu mekanizmanın bugün üretimde çağıranı YOKTUR** ve bu açıkça yazılıyor:
henüz emekliye ayrılan bir uç yok. Doğruluğu birim testleriyle kanıtlanıyor,
"kullanılıyor" diye raporlanmıyor.

## Reddedilen seçenekler

| Seçenek | Neden reddedildi |
|---|---|
| Başlık tabanlı sürümleme (`Accept-Version`) | GOV.UK açıkça "kaçının" diyor (proxy/firewall engeli). Ayrıca başlığı unutan istemci **sessizce** yanlış sürüm alır; 36 route'a elle dallanma gerekirdi |
| Medya tipi sürümleme (`application/vnd.…+json`) | Aynı gerekçeler, üstüne araç desteği daha zayıf ve `curl` ile denenmesi zor |
| Hiç sürümlememek, "asla kırma" politikası | Kaçış kapısı bırakmıyor: sözleşme yanlış tasarlandığında uç **adları** çoğalır (`/appointments-2`) ve sonuç sürüm segmentinden çirkin bir yere gider |
| Sürümlemeyi mobil geldiği gün yapmak | O gün iki tüketici olacak ve biri geri alınamaz. Bugün 36 dosya taşımak mekanik bir iş; yarın **kırıcı** bir iş |
| Tüm uçları istisnasız `/api/v1/` altına almak | `vercel.json` ve Google Cloud panelindeki kayıtları kırardı; ikisinin de düzeltmesi kodda değil **panelde**. `cron` hatası ayrıca sessiz olurdu |
| Eski adresleri takma ad olarak bırakmak | Koruyacağı bir tüketici yok; iki adresli yüzey ve sapan belge üretirdi |

## Sonuçlar

**Kazanılan**
- Mobil istemcinin bağlanacağı sözleşme artık adreste **görünür** ve yeni bir
  sürüm eski sürümü hiç değiştirmeden yanına konabilir
- Emeklilik başlıkları RFC'ye uygun, doğrulanmış ve test edilmiş bir mekanizma
- Yeni kapı: bir iş ucu `/api/v1/` dışında açılırsa CI kırmızıya döner
  (`tests/unit/api-versioning.test.ts`). Sürümsüz kalabilecek beş uç **isim
  isim** yazılı; listeye eklemek bilinçli bir hareket olmak zorunda

**Bedeli / bilinen sınırlar**
- 36 route dosyası ve onları çağıran istemci dosyaları tek seferde taşındı;
  değişiklik geniş ama mekanik ve sözleşme davranışı değişmedi
- Sürüm numarası bugün **tek** (`v1`). İkinci sürüm açılana kadar `Deprecation`
  mekanizmasının üretimde çağıranı olmayacak
- Yanıt gövdelerinin şeması hâlâ belgelenmedi (borç **#107**) — sürüm segmenti
  sözleşmenin **adresini** sabitler, **içeriğini** değil. #107 bu ADR'nin
  tamamlayıcısıdır ve mobilden önce ödenir
