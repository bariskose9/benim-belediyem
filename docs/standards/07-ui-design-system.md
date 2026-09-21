# 07 — Arayüz ve Tasarım Sistemi

## İlkeler
Modern ama sade. Süs değil, netlik. Az sayıda bileşen, tutarlı kullanım.
Kullanıcı her ekranda "şimdi ne yapmalıyım" sorusunu bir bakışta cevaplayabilmeli.

## Tasarım yönü — koddan ÖNCE karar
⛔ **Tek satır arayüz kodu yazılmadan önce üç şey kararlaştırılır ve
`ADR-*-tasarim-yonu.md` olarak yazılır.** Kararsız bırakılan yerde model kendi
varsayılanına düşer; "yapay zekâ işi" görüntüsünün kaynağı yasak listesi
eksikliği değil, **karar eksikliğidir**.

| Karar | Ne yazılır |
|---|---|
| **Yazı ailesi** | Ad + neden. Gövde ve başlık aynı aileden farklı ağırlık olabilir; ikinci bir aile ancak gerekçeliyse |
| **Palet** | Bir marka rengi + bir nötr gri ölçeği + durum renkleri (başarı/uyarı/hata). Marka rengi **tek**; ikinci bir vurgu rengi gerekçe ister |
| **Karakter ve yoğunluk** | Ferah mı sıkı mı · ciddi mi samimi mi · köşeli mi yumuşak mı. Tek cümleyle: *"Bu ürün ... hissettirmeli"* |
| **Referans** | Benzer işi yapan **2–3 gerçek ürün adı**. "Modern" bir referans değildir |

Bu kararlar Adım 3'teki PRD görüşmesinde kullanıcıya sorulur. Kullanıcının
tercihi yoksa ajan **kendi önerisini sunar ve gerekçelendirir** — menü açıp
kullanıcıyı seçime zorlamaz (`11-agent-workflow.md`).

## AI varsayılanı ("slop") — kaçınılacak kalıplar
Modeller görsel olarak "güvenli" olana kaçar; sonuç, birbirinin aynı görünen
ekranlardır. Aşağıdakiler **varsayılan olarak yasaktır**; biri kullanılacaksa
tasarım yönü ADR'sinde gerekçesi yazılır.

| Yasak varsayılan | Neden sorun | Yerine |
|---|---|---|
| Mor/indigo gradient her yerde | Her uygulamayı birbirine benzetir; markayla ilgisi yoktur | ADR'de kararlaştırılan palet |
| Aşırı gradient ve parlama | Görsel gürültü; içeriğin önüne geçer | Düz yüzey; gradient ancak tek bir yerde ve gerekçeli |
| Her şeye `rounded-2xl` | Maksimum yuvarlaklık "samimi" sanılır, ama radius **hiyerarşisini** yok eder | `sm/md/lg` ölçeği; büyük yüzey büyük radius, buton küçük |
| Gölge bombardımanı | Katmanlı gölge içerikle yarışır, düşük donanımda çizimi yavaşlatır | Gölgesiz ya da tek seviye ince gölge |
| Jenerik hero bölümü | İçerikle değil şablonla kurulmuş düzen | Önce içerik, düzen sonra |
| Her yere eşit ve şişkin padding | Eşit boşluk = hiyerarşi yok; ekran boşa gider | Ölçekten seçilmiş, önem sırasına göre değişen boşluk |
| Tek tip kart ızgarası | Her şeyi eşit önemde gösterir; tarama sırasını yok eder | Önceliğe göre düzen; ana eylem görsel olarak da ana |
| Lorem ipsum / uydurma metin | Gerçek metnin ortaya çıkaracağı taşma, sarma ve uzunluk sorunlarını gizler | Gerçekçi Türkçe içerik (`fake-data-guide.md`) |
| Başlıklara emoji, "🚀 Hızlı!" tonu | Ciddiyeti düşürür, ekran okuyucuda gürültü yapar | Düz ve net başlık |

⚠️ **Bu liste tek başına yetmez.** Yasakların hepsine uyan ama hiçbir kararı
olmayan arayüz yine jenerik görünür. Asıl koruma yukarıdaki tasarım yönü ADR'sidir.

## Token'lar (sayısal değer koda dağıtılmaz)
- Renk: `--background --foreground --primary --secondary --muted --destructive --border`
- Spacing: 4px katları (4, 8, 12, 16, 24, 32, 48, 64)
- Radius: `sm 4px · md 8px · lg 12px` — tek ölçek
- Tipografi: tek yazı ailesi, 6 boy ölçeği. Gövde metni en az 16px.

