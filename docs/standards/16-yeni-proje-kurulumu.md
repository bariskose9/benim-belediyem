# 16 — Yeni Proje Kurulumu

> Bu dosya **her projede aynıdır**. Yeni bir projeye başlarken izlenecek tek liste.

## Amaç

Yeni bir projede iskeleti kurmak **kullanıcının işi olmamalı**. Kullanıcı yalnızca
şunları verir:

1. **Analiz dokümanı** (ne yapılacak)
2. **Stack** (varsayılandan farklıysa)

Gerisini ajan bu listeye bakarak kurar.

## ⭐ Bu kit neyi optimize ediyor

Kurallara uymak amaç değil, araç. Kitin tamamı **üç sonucu** hedefliyor:

1. **Kullanıcı ne yaptığını anlıyor.** Kod üretmek kolay; üretilen kodu
   savunabilmek, sorulduğunda açıklayabilmek ve bir yıl sonra hatırlamak zor.
   Kitin öğretme yükümlülüğü, kod yorumları ve üç adımlı kavram anlatımı
   bunun içindir.
2. **Proje devredilebilir.** Başka biri (veya altı ay sonraki aynı kişi)
   nereye bakacağını bilmeli — ve yanlış yaptığında **sistem ona söylemeli.**
   Mimari testler, DBML kapısı, tip paylaşımı bunun içindir.
3. **Süreç tekrarlanabilir.** Her proje sıfırdan icat edilmez; öğrenilen kural
   kite döner ve bir sonraki projede zaten oradadır. `/kit-senkron` bunun içindir.

⚠️ Bir kural bu üç sonuca hizmet etmiyorsa **sorgulanır.** Kural ezberlenmez,
gerekçesiyle uygulanır.

## ⭐ KİT NEREYE GİDİYOR — hedeflenen son durum

Kit olgunlaştıkça kullanıcının **karar yükü azalır**, ama **öğrenmesi
azalmaz.** Hedef şu:

| Kullanıcının işi | Zamanla |
|---|---|
| Mimari ve stack'i **birlikte konuşmak** | ⭐ Kalır — en değerli kısım |
| Kurulumda soruları cevaplamak | Kalır ama kısalır (kit çoğunu biliyor) |
| İş kurallarını anlatmak (PRD) | ⭐ Kalır — yalnızca o bilir |
| Teknoloji seçimlerini araştırmak | ⛔ **Kaybolur** — kitte yazılı |
| Her adımda "nasıl yapılmalı" düşünmek | ⛔ **Kaybolur** — kitte yazılı |
| Onay vermek | Kalır — ama aşağıdaki şartla |

⭐ **Varılmak istenen yer:** `/yeni-proje` denir, sorular cevaplanır, mimari
konuşulur, gerisi **onayla ilerler** — ve kullanıcı her adımda **neyi neden
yaptırdığını öğrenir.**

⛔ **Kitte olmayan bir best practice fark edilirse** — ajan da fark edebilir,
kullanıcı da — o anda eklenir. Kit hiçbir zaman "bitmiş" sayılmaz
(`11-agent-workflow.md` → *"İstenen yapılır ama daha iyisi varsa söylenir"*).

### ⛔ BU HEDEFİN TEHLİKELİ KENARI: ONAY, ANLAMAK DEĞİLDİR

Kit iyileştikçe kullanıcının rolü **onay vermeye** yaklaşıyor. Buradaki risk
şudur:

> ⚠️ Kullanıcı anlamadan *"tamam"* demeye başlarsa, kit **birinci sonucunu
> kaybeder** — "kullanıcı ne yaptığını anlıyor". Kod yine doğru çıkar ama
> kullanıcı onu **savunamaz**, değiştiremez, anlatamaz.

⛔ **Bu, kitin en sinsi başarısızlık biçimidir**, çünkü dışarıdan başarı gibi
görünür: proje çalışıyor, testler yeşil, teslim zamanında. Eksik olan tek şey
**kullanıcının kendisi.**

**Ajanın sorumluluğu — onayı YAPISI GEREĞİ bilgili kıl:**

