# ADR-018 — Hata takibi Sentry ile yapılır; log'a ve Sentry'ye giden her şey TEK süzgeçten geçer

**Tarih:** 2026-08-11
**Durum:** Kabul edildi
**İlgili:** ADR-016 (yeni hesap açtırmama ilkesi) · teknik borç #79, #96, #97, #98

## Bağlam

`docs/standards/12-operations-and-scaling.md` iki şey istiyor: **yapılandırılmış
(JSON) log** ve **üretimdeki her istisnanın bir hata takip aracına düşmesi**.
CLAUDE.md §5.9 aynı şeyi "sessiz hata kabul edilmez" diye yazıyor.

Adım 18a'dan önceki durum ölçüldü ve ikisi de yoktu:

- Kodda **35 ayrı `console.error`**, hepsi düz metin. Bir olayı ada göre süzmek,
  bir kullanıcıyı takip etmek veya bir arızanın kaç kez olduğunu saymak mümkün
  değildi.
- Hata takibi **hiç yoktu**. Canlıda bir istisna olsa Vercel'in kısa ömürlü
  çalışma zamanı log'una düşer ve kimse görmezdi. Bunun bedeli teorik değil:
  adım 16'nın planlı görevi canlıda hiç çalışmadı ve bu **günler sonra**,
  production veritabanı elle sorgulanarak fark edildi.
- ESLint `no-console` kuralında `warn` ve `error` **serbest bırakılmıştı**.
  35 satırın nasıl biriktiğinin cevabı bu: kuralın istisnası, kuralın kendisini
  geçersiz kılmıştı.

Üstelik teknik borç **#79** açıkça şunu söylüyordu: `fail()` beklenmeyen hatanın
`cause`'unu olduğu gibi log'a yazıyor ve Prisma bir doğrulama hatası
fırlattığında **argüman nesnesinin tamamını hata metnine koyuyor** — ad soyad,
doğum tarihi, maskeli kimlik numarası dahil.

## Karar 1 — Hata takibi Sentry, hesap Vercel Marketplace üzerinden açılır

**ADR-016 "proje sahibine yeni hesap açtırmamak, açtırmaktan iyidir" diyor ve bu
adımda o ilkeden BİLEREK sapılıyor.**

Sapmanın gerekçesi: haber kaynağında (ADR-016) anahtarsız bir alternatif vardı.
Burada yok. Hata takibinin tanımı gereği verinin uygulamanın dışına, uygulama
çöktüğünde bile ayakta kalan bir yere gitmesi gerekiyor. Kendi çözümümüzü
yazmak (hataları kendi veritabanımıza yazmak) tam da çalışmayacağı anı
kaçırırdı: veritabanı erişilemezken veritabanına hata yazılamaz.

Hesap **Vercel → Integrations → Sentry** yolundan açılıyor; Vercel dört ortam
değişkenini (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
`SENTRY_AUTH_TOKEN`) projeye kendisi enjekte ediyor, yani proje sahibinin elle
değer taşıması gerekmiyor.

**Veri bölgesi: AVRUPA BİRLİĞİ (Frankfurt).** Kurulumda sorulan "Data Storage
Location" **EU** seçildi ve bu geri alınamaz (Sentry belgesi: değiştirmenin tek
yolu yeni bir organizasyon açmak). Gerekçe: veritabanımız zaten Frankfurt'ta
(`eu-central-1`), yani hata verisi ve uygulama verisi aynı yerde kalıyor;
ayrıca yurt dışına aktarım KVKK açısından ABD'ye göre daha savunulabilir.
⚠️ Hangi bölge seçilirse seçilsin **hesap bilgileri (e-posta, bildirim ayarı,
2FA) her hâlükârda ABD'de** tutuluyor — bu Sentry'nin belgesinde yazılı.
Canlıdan ölçüldü: olaylar `ingest.de.sentry.io` adresine gidiyor.

**Bedeli kabul edildi:** üçüncü bir işleyici (Sentry) ve ücretsiz
katmanın sınırları (5.000 hata/ay · 1 kullanıcı · 30 gün saklama).

## Karar 2 — Log'a ve Sentry'ye giden her şey AYNI süzgeçten geçer

`src/lib/log-redact.ts` tek giriş noktası. `logger` her bağlamı, Sentry'nin
`beforeSend` kancası her olayı buradan geçiriyor.

**Neden tek yer:** kural iki ayrı yerde yaşasaydı biri güncellenir, diğeri
geride kalırdı — ve geride kalan taraf, kişisel veriyi üçüncü bir servise
gönderen taraf olurdu.

### Süzgecin İKİ bağımsız savunması var ve ikincisi vazgeçilmez

1. **Alan adına göre** — `{ password: … }` gizlenir.
2. **Değerin BİÇİMİNE göre** — serbest metnin içindeki kimlik numarası, kart
   numarası, telefon, e-posta ve jeton gizlenir.

