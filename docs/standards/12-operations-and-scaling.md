# 12 — Çalıştırma, İzleme, Büyütme ve Bakım

## Çalışma zamanı
- Uygulama durumsuzdur; kalıcı veri yalnızca veritabanı ve blob depolamadadır.
- Sağlık ucu: `GET /api/health` → uygulama + veritabanı durumunu döner.
- Zaman aşımı ve yeniden deneme: dış API çağrılarında timeout zorunlu,
  yeniden deneme üstel geri çekilme ile ve en fazla 2 kez.
- Dış servis çökerse uygulama çökmez: widget hata durumunu gösterir, sayfa ayakta kalır.

⛔ **Konteyner geçicidir:** içine sonradan yazılan dosya yeniden açılışta
kaybolur. Yüklenen dosya konteynerin diskine değil, `FileStorage`
adaptörünün seçtiği depoya gider; `public/` altına asla
(`05-auth-security.md` → *"Dosya yükleme ve depolama"*).

### ⭐ Açılış sırası — ne yokken DÜŞER, ne yokken kısıtlı DEVAM EDER

**Hızlı düşme / fail-fast** ile **kısıtlı devam / graceful degradation.**
*Gerçek hayat:* uçağın kalkış kontrol listesi — yakıt göstergesi çalışmıyorsa
**kalkmazsın**, havada öğrenmek felakettir; kabin eğlence sistemi bozuksa
**kalkarsın**, yolculara duyurursun. Ayrım: o parça yokken uçak **yalan
söyler mi** (yakıt var sanıp yok)?

Konteyner açılırken bağımlılıklar **sırayla** kontrol edilir. Olmadan
yaşayamayacağı şey yoksa uygulama **açılmaz ve nedenini yazar** — DevOps
duman testinde görür; sessiz yarım açılmış uygulama (kullanıcı "kaydoldu"
sanır, olmadı) bundan çok daha kötüdür. Olmadan kısıtlı yaşayabileceği şey
yoksa **uyarı loglar, `/api/health` `degraded` döner**, açılır.

```
1. Ortam değişkenleri — Zod        ✗ → DÜŞ   (eksik değişken = bilinmeyen davranış)
2. Migration (kurum, açılışta)     ✗ → DÜŞ   (şeması eksik uygulama "kolon yok" der)
3. DI konteyneri kurulur
4. Veritabanı havuzu               ✗ → DÜŞ   (onsuz hiçbir istek doğru cevaplanamaz; 5 sn zaman aşımı)
5. Redis (kuyruk, önbellek)        ✗ → ADR: OTP/SMS zorunluysa DÜŞ; değilse DEGRADED + uyarı
6. Worker süreci (ayrı konteyner)  kuyruğu dinler; repeatable (cron) işler kaydedilir
7. HTTP dinleme + /api/health      { status: ok | degraded, checks: { db, redis, storage } }
8. Ters vekil trafiği yeni kaba çevirir
9. Eski kap SIGTERM alır → yeni istek kabul etmez → açık istekleri bitirir (≤ 30 sn) → kapanır
   (graceful shutdown: `app.enableShutdownHooks()`; entrypoint `exec` ile başlatır ki sinyal Node'a ulaşsın)
```

| Bağımlılık | Yokken | Neden |
|---|---|---|
| Ortam değişkeni · veritabanı · migration | ⛔ Düş | Uygulama kullanıcıya yalan söyler |
| Redis | ADR'ye göre | OTP'siz giriş yoksa uygulama zaten kullanılamaz; yalnızca rapor kuyruğuysa devam |
| Dış servisler (KPS, SMS geçidi, e-Belediye) | ✅ Devam — **asla düşme** | İstek anında hata verilir; dış servis kapalı diye kurum sitesi kapanmaz (`integrations.md`) |
| Dosya deposu | ⚠️ Degraded | Yükleme kapalı, okuma çalışır |
| Hata takibi (Sentry/GlitchTip) | ✅ Devam | Gözlemleyen, gözlediğini düşüremez (yukarıda) |

