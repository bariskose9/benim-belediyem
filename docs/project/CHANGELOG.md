# Değişiklik Günlüğü

Format: [Keep a Changelog](https://keepachangelog.com/tr/) · Sürümleme: SemVer

## [Yayınlanmamış]

### Eklendi — yanıt gövdeleri gerçek Zod şemalarıyla belgeleniyor (teknik borç #107 · ADR-021)

- **Belge artık `data`'nın İÇİNİ de gösteriyor.** Önceki hâl yalnızca zarfı
  (`{ data }`) ve Türkçe bir cümleyi belgeliyordu; istemci gövdenin ne
  taşıdığını ancak deneyerek öğrenebilirdi
- **Neden şimdi:** bugüne kadar tek tüketici web arayüzüydü ve yanıt biçimine
  **TypeScript tipleriyle derleme anında** bağlıydı. Adım 19'da (Expo mobil) o
  bağ ortadan kalkıyor ve yanıt sözleşmesinin **tek kaydı belge** olacak.
  ADR-020 sözleşmenin **adresini** sabitledi; bu iş **içeriğini** sabitliyor
- ⛔ **Şema kütüğe elle yazılmıyor** — ucun `ok()`/`created()` çağrısında
  kullandığı şemanın AYNISI kütüğe giriyor. Elle yazılsaydı ADR-019'un
  yasakladığı şeyi üretirdik: gerçeğe bağlı olmayan, sessizce sapan ikinci kaynak
- ⭐ **BAĞ ÜÇ KAPIYA BİRDEN KURULDU, ÇÜNKÜ TEK KAPI YETMİYOR.** Derleme anı
  (`ZodType<T>` — yanıta alan eklenip şemanın unutulmasını yakalar) · çalışma
  anı (telden geçen gövde şemadan geçiriliyor) · CI (kütükteki şema ile route'un
  kullandığı şema karşılaştırılıyor)
- ⛔ **YANIT SÖZLEŞMESİ TİP SİSTEMİYLE BELGELENEMEZ ve sebebi ölçüldü:** tip
  JSON'a hayatta kalmıyor. `Date` alanı derlemede `Date`, telde ISO **metin**;
  değeri `undefined` olan alan telde **hiç yok**. Yalnızca tip bağına
  güvenilseydi belge tam da bu alanlarda yanlış olurdu ve hiçbir derleme bunu
  göremezdi. Bu yüzden gövde `JSON.parse(JSON.stringify(...))` ile telden
  geçmiş hâline çevrilip öyle doğrulanıyor
- ⛔ **KONTROL `NODE_ENV`'E BAĞLANMADI — ÖLÇÜLEREK.** `playwright.config.ts`
  sunucuyu `next build && next start` ile kaldırıyor, yani **E2E production
  modunda koşuyor**; `NODE_ENV !== "production"` koşulu kapıyı tam da en çok
  işe yarayacağı yerde SESSİZCE kapatırdı. Bayrak ayrı ve açık:
  `API_RESPONSE_CONTRACT_CHECK`. Kazanç büyük — mevcut **843 birim + 325 E2E**
  testi, tek satır test yazılmadan yanıt sözleşmesi denetleyicisine dönüştü
- ⛔ **Bayrak production'da AÇILAMIYOR** (`env.ts` tutarlılık kuralı): şema
  uyuşmazlığı **belgenin** hatasıdır, kullanıcının değil. Canlıda açık olsaydı
  yanlış yazılmış tek bir şema çalışan bir ucu `500`'e çevirirdi
- ⚠️ **Belge `io: "input"` ile basılıyor, `io: "output"` ile değil:** çıktı modu
  JSON Schema'ya `additionalProperties: false` ekliyor, yani belge "yanıta
  fazladan alan konamaz" derdi — oysa `03-api-guidelines.md` yanıta alan
  eklemeyi açıkça **kırıcı olmayan** değişiklik sayıyor. Çıktı biçimi projenin
  kendi uyumluluk kuralıyla çelişen bir belge üretirdi
- ⚠️ Kontrol bayrağı önce `serverEnv`'den okunuyordu; `serverEnv` tarayıcıda
  **bilerek** istisna fırlattığı için `jsdom` ortamındaki 5 entegrasyon testi
  kırmızıya döndü — teşhis aracının kendisi arıza kaynağı olmuştu. Bayrak artık
  doğrudan `process.env`'den okunuyor, doğrulaması merkezî şemada duruyor
- **`/api/docs` dürüst bir sınırla işaretlendi:** gövdesi bir OpenAPI 3.1
  belgesi ve sözleşmesi bu projede değil, standardın kendisinde. Ona Zod şeması
  yazmak standardın sapan bir kopyasını üretirdi; bağ zaten daha güçlü —
  belge her doğrulamada `@redocly/cli lint`'ten geçiyor

### Eklendi — kimlik doğrulama ve hesap uçlarının yanıt sözleşmeleri (borç #107 · 107b)

- **12 uç şemasını beyan ediyor:** oturum açma, kayıt akışının tamamı, şifre
  sıfırlama, kimlik ve personel doğrulaması
- ⭐ **BELGELEME BOŞLUĞU BULUNDU.** `POST /api/v1/registrations/current/verifications`
  iki farklı başarı döndürüyor: ilk kanal doğrulandığında `200` (hangisi tamam),
  ikincisi de bitince `201` (hesap açıldı). Kütük tek durum kodu tutabildiği
  için **`200` dalı bugüne kadar hiç belgelenmemişti** — istemci onu ancak
  deneyerek öğrenebilirdi. Kütüğe `alternateSuccess` eklendi; kaçış kapısı
  değil, çünkü oradaki her yanıt da şema beyan etmek zorunda ve durum kodları
  benzersiz olmalı (ikisi de test edildi)
- ⭐ **Şemalar gizlilik sınırını da belgeliyor** ve bu bir kazanç: kimlik
  özetinde `nationalIdMasked` **var**, `nationalId` **yok** · kimlik doğrulama
  yanıtı yalnızca ad soyad döndürüyor · şifre sıfırlama yanıtı hesabın var olup
  olmadığını **sızdırmıyor**, yani oraya bir alan eklemek artık görünür bir
  sözleşme değişikliği · `simulationCode` alanları "production'da HİÇ
  gönderilmez" notuyla belgede
- ⚠️ **`GET /api/v1/account/export` bilinçli olarak ertelendi.** Sebep klasörü
  değil sözleşmesinin türü: uç `ok()` kullanmıyor, `{ data }` zarfına sarmıyor
  ve gövdesi bugün `Record<string, unknown>` — tipi bile yok. Muhatabı bir API
  istemcisi değil, **tarayıcı indirmesi.** Aynı sınırı paylaşan destek eki
  ucuyla birlikte, kendi kararıyla ele alınacak
- **Kalan iş gizlenmiyor:** şeması yazılmamış 14 uç `RESPONSE_BODY_PENDING`
  listesinde ve liste **yalnızca küçülebiliyor** (yeni uç eklenemez, çözülen uç
  listede kalamaz). Bu uçların yanıtı belgede "şeması henüz belgelenmedi"
  uyarısı taşıyor — eksiklik belgeyi okuyan herkese görünür
- **10 mutasyon kırmızıya döndürüldü** (107a'da 6, 107b'de 4): yanlış gövde ·
  kütükten şema silme · route'ta farklı şema · çözülmüş ucu listeye ekleme ·
  olmayan ucu listeye yazma · şema tipini değiştirme (derleme kırıldı) · yanlış
  tip döndürme · ikinci yanıtın durum kodunu çakıştırma · ikinci yanıtın
  şemasını silme

### Değişti — API sürümleme: uçlar `/api/v1/` altına taşındı (teknik borç #103 · ADR-020)

- ⛔ **KIRICI DEĞİŞİKLİK — 36 iş ucunun adresi değişti.** `/api/<kaynak>` artık
  `/api/v1/<kaynak>`. Eski adresler takma ad olarak **bırakılmadı**: bugün o
  adresleri çağıran tek şey kendi arayüzümüz ve o aynı commit'te güncelleniyor,
  yani takma ad hiç kimseyi korumaz — yalnızca iki adresli bir yüzey üretirdi
- **Neden şimdi:** adım 19 (Expo mobil) başladığı gün istemcinin bir kısmı
  kullanıcının telefonunda yaşayacak ve **güncellenmesi bizim elimizde
  olmayacak.** Bu iş bugün mekanik, yarın kırıcı
- ⭐ **Karar ezberden `/v1/` eklemek DEĞİLDİ.** Kamu sektörü için yazılmış
  [GOV.UK API standardı](https://www.gov.uk/guidance/gds-api-technical-and-data-standards)
  sürümü URI'ye koymayı söylüyor ve başlık/medya tipi tabanlı sürümleme için
  açıkça *"avoid these approaches"* diyor — proxy ve güvenlik duvarları
  engelleyebiliyor. Ayrıca başlığı göndermeyi unutan istemci `200` + **yanlış
  sürüm** alır (sessiz); yanlış yola giden istemci `404` alır (gürültülü)
- **Beş uç bilinçli olarak sürümsüz kaldı** — ölçüt: *adresini bizim dışımızda
  biri sabitlemişse sürümlenmez.* `/api/health` (izleme + duman testi),
  `/api/cron/daily` (⛔ `vercel.json`'da sabit — taşımak görevi **sessizce**
  durdururdu), `/api/docs`, `/api/auth/google/callback` (⛔ Google Cloud
  panelinde üç adres kayıtlı; taşımak canlı girişi kırardı ve düzeltmesi kodda
  değil panelde), `/api/mock-kps/identity-queries` (bir **üçüncü tarafın**
  API'sini taklit ediyor)
- ⚠️ **`/api/auth/google` taşındı ama `callback` taşınmadı.** Kural harfiyen
  uygulandı: Google yalnızca callback adresini biliyor. İstisnayı "auth ile
  ilgili" diye genişletmek kuralı ölçülemez hâle getirirdi

### Eklendi — emeklilik başlıkları ve sürümleme kapısı

- **`src/lib/api-deprecation.ts`** — `Deprecation` + `Sunset` + `Link` üretir.
  ⚠️ **`Deprecation` bir HTTP-date DEĞİL:** RFC 9745 §2 onu Structured Field
  Date olarak tanımlıyor, değeri `@<unix-saniye>`. `Sunset` ise HTTP-date
  (RFC 8594). İkisini karıştırmak hiçbir yerde yakalanmayan sessiz bir hata
  olurdu — başlık yazılır, yanıt `200` döner, istemci okuyamaz. Bu yüzden ilk
  emeklilikten **önce** yazıldı
- ⚠️ **Bu mekanizmanın bugün üretimde çağıranı YOK** ve bu açıkça yazılı:
  `v1` tek sürüm, emekliye ayrılan uç yok. Doğruluğu 10 birim testiyle
  kanıtlanıyor, "kullanılıyor" diye raporlanmıyor
- **`tests/unit/api-versioning.test.ts`** (5 test) — bir iş ucu `/api/v1/`
  dışında açılırsa CI kırmızıya döner. ⭐ İstisnalar **gerekçelerine bağlandı:**
  cron yolu `vercel.json`'dan, callback adresi `GOOGLE_CALLBACK_PATH`'ten
  okunup karşılaştırılıyor — yoksa "adresi panelde kayıtlı" doğrulanmamış bir
  iddia olarak kalırdı
- **Üç mutasyon kırmızıya döndürüldü:** sürümsüz yeni uç eklendi → kırmızı;
  `Deprecation` HTTP-date'e çevrildi → kırmızı; `vercel.json` cron yolu
  sürümlendi → kırmızı

### Eklendi — adım 18d: Güvenlik denetimi raporu ve sıkı CSP (teknik borç #10, #78, #99, #110)

- **Güvenlik denetimi raporu** (`docs/project/guvenlik-denetimi-2026-08.md`):
  OWASP Top 10 madde madde, her biri **ölçülerek** denetlendi. Ölçülemeyen
  maddeler "iyi görünüyor" diye değil **"ölçülmedi"** diye yazıldı ve nedeni
  söylendi. Bilinen kritik/yüksek açık: **0**
- **Borç #10 ÖDENDİ — nonce tabanlı sıkı CSP.** Politika `next.config.ts`'ten
  `src/proxy.ts`'e taşındı (⚠️ Next.js 16'da ara katmanın adı `middleware`
  değil **`proxy`**) ve her istekte yeni bir nonce üretiyor.
  `script-src`'den **`'unsafe-inline'` kalktı** — enjekte edilen bir betik artık
  nonce'u bilemediği için çalışmıyor
- ⭐ **Korkulan bedel ölçüldü ve SIFIR çıktı.** Next belgesi nonce'un maliyetini
  "tüm sayfalar dinamik olur, statik render ve CDN önbelleği kaybolur" diye
  anlatıyor. Build çıktısı önce ve sonra ölçüldü: statik rota **3→3**, dinamik
  **77→77** değişmedi. Sebebi borç #84'te yazılı — kaybedilecek statik render
  zaten yoktu
- **Borç #78 ÖDENDİ — ve endişesi YANLIŞ çıktı.** Kayıt "resmî dokümandan
  bakılmadan karar verilmemeli" diyordu; bakıldı. Vercel `x-forwarded-for`'u
  **üzerine yazıyor** ve dış IP'leri iletmiyor (tam da IP sahteciliğini
  engellemek için), yani atlatma senaryosu mümkün değil. Kaydın önerdiği çözüm
  de etkisiz olurdu (`x-real-ip` belgede "identical" deniyor). Sıra yine de
  `x-vercel-forwarded-for` önce olacak şekilde değişti — bugünü değil **yarını**
  korumak için
- **Borç #99 ÖDENDİ — tedarik zinciri sabitlemesi.** 11/11 GitHub Action tam
  commit SHA'sına çevrildi, yanına okunabilir sürüm yorumu yazıldı. Major sürüm
  **bilerek yükseltilmedi**. ⚠️ Kaydın "`permissions:` bloğu eklenir" kısmı
  **zaten yapılmıştı** — gerçek iş kaydın söylediğinin yarısıydı
- ⛔ **Güvenlik başlıkları bugüne kadar HİÇ test edilmiyordu** (adım 4b'den beri
  yapılandırılmış, `tests/` altında tek eşleşme yok). **19 testlik kapı**
  eklendi (`tests/e2e/guvenlik-basliklari.spec.ts`); CSP altı ayrı yolda
  ölçülüyor, çünkü tek yol ölçmek `proxy.ts` matcher'ı daraltıldığında sessiz
  kalırdı. Ayrıca `tests/unit/workflows.test.ts` action sabitlemesini koruyor
- **Üç kapı da mutasyonla kanıtlandı:** `'unsafe-inline'` geri kondu → kırmızı;
  IP sırası bozuldu → kırmızı; bir action etikete çevrildi ve `permissions:`
  silindi → kırmızı
- **Borç #110 ÖDENDİ** — aşağıdaki üç eksik girdi **commit gövdelerinden ve
  roadmap satırlarından** üretildi, hatırdan değil

### Eklendi — adım 18b: Zod şemalarından türetilen OpenAPI belgesi (teknik borç #99-#107)

- 46 ucun tamamı belgelendi; istek sözleşmeleri **gerçek Zod şemalarından**
  türetiliyor, elle yazılmıyor — elle yazılan belge sapan ikinci bir kaynak olurdu
- **Yeni bağımlılık eklenmedi**: Zod 4'ün `toJSONSchema` dönüştürücüsü 42/42
  şemayı çeviriyor ("temsil edilemeyeni sessizce atla" seçeneği KAPALI ölçüldü)
- OpenAPI **3.1** seçildi çünkü JSON Schema 2020-12'yi olduğu gibi kullanıyor;
  3.0 her şemanın elle ve sessizce kayıplı çevrilmesini gerektirirdi
- CI'da **sapma kapıları**: rota listesi, hayalet rota, erişim seviyesi, hata kodları
- Belgelenen erişim seviyesi, kaynaktaki gerçek `requireAccess` çağrısına bağlandı —
  bir mutasyon, önceki testlerin yanlış etiketlenmiş bir uçla geçtiğini gösterdi
- Belge production'da **varsayılan kapalı** (403 değil 404); üretmek ile yayımlamak
  ayrı kararlar (ADR-019)
- Adım 18a'nın maskeleme süzgeci belge üzerinde bir gizlilik kapısı olarak yeniden kullanıldı

### Eklendi — adım 18a: Yapılandırılmış log ve hata takibi (teknik borç #79)

- JSON log altyapısı; 32 düz `console.error` çağrısı ona taşındı
- **Tek maskeleme süzgeci**: sunucu log'u ve Sentry aynı fonksiyondan geçiyor.
  Süzgeç hem alan adlarını hem **değer biçimlerini** yakalıyor (ORM hataları
  kişisel veriyi metnin içine gömüyor)
- **Borç #79 ödendi**: `fail()` artık ham Prisma hata sebeplerini loglamıyor
- Sentry aynı alan adı üzerinden tünelle bağlandı; **CSP'ye dokunulmadı**
- SDK'nın veri toplama varsayılanları kapatıldı: oturum tekrarı ve oturum takibi yok
- ESLint'te `console` tamamen yasaklandı — tek kapı logger
- Kök yerleşim çökerse boş sayfa kalmasın diye `global-error` sınırı eklendi

### Eklendi — adım 17c: Personel yetkisinin işveren kanalıyla doğrulanması

- ⛔ **`matchStaffMember` kaldırıldı: kimlik doğrulaması artık personel yetkisi
  VERMİYOR.** Kim olduğunu kanıtlamak, ne yapmaya yetkili olduğunu kanıtlamaz
- Yeni `staff-verification` özelliği: iki adımlı akış, kod `work_email` adresine
  gidiyor — yani yetkiyi işverenin kontrol ettiği kanal onaylıyor
- Onay, kodun **fiilen gönderildiği** hedefe bağlanıyor
- Bilinmeyen, ayrılmış ve daha önce sahiplenilmiş kayıtlar **aynı** cevabı alıyor
- Hız sınırı, gerçek/sahte dal ayrımından **önce** tüketiliyor
- `staff_verification` OTP amacı eklendi (geriye uyumlu enum değeri)

### Eklendi — adım 18c: Performans bütçesi ve erişilebilirlik kapıları (teknik borç #11, #84)

- **Üç bütçe artık CI'da FİİLEN ÖLÇÜLÜYOR.** `09-ci-cd-deploy.md` bunları
  yazılı olarak istiyordu ama ölçen hiçbir şey yoktu — ölçüm yoksa kapı da
  yoktur. Yeni `tests/quality/` klasörü ve ayrı bir `quality` Playwright
  projesi geldi; eşikler tek bir dosyada (`budget.ts`) ve her biri neden o
  değerde olduğunu yazıyor
- **`bundle-size`**: sayfanın ilk yükünde inen JS, **gzip hâliyle telden**
  ölçülüyor (`encodedBodySize`). `loadEventEnd`'den sonra gelen istekler
  sayılmıyor — onlar Next'in önden indirdiği BAŞKA sayfaların yükü
- **`lighthouse` yerine Playwright + Chrome protokolü**: LCP ve CLS gerçek
  Chrome'da, Lighthouse'un mobil laboratuvar profiliyle (4 kat CPU kısıtı +
  Yavaş 4G) ölçülüyor. ⭐ **Yeni paket GEREKMEDİ** — devir notu bir paket
  gerekeceğini varsayıyordu, ölçüldü ve gerekmedi
- **`axe`**: WCAG 2.1 AA denetimi 13 genel sayfada
  (`@axe-core/playwright` — **tek yeni bağımlılık, yalnızca geliştirmede**,
  kullanıcıya giden pakete girmiyor; `npm audit`: 0 açık). Kritik ve `serious`
  ihlaller merge'i engelliyor; bugün ikisinden de sıfır tane var
- ⛔ **KAPILAR MUTASYONLA KANITLANDI.** Bütçe 100 KB'a indirildi → altı sayfa
  da kırmızıya döndü. `/iletisim` sayfasına `alt` metni olmayan bir görsel
  eklendi → yalnızca o sayfa `critical: image-alt` ile düştü. Kırmızıya
  dönmeyen kapı, kapı değildir

### Düzeltildi — lisans metni ve onu koruyan mekanizma

- ⛔ **ÖNCE BİR YANLIŞ TESPİTİ DÜZELTELİM: `LICENSE` DOSYASI ZATEN VARDI.**
  Devir notu "depoda `LICENSE` dosyası yok" diyordu, ajan bunu **doğrulamadan
  devraldı** ve proje sahibine yanlış bilgiyle soru sordu. Dosya `git`
  geçmişinde duruyordu. Hata `git status`'ün dosyayı "yeni" değil
  "değişti" göstermesiyle yakalandı
- **MIT metnindeki bir bozukluk düzeltildi**: son cümle `OUT OF, IN CONNECTION
  WITH…` diyordu, kanonik metin `OUT OF OR IN CONNECTION WITH…`. Tek kelimelik
  bir fark ama lisans metni **birebir** olmak zorundadır — değiştirilmiş bir
  MIT metni artık MIT değildir ve otomatik lisans tarayıcıları tanımaz
- **Lisans artık bir teste bağlı** (`tests/unit/license.test.ts`): beyan var mı ·
  dosya var mı · **içerik beyanla aynı mı** · telif satırı gerçek bir yıl ve
  sahip taşıyor mu. Teknik borç #100'ün dersi burada da geçerli: **bir kural,
  mekanizması olmadan niyettir**
- Yalnızca "dosya var mı" diye bakan bir test yanlış lisans metnini yeşil
  geçirirdi. İki mutasyonla kanıtlandı: dosya silindi → 3 test kırmızı;
  "MIT License" başlığı "Apache License" yapıldı → 1 test kırmızı
- ⚠️ **Testin BUGÜN yakalayamadığı şey:** kanonik metinden sapma. Başlık ve
  telif satırı doğru olduğu sürece gövdedeki bir kelime değişikliği geçiyor —
  bu bozukluk da o yüzden aylarca durabildi (teknik borç #111)

### Düzeltildi — devralınan iki yanlış tespit

- ⛔ **TEKNİK BORÇ #84'ÜN SEBEBİ YANLIŞMIŞ.** Kayıt "çerez bandı tüm sayfaları
  dinamik yaptı" diyordu. Mutasyonla ölçüldü: bandı tek başına kaldırmak
  hiçbir sayfayı statikleştirmiyor, `SiteHeader`'ı tek başına kaldırmak da
  öyle. Başlık oturum çerezini **adım 4a'dan beri** okuyor (commit `49f965c`),
  yani sayfalar adım 17'den çok önce zaten dinamikti. İkisi birden
  kaldırıldığında yalnızca 6 sayfa statikleşiyor. Bedel ölçüldü ve kabul
  edilebilir çıktı (o sayfaların canlı LCP'si 720 ms, hedef 2500 ms) —
  §5.10 gereği borç KAPATILDI, optimizasyon yapılmadı
- ⛔ **İLK YAZILAN BÜTÇE LİSTESİ SESSİZCE GİRİŞ SAYFASINI ÖLÇÜYORDU.**
  Listede `/spor-salonu` ve `/hastane` vardı; ikisi de **personele özel**.
  `page.goto` bu sayfalarda `200` döndürüyor çünkü `guardPage()`'in
  yönlendirmesi hidrasyondan SONRA uygulanıyor. `/spor-salonu` bu yüzden 240 ms
  ile "en hızlı sayfa" görünüyordu. Artık her ölçüm `expectRoute` ile hangi
  adreste olduğunu doğruluyor

### Bilinen açık — cırcır (ratchet) ile kapatıldı, HEDEF TUTULMUYOR

- ⛔ **İlk yük JS bütçesi AŞILIYOR: 281,7 KB gzip, hedef 200 KB** (canlıda
  288,8 KB). Ağırlığın ~150 KB'ı **Sentry'nin tarayıcı SDK'sı** — oturum
  tekrarı ve izleme kapalı olduğu hâlde paketten atılamayan ölü kod. En olası
  sebep borç #96 (Turbopack). **Emin değilim, doğrulanmadı** → teknik borç #108
- ⛔ **LCP kapısı gerçek ağı ölçmüyor**: CI localhost'a bakıyor ve Chrome'un ağ
  kısıtı ana belgeye uygulanmıyor (ölçüldü). Aynı sayfa local'de 588 ms,
  canlıda **2844 ms** — yani canlı anasayfa bugün hedefin üstünde ve CI bunu
  göremiyor → teknik borç #109
- Kapılar bu yüzden hedefe değil **bugün ölçülen değere** kuruldu: bugünden
  kötüye gidiş merge edilemiyor, hedefe olan fark yazılı borç. Gerekçesi
  `09-ci-cd-deploy.md` → "Bütçe zaten aşılmışken kapı nasıl kurulur"

### Değişti

- `npm run test:e2e` artık yalnızca davranış projelerini koşuyor
  (`desktop-chrome` + `mobile-375`); bütçe kapıları `npm run test:quality`
  altında ve CI'da **ayrı bir adım** — "davranış bozuldu" ile "bütçe aşıldı"
  bakılacak yeri farklı iki sorun
- `docs/standards/09-ci-cd-deploy.md` — cırcır ilkesi ve "kapı neyi ölçtüğünü
  söylemek zorundadır" bölümleri eklendi
- `docs/standards/06-testing.md` — "yeşil test yanlış şeyi ölçüyor olabilir"
  bölümü eklendi (mutasyon zorunluluğu · `200` ≠ doğru sayfa · devralınan
  sebebin de doğrulanması)

### Eklendi — adım 17b: Hesap yönetimi ve veri hakları (teknik borç #80)

- **`/hesabim/verilerim` ekranı geldi**: verimi indir · telefon güncelleme ·
  kimlik bağlantısını çözme · hesabımı sil. Kartların sırası en zararsızdan
  en yıkıcıya doğru ve yalnızca silme kartı kırmızı çerçeveli
- **Verimi indir (JSON)**: profil, adresler, siparişler, ödemeler, randevular,
  biletler, üyelikler, destek talepleri ve rıza kayıtları tek dosyada.
  ⛔ **Dosyaya şifre özeti, oturum jetonu ve şifreli kimlik numarası
  KONMUYOR** — bu alanlar sorgunun seçim listesinde HİÇ YOK, sonradan
  filtrelenmiyor: okunmayan veri yanlışlıkla yazılamaz. Kimlik numarası
  yalnızca maskeli. Uç `no-store` + `attachment` + `nosniff` başlıklarıyla
  dönüyor ve indirme denetim kaydına düşüyor
- **Hesabımı sil**: kişisel alanlar SİLİNİYOR (ad, e-posta, telefon, doğum
  tarihi, kimlik numarasının üç hâli, şifre, oturumlar, Google bağlantısı,
  adresler, kart sahibi adı, bildirimler, sepet, destek talepleri ve ekleri);
  mali kayıtlar tutar ve tarih olarak KALIYOR
- ⛔ **BUNA "ANONİMLEŞTİRME" DENMİYOR — ve bu kozmetik bir düzeltme değil.**
  KVKK Yönetmeliği m.10 anlamında anonimleştirme GERİ DÖNDÜRÜLEMEZ olmak
  zorunda; `users` satırı bir kullanıcı kimliği üzerinden mali kayda bağlı
  kaldığı sürece yapılan şey takma adlaştırmadır. PRD, veri modeli, roadmap ve
  ekran metinlerindeki "anonimleştirme" kelimesi bu adımda kaldırıldı
- **Neyin saklandığı ve HANGİ KANUN gereği saklandığı ekranda yazıyor** —
  onay panelinden ÖNCE ve silme sonrası `/hesap-silindi` sayfasında bir kez
  daha. Yönetmelik m.12/1-c kısmen karşılanan talebin gerekçesiyle
  bildirilmesini istiyor; liste bir "ayrıntılar" düğmesinin arkasına
  saklanırsa bildirim yapılmamış olur. E2E testi bu gerilemeyi yakalıyor
- **Silme işleminin denetim kaydı hesapla BİRLİKTE silinmiyor** (Yönetmelik
  m.7/3: imha işlemlerinin kaydı en az üç yıl saklanır)
- **PRD §5.11 kabul kriteri ölçüldü**: silinen hesabın kimlik numarasıyla
  yeniden kayıt olunabiliyor (`national_id_hash` benzersiz kolonu serbest
  kalıyor) ve eski sipariş duruyor ama kişiye bağlanamıyor. Koruma geçici
  olarak kaldırılıp iki testin de KIRMIZIYA döndüğü görüldü
- **Üyelik İPTAL EDİLMİYOR, otomatik yenilemesi kapatılıyor**: iptal, taahhüt
  varsa erken çıkış farkı TAHSİL EDERDİ — yani "hesabımı sil" düğmesi
  kullanıcının kartından habersizce para çekerdi. Kullanıcı silmeden önce
  uyarılıyor (PRD §5.11)
- **Kimlik bağlantısını çözme geldi** (ADR-017 ilke 3: "her bağlama geri
  alınabilir olmalıdır"). Bağ çözülünce kimlik numarası serbest kalıyor ve
  başka bir hesaba bağlanabiliyor — testle kanıtlandı
- ⛔ **Kimlik çözme, Google bağlantısı olmayan hesapta ENGELLENİYOR.** Bu
  projede giriş kullanıcıyı T.C. numarasının özetinden buluyor; bağ koparsa
  şifreyle giriş de ölür ve kullanıcı hesabına bir daha giremez.
  `login-methods.ts`'teki "son giriş yöntemi kaldırılamaz" korumasının aynısı.
  Koruma kaldırılıp testin kırmızıya döndüğü görüldü
- **Çözme, artık çalışmayan şifreyi de siliyor**: ekranda "Şifre: Tanımlı"
  yazıp çalışmayan bir giriş yöntemi göstermek yalan olurdu
- **Telefon güncelleme** (teknik borç #80): numara **doğrulanmamış** olarak
  yazılıyor ve ekranda öyle görünüyor. OTP adımı EKLENMEDİ — bu projede
  telefon doğrulaması simüle (borç #1), kod telefona değil kullanıcının kendi
  e-postasına gidiyor, yani kanıt üretmiyor. ADR-017 aynı gerekçeyle kimlik
  doğrulamasına OTP eklemeyi reddetmişti
- **Güvenlik**: silme ve kimlik çözme, şifresi olan hesapta ŞİFRE YENİDEN
  DOĞRULAMASI istiyor (çalınmış oturum tek başına yetmesin); üç uçta da
  kullanıcı kimliği yalnızca oturumdan okunuyor; silme tek transaction ve tek
  koşullu yazma (iki eşzamanlı silmeden yalnızca biri denetim kaydı yazıyor,
  ölçüldü); indirme ve yıkıcı işlemler için ayrı hız sınırı bütçeleri
- **Yeni migration**: `AuditAction` enum'una `identity_unlink` ve
  `contact_update` eklendi. Geriye uyumlu, tablo/kolon/satır değişmiyor;
  ⚠️ tek yönlü (PostgreSQL'de `DROP VALUE` yok)
- **Standart güncellendi**: `14-privacy-and-compliance.md` → "Hesap silme"
  bölümü. Kural proje kitine (`proje-kiti` 1.4.0) de yazıldı

### Eklendi — adım 17: Yasal sayfalar ve çerez rızası (teknik borç #71 kısmen)

- **Dört yasal belge geldi**: `/gizlilik` (KVKK aydınlatma), `/cerez-politikasi`,
  `/kullanim-sartlari`, `/iletisim`. Hepsi ziyaretçiye açık — aydınlatma
  yükümlülüğü kişi hesap açmadan ÖNCE de geçerli — ve alt bilgiden erişiliyor
- **Metnin iddiaları ÖLÇÜLEREK yazıldı, ezberden değil**: işleyici listesi
  `integrations.md`'den, saklama süreleri `data-model.md`'den, sunucu konumları
  panelden okundu (Neon → Almanya/Frankfurt, Vercel fonksiyonları → ABD).
  Yayımlanmış yanlış bir aydınlatma metni, hiç olmamasından ağırdır
- **Çerez listesi TEK KAYNAKTAN üretiliyor** (`cookie-registry.ts`): politika
  sayfasının tablosu, bandın kipi ve aydınlatma metnindeki "otomatik yollarla
  toplananlar" bölümü hep aynı kataloğu okuyor. Elle yazılmış üç liste, ilk
  değişiklikte gerçeğe aykırı düşerdi
- ⛔ **Bant "kabul et/reddet" DEĞİL, BİLGİLENDİRME** — çünkü bugün zorunlu
  olmayan tek bir çerez bile yok (analitik yok, Sentry henüz bağlı değil).
  Reddedilecek bir şey yokken reddet düğmesi göstermek kullanıcıyı yanıltırdı.
  **Kataloğa `analytics` satırı eklenirse test KIRMIZIYA DÖNÜYOR**, yani onay
  arayüzü yazılmadan analitik eklenemiyor
- **Bant SIFIR JAVASCRIPT**: sunucu bileşeni + düz `<form method="post">` +
  303 yönlendirme. İstemci bileşeni olsaydı bandın kodu sitenin TAMAMINA
  yüklenirdi — bant her sayfada çiziliyor. Betikleri kapalı tarayıcıda da
  çalıştığı curl ile doğrulandı
- **Rıza kaydı EKLEMELİ (append-only)**: geri alma eski satırı değiştirmiyor,
  üzerine `isGranted = false` yazıyor. Güncellenen bir satır "ne zaman verildi"
  bilgisini yok eder ve kayıt kanıt olmaktan çıkardı — testle ölçüldü
- **Ziyaretçinin rızası da alınıyor** (PRD §5.10): giriş yapmamış kullanıcının
  kaydı çerezdeki rastgele kimliğe bağlanıyor, giriş yapınca **aynı satır
  üzerinden** hesaba taşınıyor. Yeni satır yazılsaydı rızanın tarihi giriş
  anına kayardı; korunduğu testle kanıtlandı
- **Kayıt akışı iki rıza kaydı yazıyor** (`terms_of_use` + `privacy_notice`) ve
  son adımda kullanıcı bunu bildiren bir cümle görüyor. ⚠️ Onay KUTUSU yok —
  teknik borç #85
- ⛔ **Veri sorumlusunun kişisel verisi KODA YAZILMADI**: ad ve başvuru
  e-postası `LEGAL_CONTROLLER_NAME` / `LEGAL_CONTACT_EMAIL` ortam
  değişkenlerinden okunuyor. Depo herkese açık; koda yazılan bir ad git
  geçmişinden çıkarılamazdı. Değişken eksikse sayfa yine çiziliyor ve başvuru
  kanalı olarak kaynak kodu deposunu gösteriyor
- **Güvenlik**: uçta CSRF kapısı (`Origin` başlığı), açık yönlendirme koruması
  (`sanitizeRedirectPath` hem `returnTo` hem `Referer` için), Zod ile girdi
  doğrulama, yazma hız sınırı (sınır **yazmadan önce** çalışıyor), IDOR
  koruması (özne gövdeden değil oturumdan/çerezden), adresteki hata kodu
  ekrana basılmıyor. Hepsi curl ve Playwright ile ayrı ayrı doğrulandı
- **SEO**: her belgenin kendi `title`/`description`'ı, canonical adresi ve tek
  bir `h1`'i var; `sitemap.xml` artık ana sayfa + `/hakkimizda` + dört yasal
  sayfayı ilan ediyor (borç #71 kısmen ödendi)
- ⚠️ **Yeni teknik borç**: #84 (bant tüm sayfaları istek anında çizilir hâle
  getirdi, bedel ölçülmedi), #85 (kayıtta onay kutusu yok), #86 (hastane
  randevusundaki branş bilgisi özel nitelikli veri sayılabilir — aydınlatma
  metninde açıkça yazıldı, gizlenmedi)

### Eklendi — adım 16: Planlı görevler (teknik borç #18, #38, #53, #55, #63)

- **Günlük planlı görev geldi**: `GET /api/cron/daily`, TR saatiyle 03:00'te
  (`0 0 * * *` UTC). Altında **dokuz bağımsız görev** var; biri patlarsa
  diğerleri çalışmaya devam ediyor ve hata sunucu log'una + koşu özetine
  düşüyor. Koruma kaldırılıp testin kırmızıya döndüğü görüldü
- **Uç `CRON_SECRET` ile korunuyor**: `Authorization: Bearer` başlığı sabit
  süreli karşılaştırmadan geçiyor (`===` zamanlama saldırısına açıktı).
  ⛔ Anahtar tanımlı değilse uç **herkese kapalı** — "koruma yoksa serbest"
  davranışı, değişkeni unutan bir ortamda veri silen bir ucu internete açardı
- **Temizlik: `rate_limit_counters`** (borç #18, hem hız sınırı hem devre
  kesici), **koltuk kilitleri** (borç #53), **oturumlar**, **kayıt taslakları**,
  **doğrulama kodları** ve **dış veri önbelleği** (borç #63)
- **Temizlik "payla" siliyor (24 saat)**: süresi dolan satır anında değil,
  hiçbir canlı akışın ona bakmayacağı kadar sonra siliniyor. Pay olmasaydı
  yarıda kalan bir kayıt akışının kodu silinebilirdi. Pay kaldırılıp testin
  kırmızıya döndüğü görülerek ölçüldü
- ⛔ **Koltuk temizliği SATILMIŞ bilete dokunmuyor**: koşul `status = 'held'`
  ve bu da kırmızıya döndürülerek ölçüldü — kaybolacak şey bir mali kayıt olurdu
- ⚠️ **Dış veri önbelleğinin ölçütü FARKLI**: `expiresAt` değil `fetchedAt`.
  Süresi dolmuş kayıt burada ölü değil, sağlayıcı çöktüğünde 24 saate kadar
  "güncellenemiyor" notuyla ekrana çıkıyor (ADR-015). `expiresAt`'e göre silen
  bir görev, tam da sağlayıcının çöktüğü gün yedeği silerdi
- **Aidat tahsilatı ve yenileme hatırlatması** (borç #55): mantık
  KOPYALANMADI — görev adım 12'nin `renewMembershipPeriod()`'unu, hatırlatma da
  ekranın kullandığı `syncMembershipNotifications()`'ı çağırıyor. **İki kez
  çalıştırıldı, vadesi gelen dönem için tek tahsilat satırı kaldı** (PRD §5.6)
- **Doktor takvimi her gün 14 güne tamamlanıyor** (borç #38): saatler artık tek
  yerde (`slot-calendar.ts`), tohumlama da oradan okuyor. Görev "bir gün ekle"
  değil "eksikleri tamamla" — cron bir hafta çalışmazsa ilk koşu boşluğu kapatıyor
- **Her görev ayrı denetim kaydı yazıyor** (`scheduled_task_run`): cron
  kaçırılan koşu için log bile üretmediğinden, "bu iş bugün çalıştı mı"
  sorusunun tek güvenilir cevabı bu kayıt. `userId` boş, IP özeti sabit
  "system" — denetim kaydına yanıltıcı bir istemci izi yazılmıyor
- **"Durum simülasyonu" GEREKMEDİ**: sipariş, destek ve üyelik durumları zaten
  okuma anında türetiliyor (ADR-013), ilerletecek bir göreve ihtiyaç yok

### Karar — ADR-017: kimlik kanıtı adaptör sınırına alındı (teknik borç #76)

- Kod değişmedi; **sınır çizildi**. Bugünkü kanıt (T.C. numarası + doğum yılı)
  bilgi temellidir ve **geçici** olarak işaretlendi; gerçek sağlayıcıya
  (e-Devlet / banka doğrulaması) geçiş tek dosyalık bir iş olarak tanımlandı
- **Kimlik ≠ yetki** ve **her bağlama geri alınabilir olmalı** kuralları yazıldı;
  ikisi de roadmap'e adım oldu (17b ve yeni 17c)
- OTP eklemek REDDEDİLDİ (kod saldırganın kendi kanalına gidiyor, kanıt gücü
  artmıyor); ek KPS alanı sormak da REDDEDİLDİ (kanıtın sınıfını değiştirmiyor)
- ⛔ **Gerçek kişisel veriyle çalıştırma kapısı KAPALI** — üç iş bitene kadar

### Eklendi — adım 15c (2/2): Google ile girenin KPS doğrulaması (teknik borç #32)

- **`/kimlik-dogrulama` ekranı geldi**: Google ile açılan hesap artık kimliğini
  kendi doğrulatabiliyor. Bugüne kadar kullanıcı doğru mesajı görüyordu ama
  mesajdaki bağlantı `/kayit`'a, yani hesabı OLAN birini yeni hesap açma
  ekranına gönderiyordu
- **Sıra güvenlik gereği**: bot kapısı → "zaten doğrulanmış mı" → KPS sorgusu
  (hız sınırı + devre kesici + denetim kaydı + sabit yanıt süresi) → 18 yaş →
  "bu numara başka hesapta mı" → personel eşleştirme. Kayıt akışındaki sıranın
  aynısı; ortak parçalar kopyalanmadı, paylaşıldı
- **Yazma TEK KOŞULLU**: `UPDATE ... WHERE identity_status = 'unverified'` ve
  karar etkilenen satır sayısından okunuyor. Koruma **kaldırılıp testin
  kırmızıya döndüğü görülerek** ölçüldü. Aynı numarayı iki hesabın bağlamasını
  ise veritabanı kısıtı engelliyor
- **Ad soyad KPS'ten geliyor**: Google ile açılan hesapta ad e-postanın `@`
  öncesinden türetiliyordu; doğrulamadan sonra gerçek ad soyadla değişiyor
- **`isStaff` yalnızca sunucuda**: değer `staff_members` eşleşmesinden
  türetiliyor, girdi tipinde yeri yok. Personel kaydı başka bir hesaba bağlıysa
  kullanıcı vatandaş olarak doğrulanıyor
- **Doğrulama sonrası kullanıcı GELDİĞİ hizmete dönüyor** (`?donus=`): hastanede
  uyarıyı gören kullanıcı doğrulamayı bitirince hastaneye geri gidiyor ve orada
  artık farklı bir mesaj görüyor ("yalnızca kurum personeline açıktır")
- **`/hesabim`'da doğrulanmamış hesaba çağrı kartı**: kullanıcı eksiğini bir
  hizmete çarpmadan da görebiliyor
- **Denetim kaydına yeni işlem** (`identity_verify`): kimlik doğrulaması bir
  YETKİ DEĞİŞİKLİĞİ. ⛔ Kayda kimlik numarası yazılmıyor

### Düzeltildi — açık yönlendirme (open redirect) atlatması

- **`sanitizeRedirectPath` kontrol karakteriyle atlatılabiliyordu**: WHATWG URL
  standardı TAB/LF/CR karakterlerini adresten ayrıştırmadan önce siliyor, yani
  `/<TAB>/sahte.example` filtreden "yol" gibi geçiyor ama tarayıcıda
  `//sahte.example` olup BAŞKA SİTEYE gidiyordu. `node` ile fiilen doğrulandı,
  önce kırmızı test yazıldı, sonra düzeltildi. Bu fonksiyon giriş sonrası
  dönüşte ve Google callback'inde de kullanılıyor — düzeltme üçünü birden kapatıyor
- **Bot jetonuna uzunluk sınırı** (`TURNSTILE_TOKEN_MAX_LENGTH`): sınırsız alan,
  girişli bir kullanıcıya hem bize hem Cloudflare'a bedava yük ürettirme imkânı
  veriyordu
- **Benzersizlik çakışması ayırt ediliyor**: her `P2002` "bu numara başkasına
  ait" sayılmıyor; yalnızca `national_id_hash` çakışması. Hatanın biçimi
  ezberden değil, gerçek veritabanına sorularak yazıldı

### Değişti — adım 15c (2/2)

- **Bot kapısı ortak dosyaya taşındı** (`bot-check.ts`) ve **DÖRT akışın
  hepsi** oraya bağlandı: kayıt, kod yeniden gönderme, şifre sıfırlama ve
  giriş. Davranış değişmedi; `unavailable` hâlâ "geçti" sayılmıyor.
  Kod incelemesi ilk denemede yalnızca kayıt akışının taşındığını, kuralın
  hâlâ üç yerde ayrı ayrı yaşadığını gösterdi — ortaklaştırma tamamlandı
- **Bot jetonu şeması da ortaklaştı ve ÜÇ ucun hepsine uzunluk sınırı geldi**:
  kayıt, kod yeniden gönderme ve şifre sıfırlama. Sınırın en çok gerektiği yer
  şifre sıfırlamaydı — o uç giriş bile gerektirmiyor
- **Kimlik sorgusu şeması ortaklaştı** (`identity-challenge.schema.ts`):
  aynı üçlüyü kayıt ve kimlik doğrulama akışları soruyor. İki kopya olsaydı
  birinde sıkılaştırılan kural diğerinde gevşek kalabilirdi
- **Oturumu düşen kullanıcının dönüş adresi kaybolmuyor**: giriş ekranına
  giderken `?donus=` de taşınıyor, doğrulamadan sonra kullanıcı hastaneye
  dönüyor — hesabına değil
- **Üç güvenlik dalı daha teste bağlandı**: bot doğrulamasına ULAŞILAMADIĞINDA
  kapının kapandığı (ADR-004 bedel 2), KPS hız sınırı ve KPS çökmesi. Üçünde de
  hesabın `unverified` kaldığı ölçülüyor
- **Migration `20260810120000_add_identity_verification_audit_action`**: denetim
  sözlüğüne bir işlem eklendi. Geriye uyumlu, yalnızca enum DEĞERİ ekliyor.
  ⚠️ Tek yönlü (PostgreSQL'de `DROP VALUE` yok)
- `AccessDeniedNotice` artık dönüş adresi alıyor; hastane ve spor salonu
  sayfaları bulundukları yolu ona veriyor


### Eklendi — adım 15c (1/2): Profilden Google bağlantısı (teknik borç #33)

- **`/hesabim`'a "Giriş yöntemleri" kartı geldi**: şifre tanımlı mı, Google bağlı
  mı, ne zaman bağlandı. PRD §5.0 bunu istiyordu; birleştirme engellendiğinde
  kullanıcıya "şifrenle gir, sonra profilden bağla" deniyordu ama o ekran yoktu
- **Bağlama ŞİFRE İSTİYOR ve bu bir güvenlik kararı**: bağlama hesaba KALICI bir
  giriş yolu ekliyor. Yalnızca oturuma dayansaydı, çalınmış bir oturumla saldırgan
  kendi Google hesabını bağlar; kurban şifresini değiştirip tüm oturumları
  düşürse bile saldırgan girmeye devam ederdi
- **SON GİRİŞ YÖNTEMİ KALDIRILAMAZ** (PRD §5.0): şifresi olmayan kullanıcı
  Google'ı kaldırırsa hesabına bir daha giremezdi. Kural saf bir fonksiyonda
  (`login-methods.ts`), ekranda düğme hiç çizilmiyor ve sunucu da reddediyor.
  Koruma **kaldırılıp testin kırmızıya döndüğü görülerek** ölçüldü
- **Aynı Google hesabı iki kullanıcıya bağlanamaz**: `sub` başka bir hesaba
  bağlıysa akış reddediliyor ve hangi hesap olduğu SÖYLENMİYOR
- **OAuth akışına "bağlama" modu eklendi.** Mod istemciden gelmiyor: işlem
  çerezine yazan yer ucun kendisi. Callback iki şeyi birden doğruluyor —
  kullanıcı hâlâ girişli mi ve akışı BAŞLATAN kullanıcı mı; aksi hâlde araya
  giren bir hesap değişikliğinde bağlantı yanlış hesaba kurulurdu
- **Bağlama ve kaldırma denetim kaydına düşüyor** (`google_link` /
  `google_unlink`). ⛔ Google kimliği (`sub`) kayda YAZILMIYOR — olayın kendisi
  yeterli, kişisel veri log'a girmez (CLAUDE.md §5.11)
- Tohuma **iki demo hesap eklendi** (#15 Kemal Güler, #16 Sinan Turan): bu spec
  hesabın giriş yöntemlerini değiştiriyor, yani hesap PAYLAŞAMAZ. Listenin
  **sonuna** eklendi, 1-94 arası hiçbir hesap kaymadı

### Değişti — adım 15c (1/2)

- `accounts` tablosunun okuma tarafı büyüdü: `findLoginMethods` (şifre var mı +
  Google bağlı mı) ve `unlinkGoogleAccount` (sahiplik `WHERE` koşulunda,
  etkilenen satır sayısı dönüyor)
- **Migration `20260810090000_add_google_link_audit_actions`**: denetim
  sözlüğüne iki işlem ve bir varlık türü eklendi. Geriye uyumlu, yalnızca enum
  DEĞERİ ekliyor; tablo, kolon ve satır değişmiyor. ⚠️ Tek yönlü
  (PostgreSQL'de `DROP VALUE` yok)

### Eklendi — adım 15b: Hakkımızda (teşkilat şeması + 100 kişilik personel rehberi)

- **`/hakkimizda` sayfası geldi ve GİRİŞ GEREKTİRMİYOR** (PRD §3 · §5.9): kurum
  bilgileri, teşkilat şeması ve personel rehberi. Ziyaretçi tüm sayfayı
  görebiliyor; sayfa hiçbir kayıt oluşturmadığı için kapı da yok
- **Teşkilat şeması ağaç olarak çiziliyor**: 35 birim TEK sorguda okunup bellekte
  hiyerarşiye dönüştürülüyor (`org-tree.ts`). Özyinelemeli SQL de seviye başına
  ayrı sorgu da yok; şema derinleşse bile sorgu sayısı değişmiyor
- **Açılıp kapanma tarayıcının kendi `<details>` öğesiyle**: klavyeyle çalışıyor,
  ekran okuyucu durumu okuyor, JavaScript kapalıyken bile açılıyor. `role="tree"`
  BİLEREK kullanılmadı — ok tuşlarıyla gezinme yükümlülüğünü üstlenmeden o rolü
  yazmak ekran okuyucuya yanlış bilgi vermek olurdu
- **Birimdeki personel sayısı alt birimleri de kapsıyor**: daireye tıklayan
  kullanıcı 1 değil 100 kişi görüyor. Alt birim kimlikleri bellekteki ağaçtan
  geliyor, veritabanına ek maliyeti yok
- **Personeli olmayan 8 daire şemada ismen duruyor** ve tıklandığında "Bu birimin
  personel rehberi henüz yayınlanmadı" bilgi mesajı çıkıyor — boş ekran
  bırakılmıyor (PRD §5.9)
- **Rehberde ada göre arama + birim ve unvana göre süzme.** Arama ORTAK katalog
  katmanından geçiyor (`unaccent`), yani "ŞAHİN", "sahin" ve "Şahin" aynı kişiyi
  buluyor. Süzgeçler adres çubuğunda taşınıyor: geri tuşu çalışıyor, bağlantı
  paylaşılabiliyor, JavaScript kapalıyken de işliyor
- **KURUMSAL E-POSTA ARANMIYOR ve bu bir karar**: adres listede görünüyor ama
  aranabilir olsaydı arama kutusu bir e-posta doğrulayıcısına dönerdi
- **Personelin kimlik özeti (`national_id_hash`) rehber sorgusunda HİÇ
  OKUNMUYOR.** Üç katman birden koruyor: sorgunun alan listesi (birim testi),
  dönen kayıt (veritabanı testi) ve tarayıcıya inen HTML (E2E). Alan listesi
  testi, korumayı bilerek bozup **kırmızıya döndüğü görülerek** ölçüldü
- Üst menüye ve alt bilgiye **"Hakkımızda"** bağlantısı eklendi. Ana sayfadaki
  hizmet ızgarasına konulmadı: orası "ne yapabilirim", burası "bu kurum kim"

### Eklendi — adım 15: Profil sayfası (tüm kayıtların tek yerden yönetimi)

- **`/hesabim` bir profil MERKEZİNE dönüştü.** Eskiden yalnızca beş satır hesap
  bilgisi gösteriyordu; artık iki bölüm daha var: **"Kayıtlarım"** (siparişler,
  destek talepleri, bildirimler — personelse ayrıca randevular ve spor salonu
  üyeliği) ve **"Hesap ayarları"** (adresler, kayıtlı kartlar). PRD §4
- **Teslimat adresi YÖNETİMİ geldi** (`/hesabim/adreslerim`): listeleme, ekleme,
  **düzenleme** ve silme. Adım 7'den beri adres yalnızca ödeme ekranında
  eklenebiliyordu; yanlış yazılan bir adres asla düzeltilemiyordu (PRD §5.0)
- **Kayıtlı kart yönetimi geldi** (`/hesabim/kartlarim`): listeleme ve kaldırma.
  **Teknik borç #41 ödendi**
- **Kart ödemeden bağımsız olarak EKLENEMEZ ve bu ekranda yazıyor.** Kart yalnızca
  gerçek bir ödeme sırasında, sahte sağlayıcının doğrulamasından geçtikten sonra
  kaydediliyor (PRD §6.2); profilden eklemek doğrulanmamış bir kartı listeye
  koymak olurdu
- **Üyeliğe bağlı kart kaldırılırken UYARILIYOR**: aidatı bu karttan çekilen
  kullanıcı, silme onayında "bir sonraki aylık tahsilat bu karttan yapılamaz"
  cümlesini görüyor. Silme ENGELLENMİYOR — karar kullanıcının (PRD §5.6)
- **İKİ SİLME DE YUMUŞAK** (`deleted_at`): geçmiş siparişler adrese, geçmiş
  ödemeler ve üyelikler karta `onDelete: Restrict` ile bağlı. Kullanıcı için
  kayıt listeden çıkıyor, mali kayıt ve denetim izi bozulmuyor (data-model.md)
- **Sahiplik kontrolü sorgunun `WHERE` koşulunda**, sonradan yapılan bir `if`
  değil: başkasının adresi/kartı 404 döner ve varlığı bile sızdırılmaz.
  Koruma testte **kaldırılıp kırmızıya döndüğü görülerek** ölçüldü
- **Kullanıcı başına en fazla 20 adres** ve profil yazma uçlarına **15 dakikada
  30 istek** bütçesi (CLAUDE.md §5.5)
- **Adres ve kart yazmaları denetim kaydına düşüyor** — dört yeni denetim işlemi
  (`address_create/update/delete`, `saved_card_delete`) ve iki yeni varlık türü
- **Teknik borç #35 ödendi**: `/giris`, `/kayit`, `/hesabim`, `/sifremi-unuttum`
  ekranlarının gövde metinleri 14px'ten **16px'e** taşındı (07-ui-design-system.md)

### Değişti — adım 15

- **`addresses` ve `saved_cards` sorguları ödeme özelliğinden profil özelliğine
  taşındı** (`src/features/profile/repositories/`). İkisi de KULLANICIYA ait
  kayıtlar; ödeme onları kullanıyor ama sahibi değil. Aynı tabloya iki ayrı
  özellikten dokunmak "tablo başına tek repository" kuralını çiğnerdi
- **Geriye uyumlu migration** (`20260809180000_add_profile_audit_actions`):
  yalnızca yeni enum DEĞERLERİ ekliyor; tablo, kolon ve satır değişmiyor
- **Tohuma iki demo vatandaş hesabı eklendi** (#13 Aslı Avcı, #14 Ege Kurt).
  Profil E2E'si kullanıcının adres ve kartlarını değiştirdiği için hesap
  paylaşamıyor; mevcut 12 demo hesabın hepsi başka spec'lere ayrılmıştı.
  Liste **sona** eklendi, 1-92 arası hiçbir hesap kaymadı

### Eklendi — adım 14: Bilgi widget'ları (hava, haber, piyasa)

- **Anasayfaya "Bilgi panosu" bölümü eklendi**: hava durumu (İzmir — güncel
  durum + 3 günlük tahmin), güncel haber başlıkları ve piyasa (döviz kuru +
  kripto). PRD §5.8
- **PROJENİN İLK GERÇEK DIŞ API ÇAĞRILARI.** Bugüne kadar tüm dış servisler
  taklit ediliyordu (sahte KPS, sahte ödeme). Sağlayıcılar canlı uçlarından
  doğrulandı, ezberden yazılmadı
- **Dört sağlayıcının DÖRDÜ DE ANAHTARSIZ** — proje sahibine yeni hesap
  açtırılmadı: Open-Meteo (hava), Frankfurter/ECB (döviz), CoinGecko (kripto),
  TRT Haber RSS (haber). `NEWS_API_KEY` ve `NEWS_API_PROVIDER` kaldırıldı
- **Çağrılar yalnızca sunucuda** ve ortak bir dayanıklılık katmanından geçiyor
  (`src/lib/external-fetch.ts`): **5 sn zaman aşımı**, en fazla **2 yeniden
  deneme** (üstel geri çekilmeli) ve **sağlayıcı başına ayrı devre kesici**
  (mevcut ADR-010 altyapısı yeniden kullanıldı, yeniden yazılmadı)
- **`429` bilerek YENİDEN DENENMİYOR**: hız sınırına takılmışken tekrar sormak
  sınırı derinleştirir. O tur kaybediliyor ve bayat veri gösteriliyor
- **Yanıtlar Postgres'te önbellekleniyor** (yeni `external_data_cache` tablosu ·
  **ADR-015**): hava 30 dk, döviz 60 dk, kripto 5 dk, haber 15 dk. Taze kayıt
  varken dış çağrı **hiç yapılmıyor**
- **Sağlayıcı çökerse widget boş kalmıyor**: 24 saate kadar eski kayıt
  *"Şu an güncellenemiyor — … itibarıyla son veri"* notuyla gösteriliyor.
  Daha eskisi gösterilmiyor; kart dürüstçe hata durumuna geçiyor ve
  **sayfanın kalanı çalışmaya devam ediyor**
- **Haber XML'i yeni bir paket eklenmeden okunuyor** (`src/lib/rss.ts` ·
  **ADR-016**): CDATA ve HTML varlıkları çözülüyor, etiketler varlık
  çözümünden ÖNCE siliniyor, bağlantılar **alan adı beyaz listesinden** ve
  `https` şartından geçiyor, bağlantılar `rel="noopener noreferrer"` ile
  yeni sekmede açılıyor
- **Her widget kendi `Suspense` sınırında**: üç kart üç farklı sağlayıcıya
  gidiyor ve en yavaş olan diğerlerini bekletmiyor. Yükleniyor / bayat / hata
  durumlarının üçü de METİNLE yazılı
- **Piyasa kartında iki sağlayıcı ayrı ayrı bozulabiliyor**: döviz düşerse
  kripto ekranda kalıyor, tersi de geçerli

### Değişti

- **Yeni tablo: `external_data_cache`** (geriye uyumlu migration — yalnızca
  ekliyor, hiçbir veriyi değiştirmiyor)
- **`.env.example` sadeleşti**: bilgi widget'ları için anahtar satırı kalmadı,
  yalnızca hava durumu koordinatı duruyor

### Eklendi — adım 13: Destek talebi + dosya yükleme

- **Destek ekranı** `/destek`: üye başlık ve açıklama yazıp **en fazla 5 ekran
  görüntüsü** yükleyerek talep açıyor; aynı sayfada kendi taleplerini listeliyor
- **Talep detayı** `/destek/<id>`: durum çizgisi, tam açıklama, ek görselleri ve
  kapatma düğmesi
- **Durum okuma anında türetiliyor** (ADR-013 deseni): `Açık → İnceleniyor →
  Çözüldü` talebin yaşından hesaplanıyor (30 dk / 180 dk) ve hiçbir yere
  yazılmıyor. `support_tickets.status` kolonu yalnızca doğuşu ve kapanışı tutuyor
- **`Kapandı` durumunu yalnızca talebi açan üye veriyor** (PRD §5.7). Kapatma
  koşullu tek bir UPDATE ile yapılıyor; ikinci kapatma isteği 409 dönüyor
- **Dosya yükleme yeni bir güvenlik yüzeyi ve buna göre kapatıldı:** tür
  istemcinin beyanından değil **baytların imzasından** doğrulanıyor (PNG/JPEG/
  WebP), boyut dosya başına 2 MB, adet 5, dosya adı sanitize ediliyor ve
  **uzantıyı sunucu yazıyor**. SVG bilerek kabul edilmiyor (içine betik
  yazılabilir)
- **Ekler yetkili bir uçtan servis ediliyor**
  (`/api/support-tickets/<id>/attachments/<ekId>`): her istekte oturum ve
  sahiplik kontrolü var, `nosniff` + `no-store` başlıklarıyla dönüyor
- **Kabul kriteri kanıtlandı — kullanıcı başkasının talebini göremiyor:**
  sahiplik sorgunun içinde, başkasının talebi ve eki 404 dönüyor. Koruma
  geçici olarak kaldırılıp ilgili üç testin kırmızıya döndüğü **ölçüldü**
- **Bot doğrulaması** talep oluşturmada (Turnstile · ADR-004) ve kullanıcı
  başına **hız sınırı** (15 dakikada 10 talep) — sınır burada spam'in yanı sıra
  depolama tüketimini de kesiyor
- **Bildirim ve denetim kaydı**: durum ilerledikçe tembel bildirim yazılıyor,
  atlanan aşamalar kaybolmuyor; talep açma ve kapatma denetim kaydına düşüyor
- **Hizmet ızgarasında destek kartı açıldı** ve üst menüye eklendi

### Değişti

- **`ticket_attachments` ve `support_tickets` tabloları genişledi** (geriye
  uyumlu migration): `content_type`, `data`, `closed_at`, `notified_status`
- **Bildirimler ekranının açıklaması genelleştirildi** — artık yalnızca
  siparişten değil, üyelik ve destek talebinden de bahsediyor
- **"Açılmamış hizmet tıklanabilir bağlantı değildir" testi taşındı.** Destek
  açılınca kapalı hizmet kalmadı; kural birim testine (uydurma kapalı kart) ve
  ızgaranın veriye bakan uçtan uca testine bölündü. `ServiceTile` bu yüzden
  `page.tsx`'ten kendi dosyasına çıkarıldı

### Eklendi — adım 12: Spor salonu üyeliği (personele özel)

- **Spor salonu sayfası** `/spor-salonu`: tesis künyesi, salon saatleri
  (Pazar "Kapalı" diye YAZIYOR, satır gizlenmiyor) ve haftalık grup ders
  programı. Program ve tesis bilgisi **koddaki sabit içerik** — veri modelinde
  karşılığı olan bir tablo yok ve değiştirecek yönetici paneli de yok
- **Dört paket, hepsi AYLIK tahsilat** (PRD §5.6): aylık taahhütsüz · 3 · 6 ·
  12 aylık. Peşin toplu ödeme yok. **İndirim yüzdesi veritabanında
  tutulmuyor**, taahhütsüz paketin fiyatından hesaplanıp yalnızca ekranda
  gösteriliyor (%10 / %15 / %25)
- **Üyelik SEPETE GİRMİYOR** — kendi akışı var: paket seç → kart seç/gir →
  taahhüt ve erken çıkış kuralını onayla → **ilk ay tahsil edilir**. Sepette
  bekleyen market/restoran/bilet ürünleri bu akıştan etkilenmiyor
- **Taahhüt ve erken çıkış kuralı satın alma ÖNCESİ ekranda**, ay başına TL
  cinsinden. Onay kutusu işaretlenmeden düğme çalışmıyor; **sunucu da aynı
  onayı bağımsız arıyor** (istemciye güvenilmiyor)
- **"Aynı anda tek üyelik" kuralını veritabanı zorluyor**: `memberships`
  tablosuna nullable + benzersiz `active_user_id` kolonu eklendi. Üyelik
  yaşarken `user_id` ile aynı, sona erince `NULL`. Uygulamadaki kontrol
  yalnızca kullanıcıya doğru mesajı göstermek için — kararı veritabanı veriyor
- **Üyelik ekranı** `/spor-salonu/uyelik`: aktif paket, taahhüt bitişi,
  sonraki tahsilat tarihi ve tutarı, otomatik yenileme, ödeme geçmişi
  (başarısız denemeler dahil), paket değiştirme ve iptal
- **Paket değişimi bir sonraki tahsilat tarihinde** yürürlüğe giriyor; ödenmiş
  ay ne kısalıyor ne uzuyor (PRD kabul kriteri). Değişim yürürlüğe girene
  kadar iptal edilebiliyor
- **Erken çıkış farkı**: taahhüt sürerken iptal edilirse ya da daha kısa
  taahhütlü pakete düşülürse, o güne kadar **tahsil edilmiş** aylar taahhütsüz
  fiyattan yeniden hesaplanıyor ve fark tek seferde çekiliyor. Tutar onaydan
  önce ekranda; kullanıcının onayladığı rakam sunucunun hesabıyla tutmuyorsa
  işlem duruyor. Fark **bir kez** alınıyor (kayıt tablosuna sorularak)
- **Yenileme hatırlatması** vadeden 3 gün önce, **tembel** yazılıyor
  (ADR-013 deseni): planlı görev yokken de kullanıcı bildirimi görüyor. Aynı
  hatırlatmanın ikinci kez yazılmasını `renewal_reminder_for_billing_at`
  üzerindeki **koşullu güncelleme** engelliyor
- **Üyelik durumu kolondan değil KURALDAN türetiliyor** (ADR-013): vadesi
  geçmiş üyelik okuma anında "ödeme bekliyor", 3 gün de geçmişse "sona erdi",
  iptal edilmiş üyelik ödenmiş dönem sonunda bitiyor
- **Yenileme tahsilatı saf bir çekirdek fonksiyonda** (`renewMembershipPeriod`):
  HTTP, oturum ve ekran bilmiyor. Adım 16'daki planlı görev onu olduğu gibi
  çağıracak — kopyalanacak mantık kalmadı
- Uçlar: `POST /api/memberships` · `PATCH` ve `DELETE
  /api/memberships/[id]`. Üçü de `requireAccess("staff")` ile korunuyor ve
  sahiplik sorgunun içinde (başkasının üyeliği 404 alıyor, 403 değil)
- Tohuma **iki yeni demo personel hesabı** eklendi (#11, #12): üyelikte hesap
  paylaşılamadığı için iki Playwright projesinin her birine ayrı personel
  gerekiyordu. Listenin SONUNA eklendi; mevcut 10 hesabın kimliği ve
  e-postası değişmedi

### Değiştirildi

- **Sahte ödeme sağlayıcısı artık kayıtlı kartta da sonucu belirleyebiliyor.**
  Kayıtlı kartın numarası hiç saklanmadığı için sağlayıcı varsayılan
  "başarılı" yolunu izliyordu; artık **son 4 haneye** bakıyor. Üyelik aidatı
  her ay kayıtlı karttan çekildiği için bu olmadan "kart reddedilirse üyelik
  ödeme bekliyora geçer" kuralı hiç tetiklenemezdi. **Sepet ödemesini de
  etkiliyor**: kaydedilmiş "Reddedildi" kartı artık gerçekten reddediliyor
- Ödeme ekranındaki kart alanları ortak bir bileşene taşındı (`CardPicker`) ve
  üyelik ekranı da onu kullanıyor — erişilebilirlik kuralları tek yerde

### Eklendi — adım 11: Etkinlik + koltuk seçimi + bilet

- **Etkinlik listesi** `/etkinlikler`: 12 etkinlik, üç tür (konser, tiyatro,
  çocuk), tarih/mekân/sanatçı/fiyat ve **boş koltuk sayısı**. Arama ve tür
  süzgeci market ve restoranla **ORTAK katalog katmanından** geliyor; arama
  etkinlik adı VEYA sanatçı üzerinde çalışıyor ve aksan körü
- **Salon planı** `/etkinlikler/[id]`: blok → sıra → koltuk düzeni, sahne
  yönü, boş/seçili/dolu göstergesi. Dolu koltuk **düğme değil** (klavyeyle
  gezilemeyen pasif düğme yerine durumu metinle yazan bir öğe — hastane
  ekranındaki "dolu saat" deseninin aynısı)
- **10 dakikalık koltuk kilidi (PRD §5.2 · ADR-007)** — adımın kalbi:
  - Koltuğa basmak kilidi koyuyor **ve aynı transaction'da sepete satır
    yazıyor**. İkisi ayrı yazılsaydı arada bir çökme, kimsenin göremediği ama
    koltuğu 10 dakika kapatan bir kilit bırakırdı
  - **Süresi dolmuş kilit okuma anında yok sayılıyor**: temizlik görevi hiç
    çalışmasa bile koltuk satılabilir görünüyor (kabul kriteri 2)
  - Kilit **tek ifadeli koşullu yazmayla** konuyor: süresi dolmuş kaydı
    devralan bir `UPDATE`, kayıt hiç yoksa `INSERT … ON CONFLICT DO NOTHING`.
    İki kullanıcı aynı anda talip olursa biri **409** alıyor (kabul kriteri 1)
  - Süre **sepette uzamıyor**, ödeme ekranına girmek de **sıfırlamıyor**
- **Sepette geri sayım**: her biletin yanında kalan süre saniye saniye
  işliyor. Süre dolunca satır **kendiliğinden düşüyor** ve kullanıcıya
  `seat_hold_expired` bildirimi gidiyor — sessizce boşalan bir sepet
  açıklanamaz olurdu
- **Bilet satın alma**: ödeme transaction'ının içinde kilit `sold`'a çevriliyor.
  Koltuk bu arada kaçırılmışsa hiçbir sipariş yazılmıyor ve para çekilmiyor.
  Bilet siparişi doğrudan `Teslim edildi` doğuyor ve iptal edilemiyor (PRD §5.5)
- **Kullanıcı başına en fazla 8 aktif kilit**: PRD bir sayı vermiyor ama kilit
  bedava ve koltuğu 10 dakika herkesten saklıyor — sınırsız bırakmak tek
  hesabın salonu kilitleyip satışı durdurmasına izin vermek olurdu

### Değişti — adım 11

- **Teknik borç #40 ÖDENDİ**: sepetteki bilet satırı artık ETKİNLİĞE değil
  **koltuk rezervasyonuna** bağlı. Satır "Körfez Akşamı — A Blok, 1. sıra,
  1. koltuk" diye görünüyor, adedi 1'de sabit ve adet düğmeleri hiç çizilmiyor
- **`POST /api/carts/current/items` artık `event` türünü KABUL ETMİYOR.**
  Bilet sepete yalnızca koltuk kilidi ucundan, sunucunun ürettiği kimlikle
  giriyor. İstemci rezervasyon kimliği yazabilseydi başkasının kilidini kendi
  sepetinde görüntüleyebilirdi (IDOR)
- Ana sayfadaki etkinlik kartı ve üst menü açıldı (`navigation.ts`)
- **Şema DEĞİŞMEDİ**: `venues`, `venue_seats`, `events`, `seat_reservations`
  adım 3'ten beri hazırdı ve tohumluydu. Yeni migration yok
- **Tüm koltuklar aynı fiyat** (etkinliğin taban fiyatı): veri modelinde koltuk
  başına fiyat alanı yok, kategori/blok farklı fiyatlandırma uydurulmadı

### Eklendi — adım 10: Sipariş takibi + bildirim

- **Siparişlerim ekranı** `/siparislerim`: her sipariş için dört adımlı durum
  çizgisi (`Alındı → Hazırlanıyor → Yola çıktı → Teslim edildi`), kalemler,
  tutarlar ve iptal düğmesi. Durum renkle değil **metinle** anlatılıyor
- **Durum bir zamanlayıcıyla değil, siparişin YAŞINDAN hesaplanıyor**
  (ADR-013). Bu projede sık çalışan cron yok (borç #3) ve yönetici paneli de
  yok (borç #4); durumu bir görevin çalışmasına bağlamak, gecikmesi hâlinde
  kullanıcıya yanlış bilgi göstermek olurdu. Eşikler modül başına tek bir
  kural tablosunda: restoran 10/25/45 dk, market 20/90/240 dk
- **Bildirimler ekranı** `/bildirimler`: ödeme tamamlanınca ve her durum
  değişiminde bildirim düşüyor, okunmamışlar işaretli. "Tümünü okundu
  işaretle" tek uçla çalışıyor
- **Atlanan aşamalar kaybolmuyor**: kullanıcı yarım saat sonra baksa bile
  `Hazırlanıyor` ve `Yola çıktı` bildirimlerinin ikisi birden yazılıyor. Aynı
  bildirimin iki kez yazılmasını `orders.notified_status` üzerindeki
  **koşullu güncelleme** engelliyor
- **Sipariş iptali** yalnızca `Alındı` aşamasında. Sonrası 409, başkasının
  siparişi 403, bilet hiç iptal edilemiyor. İptal tek transaction'da:
  durum değişimi + market stoğunun geri yüklenmesi + sahte iade kaydı +
  bildirim; denetim kaydı da yazılıyor
- **İptal penceresi hem serviste hem `WHERE` içinde**: okuma ile yazma arasında
  pencere kapanabilir, bu yüzden asıl kararı koşullu UPDATE veriyor. İkinci
  emniyet kemeri `refunds.order_id` üzerindeki unique index — stok iki kez
  geri yüklenemiyor
- Ödeme sonrası fiş ekranına **"Siparişlerimi takip et"** bağlantısı, üst menüye
  giriş yapmış kullanıcı için **Siparişlerim** ve **Bildirimler** eklendi

### Değişti — adım 10

- `prisma/schema.prisma`: yeni `refunds` tablosu ve `orders.notified_status`
  kolonu (ikisi de geriye uyumlu ekleme; kolon silen migration yok)
- Ödeme akışı artık her sipariş için "Siparişiniz alındı" bildirimini **ödemenin
  transaction'ı içinde** yazıyor

### Eklendi — adım 9: Belediye Restoran + adisyon

- **Restoran ekranı** `/restoran`: 31 kalem, 5 kategori; görselli, fiyatlı
  kartlar. Mobilde tek, tablette iki, masaüstünde üç sütun (kartın içinde form
  açıldığı için dört değil)
- **Adisyon** — adım 9'un tek yeni kavramı: kaleme basınca kartın içinde adet ve
  **mutfak notu** ("az acılı") soran bir form açılıyor. Modal pencere değil,
  çünkü modal yeni bir bağımlılık isterdi ve üç alanlık bir form için sayfayı
  kilitlemenin karşılığı yok
- **Adisyon KALICI ve sepetin restoran bölümünün kendisi.** Ayrı bir taslak liste
  tutulmadı: sayfayı yenileyince adisyon duruyor, ziyaretçiden üyeye geçişte
  hesaba taşınıyor (PRD §4) ve adet/satılabilirlik kuralları ekranda ikinci kez
  yazılmıyor. "Adisyon sepete aktarılır" adımı bu yüzden bir düğme değil, zaten
  olmuş bir durum — paneldeki bağlantı doğrudan ödemeye götürüyor
- **Mutfak notu sonradan düzenlenebiliyor** — hem adisyon panelinde hem sepet
  sayfasının restoran bölümünde. Yeni uç yazılmadı: mevcut
  `PATCH /api/carts/current/items/{id}` artık `note` alanını da kabul ediyor
- **Restoran paket servisi**: teslimat ücreti **49,90 TL**, 400 TL üzeri
  ücretsiz; ekranda **tahmini hazırlık süresi 30-45 dakika** yazıyor. Değerleri
  proje sahibi belirledi (teknik borç #39 ödendi)
- **Ortak katalog katmanı** (`src/features/catalog/`): arama kutusu, kategori
  şeridi, boş durum ve Türkçe `unaccent` araması artık market ile restoran
  arasında PAYLAŞILIYOR. Market ekranı kopyalanmadı — kopyalansaydı iki ekranın
  aynı mantığı zamanla ayrışırdı
- Ana sayfadaki restoran kartı ve üst menü artık `/restoran`'a bağlı; rozet
  "Yakında"dan "Açık"a döndü

### Değişti — adım 9

- **Restoran siparişinde teslimat ZAMAN ARALIĞI artık sorulmuyor** (PRD §6.1).
  Market "adres + zaman aralığı" istiyor, restoran "adres + tahmini hazırlık
  süresi": restoran siparişi ödemeden hemen sonra hazırlanmaya başlıyor, yani
  seçilecek bir pencere yok. Kontrol sunucuda — ekran alanı göstermese bile
  ödeme servisi sepetin içine bakıp kendi kararını veriyor. Sepette market
  varsa aralık yine zorunlu
- **Teslimat ücreti hesabı modül başına bir kural tablosundan okunuyor**
  (`cart-pricing.ts`). Önce her modül için ayrı bir `if` dalı vardı; üçüncü
  modül geldiğinde dallardan birinin eşik kontrolünü unutması an meselesiydi
- **Sepet satırı dar kapsayıcıda sarıyor.** Aynı bileşen hem geniş sepet
  sayfasında hem 384px'lik adisyon panelinde çiziliyor; sarma olmadan adet
  düğmeleri ve tutar panelden taşıp SAYFAYA yatay kaydırma ekliyordu — tarayıcıda
  ölçüldü ve düzeltildi
- Ücretsiz teslimat ipucu artık hangi modülden söz ettiğini yazıyor
  ("… Belediye Restoran teslimatı ücretsiz olsun"); metne "market" gömülü
  kalsaydı restoran bölümünde yanlış bilgi verirdi

### Düzeltildi — adım 9 (ödeme ekranı, tarayıcı denemesinde bulundu)

- **Ödeme hatası yanlış alanı gösteriyordu.** İstek şemadan geçemediğinde ekran
  ne olursa olsun "Kart numarası geçersiz" diyordu; son kullanma alanlarını boş
  bırakan kullanıcı doğru yazdığı kart numarasını kontrol etmeye yönlendirildi.
  Hangi alanın hatalı olduğu HÂLÂ söylenmiyor (gövdede kart numarası var ve
  Zod'un hata nesnesi girdinin parçalarını taşıyabiliyor) ama mesaj artık
  kontrol edilecek alanları sayıyor. Nöbetçi test eklendi; düzeltme geri
  alınınca yalnızca o test kırmızıya dönüyor
- **Kart alanlarındaki örnekler kutunun içinden altına taşındı.** Yer tutucu
  olarak duran soluk `12` ve `2030` metinleri yazılmış değer sanıldı ve alanlar
  boş bırakıldı — yukarıdaki yanıltıcı hatanın asıl sebebi buydu. Kayıt
  formundaki "Örnek: 1990" deseniyle aynı hâle getirildi
- İkisi de adım 7'den kalma kusurlardı, bu adımda doğmadılar

### Veritabanı — adım 9

- **Değişiklik yok.** `menu_categories` ve `menu_items` adım 3'ten beri hazırdı
  ve tohumluydu; `cart_items.note` de öyle. Yeni migration, yeni tablo, yeni
  kolon YOK

### Güvenlik — adım 9

- Yeni girdi noktaları Zod'dan geçiyor: `/restoran` adres parametreleri (ortak
  `parseCatalogSearchParams`) ve `PATCH` gövdesindeki `note` (en fazla 200
  karakter, sabit `CART_ITEM_NOTE_MAX_LENGTH`'ten okunuyor)
- **IDOR kontrolü ölçüldü:** başkasının sepet satırının notu değiştirilemiyor.
  Sahiplik koşulu geçici olarak kaldırıldı, tam olarak bir test kırmızıya döndü,
  diğer sekizi yeşil kaldı — yani test doğru şeyi ölçüyor
- Menü araması ham SQL kullanıyor ama tablo adı **sabit listeden seçilen bir dal**,
  dışarıdan gelen bir metin değil; arama deseni parametre olarak bağlanıyor
- Yeni bağımlılık, yeni secret, yeni ortam değişkeni **yok**. `npm audit` ve
  `npm audit --omit=dev`: **0 açık**
- `nanoid` **3.3.18**'e `overrides` ile sabitlendi (boyut sıfır verildiğinde özel
  üreticinin sonsuz döngüye girmesi — yüksek). Bildirim dal gönderildikten sonra,
  2026-08-08'de yayınlandı ve CI'daki denetim işini kırmızıya düşürdü. Paket bize
  yalnızca `@tailwindcss/postcss` → `postcss` üzerinden geliyor ve **uygulama
  çalışma anında nanoid çağırmıyor**, yani fiili risk düşüktü — denetim kapısı
  yine de kırmızı bırakılmadı (`09-ci-cd-deploy.md`)

### Eklendi — adım 8: Belediye Market

- **Market ekranı** `/market`: 45 ürün, 6 kategori; görselli, fiyatlı, stoklu
  kartlar. Mobilde tek, tablette iki, masaüstünde dört sütun
- **Kategori süzgeci ve arama** — ikisi de adres çubuğunda taşınıyor
  (`?kategori=…&arama=…`), yani geri tuşu çalışıyor ve bağlantı paylaşılabiliyor.
  Arama formu sıradan bir `GET` formu olduğu için JavaScript kapalıyken de işliyor
- **Sepete ekleme**: hazır sepet ucu (`POST /api/carts/current/items`) çağrılıyor;
  yeni uç ve yeni iş kuralı yazılmadı. Ziyaretçi de ekleyebiliyor (PRD §4)
- **Bildirim balonu** (`sonner`): ekleme onayı ve içinde "Sepete git" bağlantısı.
  Balon `aria-live` bölgesine yazıyor, yani ekran okuyucuya da ulaşıyor
- **Tükenmiş ürün** listede kalıyor ama "Tükendi" rozetiyle ve düğmesiz. Asıl
  engel sunucuda: `addItemToCart` isteği zaten reddediyor (PRD §5.3)
- **Az stok uyarısı** ("Son 5 adet") 10 adedin altında görünüyor
- Ana sayfadaki market kartı ve üst menü artık `/market`'e bağlı; rozet
  "Yakında"dan "Açık"a döndü

### Düzeltildi — adım 8

- **Türkçe aramada büyük harf VE aksan sorunu.** Veritabanının büyük/küçük harf
  duyarsız araması Türkçe harfleri bilmiyordu; `I` harfini `i`'ye çeviriyor,
  oysa karşılığı `ı`. Üstelik aksanlar da eşleşmiyordu. Ölçülen sonuç:
  `KAĞIT` → 0, `kagit` → 0, yalnızca `kağıt` → 1 sonuç. Yani büyük harfle yazan
  **veya Türkçe klavyesi olmayan** kullanıcı ürünü hiç bulamıyordu.
  `unaccent` eklentisi migration ile açıldı; sorgu ve ürün adı aynı
  sadeleştirmeden geçiyor, iki sorun tek yerde kapandı. Eklenti kaldırılıp
  ilgili dört testin kırmızıya döndüğü doğrulandı
- **Arama kutusundaki `%` ve `_` artık joker sayılmıyor.** `LIKE` içinde bunlar
  joker karakter; kaçırılmasaydı tek bir `%` yazan kullanıcı **tüm kataloğu**
  eşleştirirdi. Hata vermeyen, sessizce yanlış bir sonuçtu; testle sabitlendi

### Veritabanı — adım 8

- Migration `20260806200000_enable_unaccent_for_search` — `unaccent` eklentisi
  açıldı. **Tablo, kolon veya veri değişmedi**; geri alınması `DROP EXTENSION`
  ile tek satır. Neon'un desteklediği eklentiler arasında olduğu dokümandan
  doğrulandı; CI'daki PostgreSQL kapsayıcısında da çalışıyor

### Güvenlik — adım 8

- `js-yaml` **4.3.1**'e `overrides` ile yükseltildi (`!!omap` çözümlemesinde
  karesel CPU tüketimi — GHSA-5p4m-2wfm-xmqj, yüksek, CVSS 7.5). Bildirim
  2026-08-06 gecesi yayınlandı ve CI'daki denetim işini kırmızıya düşürdü;
  paket ESLint ve `shadcn` CLI üzerinden geliyor. **Uygulama çalışma anında
  YAML ayrıştırmıyor**, yani fiili risk düşüktü — yine de denetim kırmızı
  bırakılmadı. 4.x hattının yaması 4.3.1'dir; 5.x'e geçmek gerekmiyor
  (bildirimden doğrulandı)
- `hono` **4.13.0**'a `overrides` ile yükseltildi (CORS ara katmanında ReDoS —
  GHSA-8j4g-w8fx-2239). Paket `shadcn` CLI üzerinden geliyordu ve zaten
  bağımlılık ağacındaydı; `npm audit` ve `npm audit --omit=dev` yeniden **0 açık**
- `next-themes` bağımlılığı **kaldırıldı**. shadcn CLI'ı `sonner` bileşeniyle
  birlikte getirmişti, oysa projede tema sınıf tabanlı ve `src/lib/theme.ts`
  içinde "bu paketi bilerek eklemiyoruz" yazıyor. Balon rengi artık tasarım
  token'larına bağlı, yani temayı CSS biliyor — ikinci bir tema kaynağı yok

### Eklendi — adım 7: ortak sepet + sahte kart ödemesi

- **Ortak sepet** `/sepet`: market, restoran ve etkinlik ürünleri tek sepette,
  modül başına ayrı bölüm ve ayrı ara toplam. Adet artırma/azaltma ve satır
  çıkarma anında çalışıyor
- **Ziyaretçi sepeti** (PRD §4): giriş yapmamış kullanıcı da sepete ekleyebiliyor,
  sepet `bb_anon` çerezinde taşınıyor. **Giriş yapıldığında hesaptaki sepetle
  birleşiyor** — aynı ürünün adetleri toplanıyor, stok ve satır sınırı aşılmıyor.
  Hem şifreyle hem Google ile girişte çalışıyor
- **Teslimat ücreti MODÜL BAŞINA** (PRD §6.1): market 59 TL, 750 TL üzeri
  ücretsiz. Eşik **yalnızca market tutarına** bakıyor — restoran ürünü ekleyerek
  market teslimatını bedavaya getirmek mümkün değil, testi de var
- **Ödeme ekranı** `/odeme` ve **sahte fiş** `/odeme/tamamlandi`: kayıtlı karttan
  seçme veya yeni kart girme, "kartımı kaydet", teslimat adresi ve zaman aralığı
- **Sahte ödeme sağlayıcısı** (ADR-003'ün deseni): gerçek tahsilat yok.
  `fake-data-guide.md`'deki test kartları sonucu belirliyor —
  `4000…0002` reddedildi, `4000…9995` yetersiz bakiye. Hata yolları böylece
  öngörülebilir biçimde test edilebiliyor
- **Kart doğrulaması sunucuda**: Luhn, son kullanma (ayın SONUNA kadar geçerli),
  CVV biçimi, kart sahibi adı. Marka numaranın ön ekinden çıkarılıyor;
  tanınmayan numara varsayılan bir markaya DÜŞMÜYOR, reddediliyor

### Kabul kriterleri (PRD §6.1) — gerçek PostgreSQL'e karşı kanıtlandı

- **Karışık sepet tek ödemeyle ÜÇ SİPARİŞ üretiyor**, hepsi aynı ödemeye bağlı.
  Bilet doğrudan `delivered` oluyor ve teslimat alanları boş kalıyor; market ile
  restoran `received` ile başlayıp adres ve zaman aralığı taşıyor
- **Ödeme başarısızsa HİÇBİR sipariş oluşmuyor, sepet korunuyor.** Sıralama
  bunu sağlıyor: sağlayıcıya sipariş yazılmadan ÖNCE soruluyor
- **Çift tahsilat veritabanı seviyesinde engelleniyor** (`unique(idempotency_key)`).
  Eşzamanlı iki istekten yalnızca biri tahsil ediyor
- **Stok koşullu UPDATE ile düşüyor** (`WHERE stock >= n`) — randevu modülündeki
  desenin aynısı. Son adedi aynı anda isteyen iki kullanıcıdan yalnızca biri
  alıyor, stok eksiye inmiyor

### Güvenlik

- **Tam kart numarası hiçbir yere yazılmıyor**: ne veritabanına, ne log'a, ne
  hata mesajına, ne ekrana. Repository imzalarında kart numarası için parametre
  YOK; sızması yanlışlıkla bile mümkün değil. Testler bunu yanıtta, şema
  hatasında, iş kuralı hatasında ve beklenmeyen hatada ayrı ayrı doğruluyor
- **Tutar sunucuda hesaplanıyor.** İstemcinin gönderdiği `expectedTotalKurus`
  tahsil edilmiyor; yalnızca "kullanıcının gördüğü ekran güncel miydi" diye
  karşılaştırılıyor, tutmuyorsa ödeme duruyor
- **IDOR**: başkasının adresi, kayıtlı kartı, sepet satırı veya fişi
  kullanılamıyor — sahiplik her sorgunun içinde
- Hız sınırı: sepet yazmalarında ziyaretçi başına 120/15dk, ödemede kullanıcı
  başına 10/15dk (kart deneme saldırısına karşı dar tutuldu)

### Değiştirildi

- **Para hesabı artık TAM SAYI KURUŞ** (`src/lib/money.ts`). Veritabanı
  `Decimal(10,2)` tutuyor, ekran lira gösteriyor, ama aradaki tüm hesap tam
  sayıyla yapılıyor — `0.1 + 0.2` hatası bir sepette kuruş kaymasına dönüşürdü.
  Testi bu davranışı doğrudan kanıtlıyor
- Üst menüye **sepet bağlantısı** eklendi; menünün içinde değil sağda, giriş
  düğmesi gibi her ekran boyutunda tek dokunuş uzaklıkta (PRD §4)
- Kart son kullanma etiketleri "Ay"/"Yıl" yerine **"Son kullanma ayı/yılı"**
  oldu: kısa hâli hem ekran okuyucuda bağlamsız kalıyordu hem de sayfadaki
  başka metinlerle çakışıyordu (testte fiilen çakıştı)
- `tests/db/helpers.ts` temizliği sepet, sipariş, ödeme, adres ve katalog
  tablolarını da kapsıyor — uygulamanın ürettiği kayıtlar `cuid()` aldığı için
  test önekiyle bulunamıyordu

### Düzeltildi

- **`/sepet` sayfası, çerezi hiç olmayan ziyaretçide çöküyordu.** Sunucu
  bileşeni ziyaretçi kimliğini üretmeye çalışıyordu; Next.js sunucu
  bileşeninde çerez yazılmasına izin vermiyor. Artık sayfa salt okuma yapıyor
  (`readCartOwner`), kimlik ilk yazma isteğinde uçta üretiliyor. E2E testi yakaladı
- **Hastane E2E testinde gizli bir yarış vardı** (adım 6'dan): iki Playwright
  projesi aynı branşın aynı ilk boş saatini kapmaya çalışıyordu. Adım 7'nin
  eklediği yükle görünür oldu; her projeye ayrı branş verildi


### Eklendi — adım 6: hastane randevu modülü (personele özel)

- **Randevu akışı** `/hastane`: branş → doktor → gün → saat, hepsi tek adreste
  ve adres çubuğunda taşınıyor (`?brans=…&doktor=…&gun=…`). Her adım sunucuda
  çiziliyor; geri tuşu bir adım geri alıyor, bağlantı paylaşılabiliyor
- **`/hastane/randevularim`**: yaklaşan ve geçmiş randevular, iptal düğmesi.
  Sayfa hiçbir kullanıcı kimliği parametresi almıyor — kimlik oturumdan
  geliyor, dolayısıyla unutulabilecek bir sahiplik kontrolü yok
- **İki uç**: `POST /api/appointments` (201) ve `DELETE /api/appointments/{id}`
  (204). İkisi de yalnızca personele açık; `userId` gövdeden değil oturumdan
  okunuyor ve istemcinin gönderdiği değer şemadan hiç geçmiyor
- **PRD §5.1'in dört kuralı da sunucuda**: dolu saat seçilemez · geçmiş tarihe
  randevu alınamaz · **aynı branşta aktif randevu varken ikinci randevu
  alınamaz** · iptal en geç randevudan 2 saat önce. Dördü de ayrı hata kodu ve
  409 döndürüyor, çünkü ekranın hangi kuralın devreye girdiğini bilmesi gerekiyor
- **Üçüncü kural canlı denemeden sonra sıkılaştırıldı (PRD §5.1 güncellendi).**
  Önce "aynı branşta **aynı gün**" diye yazılıydı ve öyle uygulanmıştı; proje
  sahibi preview'da deneyip gerçek randevu sistemlerinin böyle davranmadığını
  belirtti. Artık o branşta bekleyen randevunuz varken **hiçbir güne** yeni
  randevu alamıyorsunuz. "Aktif" = durumu `booked` ve saati henüz gelmemiş;
  saati geçen randevu engel olmaktan çıkıyor, iptal edilen hiç sayılmıyor.
  Kabul edilen bedel: kontrol randevusu önceden alınamıyor
- **Kabul kriteri karşılandı — iki kullanıcı aynı saati alamaz.** Koruma
  uygulama mantığında değil, `doctor_slots` üzerindeki koşullu güncellemede
  (`WHERE is_booked = false`): PostgreSQL ikinci işlemi bekletiyor, birinci
  commit edince WHERE'i yeniden değerlendiriyor ve satır artık koşulu
  sağlamadığı için atlıyor → 409. Beş eşzamanlı istekle gerçek veritabanına
  karşı sınandı; **koşul geçici olarak kaldırıldığında testin kırmızıya
  döndüğü de doğrulandı** (beşi de saati alabildi)
- **İptal randevuyu SİLMİYOR**: `status = cancelled` oluyor, kayıt 3 yıl
  saklanıyor (data-model.md) ve saat yeniden satışa açılıyor. Randevusunu
  iptal eden kullanıcı aynı gün yenisini alabiliyor — iptal bir cezaya
  dönüşmüyor
- **Denetim kaydı**: randevu oluşturma ve iptal `audit_logs`'a yazılıyor
  (CLAUDE.md §5.11 iptali açıkça sayıyor). IP düz değil özetlenerek
- **Hız sınırı yazma uçlarında**: 20 işlem / 15 dakika, **kullanıcı başına**.
  IP bazlı değil — bu hizmet tek bir kurumun personeline açık ve hepsi aynı
  dış IP'nin arkasından girebilir, IP sayacı onları birbirinin bütçesinden
  yerdi. Kullanıcı kimliği sayaç anahtarında özetlenerek tutuluyor
- **`src/lib/datetime.ts` (yeni)**: gün ve saat gösteriminin tek yeri. Ekranda
  her tarih **İstanbul saatine** çevriliyor (veritabanında UTC saklanıyor) ve
  gün şeridi günleri İstanbul takvimine göre grupluyor — UTC 21:00'den sonrası
  İstanbul'da ertesi gündür. Etkinlik ve teslimat modülleri de bunu kullanacak
- **`api-guard.ts` (yeni)**: korumalı uçların kapısı. `page-guard`'ın HTTP
  karşılığı, ama kararı **aynı saf fonksiyon** veriyor (`evaluateAccess`) —
  sayfada izin verilen bir işlem uçta reddedilemez, tersi de olamaz

### Değiştirildi

- `/hastane` artık gerçek içerik gösteriyor; "yakında" iskeleti yalnızca spor
  salonunda kaldı (`StaffOnlyService` bileşenine dokunulmadı)
- `rate-limit.ts` yeni bir anahtar türü tanıyor: `user`. Değer düz değil
  özetlenerek yazılıyor — `rate_limit_counters` tablosunu okuyan biri hangi
  hesabın ne zaman ne yaptığını çıkaramasın diye

### Düzeltildi

- **İki E2E testi yanıltıcı biçimde geçiyormuş.** `layout.spec.ts` içindeki
  "açık hizmet kendi sayfasına götürür" ve "mobilde bağlantıya basınca menü
  kapanır" testleri `/hastane$` adresini bekliyordu; oysa giriş yapmamış
  ziyaretçi kapıdan geçemiyor ve `/giris`'e yönlendiriliyor. Testler
  yönlendirme tamamlanmadan önceki **geçici adresi** yakalıyordu. Adım 6'da
  sayfaya `loading.tsx` eklenince zamanlama değişti ve testler kırmızıya
  döndü — yani bir davranış değişikliğini değil, kendi kırılganlıklarını
  bildirdiler. Beklentiler kalıcı sonuca (`/giris?...donus=%2Fhastane`)
  çevrildi
- `tests/db/helpers.ts` temizliği artık uygulamanın ürettiği kayıtları da
  siliyor. Randevu ve denetim satırları `cuid()` kimlik aldığı için test
  önekiyle bulunamıyordu; kalan satırlar yabancı anahtar kısıtı yüzünden
  (`Restrict`) tüm temizliği patlatıyordu

### Eklendi — adım 5: görsel iskelet (layout, tema, marka)
- **Marka paleti**: kurumsal lacivert (`--primary`) + turkuaz vurgu
  (`--brand-accent`), açık ve koyu tema için ayrı ayrı. Değerler tahminle
  seçilmedi: her metin/zemin çifti oklch → sRGB'ye çevrilip WCAG kontrast oranı
  hesaplandı. En düşük çift **4.67:1** (gereken 4.5:1), odak halkası **4.89:1**
  (gereken 3:1)
- **Kendi kelime-logomuz** (`Logo` bileşeni + `icon.svg` sekme simgesi):
  yuvarlak köşeli karo içinde sadeleştirilmiş kemerli kamu binası cephesi.
  **Hiçbir gerçek belediyenin logosu, arması veya rengi kullanılmadı** — depo
  herkese açık ve site canlı. İşaret SVG olduğu için rengini temadan alıyor,
  ayrı bir ağ isteği doğurmuyor ve düzen kaymasına yol açmıyor
- **Açık/koyu tema düğmesi**: tercih tarayıcıda saklanıyor, ilk girişte sistem
  tercihi kullanılıyor. Sınıf sayfa **boyanmadan önce** uygulanıyor (`<head>`
  içindeki satır içi betik), yani koyu tema kullanıcısı açılışta beyaz parlama
  görmüyor. **Yeni bağımlılık eklenmedi** — `next-themes` yerine 3 fonksiyonluk
  kendi çözümümüz (`src/lib/theme.ts`)
- **Üst menü yeniden**: solda logo, ortada hizmet bağlantıları, sağda tema
  düğmesi ve giriş/çıkış. Mobilde bağlantılar açılır menüye giriyor
  (`aria-expanded` + `aria-controls`), **giriş/çıkış düğmesi ise menünün dışında
  kalıyor** — en kritik eylem her ekran boyutunda tek dokunuş uzaklıkta
- **Bağlantılar tek kopya**: masaüstü ve mobil için ayrı menü YAZILMADI. İki
  kopya olsaydı ekran okuyucu her şeyi iki kez okur, testler de hangi
  bağlantının kastedildiğini ayırt edemezdi
- **Alt bilgi (yeni)**: her sayfada kalıcı feragat — "Bu site gerçek bir
  belediyeye ait değildir." Yasal sayfalar (adım 17) henüz yok, bu yüzden
  onlara bağlantı verilmedi: 404'e giden bir "KVKK" bağlantısı, bağlantının hiç
  olmamasından kötüdür
- **Ana sayfa**: tanıtım bölümü + 6 hizmet kartı. Sayfası olmayan hizmet
  **bağlantı değil**, "Yakında" rozetiyle duruyor — hem 404 önleniyor hem de
  Next'in bağlantı ön yüklemesi ana sayfada başarısız istek üretmiyor
- **"İçeriğe geç" atlama bağlantısı**: klavye kullanıcısı menüyü tek tek
  geçmeden içeriğe atlıyor (WCAG 2.1 AA "Bypass Blocks")
- **Dokunma hedefleri 44x44px'e çıkarıldı** (menü, tema düğmesi, çıkış düğmesi)
- 375px'te üst menü **tek satıra sığdırıldı**: tarayıcıda ölçüldüğünde satır
  10px taşıyor ve menü düğmesi alta düşüyordu. Kelime-logo dar ekranda bir punto
  küçültüldü, boşluk daraltıldı; dokunma hedefleri korundu
- Sayfa çerçevesinin ölçüleri tek yerde: `page-shell` yardımcı sınıfı +
  `--page-*` token'ları. Üst menü, içerik ve alt bilgi aynı hizada

### Değiştirildi — adım 5
- **Site açıklamasından gerçek kurum adı çıkarıldı.** Önceki metin gerçek bir
  belediyenin adını taşıyordu; arama sonuçlarında ve bağlantı önizlemelerinde
  görünen bu metin, sitenin o kuruma ait olduğu izlenimini doğurabilirdi
- **`getCurrentSession()` istek başına bir kez okuyor** (React `cache`). Oturum
  aynı sayfada birden fazla yerden okunuyordu (üst menü + sayfa + korumalı
  sayfalarda `page-guard`) ve her biri ayrı bir sorgu açıyordu. Önbellek
  yalnızca o istek boyunca yaşıyor; istekler arasında hiçbir şey paylaşılmıyor
- **E2E local'de 2 işçiyle koşuyor** (önceden çekirdek sayısının yarısı). Test
  sayısı 92'den 118'e çıkınca beş paralel işçi tek Next sunucusu üzerinde 30
  saniyelik zaman aşımlarına yol açıyordu; testler tek tek geçiyordu, yani sorun
  testlerde değil koşum ortamındaydı. CI zaten tek işçi kullanıyor
- Şema **değişmedi**, migration **yok**

### Eklendi — adım 4c: Google ile giriş (OAuth)
- **"Google ile devam et" ile giriş ve kayıt** (`/api/auth/google` →
  Google → `/api/auth/google/callback`). Düğme metni bilerek "giriş yap" değil:
  aynı düğme hesabı olmayanı da kaydediyor
- **Üç koruma birlikte, hiçbiri isteğe bağlı değil**: `state` (CSRF), **PKCE**
  (çalınan yetkilendirme kodu işe yaramaz), `nonce` (jeton tekrar oynatılamaz).
  Biri tutmazsa akış oracıkta ölüyor, "yine de devam et" dalı yok
- **Hesap birleştirme kuralı (PRD §5.0, güvenlik açısından kritik)**: aynı
  e-postalı hesap varsa **otomatik birleştirilmiyor**. Birleşme yalnızca Google
  e-postayı doğrulanmış bildiriyorsa **ve** bizdeki hesabın e-postası da
  doğrulanmışsa oluyor; aksi hâlde oturum açılmıyor, hesap yazılmıyor, bağlantı
  kurulmuyor. Bu olmasaydı saldırgan, kurbanın e-postasıyla açtığı bir Google
  hesabıyla mevcut hesabı şifreyi hiç bilmeden devralabilirdi
- **Google KİMLİK DOĞRULAMAZ** — hesap `dogrulanmamis` kademesinde açılıyor;
  kimlik numarası, doğum tarihi ve personel yetkisi almıyor. Bu ekranda
  kullanıcıya da açıkça yazıyor
- **Oturum mevcut mekanizmayla açılıyor** (ADR-005): Google ile giren kullanıcı
  "tüm cihazlardan çık", "şifre değişince oturum düşer" ve anında iptal
  davranışını ek kod yazılmadan alıyor
- **İşlem çerezi tek kullanımlık** — hata yolunda bile siliniyor; aynı `state`
  ile ikinci deneme mümkün değil (tarayıcıda fiilen doğrulandı)
- **Tüm hatalar tek ekrana çıkıyor**: `state` uyuşmazlığı, PKCE hatası, geçersiz
  kimlik jetonu, Google'ın 5xx'i, iznin reddi. Ayrıştırmak saldırgana hangi
  korumaya takıldığını söylerdi
- **Hata kodları beyaz listeden geçiyor** — adres çubuğuna yazılan uydurma bir
  metin ekrana basılmıyor (kimlik avı / metin enjeksiyonu koruması)
- **Jeton saklanmıyor**: `accounts` tablosundaki `access_token` / `id_token`
  alanları bilerek boş. Google API'si çağrılmıyor; saklanmayan jeton sızmaz
- Testler: 34 yeni birim/entegrasyon + 9 E2E (masaüstü ve 375px).
  Toplam: **397** unit/entegrasyon · 36 veritabanı · 83 E2E

### Değiştirildi — adım 4c
- `openid-client@6.8.4` eklendi — OpenID Foundation **sertifikalı** istemci.
  Auth.js kurulmadı: iki ayrı oturum mekanizması doğurur ve ADR-005'in
  jeton-özeti tasarımını bozardı. `npm audit`: 0 açık
- `AUTH_SECRET` **gerekmiyor**: OAuth işlem çerezi `httpOnly` olduğu için
  imzalanmıyor — yönetilecek bir sır eksildi
- Şema **değişmedi**, migration **yok**: `accounts` tablosu adım 3'ten beri hazır

### Düzeltildi — adım 4c (preview'da tarayıcı denemesinde yakalandı)
- **Preview'ın adresi artık DAL adresinden alınıyor** (`VERCEL_BRANCH_URL`),
  dağıtım adresinden değil. Dağıtım adresi her commit'te değiştiği için
  (`...-egg0uqrln-...`) Google paneline önceden yazılamıyordu ve her dönüş
  `redirect_uri_mismatch` ile ölecekti. Dal adresi (`...-git-<dal>-...`) dal
  boyunca sabit. Aynı düzeltme giriş sonrası yönlendirmede Turnstile'ın
  hostname kontrolünü de kurtarıyor — iki hata tek sebepten geliyormuş
- **E2E'ye sahte Google istemcisi verildi.** Anahtarlar yokken düğme bilerek
  çizilmiyor, dolayısıyla CI'da testler düğmeyi bulamıyordu. Gerçek anahtar
  CI'ya taşınmadı: testler Google'ın giriş ekranına hiç girmiyor, yalnızca
  bizim ürettiğimiz adresi doğruluyor

### Eklendi — adım 4b-3: şifre sıfırlama ve hesap sayımı koruması
- **Şifre sıfırlama akışı (`/sifremi-unuttum` → `/sifremi-unuttum/dogrulama`)**:
  kimlik numarası → kayıtlı e-posta adresine 6 haneli kod → kod + yeni şifre.
  Kod kuralları kayıttakiyle aynı (5 dakika, 3 deneme, tek kullanımlık) ve aynı
  OTP mekanizması kullanılıyor — yeni bir mekanizma kurulmadı
- **Şifre değişince kullanıcının TÜM oturumları düşüyor** (ADR-005'in varlık
  sebebi). 4b-2'de hazırlanan `revokeAllSessionsForUser()` artık çağrılıyor
- **Hesap sayımı koruması üç katmanlı** (PRD §5.0): (1) kayıtlı ve kayıtsız
  numara aynı yanıtı alıyor, (2) kayıtsız numara için de **kimseye ait olmayan
  bir sahte kod kaydı** açılıyor — böylece ikinci ekran da aynı davranıyor
  (aynı deneme hakkı, aynı kilitlenme, aynı mesajlar), (3) yanıt süresi sabit
  bir tabana dolduruluyor. Yalnızca birinci ekranı eşitlemek korumayı yarım
  bırakırdı: fark ikinci ekranda okunurdu
- **Bot doğrulaması bu akışta ilk denemeden itibaren zorunlu** — giriş
  ekranındaki "2 başarısız denemeden sonra" kuralı buraya geçmiyor (PRD)
- **Kod önce doğrulanıyor, şifre politikası sonra**: sıra ters olsaydı kodu hiç
  bilmeyen biri "bu şifre hesabın adını içeriyor" yanıtını alabilir ve hesap
  sahibinin adını doğrulayabilirdi. Doğru kod politika hatasında **tüketilmiyor**;
  kullanıcı aynı kodla daha güçlü bir şifre yazabiliyor
- **Denetim kaydı**: `password_reset`, kimlik numarası ve düz IP yazılmadan
- Giriş ekranına "Şifrenizi mi unuttunuz?" bağlantısı ve sıfırlama sonrası
  "tüm cihazlardaki oturumlarınız kapatıldı" bilgisi eklendi
- Testler: 46 yeni birim/entegrasyon + 6 E2E (masaüstü ve 375px).
  Toplam: **363** unit/entegrasyon · 36 veritabanı · 74 E2E

### Değiştirildi — adım 4b-3
- `verifyOtp()` artık `consumeOnSuccess` seçeneği alıyor (varsayılan: eskisi
  gibi tüketir) ve başarıda kayıt kimliğini döndürüyor. Kayıt akışının davranışı
  değişmedi
- `otp_challenges.user_id` ilk kez kullanılıyor: sıfırlama kodunun hangi hesaba
  ait olduğu **yalnızca sunucuda** bu alanda duruyor, tarayıcıda değil.
  **Şema değişmedi, migration yok** — alan adım 3'ten beri vardı
- `registration-availability.ts` → `auth-availability.ts`: e-posta gönderimine
  bağlı iki akış (kayıt ve şifre sıfırlama) aynı kuralı paylaşıyor; biri açılıp
  diğerinin unutulmaması için kural tek yerde

### Eklendi — adım 4b-2: giriş, çıkış, oturum ve erişim kademeleri
- **Giriş ekranı (`/giris`)**: T.C. kimlik numarası + şifre. Giriş anında KPS
  sorgulanmıyor (PRD §5.0 — hız ve dayanıklılık); sahte KPS çökse bile mevcut
  kullanıcılar girebiliyor
- **Veritabanı oturumu (ADR-005)**: `sessions` tablosu, httpOnly çerezde 32
  baytlık rastgele jeton, veritabanında jetonun **özeti**. 7 gün ömür, kalan
  ömür 6 günün altına düşünce kayan yenileme. Süresi dolan satır okuma anında
  siliniyor (ADR-007)
- **Çıkış (`DELETE /api/sessions/current`)**: oturum satırı siliniyor, çerez
  düşüyor. Adres bir oturum kimliği taşımıyor — herkes yalnızca kendi çerezini
  düşürebilir
- **"Tüm oturumları düşür" mekanizması** kuruldu (şifre değişimi için); ekranı
  4b-3'te gelecek
- **Hesap sayımı koruması**: "böyle bir hesap yok" ile "şifre yanlış" aynı
  durum kodunu, aynı mesajı ve **aynı süreyi** üretiyor — hesap bulunamadığında
  sahte bir argon2 doğrulaması çalıştırılıyor. Sahte özetin parametrelerinin
  gerçek ayarlarla aynı kaldığını bir test koruyor
- **Giriş hız sınırı** 5 deneme / 15 dakika (IP + ziyaretçi bacağı) ve
  **2 başarısız denemeden sonra bot doğrulaması** (PRD §5.0)
- **Erişim kademeleri (PRD §5.0)**: `/hesabim` oturum istiyor; `/hastane` ve
  `/spor-salonu` yalnızca personele açık. Eksiğine göre farklı mesaj — kimlik
  doğrulanmamışsa yönlendirme var, personel değilse yok
- **Üst menü** oturum durumuna göre değişiyor (sunucuda okunuyor, istemciden
  gelen bir bayrağa güvenilmiyor)
- Açık yönlendirme koruması: `?donus=` yalnızca kendi yollarımızı kabul ediyor
- Testler: 54 yeni birim/entegrasyon + 12 E2E (masaüstü ve 375px).
  Toplam: 317 unit/entegrasyon · 36 veritabanı · 62 E2E

### Değiştirildi
- `docs/standards/00-stack.md` — "Auth" satırı ikiye ayrıldı: şifreyle giriş
  paketsiz (elle yazılmış veritabanı oturumu), Auth.js uyarısı artık yalnızca
  4c (Google ile giriş) için geçerli
- `ADR-005` — 2026-08-01 tarihli güncelleme notu: karar geçerli, mekanizma
  Auth.js değil elle yazılmış oturum; gerekçesi kaynak koddan doğrulandı
- Kayıt tamamlandı ekranındaki düğme artık giriş ekranına gidiyor

### Eklendi — yeni proje başlangıç kiti
- `docs/standards/16-yeni-proje-kurulumu.md` — **her projede aynı**: yeni bir
  projeye başlarken hangi dosyanın nereye kopyalanacağı, hangisinin projeye göre
  değişip hangisinin değişmediği. Amaç: iskeleti kurmak kullanıcının işi olmasın;
  kullanıcı yalnızca analiz dokümanını ve (varsa) farklı stack'i versin
- `docs/standards/sablonlar/` — dokuz doldurulabilir şablon (`PRD`, `roadmap`,
  `altyapi-durumu`, `CHANGELOG`, `sonraki-adim-prompt`, `data-model`,
  `integrations`, `fake-data-guide`, `ADR-000`) + klasör indeksi `OKUBENI.md`.
  Her şablonun başında **neden var olduğu** ve **ne zaman güncellendiği** yazıyor;
  doldurulunca o açıklama bloğu siliniyor
- `16-yeni-proje-kurulumu.md` içine **"proje hafızası — dört dosya"** tablosu:
  "hangi teknolojiyi kullandık" (`00-stack.md`), "hangi hesabı açtık"
  (`altyapi-durumu.md`), "neden böyle yaptık" (ADR'ler), "nerede kaldık"
  (`roadmap.md`). Gerekçe: oturum hafızasızdır, bu dört soru dosyaya yazılmazsa
  bir daha cevaplanamaz

### Değiştirildi — adım 4b-2 kararı
- **Auth.js `Credentials` sağlayıcısının veritabanı oturumunu desteklemediği
  kaynak koddan doğrulandı** (`@auth/core` → `assert.ts`: *"Signing in with
  credentials only supported if JWT strategy is enabled"*). Bu yüzden 4b-2'de
  şifreyle giriş **elle yazılmış veritabanı oturumuyla** yapılacak; ADR-005
  (oturum veritabanında) yürürlükte kalıyor ve `next-auth` kurulmuyor.
  Karar gerekçesi ve sonuçları `sonraki-adim-prompt.md` içinde

### Eklendi — oturum devri altyapısı
- `docs/standards/15-oturum-devri.md` — **her projede aynı**: bir bilginin
  hangi dosyaya yazılacağını söyleyen yönlendirme tablosu ve oturum sonu
  protokolü. Gerekçesi gerçek bir hata: bir oturumda Cloudflare hesabı açılmıştı,
  sonraki oturum bunu bilmediği için kullanıcıya aynı işi tekrar yaptırdı
- `docs/project/altyapi-durumu.md` — **projeye özel**: hangi hesap açık, panelde
  ne yapılandırılmış, hangi ortam değişkeni hangi ortamda tanımlı, ajan hangi
  araçlara erişebiliyor. Gizli anahtar DEĞERİ yazılmaz, yalnızca adı ve yeri
- `CLAUDE.md` kaynak hiyerarşisine `altyapi-durumu.md` eklendi: kullanıcıya
  "şunu aç" demeden önce okunması zorunlu

### Değiştirildi — canlı ortam
- Cloudflare Turnstile **gerçek anahtarlarla** devrede (preview + production);
  canlıda gerçek onay kutusu çıktığı doğrulandı. Teknik borç #21 kapandı
- Resend anahtarı production'a girildi, **canlıda kayıt açıldı**.
  Teknik borç #22 kapandı, yerine #25 doğdu (doğrulanmış alan adı olmadığı için
  yalnızca hesabın kayıtlı e-postasına gönderim yapılabiliyor)

### Eklendi — adım 4b-1 (TCKN ile kayıt)
- `src/app/kayit/` — üç adımlı kayıt akışı: kimlik doğrulama →
  salt okunur kimlik + iletişim/şifre → **iki bağımsız doğrulama kodu**.
  Her adım gerçek bir adres; geri tuşu çalışıyor, her adımın kendi
  yükleniyor/hata durumu var
- `POST /api/registrations` + `GET|PATCH|DELETE /api/registrations/current` +
  `.../current/otp-challenges` + `.../current/verifications`.
  **Taslak kimliği URL'de geçmez**, httpOnly çerezde taşınır
- `src/features/otp/` — `OtpChannel` adaptörü ve üç uygulaması:
  `MockChannel` (local/preview, kodu ekrana döndürür), `EmailChannel`,
  `EmailSmsSimulationChannel`. **Telefon kodu e-postaya gider ve simülasyon
  olduğu ekranda da e-postada da açıkça yazar** (teknik borç #1)
- `src/features/auth/` — kayıt servisi, **18 yaş kontrolü** (KPS'ten gelen
  tarihten, İstanbul takvim günüyle), argon2id şifre özetleme, şifre
  politikası, personel eşleştirme
- `registration_drafts` tablosu (ADR-012) — KPS yanıtının 15 dakikalık şifreli
  önbelleği. Düz metin kimlik numarası, e-posta, telefon veya kod hiçbir
  kolonda yok; çerez yalnızca rastgele bir jeton taşıyor
- `src/lib/turnstile.ts` — bot koruması, kayıt formunda **KPS sorgusundan önce**
  (ADR-004). Cloudflare'a ulaşılamazsa akış DURUR, kapı atlanmaz
- `src/lib/audit.ts` — `audit_logs` tablosuna ilk yazan. `src/lib/anonymous-id.ts` —
  hız sınırının oturum bacağını besleyen rastgele ziyaretçi kimliği
- Yeni bağımlılıklar: `argon2` (ADR-011), `react-hook-form`,
  `@hookform/resolvers`, `date-fns`
- Yeni ADR: **011** (argon2id) ve **012** (kayıt taslağı sunucuda şifreli)

### Değiştirildi
- `NATIONAL_ID_ENCRYPTION_KEY` artık **zorunlu** ve 32 bayt olduğu açılışta
  doğrulanıyor. Opsiyonel bırakılsaydı uygulama açılır, kayıt ucu çalışma
  anında ham bir kripto hatasıyla 500 dönerdi
- Ortam doğrulaması **production'da sahte OTP kanalını reddediyor**: sahte kanal
  kodu ekrana bastığı için yanlış yapılandırılmış bir production dağıtımının
  hiç açılmaması tercih edildi
- CSP'ye `challenges.cloudflare.com` eklendi (`script-src`, `frame-src`,
  `connect-src`). Bu satırlar olmadan Turnstile SESSİZCE bozuluyordu
- `created()` yanıtları artık her zaman `Cache-Control: no-store` taşıyor
- Tohumlama demo hesaplara argon2id şifresi yazıyor (teknik borç #15 kapandı)

### Düzeltildi
- `getRegistrationState` yanıtı **tam kimlik numarasını sızdırıyordu**: kimlik
  görünümü saklanan yükü olduğu gibi yayıyordu, o yük ise düz numarayı taşıyor.
  Artık alanlar tek tek beyaz listeden geçiyor
- Kontrol basamağı hatalı numara 422 yerine PRD'nin istediği **400** dönüyor;
  farklı bir durum kodu, tek tip mesajın sildiği ayrımı geri sızdırıyordu
- Doğrulama panelleri artık adlandırılmış bölge (`<section aria-labelledby>`);
  bilgi kutuları ekran okuyucuyu kesen `role="alert"` yerine `role="status"`

### Eklendi — adım 4a (sahte KPS servisi)
- `src/app/api/mock-kps/identity-queries/` — taklit edilen DIŞ KURUM ucu.
  Yalnızca POST (kimlik numarası URL'e değil gövdeye yazılır), yapay gecikme
  200–800 ms, `simulationBehavior` alanına göre `timeout` / `error` /
  `not_found` üretimi. **Paylaşılan gizli başlık olmadan 401 döner** (ADR-009)
- `src/features/identity/` — `IdentityProvider` arayüzü + `MockKpsProvider`.
  Zaman aşımı 3 sn, en fazla 2 yeniden deneme (üstel geri çekilme), devre
  kesici. **Yeniden deneme yalnızca zaman aşımı ve 5xx'te**; `not_found`,
  `mismatch` ve 4xx iş sonucudur, tekrarlanmaz
- `src/features/identity/services/identity-lookup.service.ts` — numara taraması
  koruması: tek tip başarısızlık mesajı, **sabit yanıt süresi** (bulundu /
  eşleşmedi / bulunamadı aynı sürer), her sorgu `KpsQueryLog`'a **numara
  yazılmadan** kaydedilir
- `src/lib/rate-limit.ts` — Postgres üzerinde hız sınırı sayacı (ADR-006).
  5 deneme / 15 dakika, IP + oturum bazlı. IP tuzlanmış özet olarak saklanır.
  **Sayaç kullanıcı denemesi başına artar**, iç yeniden denemeler artırmaz
- `src/lib/circuit-breaker.ts` — devre kesici, mevcut `rate_limit_counters`
  tablosu üzerinde (ADR-010). Yeni migration yok
- `MOCK_KPS_API_KEY` ortam değişkeni — **zorunlu**, her ortamda farklı
- `docs/project/decisions/ADR-009-*`, `ADR-010-*`
- Testler: 54 yeni unit/entegrasyon + 6 veritabanı + 5 E2E. E2E, derlenmiş ve
  çalışan uygulamaya dışarıdan başlıksız istek atıp 401 aldığını kanıtlıyor

### Değişti — adım 4a
- `NATIONAL_ID_HASH_SALT` artık **zorunlu** (IP özeti bunu kullanıyor)
- `src/lib/crypto.ts` — `hashPseudonym()` eklendi: kimlik numarası dışındaki
  tanımlayıcılar için alan ayrımlı (domain-separated) takma ad özeti
- `src/app/robots.ts` — production'da `/api/mock-kps` açıkça kapatıldı

### Eklendi — adım 3
- `prisma/schema.prisma` — `data-model.md`'deki **37 tablonun tamamı**, 26 enum,
  yabancı anahtarlar, index'ler ve eşzamanlılık için benzersiz index'ler
- `prisma/migrations/*_add_core_data_model` — tek migration; boş baseline'ın üstüne
  yalnızca `CREATE TABLE` / `CREATE INDEX` ekler, hiçbir şey silmez
- `prisma/seed/` — modül modül tohumlama: 200 sahte KPS vatandaşı, 35 birimlik
  teşkilat şeması, 100 personel, 90 üye hesabı, 45 market ürünü, 31 menü kalemi,
  4 üyelik paketi, 26 doktor + 6552 slot, 3 mekân + 576 koltuk + 12 etkinlik.
  Sabit kimlikler ve sabit tohumlu üreteç sayesinde **idempotent ve deterministik**
- `src/lib/national-id.ts` — kimlik numarası doğrulama (kontrol basamağı),
  maskeleme, tuzlanmış özet (HMAC-SHA256) ve AES-256-GCM şifreleme.
  Bağımlılık eklenmedi; `node:crypto` kullanıldı
- `tests/db/` + `npm run test:db` — **gerçek veritabanına bağlanan** testler:
  benzersiz index'lerin çalıştığı ve tohumlamanın idempotentliği kanıtlanıyor.
  CI'da `e2e.yml` içinde, PostgreSQL servisi ayakken koşuyor
- `docs/project/test-hesaplari.md` — tohumlama tarafından üretilir; sınır durum
  kayıtlarının (18 yaş altı, tam bugün 18, timeout, error, bulunamayan numara)
  ve örnek hesapların listesi. Production'da üretilmez
- `public/images/market|restaurant/*.svg` — telifsiz, kategori başına yer tutucu görsel

### Değişti — adım 3
- `docs/project/data-model.md` — iki düzeltme: tekilliği şifreli kolon değil
  `nationalIdHash` zorlar; `idempotencyKey` `Payment` üzerindedir, `Order` üzerinde değil.
  Ayrıca `OrgUnit.unitType` altı kademeye çıktı (üst yapı için)
- `.env.example` — `NATIONAL_ID_ENCRYPTION_KEY` / `NATIONAL_ID_HASH_SALT` artık
  adım 3'ten itibaren zorunlu ve local varsayılan değerleri var; `OWNER_BIRTH_DATE` eklendi

### Eklendi — adım 2
- `docker-compose.yml` — local PostgreSQL 18.4 (Neon'daki sürümle birebir aynı),
  sağlık kontrollü; `docker compose up -d --wait` bu kontrolü bekler
- `Dockerfile` — çok aşamalı build (deps → builder → runner), root olmayan kullanıcı,
  konteyner sağlık kontrolü. Vercel bu imajı kullanmaz; taşınabilirlik ve öğrenme için
- `prisma/schema.prisma` + `prisma.config.ts` — Prisma 7 kurulumu (model yok, adım 3'te gelir)
- `prisma/migrations/0_init` — boş baseline migration; migration boru hattının
  local (`migrate dev`) ve preview/production (`migrate deploy`) tarafında çalıştığını kanıtlar
- `prisma/seed.ts` — idempotent seed iskeleti
- `src/lib/db.ts` — tekil PrismaClient, `@prisma/adapter-pg` üzerinden (ADR-008)
- `npm run setup` — tek komutla kurulum: `npm ci` → Docker → migration → seed (~2,5 dk)
- `db:up`, `db:down`, `db:reset`, `db:migrate`, `db:deploy`, `db:studio` komutları
- **ADR-008** — Prisma bağlantısı için `@prisma/adapter-pg` kararı ve alternatifleri

### Değişti — adım 2
- `GET /api/health` artık veritabanını da kontrol ediyor: ulaşılabiliyorsa
  `200` + `db: "ok"`, ulaşılamıyorsa `503` + hangi parçanın düştüğü.
  Sorgunun zaman aşımı var (3 sn) — cevap vermeyen veritabanı ucu askıda bırakmaz
- `src/config/env.ts` — `DATABASE_URL` ve `DIRECT_URL` artık **zorunlu** ve
  `postgresql://` protokolü doğrulanıyor
- `next.config.ts` — `standalone` çıktısı yalnızca Docker imajı için açılıyor
  (`NEXT_OUTPUT=standalone`); `next start` bu modda çalışmadığı için kalıcı değil
- `e2e.yml` — Postgres servis kabı eklendi; E2E artık gerçek veritabanına bağlanıyor
  ve `migrate deploy` ile migration'ları uyguluyor
- `src/lib/http.ts` — hata yanıtları artık her zaman `Cache-Control: no-store` gönderiyor

### Düzeltildi — adım 2
- `prisma.config.ts` Prisma'nın `env()` yardımcısını kullanıyordu; bu, veritabanına
  hiç bağlanmayan `prisma generate` komutunu bile `DIRECT_URL` olmadan başarısız
  kılıyordu. Docker imajı derlenirken ve Vercel'in `postinstall` adımında patlıyordu

### Eklendi — adım 1
- `GET /api/health` — uygulama sağlık ucu; ortam, sürüm, commit ve zaman damgası döner.
  Yayın sonrası duman testinin ilk adımı bu (`CLAUDE.md §5.8`)
- `src/lib/errors.ts` — tiplenmiş hata sınıfları. Her hatanın makine için `code`'u ve
  kullanıcı için Türkçe mesajı var; beklenmeyen hatalar iç detay sızdırmadan
  `InternalError`'a düşer
- `src/lib/http.ts` — tek tip yanıt zarfı (`{ data }` / `{ error }`), tüm route
  handler'lar yanıtı buradan üretir
- `.github/workflows/ci.yml` — `format:check` → `lint` → `typecheck` → `test` → `build`
  + bağımlılık denetimi. Build ortam doğrulamasını gerçekten çalıştırır
- `.github/workflows/e2e.yml` — Playwright (masaüstü + 375px), tarayıcı önbellekli
- `.github/pull_request_template.md` — Definition of Done kontrol listesiyle

### Değişti — adım 1
- `src/config/env.ts` — preview ortamında `NEXT_PUBLIC_APP_URL` artık Vercel'in
  `NEXT_PUBLIC_VERCEL_URL` değişkeninden türetiliyor. Preview adresi her dalda
  değiştiği için sabit bir değer doğru olamıyordu
- `src/config/constants.ts` — `APP_VERSION` ve `BUILD_COMMIT` eklendi

### Düzeltildi — adım 1
- Sağlık ucu `Cache-Control` başlığı göndermiyordu. `export const dynamic =
  "force-dynamic"` yalnızca Next'in render davranışını değiştiriyor, yanıt başlığı
  eklemiyor — araya giren bir CDN "sağlıklı" cevabını dondurabilirdi. Artık
  `no-store` gönderiliyor ve bu üç seviyede test ediliyor (unit, entegrasyon, E2E)

### Eklendi — adım 0
- Roadmap adım 0 — proje iskeleti: Next.js 16 (App Router), TypeScript 6 (strict),
  Tailwind CSS 4, shadcn/ui (Radix tabanlı), ESLint + Prettier
- `src/config/env.ts` — ortam değişkenlerinin tek okuma noktası, Zod 4 ile doğrulanır;
  eksik değişkende uygulama açılışta Türkçe hata verip durur
- `src/components/layout/EnvBanner.tsx` — local ve preview ortamlarında ekranın
  üstünde `LOCAL` / `PREVIEW` şeridi (13-environments.md)
- `src/app/robots.ts` ve `src/app/sitemap.ts` — production dışındaki ortamlar
  arama motorlarına kapalı (`noindex`)
- `next.config.ts` — baseline güvenlik başlıkları (CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Test altyapısı: Vitest 4 + Testing Library (16 unit testi) ve
  Playwright (12 E2E testi — masaüstü + 375px mobil)
- `.env.example`, `.nvmrc`, `README.md`

### Değişti
- `docs/standards/00-stack.md` — sürüm sütunu eklendi ve fiilen kurulu sürümlerle
  eşitlendi (Next 15→16, PostgreSQL 16→18); sürüm tavanlarının gerekçesi yazıldı
- `REPO-YAPISI.md` — `tailwind.config.ts` çıkarıldı (Tailwind v4 bu dosyayı
  üretmiyor), `postcss.config.mjs` ve `components.json` eklendi
- `docs/project/roadmap.md` — teknik borç tablosuna 6 yeni satır (7–12)

### Güvenlik
- `sharp` 0.34.5 → **0.35.3** ve `postcss` 8.4.31 → **8.5.25** `overrides` ile
  yükseltildi; üretim bağımlılıklarında bilinen açık kalmadı (`npm audit --omit=dev`: 0)