⭐ **İkincisi olmadan borç #79 kapanmazdı.** Prisma'nın hata metninde değerler
bir alan adının arkasında değil, **cümlenin ortasında** duruyor. Alan adına
bakan bir süzgeç oradan hiçbir şey yakalayamaz.

### Ölçülerek düzeltilen bir gerekçe

İlk sürümde desenlerin sırasının önemli olduğu ("kart önce aranmalı, yoksa
16 hanenin ilk 11'i kimlik sanılır") yazılmıştı. **Sıra bilerek ters çevrilip
ölçüldü ve testler yeşil kaldı** — gerekçe yanlıştı. Gerçek koruma
lookaround'lar (`(?<!\d)` / `(?!\d)`): 11 hanelik desen, daha uzun bir rakam
dizisinin içinde hiç eşleşmiyor. Yorum gerçeğe göre düzeltildi.

Buna karşılık **biçim-tabanlı süzme tamamen kapatıldığında 9 test kırmızıya
döndü** — koruma gerçekten ısırıyor.

### Süzgeç olayın TAMAMINA uygulanmaz

`redact()` derinliği 5'te kesiyor ve uzun metinleri kırpıyor. Sentry olayı çok
daha derin (`exception.values[].stacktrace.frames[]`). Toptan uygulamak **yığın
izini yok ederdi** — yani hatayı bulunamaz hâle getirip, gözlemlenebilirliği
kazanmak yerine kaybederdik. `scrubEvent` bu yüzden yalnızca kişisel veri
taşıyabilen alanları hedefliyor; bir test yığın izinin bozulmadığını koruyor.

## Karar 3 — Sentry'nin veri toplama VARSAYILANLARI kapatılır

SDK'nın kendi tip tanımından okundu; varsayılanlar bu proje için tehlikeli:

| Ayar | Sentry varsayılanı | Bizde ne olurdu |
|---|---|---|
| `httpBodies` | hepsi | Kayıt isteğinin gövdesi = şifre + T.C. kimlik numarası |
| `cookies` | toplanır | `bb_session` oturum çerezi |
| `httpHeaders` | istek+yanıt | `Authorization`, `Cookie` |
| `databaseQueryData` | toplanır | Prisma sorgusunun parametre DEĞERLERİ |
| `stackFrameVariables` | toplanır | Yığındaki `password`, `nationalId` |
| `urlQueryParams` | toplanır | Adresteki tek kullanımlık jetonlar |

Altısı da kapatıldı. `tests/unit/sentry-options.test.ts` bunu bir **gerileme
kapısı** olarak koruyor: biri sessizce açılırsa test kırmızıya döner.

## Karar 4 — Oturum tekrarı ve oturum izleme KURULMAZ

**Oturum tekrarı (Session Replay)** Sentry'nin en çok öne çıkardığı özellik ve
kurulum sihirbazı varsayılan olarak açıyor. Kullanıcının ekranını kaydediyor —
bu projenin ekranlarında T.C. kimlik numarası, doğum tarihi ve kart numarası
alanları var. Maskeleme seçenekleri açık olsa bile **kaydın kendisi** KVKK m.6
anlamında yeni bir işleme faaliyeti ve aydınlatma metnimizde böyle bir işleme
yazmıyor. Açılacaksa önce ADR + aydınlatma metni, sonra kod.

**Oturum izleme (`BrowserSession`)** varsayılan entegrasyonlardan çıkarıldı.
Tarayıcıda ölçüldü: hiçbir hata olmadan, sadece anasayfa açılışında Sentry'ye
iki istek gidiyordu. Kapatma sebebi kota değil **tutarlılık**:
`/cerez-politikasi` kullanıcıya "Ölçüm ve istatistik" ve "Pazarlama"
gruplarının BOŞ olduğunu söylüyor (adım 17). Her sayfa görüntülemesinde üçüncü
bir servise ping atmak o cümleyi ruhen yanlışlardı.

**Ölçüm sonrası durum:** temiz sayfa açılışında sıfır konsol hatası, Sentry'ye
sıfır istek; gerçek bir hata fırlatıldığında tünelden tek istek — ve gövdede
kart numarası ile kimlik numarası **sıfır kez** geçiyor.

## Karar 5 — Olaylar `tunnelRoute` ile KENDİ alan adımızdan geçer

İki kazanç:

1. **CSP'ye dokunulmuyor.** Olaylar `ingest.sentry.io` yerine
   `/sentry-tunnel` yoluna POST ediliyor, yani `connect-src 'self'` satırı
   olduğu gibi kalıyor. Alternatif, güvenlik başlığına üçüncü bir dış kaynak
   eklemekti.
2. **Reklam engelleyiciler olayları düşüremiyor.** Engellenen bir hata takibi,
   hiç kurulmamış bir hata takibiyle aynı şeydir.

Bedeli dokümanda yazılı ve kabul edildi: olaylar kendi sunucumuzdan geçtiği
için sunucu yükü artıyor. Gerçek kullanıcı 0 ve tavan 5.000 olay/ay.

**Doğrulandı, varsayılmadı:** tünel route listesinde görünmüyor (route değil,
`rewrite`); varlığı `.next/routes-manifest.json` içinden ve tarayıcıdan giden
gerçek POST isteğinden ölçüldü.

## Karar 6 — `logger.error` / `logger.warn` bir sink üzerinden Sentry'ye gider

Sentry kendiliğinden yalnızca **yakalanmamış** istisnaları görüyor. Bu projedeki
en önemli arızaların çoğu ise bilinçli olarak yakalanıyor: planlı görevin
düşmesi, e-posta gönderilememesi, ziyaretçi sepetinin taşınamaması. Sink
olmasaydı tam da izlemek istediğimiz şeyler görünmezdi.

Sink `setLogSink()` ile kaydediliyor, logger Sentry'yi doğrudan içe aktarmıyor:
log katmanı Sentry hiç kurulmamışken de çalışmalı ve testler Sentry kurulumu
gerektirmemeli.

## Canlıda nasıl doğrulanır (ve nasıl doğrulanmaz)

⛔ **TEK KOMUTLUK BİR `curl` KONTROLÜ YOKTUR.** Bu oturumda üç kez denendi ve
üçü de yanlış çıktı; sonuncusu gerçek organizasyon kimlikleriyle bile 404
döndü, çünkü Sentry'nin ingest ucu o yolda **yalnızca POST** kabul ediyor ve
Vercel'in vekil sunucusu bunu 404 olarak yansıtıyor.

Ayrıca tünel kuralının **DSN ile hiçbir ilgisi yok** — SDK kaynağından okundu
(`getFinalConfigObjectUtils.js`): tek koşul `tunnelRoute` ayarının dolu olması.
Yani "tünel var mı" sorusu "Sentry çalışıyor mu" sorusunu cevaplamıyor.

**GEÇERLİ TEK YÖNTEM — uçtan uca tarayıcı testi:**

1. Canlı sayfayı aç, konsoldan bilerek bir hata fırlat
2. Ağ sekmesinde `POST /sentry-tunnel?o=…&p=…` isteği çıkmalı ve **200** dönmeli
3. Yanıt gövdesinde bir olay kimliği olmalı (`{"id":"…"}`) — olay Sentry'ye yazıldı demektir
4. ⭐ **İstek gövdesini OKU:** kimlik numarası, kart numarası ve e-posta
   `[gizlendi]` olmalı; yığın izi ise BOZULMAMIŞ olmalı

2026-08-11'de bu dört adım canlıda uygulandı ve geçti.

## Sonuçlar

**Kazanılan**

- Borç **#79 ödendi** — hem sunucu log'unda hem Sentry'de.
- `no-console` **istisnasız** yasak; tek kapı `logger`.
- Kök hata sınırı (`global-error.tsx`) geldi: yerleşim çökse bile kullanıcı boş
  beyaz ekran değil, Türkçe bir mesaj görüyor — ve o hata artık kaydediliyor.
- Üç sayfa hata sınırı önceden sabit bir metin yazıyordu, yani **hatayı
  kaybediyordu**; artık `captureException` çağırıyorlar.

**Kaybedilen / ertelenen**

- Yeni bir dış hesap ve yeni bir bağımlılık (`@sentry/nextjs`, +103 alt paket,
  `npm audit`: 0 açık).
- **Cron izleyicisi kurulamadı (borç #96):** seçenek `webpack.` altında, bu
  proje **Turbopack** ile derleniyor, yani sessizce etkisiz kalırdı.
  Yapılandırmada bırakmak "alarmım var" sanmak olurdu — kaldırıldı.
- **İstek kimliği log satırlarına otomatik girmiyor (borç #97):** `AsyncLocalStorage`
  + ara katman gerekiyordu, bu her route'a dokunmak demekti (CLAUDE.md §7).
- **Kaynak haritası yüklemesi Turbopack'te doğrulanmadı (borç #98).**

## Alternatifler ve neden reddedildiler

**Yalnızca yapılandırılmış log, hata takibi yok.** Borç #79'u kapatırdı ve dış
hesap gerektirmezdi. Reddedildi: uyarı yok, Hobby planında log saklama süresi
çok kısa ve "sessiz hata kabul edilmez" maddesi kapanmazdı — bir hatayı ancak
biri log'a bakmayı akıl ederse görürdük.

**Sentry hesabını doğrudan sentry.io'dan açmak.** Vercel'e bağımlı olmayan,
taşınabilir bir hesap olurdu. Reddedilmedi, ikinci seçenek olarak duruyor;
Marketplace yolu yalnızca proje sahibinin elle değişken taşımasını ortadan
kaldırdığı için tercih edildi.

**Süzgeci yalnızca alan adına bakacak şekilde yazmak.** Daha basit ve daha az
yanlış pozitif üretirdi. Reddedildi: borç #79'un tam olarak kapatamadığı
senaryo bu — Prisma değerleri metnin içine koyuyor.