⭐ **Kararı veren soru:** *"Bu bağımlılık yokken uygulama kullanıcıya yalan
söyler mi?"* Söyler → düş. Söylemez → devam et, uyar. Hangi bağımlılığın
hangi kutuda olduğu `altyapi-durumu.md`'de yazılıdır.


## Loglama

**Kütüphane:** ayrı backend varsa `nestjs-pino`, Next tek başınaysa `pino`.
Seçim gerekçesi: JSON'u varsayılan olarak üretir ve kurumsal log toplama
sistemleri (Loki, ELK) **düz metin toplayamaz, JSON toplar.** Kurum projesinde
log biçimi senin tercihin değil, DevOps'un altyapısıyla **sözleşmendir**.

### ⛔ İki tür kayıt karıştırılmaz

| | **Uygulama logu** | **Denetim kaydı (audit log)** |
|---|---|---|
| Ne yazar | "İstek geldi, 45 ms sürdü, 200 döndü" | "Ali, 14:32'de 1042 no'lu kaydı kapattı" |
| Kime lazım | Geliştirici / DevOps | **İş birimi, denetim, hukuk** |
| Nerede durur | stdout → toplama sistemi | **Veritabanında tablo** |
| Ömrü | Günler–haftalar | Yıllar (mevzuat) |
| Nasıl görülür | Log arama ekranı | **Uygulama içinde ekran** |

⛔ **Denetim kaydını uygulama loguna yazmak bir tasarım hatasıdır:** log'lar
döner ve silinir; "bu kaydı kim değiştirdi" sorusu 2 yıl sonra sorulur.
Denetim kaydı **veriyi değiştiren işlemle aynı transaction içinde** tabloya
yazılır — yarısı yazılıp yarısı yazılmasın diye.

- Yapılandırılmış (JSON) log. `console.log` ile hata ayıklama çıktısı bırakılmaz.
- Her log satırında: zaman, seviye, istek kimliği, kullanıcı kimliği (mümkünse anonim), olay.
- **Log'a asla:** şifre, token, kart numarası, TCKN, e-posta gövdesi.
- Seviyeler: `error` (müdahale gerekir) · `warn` (beklenmedik ama tolere edilebilir) ·
  `info` (iş olayı: sipariş oluştu) · `debug` (sadece local).

### ⛔ `no-console` İSTİSNASIZ yasaklanır — tek kapı logger'dır

`no-console` kuralına `warn` ve `error` için istisna tanımak, kuralı geçersiz
kılar. Bir projede ölçüldü: istisna açıkken **35 ayrı düz metin `console.error`**
birikmişti. O satırların hiçbiri JSON değildi, kişisel veri süzgecinden
geçmiyordu ve hata takip aracına ulaşmıyordu.

Kural: `"no-console": "error"` (izin listesi YOK). Muafiyet yalnızca üç yere:
**log katmanının kendisine**, komut satırı betiklerine (tohumlama gibi) ve
`console`'u yalnızca casuslamak için anan testlere.

### ⛔ Kişisel veri süzgeci alan adına DEĞİL, DEĞERİN BİÇİMİNE de bakar

Yalnızca alan adına bakan bir süzgeç (`password`, `email` …) yetmez.
**ORM'ler ve doğrulama kütüphaneleri, hata mesajının İÇİNE argüman nesnesinin
tamamını düz yazı olarak koyuyor** — yani değerler bir alan adının arkasında
değil, cümlenin ortasında duruyor.

İki bağımsız savunma zorunlu:
1. **Alan adına göre** — yapılandırılmış bağlamı kapatır
2. **Değerin biçimine göre** — serbest metnin içindeki kimlik numarası, kart
   numarası, telefon, e-posta ve jetonu kapatır

⚠️ Rakam desenlerinde `\b` GÜVENİLMEZ: iki rakam arasında sınır görmediği için
uzun bir sayının ortasından kesip yanlış eşleşme üretir. Lookaround kullan
(`(?<!\d)` / `(?!\d)`).

⛔ **Süzgeci hata takip olayının TAMAMINA uygulama.** Derinlik ve uzunluk
sınırları yığın izini yok eder; hatayı bulunamaz hâle getiren bir gizlilik
önlemi, gözlemlenebilirliği kazandırmaz, kaybettirir. Yalnızca kişisel veri
taşıyabilen alanları hedefle ve yığın izinin bozulmadığını bir testle koru.