| ⛔ Yanlış | ✅ Doğrusu |
|---|---|
| *"Şunu yaptım, onaylıyor musun?"* | *"Şunu yaptım. **Sebebi** şu. Yanlış olsaydı **şu** bozulurdu. Onaylıyor musun?"* |
| Onayı bir kapı gibi geçmek | Onayı bir **anlatma fırsatı** gibi kullanmak |
| Uzun bir işi tek onaya yığmak | Kararları ayrı ayrı sunmak |

⚠️ **Uyarı işareti:** Kullanıcı arka arkaya **hiç soru sormadan** onaylıyorsa
iki ihtimal var — ya gerçekten anladı, ya da takip etmeyi bıraktı. Ajan bunu
**varsayamaz**; anlatımın o kısmını sadeleştirmek yerine *"burada şunu
seçtim, alternatifi şuydu — bir sakınca görüyor musun?"* diye **kararı
görünür kılar.**

⛔ **Onay hızlandırmak için açıklama kısaltılmaz.** Kısalmanın tek meşru
sebebi, kullanıcının o konuyu **artık biliyor olmasıdır** — ve bu
`calisilacak-konular.md` → *"Artık biliyorum"* listesiyle **kayda geçer**, ajanın
tahminiyle değil.

## Yapım planı nasıl sıralanır — dört kural

`docs/project/roadmap.md` adımları rastgele değil, aşağıdaki dört kurala göre
dizilir. Sıra gerekçesi **plana yazılır**, okuyan keyfi sanmasın.

### 1. Bağımlılık — bir şey, dayandığı şeyden sonra gelir

Veri modeli olmadan API yazılamaz (hangi tabloya yazacağını bilmez). API
olmadan ekran veri çekemez (çağıracak bir şey yoktur).

⚠️ Yazılımda bu bağımlılık **görünmez** olduğu için atlanabiliyor: kod yazılır,
derlenir, hatta çalışır gibi görünür — dayandığı şeyin olmadığı sonradan
ortaya çıkar.

### 2. Yatay kesen işler erken yapılır

Bazı işler tek modüle ait değildir, hepsini keser: kimlik doğrulama, merkezî
hata yönetimi, sayfalama kalıbı, audit alanları.

Sonraya bırakılırsa yazılmış **her modüle geri dönmek** gerekir.

*Binada elektrik tesisatı sıva atılmadan önce döşenir.*

### 3. En riskli parça öne alınır

Belirsizliği en yüksek, yanlış tasarlanırsa en çok şeyi etkileyecek parça
başa konur. Geç kalırsa sürpriz çıktığında geri dönüş pahalıdır.

Düşük riskli işler (ekranlar, biçimlendirme) sona bırakılır — ne yapacakları
bellidir, sürpriz çıkmaz.

### 4. Kalıp basit yerde oturtulur

Aynı işi çok kez yapacaksan, **ilk yaptığın yer en basit olanı** olur. Orada
oturan kalıbı sonrakiler tekrarlar.

⚠️ Karmaşık modülle başlanırsa hem oturmamış kalıpla hem karmaşık kuralla aynı
anda uğraşılır ve **çıkan hatanın hangisinden geldiği ayırt edilemez.**

### Planın kabul etmediği üç yaklaşım

⛔ **"Önce ekranı yapalım."** Ekran, henüz var olmayan bir veri şekline göre
tasarlanır; arka uç yazılınca baştan elden geçirilir.