## Dark mode
İlk günden token seviyesinde. `class` stratejisi (`.dark`).
Kullanıcı tercihi kalıcı saklanır; ilk girişte sistem tercihi kullanılır.
Her ekran **iki modda da** kontrol edilir. Sabit `#fff`/`#000` yazılmaz.

## Responsive
- **Mobile-first.** Varsayılan stil mobil; büyük ekran `md:` `lg:` ile eklenir.
- Kırılım noktaları: `sm 640 · md 768 · lg 1024 · xl 1280`
- Her ekran 375px'te yatay kaydırma olmadan çalışır.
- Dokunma hedefi en az 44x44px.

## Zorunlu ekran durumları
Her veri gösteren bileşende dördü de tanımlıdır:
**yükleniyor** (skeleton) · **boş** (açıklama + eylem) · **hata** (mesaj + tekrar dene) · **dolu**

### ⭐ Yazma sırasında da durum vardır — ve iyimser güncelleme kararı

Okuma tarafının dört durumu gibi, **yazma** (kaydet, sil, gönder) tarafının da
üç durumu vardır; hiçbiri atlanmaz:

| Durum | Ne görünür | Nasıl |
|---|---|---|
| **Gönderiliyor** (pending) | Düğme devre dışı + "Kaydediliyor…"; **çift tıklama** engellenir | Server Action: `useActionState` → `pending`; TanStack: `mutation.isPending` |
| **Başarılı** | Kısa onay (toast) + ekran yeni veriyi gösterir | Etiket düşürme / `invalidateQueries` — `01-architecture.md` → *"Önbellek ve tazelik"* |
| **Başarısız** | Alan bazlı hata (Zod'dan) form içinde; genel hata toast'ta; **girilen veri kaybolmaz** | `fieldErrors` alana bağlanır; form sıfırlanmaz |

**İyimser güncelleme / optimistic UI**: sunucu cevabını beklemeden ekranı
**sanki olmuş gibi** güncellemek, cevap olumsuz gelirse geri almak. *Gerçek
hayat:* garson siparişi mutfağa iletmeden "tamam" der; mutfakta malzeme yoksa
geri gelip söyler. Hızlı hissettirir, ama geri alma karmaşıklık ve **yalan**
riski taşır.

| Kullan | Kullanma |
|---|---|
| Geri alması kolay ve zararsız: beğeni, "okundu" işareti, sıralama sürükle-bırak, tamamlandı kutusu | Para, başvuru gönderimi, silme, yetki değişikliği — "gönderildi" yazıp sonra "aslında gönderilemedi" demek kamu hizmetinde kabul edilemez |
| Kullanıcı aynı ekranda kalıyor | Sonuç başka ekranda / e-postada görünecek |

`useOptimistic` (React) yalnızca sol sütundakiler için; sağ sütunda **gönderiliyor
durumu** gösterilir ve cevap beklenir. Kararı veren soru: *"Sunucu 'hayır'
derse kullanıcıya ne söyleyeceğim ve o an nerede olacak?"* — cevap rahatsız
ediyorsa iyimser değil.

## Formlar
- Etiket her zaman görünür (placeholder etiket yerine geçmez).
- **Örnek değer alanın ALTINA yazılır, İÇİNE değil** — `Örnek: 2030` biçiminde
  bir yardım metni olarak. Yer tutucu (`placeholder`) olarak yazılmaz.
  *Gerekçe (yaşandı):* kart formunda son kullanma alanlarının içinde soluk
  `12` ve `2030` duruyordu; kullanıcı bunları **yazılmış değer sanıp** alanları
  boş bıraktı ve ödeme reddedildi. Yer tutucu bir örnek gibi değil, dolu bir
  alan gibi okunuyor — özellikle koyu temada ve küçük ekranda.
- **Yer tutucu yalnızca BİÇİM ipucu için kullanılabilir** ("gg.aa.yyyy" gibi),
  gerçekçi görünen bir değer için asla.
- **Hata mesajı hangi alanı işaret ettiği konusunda YANILTMAZ.** Hangi alanın
  hatalı olduğu söylenemiyorsa (güvenlik gereği) mesaj genel kalır; başka bir
  alanı suçlamaz. *Gerekçe (yaşandı):* ödeme isteğinde herhangi bir alan
  şemadan geçemediğinde ekran "Kart numarası geçersiz" diyordu ve kullanıcı
  doğru yazdığı numarayı kontrol etmeye yönlendiriliyordu.
- Doğrulama alan bazlı ve anlaşılır Türkçe.
- Gönder butonu işlem sırasında kilitlenir (çift gönderim engellenir).
- Yıkıcı işlemler (silme, iptal) onay ister.

## Hareket ve animasyon
Hareket **bilgi taşır**: neyin nereden geldiğini, neyin değiştiğini gösterir.
Süs için animasyon eklenmez.

- **Süre ölçeği:** `hızlı 150ms` (hover, odak) · `normal 200ms` (açılır menü,
  sekme) · `yavaş 300ms` (panel, sayfa geçişi). 300ms üstü **yavaş hissettirir**.
- **Easing:** girişte `ease-out`, çıkışta `ease-in`. `linear` yalnızca sonsuz
  döngüde (yükleniyor göstergesi).
- ⛔ **Yalnızca `transform` ve `opacity` animasyonlanır.** `width`, `height`,
  `top`, `left`, `margin` animasyonu yapılmaz — her karede düzen yeniden
  hesaplanır, orta seviye telefonda gözle görülür şekilde takılır.
- ⛔ **`prefers-reduced-motion: reduce` desteklenir.** Bu ayarı açan kullanıcı
  için süreler sıfırlanır (geçiş anında olur), animasyon **kaldırılmaz** —
  durum değişikliği yine görünür kalır. Vestibüler rahatsızlığı olan kullanıcı
  için bu bir konfor değil, erişilebilirlik gereğidir.
- ⛔ **Sayfa açılışında "her şey belirsin" animasyonu yapılmaz.** İçeriği
  geciktirir, LCP'yi bozar ve JavaScript yüklenmezse ekran boş kalır.
- Hover efekti dokunmatik cihazda anlamsızdır: `@media (hover: hover)` ile sarılır.
- Sonu belli olmayan bekleme spinner ile değil, **skeleton** ile gösterilir
  (düzen zıplamaz).

## Erişilebilirlik (WCAG 2.1 AA)
- Sadece klavye ile tüm akış tamamlanabilir; odak halkası görünür.
- Metin kontrastı >= 4.5:1.
- Anlamsal HTML (`button`, `nav`, `main`); tıklanabilir `div` yok.
- Her görselde anlamlı `alt`; dekoratifse `alt=""`.
- Bilgi sadece renkle aktarılmaz.

## Geri bildirim
Her kullanıcı eylemi 100ms içinde görsel karşılık verir.
Başarı/hata bildirimleri toast ile; kritik olanlar ekranda kalıcı.

## Görseller
- `next/image` kullanılır; genişlik-yükseklik verilir (düzen kayması olmaz).
- Modern format (WebP/AVIF), lazy loading, ekran boyutuna göre `sizes`.
- Kullanıcı yüklediği görseller ayrı depolamadan servis edilir, boyutu sınırlanır.

## Performans bütçesi (aşılırsa PR merge edilmez)
- LCP < 2.5s · INP < 200ms · CLS < 0.1
- İlk yüklemede JS < 200KB (gzip)
- Ana sayfa istek sayısı makul; her dış widget kendi başına yüklenir, sayfayı bloklamaz

## SEO ve meta
Arama motoru kuralları **`18-seo.md`** altında toplanmıştır — render stratejisi,
canonical, yapılandırılmış veri, URL biçimi ve yayın sonrası indekslenme
doğrulaması dahil. Arayüz tarafında bağlayıcı olan asgari kurallar:

- Her sayfada başlık ve açıklama (`generateMetadata`), Open Graph görseli.
- Anlamsal başlık hiyerarşisi — sayfa başına **tek `h1`**, seviye atlanmaz.
- **Preview ve local ortamlarda `noindex`** — test ortamı arama motoruna düşmez.

## Otomatik erişilebilirlik denetimi
`axe-core` Playwright testlerine bağlanır; kritik ihlal varsa CI kırmızı olur.
Manuel kontrol de yapılır: sadece klavye ile tüm akış tamamlanabilmeli.

## Görsel doğrulama — bakmadan "bitti" denmez
⛔ **Kodun doğru görünmesi ekranın doğru göründüğünün kanıtı değildir**
(`00-cekirdek.md` → *"Zorunlu kapılar"* kapı 4b). Arayüz değiştiren her adımda `chrome-devtools` MCP ile
ekran görüntüsü alınır ve **fiilen bakılır**:

| Genişlik | Tema | Bakılan |
|---|---|---|
| 375px | açık + koyu | Yatay kaydırma yok · metin taşmıyor · dokunma hedefi ≥44px |
| 768px | açık | Düzen kırılım noktasında bozulmuyor |
| 1440px | açık + koyu | İçerik ortada, satır uzunluğu okunur (~75 karakter) |

Ayrıca her ekranda: konsol hatası yok · odak halkası klavyeyle görünüyor ·
boş ve hata durumu gerçekten çizilmiş · koyu temada sabit renk kaçağı yok.
