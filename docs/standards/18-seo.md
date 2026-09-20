# 18 — SEO ve Aranabilirlik

Amaç: site canlıya çıktıktan sonra **aranınca bulunabilmesi**. Bu bir pazarlama
işi değil, mühendislik işidir — render stratejisi, URL biçimi ve yayın adımları
bunu belirler. Sonradan "SEO ekleyelim" denince en pahalı kısmı (render ve URL)
değiştirmek gerekir.

⛔ **SEO son adım değildir.** Render stratejisi ve URL biçimi ilk gün, veri
modeliyle birlikte kararlaştırılır.

## Kapsam kararı — önce bunu ver
Her proje SEO istemez. Adım 1a'daki sınıflandırmaya göre:

| Proje | SEO |
|---|---|
| Herkese açık site, ürün/hizmet tanıtımı, içerik, ilan, katalog | **Zorunlu** — bu dosyanın tamamı |
| Giriş arkasındaki panel, kurum içi uygulama, admin | **İstenmez** — `robots.txt` ile kapatılır, `noindex` verilir |
| Karma (açık vitrin + kapalı panel) | Vitrin indekslenir, panel `noindex`. **Sınır net çizilir** |

Karar ADR'ye yazılır. "Sonra bakarız" bir karar değildir.

## 1. Render stratejisi — en belirleyici karar
Arama motoru JavaScript çalıştırabilir ama **geciktirerek** ve garantisiz yapar.
İçerik yalnızca tarayıcıda üretiliyorsa indekslenmesi haftalar sürebilir veya hiç
olmaz.

| İçerik | Strateji | Next.js |
|---|---|---|
| Nadiren değişen (hakkımızda, hizmetler, yasal sayfalar) | **Statik** | Varsayılan sunucu bileşeni, build'de üretilir |
| Düzenli değişen (ilan, ürün, haber listesi) | **ISR** — statik + zamanlı yenileme | `export const revalidate = <saniye>` |
| Kullanıcıya özel (panel, sepet, profil) | Sunucuda veya istemcide — **indekslenmez** | `noindex` |

⛔ **Ana içerik `useEffect` içinde `fetch` ile getirilmez.** Tarayıcıda boş HTML
gelir, içerik sonradan dolar; tarayan robot çoğu zaman boş sayfayı görür.
İstemci tarafı veri getirme yalnızca ikincil bileşenler içindir (yorumlar,
öneriler, canlı sayaç).

**Doğrulama — tahmin etme:**
```bash
curl -s https://<adres>/<sayfa> | grep -c "<beklenen metin>"
```
JavaScript'siz gelen HTML'de içerik yoksa strateji yanlıştır.

## 2. URL biçimi
- Küçük harf, kelimeler arası **tire** (`-`), alt çizgi yok.
- **Türkçe karakter URL'e girmez.** `ç ğ ı ö ş ü` → `c g i o s u`.
  `İ` → `i`, `I` → `i` (⚠️ Türkçe'de `I`'nın küçüğü `ı`'dır; slug üretiminde
  `toLowerCase()` yerine `toLocaleLowerCase("tr")` **kullanılmaz**, aksi hâlde
  `IZMIR` → `ızmır` olur ve URL bozulur. Slug için `en-US` kuralı uygulanır.)
- Slug **veritabanında saklanır**, her istekte yeniden üretilmez — başlık
  düzeltilince adres değişmesin.
- Anlamlı ve kısa: `/ilanlar/kadikoy-2-1-kiralik-daire` ✅ ·
  `/ilan?id=8412` ❌ · `/p/8412-kadikoy-2-1-kiralik-daire-istanbul-uygun-fiyat` ❌
- Sondaki eğik çizgi (`/`) tek biçimde: ya hep var ya hep yok, diğeri **301**
  ile yönlendirilir.
- Adres değiştiğinde eski adres **301** ile yenisine gider. ⛔ 404 bırakılmaz —
  birikmiş sıralama kaybolur.

## 3. Sayfa meta bilgisi
Her indekslenen sayfada `generateMetadata` ile:

| Alan | Kural |
|---|---|
| `title` | 50–60 karakter. Sayfaya **özgü**; şablon `%s | <Site>` |
| `description` | 140–160 karakter, o sayfayı anlatır. ⛔ Tüm sitede aynı açıklama kullanılmaz |
| `canonical` | Her sayfa **kendi** kanonik adresini verir |
| `openGraph` | `title`, `description`, `images` (1200×630), `type`, `locale: "tr_TR"` |
| `twitter` | `card: "summary_large_image"` |

- ⛔ **Başlık ve açıklama koda gömülmez**, içerikten üretilir. Ürün sayfasının
  açıklaması ürünün kendi açıklamasından gelir.
- Liste sayfalarında sayfa numarası başlığa girer (`... — Sayfa 2`), yoksa
  sayfalar birbirinin kopyası görünür.
- OG görseli yoksa üret (`opengraph-image.tsx`); paylaşımda boş kutu çıkmaz.

## 4. Yapılandırılmış veri (JSON-LD)
Arama sonucunda zengin görünüm (fiyat, puan, tarih, soru-cevap) ancak bununla
çıkar. `schema.org` sözlüğü, `<script type="application/ld+json">` ile.

| Sayfa | Tip |
|---|---|
| Site geneli | `Organization` + `WebSite` (site içi arama kutusu için `SearchAction`) |
| Ürün / ilan | `Product` (+ `Offer`: fiyat, para birimi, stok durumu) |
| Yazı / haber | `Article` (yayın ve güncelleme tarihi, yazar) |
| Hizmet veren yerel işletme | `LocalBusiness` (adres, telefon, çalışma saati) |
| Sık sorulanlar | `FAQPage` |
| Her iç sayfa | `BreadcrumbList` |

