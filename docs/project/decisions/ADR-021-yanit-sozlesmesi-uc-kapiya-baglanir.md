# ADR-021 — Yanıt sözleşmesi tek bir şemayla tanımlanır ve üç ayrı kapıya bağlanır

**Tarih:** 2026-08-13
**Durum:** Kabul edildi
**İlgili:** ADR-019 (API belgesi Zod'dan türetilir) · ADR-020 (sürüm yol segmentinde) ·
teknik borç #107 · adım 19 (Expo mobil) ·
`docs/standards/03-api-guidelines.md` → "Yanıt gövdesi de belgelenir"

## Bağlam

ADR-019 belgeyi **elle yazmayı yasakladı**: istek tarafı, ucun fiilen doğrulama
yaptığı Zod şemasından türetiliyor. Gerekçesi tek cümleydi — *gerçeğe bağlı
olmayan ikinci bir kaynak sessizce sapar ve yanlış belge, belgesizlikten
kötüdür.*

Adım 18b'de o kural yalnızca **yarısına** uygulanabildi ve eksik kalan yarısı
borç #107 olarak yazıldı. Belge, başarılı yanıtın **zarfını** (`{ data }`) ve
`data` alanının Türkçe bir tarifini gösteriyordu; içinde hangi alanların
olduğunu **göstermiyordu**. Sebebi teknikti: `ok<T>()` jenerik, `T` route'tan
geliyor ve çalışma anında okunamıyor.

Bugüne kadar bunun bedeli sınırlıydı, çünkü tek tüketici web arayüzüydü ve
yanıt biçimine **TypeScript tipleriyle derleme anında** bağlıydı. Adım 19'da
(Expo mobil) bu bağ ortadan kalkıyor: istemci ayrı bir derleme birimi olacak ve
yanıt sözleşmesinin **tek kaydı belge** olacak.

ADR-020 sözleşmenin **adresini** sabitledi (`/api/v1/…`). Bu ADR **içeriğini**
sabitliyor.

## Karar 1 — Yanıt şeması kütüğe elle yazılmaz; ucun kullandığı şemanın AYNISI olur

Kütükteki `success.body.schema`, route'un `ok()` / `created()` çağrısında
verdiği şemayla **aynı nesnedir**. İkinci bir tarif üretilmez.

⛔ **Reddedilen alternatif:** kütüğe yanıtın biçimini elle yazmak. Kısa yoldu ve
tam olarak ADR-019'un yasakladığı şeydi — gerçeğe bağlı olmayan, sapması hiçbir
yerde yakalanmayan bir iddia.

## Karar 2 — Bağ üç ayrı kapıya kurulur, çünkü tek kapı yetmez

| Kapı | Nerede | Yakaladığı hata | Neden tek başına yetmez |
|---|---|---|---|
| Derleme anı | `ok(data, { schema })` → `ZodType<T>` | Yanıta alan eklenip şemanın unutulması | **Tip JSON'a hayatta kalmaz** |
| Çalışma anı | `src/lib/api-response-contract.ts` | `Date`/`Decimal`/`undefined` gibi biçim farkları | Yalnızca çalıştırılan uçları görür |
| CI (statik) | `tests/unit/api-docs-response.test.ts` | Belgenin A'yı gösterip ucun B ile çalışması | Nesne kimliğini değil, kaynak metnini ölçer |

⛔ **KARARIN ÖZÜ, İKİNCİ SATIRDIR: YANIT SÖZLEŞMESİ TİP SİSTEMİYLE
BELGELENEMEZ.** `Date` alanı derlemede `Date`, telde ISO **metindir**;
`undefined` değerli alan telde **hiç yoktur**. Yalnızca tip bağına
güvenilseydi belge tam da bu alanlarda yanlış olurdu ve hiçbir derleme bunu
göremezdi. Bu yüzden çalışma anı kontrolü gövdeyi `JSON.parse(JSON.stringify(…))`
ile **telden geçmiş hâline** çevirip öyle doğruluyor.

### Çalışma anı kontrolü production'da AÇILAMAZ

Şema uyuşmazlığı **belgenin** hatasıdır, kullanıcının değil. Canlıda açık
olsaydı yanlış yazılmış tek bir şema, çalışan bir ucu gerçek kullanıcıya `500`
döndürürdü. Bayrak production'da verilirse **uygulama açılmaz**
(`src/config/env.ts` tutarlılık kuralı) — kural yorumda bırakılmadı.

### ⛔ Bayrak `NODE_ENV`'e bağlanmadı — ölçülerek

İlk tasarım `NODE_ENV !== "production"` idi. `playwright.config.ts` sunucuyu
`next build && next start` ile kaldırıyor, yani **E2E production modunda
koşuyor**: kontrol, gerçek tarayıcıdan geçen her yanıtta — yani en çok işe
yarayacağı yerde — **sessizce kapalı** kalacaktı.

Bayrak bu yüzden kendi ortam değişkeni (`API_RESPONSE_CONTRACT_CHECK`) ve E2E
ile vitest yapılandırmalarında açıkça veriliyor. Kazanç büyük: mevcut 841 birim
ve 342 E2E testinin tamamı, ek bir test yazılmadan yanıt sözleşmesi
denetleyicisine dönüşüyor.

⚠️ İkinci bir tuzak da ölçülerek bulundu: kontrol bayrağı önce `serverEnv`'den
okunuyordu. `serverEnv` tarayıcıda **bilerek** istisna fırlatıyor (gizli değer
koruması) ve bu modül her yerden içe aktarılabiliyor — `jsdom` ortamındaki 5
entegrasyon testi kırmızıya döndü. Teşhis aracının kendisi arıza kaynağı
olmuştu. Bayrak artık doğrudan `process.env`'den okunuyor; doğrulaması ve
production yasağı merkezî şemada duruyor.

## Karar 3 — Belge `io: "input"` biçimiyle basılır, `io: "output"` ile değil

Zod, `io: "output"` modunda JSON Schema'ya `additionalProperties: false`
ekliyor. Belge o biçimle basılsaydı "yanıta fazladan alan **konamaz**" derdi —
oysa `03-api-guidelines.md` yanıta alan eklemeyi açıkça **kırıcı olmayan**
değişiklik sayıyor. Yani çıktı modu, projenin kendi uyumluluk kuralıyla çelişen
bir belge üretirdi.

Bunun sonucu olarak **yanıt şemaları `.transform()` taşıyamaz** (girdi ile
çıktı ayrışmasın diye) ve bu bir test kapısıyla ölçülüyor.

## Karar 4 — Sözleşmesi bu projede olmayan gövde için dürüst bir sınır tanınır

`/api/docs` bir **OpenAPI 3.1 belgesi** döndürüyor; o gövdenin sözleşmesi bu
projede değil, standardın kendisinde tanımlı. Ona Zod şeması yazmak standardın
eksik bir kopyasını üretirdi ve o kopya sapardı.

Bu tek uç `externalContract` ile işaretleniyor ve **gerekçe metni zorunlu**
(kapı boş dizeyi kabul etmiyor). Bağ ortadan kalkmıyor, yalnızca farklı ve daha
güçlü: belge her doğrulamada bağımsız bir OpenAPI doğrulayıcısından
(`@redocly/cli lint`) geçiyor.

## Karar 5 — İş 107a-d olarak bölünür; kalan uçlar CI'ın okuduğu bir listede durur

Gövdeli 29 ucun hepsine tek adımda dokunmak CLAUDE.md §7'yi ("aynı anda birden
fazla feature'a dokunma") çiğnerdi. Kalan uçlar
`RESPONSE_BODY_PENDING` listesinde duruyor ve liste üç şarta bağlı:

1. Listede olmayan gövdeli uç şema beyan etmek **zorunda**
2. Liste **yalnızca küçülebilir** — yeni uç eklenemez, çözülen uç listede kalamaz
3. Kalan iş **belgede de görünür** — o uçların yanıtında "şeması henüz
   belgelenmedi" uyarısı basılıyor

⛔ Bu üç şart olmadan liste bir kaçış kapısına dönüşürdü: şema yazmak yerine adı
listeye eklemek kolaylaşır ve borç hiç kapanmazdı. 107d bittiğinde liste boşalır
ve sabit silinir.

## Reddedilen seçenekler

| Seçenek | Neden reddedildi |
|---|---|
| Yanıt biçimini kütüğe elle yazmak | ADR-019'un yasağı: gerçeğe bağlı olmayan, sessizce sapan ikinci kaynak |
| Yalnızca TypeScript tip bağı | Tip JSON'a hayatta kalmıyor — `Date`, `Decimal`, `undefined` sessizce yanlış belgelenirdi |
| Production'da da çalışma anı doğrulaması | Belgenin hatası kullanıcıya `500` olarak yansırdı; ayrıca her yanıta ölçülmemiş bir maliyet eklerdi |
| Kontrolü `NODE_ENV`'e bağlamak | E2E production modunda koşuyor — kapı en çok gerektiği yerde sessizce kapanırdı (ölçüldü) |
| Uyuşmazlıkta log'layıp devam etmek | Kırmızıya dönmeyen kapı kapı değildir; satır CI çıktısında kaybolur ve sapma aylarca yaşar |
| 29 ucu tek adımda taşımak | CLAUDE.md §7 ihlali; `main`'in tek adımda deploy edilebilir kalması riske girerdi |

## Sonuçlar

**Kazanılan:**
- Yanıt sözleşmesi belgede **gerçek şemayla** görünüyor; mobil istemci (adım 19)
  için tek kayıt hazır
- Var olan 841 birim + 342 E2E testi, ek test yazılmadan sözleşme denetleyicisi oldu
- Kalan iş gizli değil: hem CI'da hem yayınlanan belgede sayılabilir

**Kabul edilen bedel:**
- Kütük ile route arasındaki kapı **kaynak metnini** karşılaştırıyor, nesne
  kimliğini değil. Aynı adı taşıyan iki farklı şema import edilirse kapı bunu
  göremez. Nesne kimliğiyle ölçmek route modülünü teste almayı, o da `prisma` ve
  ortam doğrulamasını içeri çekmeyi gerektirirdi. Sınır **yazılı**.
- Yanıt şemaları `.transform()` kullanamıyor.
- 107b-d bitene kadar belgenin bir kısmı "şeması henüz yazılmadı" uyarısı taşıyor.