### Süzgeç TEK yerde yaşar
Sunucu log'u ve hata takip aracı **aynı** süzgeç fonksiyonundan geçer. İki ayrı
kopya olsaydı biri güncellenir, diğeri geride kalırdı — ve geride kalan taraf,
veriyi üçüncü bir servise gönderen taraf olurdu.

## İzleme (observability)
- Hata takibi: Sentry (ücretsiz katman) — üretimdeki her istisna yakalanır; kurum modunda GlitchTip / kurumun aracı (aşağıda *"Hata takibi ne yakalar"*).
- ⛔ **YAKALANMIŞ hatalar da iletilir.** Hata takip SDK'ları kendiliğinden
  yalnızca **yakalanmamış** istisnaları görür. Oysa en önemli arızaların çoğu
  bilinçli olarak yakalanır (planlı görevin düşmesi, e-posta gönderilememesi,
  dış servisin cevap vermemesi). Log katmanının `error`/`warn` çağrıları bir
  kanal üzerinden hata takibine de iletilmezse, tam da izlenmek istenen şeyler
  görünmez kalır.
- ⛔ **Gözlemlenebilirlik katmanı, gözlediği uygulamayı DÜŞÜREMEZ.** Log ve hata
  takibi dosyaları, açılışta fırlatan bir yapılandırma doğrulayıcısını içe
  aktarmaz; ortam değişkenini doğrudan okur. Yapılandırma hatasını raporlaması
  beklenen modülün o hata yüzünden açılamaması, sessiz bir körlük üretir.
- ⛔ **Hata takibi olayları kendi alan adımızdan geçirilir** (tünel/proxy).
  İki kazanç: güvenlik başlığına (CSP) üçüncü bir dış kaynak eklemek gerekmez
  ve reklam engelleyiciler olayları düşüremez. **Engellenen bir hata takibi,
  hiç kurulmamış bir hata takibiyle aynı şeydir.**
- Performans: Vercel Analytics — Core Web Vitals izlenir (LCP < 2.5s, INP < 200ms, CLS < 0.1).
- Çalışma süresi izleme: sağlık ucuna dışarıdan periyodik ping.
- Uyarı eşikleri tanımlıdır: hata oranı %1'i geçerse, yanıt süresi 2 katına çıkarsa haber ver.

### Hata takibi ne yakalar, alternatifleri ne, kurumda ne olur

**Hata takibi / error tracking / hata izleme servisi** — *Gerçek hayat:*
uçaktaki kara kutu: kaza olduğunda "ne oldu" sorusunu pilotun hatırlamasına
bırakmaz, son dakikaları kayıttan verir. *Yazılım:* canlıda fırlayan her
istisnayı (exception) toplayıp bir panelde gösteren servis. Yalnızca "hata
oldu" demez; her hata için şunları verir:

| Ne | Ne işe yarar |
|---|---|
| **Yığın izi** (stack trace) — hatanın hangi dosya, hangi satırdan geldiği; **source map** ile derlenmiş kodda değil senin yazdığın satırda | "Nerede" |
| **Breadcrumb** (ekmek kırıntısı) — hatadan önceki son işlemler: hangi sayfaya girdi, hangi isteği attı, hangi butona bastı | "Hangi adımlardan sonra" |
| **Bağlam** — tarayıcı, işletim sistemi, uygulama sürümü (release), kullanıcı kimliği (maskeli) | "Kimde, hangi sürümde" |
| **Gruplama ve sayım** — aynı hata 400 kez olduysa 400 satır değil, 1 grup + sayaç; ilk ve son görülme | "Ne kadar yaygın, yeni mi" |
| **Uyarı** — yeni hata grubu çıkınca ya da sayı eşiği aşınca bildirim | "Ben bakmadan haber ver" |

⛔ Sentry yalnızca **fırlayan** hatayı görür; veri yanlış ama kod hata
vermiyorsa (yanlış hesaplanan tutar) göremez — onun için `warn` seviyesinde
**bilinçli** log ve iş kuralı testleri (`06-testing.md`).