⛔ **Yapılandırılmış veri sayfada görünenle aynı olmalıdır.** Sayfada olmayan
puanı veya fiyatı JSON-LD'ye yazmak yaptırım sebebidir.
Doğrulama: [search.google.com/test/rich-results](https://search.google.com/test/rich-results)

## 5. Site haritası ve robots
- `sitemap.xml` **tek katalogdan üretilir** — sayfa listesi elle yazılmaz;
  veritabanı + statik rota listesi tek kaynaktan okunur (`app/sitemap.ts`).
  *Gerekçe:* elle yazılan harita ilk yeni sayfada eskir ve kimse fark etmez.
- Yalnızca **indekslenecek** adresler girer: `noindex` sayfa, giriş ekranı,
  arama sonucu ve filtre kombinasyonları haritada **yer almaz**.
- `lastModified` gerçek güncelleme tarihinden gelir; her build'de "bugün"
  yazılmaz — güven kaybettirir.
- `robots.txt` (`app/robots.ts`) sitemap adresini içerir.
- ⛔ **Preview ve local ortam tamamen kapalıdır** (`13-environments.md`):
  `robots.txt` → `Disallow: /` **ve** sayfa seviyesinde `noindex`. İkisi birden
  gerekir; `robots.txt` ile engellenen ama başka yerden bağlantı verilen sayfa
  yine sonuçlarda çıkabilir.

## 6. Kopya içerik ve sayfalama
- Aynı içeriğe birden fazla adresten ulaşılıyorsa (filtre, sıralama, izleme
  parametresi) hepsi **tek kanonik adresi** gösterir.
- `www` / `www` olmayan ve `http` / `https` arasından **biri** seçilir, diğeri
  301 ile ona gider.
- Sayfalanmış listelerde her sayfa kendi kanonik adresini verir; hepsi 1. sayfayı
  göstermez.
- Filtre kombinasyonları taranmaya değmez: `noindex, follow` verilir.

## 7. İçerik ve iç bağlantı
- Her sayfada **tek `h1`**, sayfanın konusunu söyler; başlık seviyesi atlanmaz.
- Her görselde anlamlı `alt` (`07-ui-design-system.md`) — hem erişilebilirlik
  hem görsel araması.
- Bağlantı metni ne olduğunu söyler: "Kiralık daire ilanları" ✅ · "buraya
  tıklayın" ❌
- Önemli sayfa ana sayfadan **en fazla 3 tıklama** uzakta olur.
- Sitede arama motorunun ulaşamayacağı sayfa kalmaz: yalnızca JavaScript ile
  açılan, `<a href>` olmayan gezinme robotun geçemeyeceği duvardır.
- ⛔ Metin görselin içine gömülmez.

## 8. Hız — sıralama etkeni
`07-ui-design-system.md` performans bütçesi (LCP < 2.5s · INP < 200ms ·
CLS < 0.1) burada **aynen geçerlidir**; Core Web Vitals sıralamaya girer.
CI'daki Lighthouse kapısı (`09-ci-cd-deploy.md`) bu bütçeyi korur.
Mobil ölçüm esastır — arama motoru siteyi mobil olarak tarar.

## 9. Yayın adımı — canlıya çıkınca YAPILIR
Site yayınlandığında iş bitmez; arama motorunun haberi olması gerekir.
⚠️ Aşağıdakiler hesap açma ve kimlik doğrulama gerektirir; ajan bunları kendi
yapamaz. Kullanıcıya **adım adım söylenir, yapması beklenir** ve neden
devredildiği belirtilir.

1. **Google Search Console**'a mülk eklenir; doğrulama DNS `TXT` kaydı ya da
   `app/` altına konan doğrulama dosyasıyla yapılır.
2. `sitemap.xml` Search Console'dan **gönderilir**.
3. Ana sayfa "URL denetimi" ile **indeksleme talebi** verilir.
4. Bing Webmaster Tools'a aynı mülk eklenir (Search Console'dan içe aktarılabilir).
5. Analitik/ölçüm aracı bağlanır — ⛔ çerez ve aydınlatma yükümlülüğü için
   `14-privacy-and-compliance.md` okunur, izinsiz izleme kurulmaz.
6. `altyapi-durumu.md`'ye yazılır: hangi hesap, hangi doğrulama yöntemi,
   doğrulama kaydı nerede duruyor.

## 10. Yayın sonrası doğrulama
Kurulum yapıldı diye indekslendi sayılmaz. Yayından **3–7 gün** sonra:

- [ ] `site:<alanadi>` aramasında sayfalar çıkıyor mu
- [ ] Search Console → Kapsam: hata veren sayfa var mı, "keşfedildi ancak
      dizine eklenmedi" yığılması var mı
- [ ] Zengin sonuç testi: JSON-LD hatasız mı
- [ ] `curl` ile alınan HTML'de ana içerik var mı (madde 1)
- [ ] Core Web Vitals raporu "İyi" bandında mı
- [ ] Preview ortamı **sonuçlarda çıkmıyor** — `site:<preview-adresi>` boş dönmeli

## Bitti sayılma ölçütü (`10-definition-of-done.md` eki)
İndekslenmesi istenen bir sayfa şu beşi sağlamadan bitmiş sayılmaz:
**JavaScript'siz HTML'de içerik var · kendine özgü `title` + `description` ·
kanonik adres · `sitemap.xml` içinde · tek `h1`.**