> ⚠️ **Bu yasak mutlak DEĞİL — kuralın gerçek hâli şudur:**
>
> ⭐ Sıra *"önce arka uç"* değil, **"önce VERİ ŞEKLİ kesinleşsin".** Arka uç
> yazmak, veri şeklini kesinleştirmenin bir yoludur. Zaten kesinleşmişse o iş
> bitmiştir.
>
> | Durum | Doğru sıra |
> |---|---|
> | Arka uç **zaten var** (API'ler yazılmış, veritabanı ayakta) | **Önce arayüz (UI)** — önce mevcut API sözleşmesi `packages/contracts`'a Zod şeması olarak yazılır, sonra ekran |
> | **Yalnızca arayüz** değişiyor (yeniden tasarım) | Sadece arayüz |
> | Ürün belirsiz, önce görülmesi gerekiyor | Tıklanabilir **taslak** → arka uç → gerçek arayüz. ⛔ Taslak atılmak üzere yapılır, içine iş kuralı yazılmaz |
>
> ⛔ **Bu karar proje BAŞINDA verilir, ortasında değil** ve gerekçesiyle
> `docs/project/teknoloji-ve-plan.md` içine yazılır. Yarısında sıra
> değiştirmek iki yaklaşımın maliyetini birden ödemektir.

⛔ **"Testleri sona bırakalım."** Test her adımda yazılır, son adımda yalnızca
tamamlanır. Sona bırakılan test, çalışan kodu onaylamaktan ibaret kalır — hata
bulmaz.

⛔ **"Dokümanı en sonda yazarız."** Her adımın kararı o adım biterken yazılır;
gerekçe, kararı verirken en net hatırlanır.

## Neyi kopyalayacaksın — tek tablo

| Ne | Nereye | Nasıl |
|---|---|---|
| `PROJEYE-CLAUDE-MD-OLUSTURMAK-ICIN-SABLON.md` | repo kökü, ⛔ **adı `CLAUDE.md` olarak** | Olduğu gibi kopyala + **yeniden adlandır**, sonra yalnızca §0 "Proje Değişkenleri" bloğunu doldur. Ad değişmezse Claude Code yüklemez |
| `.claude/**` (`settings.json` + `rules/` 9 dosya) | `.claude/` | **Olduğu gibi kopyala.** `rules/00-cekirdek.md` her oturum, diğerleri `paths` ile ilgili dosya açılınca kendiliğinden yüklenir; içlerinde `@import` yok |
| `CALISMA-KILAVUZU.md` | Kullanıcının kılavuzu: nasıl başlanır, ne sorulur, hangi dosya ne işe yarar | Olduğu gibi kopyalanır |
| `docs/standards/**` (00–18, **19 dosya**) | `docs/standards/` | **Olduğu gibi kopyala, İÇİNİ DEĞİŞTİRME.** Stack farklıysa yalnızca `00-stack.md` tablosu güncellenir |
| `docs/standards/KIT-SURUM` | `docs/standards/` | Kopyayla gelir: `<sürüm> @ <hash>`. Açılış kancası "proje kopyası geride mi" diye buna bakar; senkron sonunda yenilenir |
| `docs/standards/sablonlar/**` | ⛔ **İKİYE AYRILIR:** çoğu `docs/project/` · ⭐ iki defter `docs/kullanici/` | Kopyala ve **içini doldur**. Hedefler satır satır aşağıdaki *"`sablonlar/` içinde ne var"* tablosunda — ezberden `docs/project/` yazma |
| `REPO-YAPISI.md` | repo kökü | Kopyala, projeye özel klasör adlarını değiştir |

**Kural:** `docs/standards/` **asla projeye göre değişmez.** Bir kural projeye
özel hale geliyorsa o kural yanlış yazılmıştır — düzelt, dallandırma.

### `sablonlar/` içinde ne var

Klasörün kendi indeksi: `docs/standards/sablonlar/OKUBENI.md`.

| Şablon | Hedef | Zorunlu mu |
|---|---|:---:|
| `PRD.md` | `docs/project/PRD.md` | **Evet** |
| `roadmap.md` | `docs/project/roadmap.md` | **Evet** |
| `altyapi-durumu.md` | `docs/project/altyapi-durumu.md` | **Evet** |
| `CHANGELOG.md` | `docs/project/CHANGELOG.md` | **Evet** |
| `yeni-oturuma-verilecek-sonraki-adim-promptu.md` | `docs/project/yeni-oturuma-verilecek-sonraki-adim-promptu.md` | **Evet** |
| `teknoloji-ve-plan.md` | `docs/project/teknoloji-ve-plan.md` | **Evet** — projenin öğretici belgesi, her adımda büyür |
| `calisilacak-konular.md` | ⭐ `docs/kullanici/calisilacak-konular.md` | **Evet** — seviye defteri, anlatım düzeyi buradan okunur |
| `ogrendigim-konular.md` | ⭐ `docs/kullanici/ogrendigim-konular.md` | **Evet** — ikizi; kapanmış konular buraya taşınır |

⭐ **`docs/kullanici/` ayrı bir klasördür ve bilerek böyledir.** Projede üç
bölge vardır ve sınır klasör adından okunur:

| Klasör | İçinde ne var | Yeni projede |
|---|---|---|
| `docs/standards/` | Kitin 19 kuralı + şablonlar | Aynen gelir |
| ⭐ `docs/kullanici/` | Kullanıcının iki defteri | **Birleştirilerek** gelir, sıfırlanmaz |
| `docs/project/` | PRD · roadmap · ADR · veri modeli · altyapı durumu | ⛔ **Boş/şablon** başlar |

⛔ `docs/project/` içindekiler **her projede sıfırdan dolar** — bir projenin
PRD'si başka projeye taşınmaz.
| `decisions/ADR-000-sablon.md` | `docs/project/decisions/` | **Evet** (doldurulmaz, çoğaltılır) |
| `vscode-eklentileri.md` | `docs/project/vscode-eklentileri.md` | **Evet** — hangi eklenti neden önerildi |
| `data-model.md` | `docs/project/data-model.md` | Veritabanı varsa |
| `integrations.md` | `docs/project/integrations.md` | Dış servis varsa |
| `fake-data-guide.md` | `docs/project/fake-data-guide.md` | Sahte veri gerekiyorsa |
| `kurumdan-ogrenilecekler.md` | `docs/project/kurumdan-ogrenilecekler.md` | ⛔ **Yalnızca işyeri projesinde** — kendi projende soracak kurum yok |

⛔ **Bu tablo `sablonlar/` klasörüyle birebir aynı olmalıdır.** Sayıyı ezberden
yazma: `ls docs/standards/sablonlar/` ile bak. Tabloda olmayan bir şablon
**hiç açılmaz** — 2026-09-06 denetiminde dört şablon tam bu yüzden tablonun
dışında kalmıştı (`teknoloji-ve-plan` · `calisilacak-konular` · `vscode-eklentileri` ·
`kurumdan-ogrenilecekler`).

Şablonlar **kaynak projeden silinmez** — bir sonraki projeye yine lazım.

## Kurulum sırası

### 1. Dosyaları yerleştir
Yukarıdaki tabloyu uygula. `docs/standards/sablonlar/` klasörü kopyalandıktan
sonra **kaynak projeden silinmez**. ⛔ Hedef projede **tek bir klasöre açılmaz**:
çoğu `docs/project/`, ⭐ iki defter `docs/kullanici/` altına gider. Her şablonun
hedefi **kendi başındaki `ŞABLON —` satırında** yazılıdır; denetim betiği bunu
kontrol eder.

### 2. `CLAUDE.md` §0'ı doldur
Proje adı, stack, deploy hedefi, ana dal, arayüz dili, kod dili.

### 3. PRD'yi çıkar — `interview-me` ile
Kullanıcının analiz dokümanı **her zaman eksiktir**. `00-cekirdek.md` → *"Zorunlu kapılar"* kapı 1:
**tek tek soru sor, varsayım yapma.** Cevaplar `docs/project/PRD.md`'ye yazılır,
"Açık sorular" bölümü boşalana kadar kodlama başlamaz.

### 4. Roadmap'i yaz
Adımlar **bağımlılık sırasına** göre: her adım bir öncekinin üzerine kurulur.
İlk üç adım neredeyse her projede aynıdır:

1. Repo + framework + lint/format + `docs/`
2. Hosting + veritabanı bağlantısı + `/api/health` + CI
3. Veri modeli + migration + tohumlama

### 5. `altyapi-durumu.md`'yi ilk günden aç
Boş bile olsa oluştur. **İlk hesap açıldığı anda yazılmaya başlar.**
Sonradan hatırlamaya çalışmak işe yaramaz — bu dosya tam olarak bu yüzden var
(`15-oturum-devri-kurallari.md`).

### 6. İlk ADR'yi yaz
Genellikle "neden bu stack / neden tek repo". `ADR-000-sablon.md` biçimi kullanılır.

### 7. ⛔ DEPO HİJYENİ — ilk gün, sonraya bırakılmaz

Bu üçü **deponun ilk saatinde** halledilir. Sonraya bırakılırsa hatırlanmaz;
üstelik ikisinin bedeli geriye dönük ödenemez.

| Ne | Neden ilk gün |
|---|---|
| **Görünürlük kararı** (public / private) | Public'e itilen bir sır, private'a alsan da sızmış sayılır |
| **Sır taraması + push koruması** | Koruma ancak açıkken çalışır; sonradan açmak geçmişi geri almaz |
| **`LICENSE` dosyası** | Lisanssız depo hukuken "her hakkı saklı"dır — kimse kullanamaz |

**Lisans nasıl seçilir:**

- **Public + portföy / öğrenme projesi** → izin verici bir lisans (MIT gibi).
  Lisanssız bırakmak "kimse dokunmasın" demektir ve portföyün amacına terstir:
  kod görünür ama hukuken kullanılamaz.
- **Şirket içi / kuruma ait proje** → lisans dosyası yerine **sahiplik ve
  gizlilik notu**; depo `private` olur. Burada varsayılan "her hakkı saklı"
  zaten istenen şeydir.
- ⛔ **Karar kod yazanın değil, işin SAHİBİNİN kararıdır.** Ajan lisans
  uydurmaz; seçenekleri ve sonuçlarını anlatır, sahibi seçer.

**⛔ SEÇİM YAPILDIKTAN SONRA BİR MEKANİZMA KURULUR — kural yetmez.**

Bu kural yazılıydı ve yine de ihlal edildi: bir projede `package.json`
`"license": "MIT"` derken kökte `LICENSE` dosyası yoktu (aylar sonra fark
edildi). Depo kendi kendisiyle çelişiyordu — paket yöneticisi "MIT" okuyor,
hukuken geçerli olansa dosyanın yokluğu, yani **"her hakkı saklı"**.

Bu yüzden lisans seçimi bir **teste** bağlanır. Test üç şeyi birden ölçer:

1. `package.json` bir lisans **beyan ediyor** mu
2. Beyan edilen lisansın **dosyası** kökte duruyor mu
3. Dosyanın **içeriği** beyanla aynı mı (MIT denip Apache metni konamaz) ve
   telif satırı gerçek bir **yıl + sahip** taşıyor mu

Yalnızca "dosya var mı" diye bakan bir test, yanlış lisans metnini yeşil
geçirir — yani kuralı değil, kuralın görüntüsünü korur.

⛔ Aynı ilke lisansa özel değildir: **bir kural, mekanizması olmadan
niyettir.** Bir kuralı yazdıktan sonra "bunu ne ihlal edildiğinde yakalar?"
sorusunun cevabı yoksa, kural henüz yürürlükte değildir.

**Depo private ise ne değişir:**

Güvenlik ayarlarının **gerekçesi** değişmez, yalnızca aciliyeti değişir. Private
bir depoda sır sızması "internete açıldı" demek değildir — ama **erişimi olan
herkese** açıldı demektir ve kurumsal ortamda bu, taşerondan stajyere geniş bir
kitledir. Ayrıca sır bir kez geçmişe girdiğinde depo bir gün açılırsa veya
yedeği dışarı çıkarsa birlikte gider.

⚠️ Kurumsal ortamda bu ayarlar **senin kararın olmayabilir**: platform ekibi
organizasyon seviyesinde politika uygulamış olabilir. O hâlde yapılacak şey
kuralı görmezden gelmek değil, **kimin sorumlu olduğunu bulup istemektir**.

## Neyin projeye göre DEĞİŞTİĞİ

| Dosya | Değişir mi | Ne değişir |
|---|---|---|
| `docs/standards/00-stack.md` | **Bazen** | Yalnızca sürüm tablosu, o da fiilen kurulanla eşitlenerek |
| `docs/standards/01–18` | **Hayır** | Mühendislik kuralları projeden bağımsızdır |
| `CLAUDE.md` | **Sadece §0** | Geri kalanı "kurallar nerede" tablosu; davranış kuralları `.claude/rules/00-cekirdek.md`'de, sabit |
| `.claude/rules/*` | **Hayır** | Çekirdek ve alan tetikleyicileri projeden bağımsızdır; standart değişince `/kit-senkron` ile birlikte güncellenir |
| `docs/project/PRD.md` | **Tamamen** | Her projenin işi başkadır |
| `docs/project/roadmap.md` | **Tamamen** | Adımlar işe göre |
| `docs/project/data-model.md` | **Tamamen** | — |
| `docs/project/altyapi-durumu.md` | **Yapı sabit, içerik projeye özel** | Hesaplar ve değişken matrisi |
| `docs/project/integrations.md` | **Çoğunlukla** | Dış servisler değişir |
| `docs/project/fake-data-guide.md` | **Tamamen** | Sahte veri gerekiyorsa |

## Proje hafızası — dört dosya, dört ayrı soru

Yapay zekâ oturumu hafızasızdır: sohbet kapanınca **hiçbir şey** hatırlamaz,
yalnızca depodaki dosyaları okuyabilir. "Geçmişte ne yaptık" bilgisi bu dört
dosyada yaşar. Biri boş kalırsa o soru bir daha cevaplanamaz.

| Soru | Dosya | Örnek |
|---|---|---|
| **Hangi teknolojiyi kullanıyoruz, hangi sürümü, neyi kullanMIyoruz** | `docs/standards/00-stack.md` | "Prisma 7 · TypeScript 6 (7 değil, çünkü…) · Redux kullanılmaz" |
| **Hangi hesap açık, panelde ne yapılandırılmış, hangi anahtar nerede** | `docs/project/altyapi-durumu.md` | "Cloudflare hesabı açık, widget Managed modda, 2 hostname tanımlı" |
| **Bir şeyi NEDEN böyle yaptık** | `docs/project/decisions/ADR-*.md` | "Oturum JWT değil veritabanında, çünkü çıkış gerçekten çalışsın" |
| **Nerede kaldık, sırada ne var, hangi eksiği kabul ettik** | `docs/project/roadmap.md` | Adım tablosu + teknik borç listesi |

Üç pratik kural:

1. **`00-stack.md`'deki sürüm sütunu `package.json` ile birebir aynı olur.**
   Tahmini sürüm yazmak, yazmamaktan kötüdür; en yenisi kullanılmıyorsa
   nedeni yazılır — kural ve gerekçesi `00-stack.md` → *"Sürüm tavanları"*.
2. **`altyapi-durumu.md` ilk gün açılır**, ilk hesapla dolmaya başlar.
   Sonradan hatırlamaya çalışmak işe yaramaz. ⛔ Anahtar **değeri** yazılmaz —
   yalnızca adı, yeri, ne işe yaradığı.
3. **Geri dönmesi pahalı her karar ADR olur.** Ölçütü `00-stack.md` →
   *"KARAR NEREYE YAZILIR"* verir; burada tekrarlanmaz.

## Kullanıcıya sormadan ÖNCE

Yeni projede de eski projede de aynı hata yapılabilir: kullanıcıya zaten
yapılmış bir işi tekrar yaptırmak. Bunun tek panzehiri **önce
`docs/project/altyapi-durumu.md`'yi okumaktır** (`00-cekirdek.md` → *"Hangi soru → hangi dosya"*, kaynak hiyerarşisi).

## İlk oturumun sonunda

`15-oturum-devri-kurallari.md` protokolünü uygula: `altyapi-durumu.md`, `roadmap.md`,
`CHANGELOG.md` güncellensin ve `yeni-oturuma-verilecek-sonraki-adim-promptu.md` yazılsın. **İlk oturum
bile devredilebilir olmalı.**