| Araç | Ne | Ne zaman |
|---|---|---|
| **Sentry** | Piyasa standardı, ücretsiz katman, Next/Nest SDK'sı olgun | ⭐ Kendi proje varsayılanı |
| **GlitchTip** | Sentry'nin açık kaynak, **kendi sunucunda** kurulan uyumlusu; aynı SDK çalışır (`SENTRY_DSN` adresi değişir) | ⭐ **Kurum modu** — veri dışarı çıkamıyorsa |
| Bugsnag · Rollbar · Highlight | Aynı iş, farklı fiyat/panel | Kurum dayatıyorsa |
| OpenTelemetry + Grafana/Loki | Hata takibi değil, **izleme altyapısı**: log + metrik + iz (trace) tek yerde; hata takibi bunun üstüne kurulur | Kurumun DevOps'unda genelde bu vardır |

⭐ **Kurum modunda kural:** hata takibi olayı kurum ağından **dışarı gitmez**
(kişisel veri ve KVKK). Ya kurumun izleme aracına JSON log ile yazılır
(DevOps'a sorulur — `kurumdan-ogrenilecekler.md` → *"BÖLÜM 5"* satır 5.7),
ya da kurum içine GlitchTip kurulur; Sentry bulutu **kullanılmaz**. Kod tarafı
aynı kalır — SDK aynı, yalnızca adres değişir.

## Yedekleme ve kurtarma
- Veritabanı otomatik günlük yedek (Neon point-in-time recovery).
- Yedekten geri dönüş **denenmiş** olmalı; denenmemiş yedek yedek değildir.
- Blob depolamadaki kullanıcı dosyaları da yedek kapsamındadır.

## Performans ve büyütme sırası
Büyütme kararı **ölçümle** verilir, tahminle değil. Sıra:
1. **Sorgu ve index düzeltmesi** (kazancın çoğu burada)
2. **Önbellek**: etiketli veri önbelleği + yazarken geçersiz kılma, dış API yanıtları (`01-architecture.md` → *"Önbellek ve tazelik"*)
3. **CDN**: statik içerik ve görseller (Next.js Image ile otomatik boyutlandırma)
4. **Bağlantı havuzu**: sunucusuz ortamda Prisma için pooler kullan
5. **Yatay ölçekleme**: Vercel otomatik; kendi sunucunda kopya sayısı artırılır.
   Uygulama **durumsuz** olduğu sürece sorun çıkmaz — aşağıdaki kurala bak
6. **Kuyruk**: e-posta, bildirim, rapor gibi işler istek döngüsünden çıkarılır
7. **Okuma replikası / veri bölme**: ancak gerçekten gerekirse, ADR ile

Erken optimizasyon yapılmaz. Önce ölç, sonra düzelt, sonra tekrar ölç.

## ⛔ BÖLGE EŞLEŞMESİ — sunucu ile veritabanı aynı kıtada olur

En sık yapılan ve en sessiz hata: uygulama bir bölgede, veritabanı başka
bölgede. Her sorgu okyanus geçer; 10 sorgulu bir sayfa 1–2 saniye geç açılır.

⛔ **Kurulumda ikisi de açıkça seçilir ve `altyapi-durumu.md`'ye yazılır.**
Varsayılana bırakılmaz — Vercel varsayılanı ABD'dir (`iad1`), veritabanını
Frankfurt'ta açarsan her istek Atlantik'i iki kez geçer.

| Kullanıcı kitlesi | Veritabanı bölgesi | Fonksiyon bölgesi |
|---|---|---|
| Türkiye / Avrupa | Frankfurt (`eu-central`) | **Aynısı** (`fra1`) |
| Kurum sunucusu | Kurumun bulunduğu yer | Aynı ağ |

### ⚠️ "Edge'e taşıyalım, hızlanır" — çoğu zaman YANLIŞ

Edge çalışma zamanı kodu kullanıcıya yaklaştırır, **veritabanına değil.**
Üstelik Edge'de doğrudan Postgres bağlantısı (TCP) açılamaz; araya HTTP
sürücüsü girer. Veritabanın tek bölgedeyse Edge'e taşımak her sorguyu
**yavaşlatır**, hızlandırmaz.

| Sayfa | Nerede çalışmalı |
|---|---|
| Veritabanına giden her şey | **Veritabanının yanındaki bölgede** |
| Statik / ISR ile üretilmiş sayfa | CDN'den gelir; zaten Edge'dedir, ayrıca ayar gerekmez |
| Yalnızca çerez okuyup yönlendiren ara katman (`proxy.ts` — Next 16 adı) | Edge uygun |

⛔ **Asıl sorun genellikle "10 API isteği"nin kendisidir.** Açılışta on ayrı
istek atılıyorsa çözüm bölge değiştirmek değil, **sunucu bileşeninde tek seferde
veri çekmektir** (`01-architecture.md` → *"Katmanlar"*). Bölge eşleşmesi bunun
yerine geçmez, ikisi ayrı iştir.

## ⛔ ANİ YÜK (spike) — tarihi belli kalabalık BAŞTAN planlanır

Başvuru açılışı, etkinlik kaydı, yemek saati: saat 12:00'de 20.000 kişi aynı
anda girer. Bu, kademeli büyüme değildir; **planlanabilir bir olaydır** ve
plansız girilirse sistem o dakikada çöker.

⛔ **PRD'de "aynı anda kaç kişi ve ne zaman" sorusu sorulur.** Cevap yoksa
tasarım yapılamaz — tahmin edilmez, sorulur.

### Darboğaz HTTP katmanı değil, VERİTABANI BAĞLANTISIDIR

Yaygın yanılgı, HTTP çatısını hızlandırmaktır (Express → Fastify gibi). Ani
yükte istekler HTTP'de değil, **veritabanı bağlantı sayısında** birikir:

| Mimari | Ne olur |
|---|---|
| **Sunucusuz** (Vercel/Lambda) | Fonksiyon sayısı saniyeler içinde binlere çıkar; her biri veritabanına bağlanmak ister. Postgres bağlantı sayısı sınırlıdır → **veritabanı çöker, uygulama ayakta kalır** |
| **Kendi sunucun** (NestJS) | Kapasite önceden büyütülmediyse CPU/RAM dolar → **uygulama çöker, kimse hizmet alamaz** |

⛔ Bu yüzden Fastify'a geçmek ani yük gerekçesiyle **savunulamaz**: HTTP
ayrıştırması darboğaz değildir. Fastify ölçülmüş bir HTTP darboğazı varsa
seçilir, "trafik çok olacak" sezgisiyle değil.

### Ani yük öncesi zorunlu beş madde

| # | Ne | Neden |
|---|---|---|
| 1 | **Bağlantı havuzu (pooler)** — sunucusuzda zorunlu | Binlerce fonksiyonu az sayıda gerçek bağlantıya indirir. Yoksa veritabanı ilk dakikada düşer |
| 2 | **Yazma işlerini kuyruğa al** | Kayıt kabul edilir, işlenmesi kuyruğa gider; kullanıcı beklemez, veritabanı sıraya girer |
| 3 | **Okuma sayfalarını statik/ISR yap** | 20.000 kişinin çoğu **okumaya** gelir. Statik sayfa CDN'den döner, veritabanına hiç gitmez |
| 4 | **Hız sınırı** (IP + oturum) | Yenile tuşuna basan kullanıcı ve bot yükü ikiye katlar |
| 5 | **Sıra/bekleme ekranı** — kapasite aşılırsa | Beyaz ekran ve zaman aşımı yerine *"sıradasınız"* demek, çökmüş görünmekten iyidir |

⭐ **Yük testi ile doğrulanır**, varsayımla değil: beklenen sayının **iki katıyla**
test edilir ve sonuç `altyapi-durumu.md`'ye ölçüm tarihiyle yazılır.

⛔ **Kendi sunucundaysan ölçeklendirme olaydan ÖNCE elle büyütülür.** Otomatik
ölçeklendirme dakikalar içinde tepki verir; ani yük saniyeler içinde gelir.

### Ayrı backend varsa: bağımsız ölçeklenebilirlik BAŞTAN kurulur

Web, API ve worker **ayrı ayrı kopyalanabilmelidir.** Bu sonradan eklenen bir
özellik değil, baştan korunan bir kısıttır — bozulursa fark edilmez, yük
geldiğinde anlaşılır.

Neden önemli: yük her katmana eşit binmez. Sabah mesai başında yük **API'ye**
biner (kimlik doğrulama, sorgu), web tarafı yalnızca hazır sayfa gönderir.
Ayrıysa API 6 kopyaya çıkar, web 1 kalır. Tek parçaysa gereksiz olan da 6 kez
çalışır ve 6 kat kaynak ödenir.

**Bunu mümkün kılan üç kural — ihlali ölçeklemeyi sessizce kırar:**

1. **Süreçler durumsuzdur.** Oturum, sayaç, kilit, geçici dosya süreç belleğinde
   tutulmaz — ikinci kopya açıldığında o veriyi göremez. Paylaşılan durum
   Postgres veya Redis'te yaşar.
2. **Worker ayrı süreçtir**, API'nin içinde `setInterval` ile çalışmaz. Aksi
   halde API'yi 6 kopyaya çıkardığında zamanlanmış iş **6 kez** çalışır.
3. **Zamanlanmış işler tekil çalışacak şekilde korunur** (kuyruk motorunun
   kilidi veya benzersiz iş anahtarı). Kopya sayısı arttığında mükerrer işlem
   ve mükerrer bildirim üretilmemelidir.

⚠️ **Test:** her servisten **iki kopya** çalıştırıp uygulamayı bir kez baştan
sona kullan. Oturum düşüyorsa, sayaç sıfırlanıyorsa veya bildirim iki kez
geliyorsa durumsuzluk kuralı çiğnenmiş demektir.

## Bakım
- Haftalık: hata panosu gözden geçirilir, `pnpm audit` çalıştırılır.
- Aylık: bağımlılık güncellemeleri ayrı PR ile; major yükseltmeler tek tek.
- Sürekli: teknik borç `docs/project/roadmap.md` içinde açıkça listelenir, gizlenmez.
- Kullanılmayan özellik, tablo ve bağımlılık silinir (bkz. deprecation süreci).

## Olay (incident) müdahalesi
1. Durdur: gerekiyorsa önceki dağıtıma dön (rollback)
2. Etkiyi ölç: kaç kullanıcı, hangi akış
3. Düzelt: önce hatayı yakalayan test, sonra düzeltme
4. Yaz: `docs/project/decisions/` altında kısa olay notu — ne oldu, neden, tekrarı nasıl önlenir
Suçlu aranmaz, süreç düzeltilir.

## Hizmet hedefleri (SLO)

Ölçülebilir hedef yoksa "yavaş" tartışması bitmez. ⭐ **Aşağıdakiler
BAŞLANGIÇ değerleridir**, dondurulmuş hedef değil — her projede gözden geçirilir
ve kabul edilen değer `PRD.md` → *"Kalite gereksinimleri"* içine yazılır.

| Hedef | Başlangıç değeri |
|---|---|
| Kullanılabilirlik | aylık %99 |
| API p95 yanıt süresi | < 500ms |
| Hata oranı | < %1 |

⚠️ **Kurum bir hizmet seviyesi dayatıyorsa o geçerlidir** (`00-stack.md` →
*"DAYATILAN SEÇİM"*); şartnamedeki rakam buraya yazılır ve sapma ADR'ye girer.

Hedef aşılırsa performans işi, yeni özellik işinin önüne geçer.

## Planlı görevler (cron)

Tipik olanlar — projede karşılığı yoksa kurulmaz:
- Süresi dolan rezervasyonları (koltuk, slot, stok) serbest bırakma
- Süresi dolan verileri temizleme (saklama politikası)
- Üyelik bitiş hatırlatması
Her planlı görev **idempotent** olur: iki kez çalışırsa veri bozulmaz.
Çalıştığı ve sonucu loglanır; sessizce başarısız olmasına izin verilmez.

## Bakım penceresi ve duyuru
Kesinti gerektiren işlem varsa kullanıcıya önceden bildirilir ve
bakım sayfası gösterilir; boş beyaz ekran bırakılmaz.
