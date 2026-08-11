# 15 — Oturum Devri ve Kurumsal Hafıza

> Bu dosya **her projede aynıdır** ve `docs/standards/` ile birlikte kopyalanır.
> Projeye özel hiçbir bilgi buraya yazılmaz.

## Problem

Bir yapay zekâ oturumu er ya da geç dolar ve yeni bir oturum açılır. Yeni oturum
**hiçbir şey hatırlamaz** — yalnızca depodaki dosyaları okuyabilir.

Bu, gerçekten yaşanmış bir hataya yol açtı: bir oturumda Cloudflare hesabı
açılmış ve widget kurulmuştu; sonraki oturum bunu bilmediği için kullanıcıya
"git bir Cloudflare hesabı aç" dedi. Kullanıcı zaten yapılmış bir işi yeniden
yapmaya yönlendirildi.

**Kural:** bir sonraki oturumun bilmesi gereken hiçbir şey yalnızca sohbet
geçmişinde kalmaz. Sohbet geçmişi **hafıza değildir**.

## Ne, nereye yazılır — yönlendirme tablosu

Bir bilgi ortaya çıktığında kendine sor: *"bunu bilmeyen bir oturum ne yapar?"*
Cevap "yanlış iş yapar" ise aşağıdaki tabloya göre yaz.

| Bilgi türü | Dosya | Örnek |
|---|---|---|
| **Neden böyle yaptık** (mimari karar) | `docs/project/decisions/ADR-*.md` | "Oturum JWT değil veritabanında, çünkü…" |
| **Ne yayınlandı** (sürüm günlüğü) | `docs/project/CHANGELOG.md` | "Kayıt akışı eklendi, şu üç hata düzeltildi" |
| **Nerede kaldık, sırada ne var** | `docs/project/roadmap.md` | Adım tablosu + teknik borç listesi |
| **Bilinen eksik, kabul edilmiş bedel** | `docs/project/roadmap.md` teknik borç | "Telefon doğrulaması simüle ediliyor" |
| **DIŞ DÜNYANIN DURUMU** | `docs/project/altyapi-durumu.md` | "Cloudflare hesabı açık, widget kurulu, 2 hostname tanımlı" |
| **Bir sonraki oturuma talimat** | `docs/project/sonraki-adim-prompt.md` | "Şu adıma geç, şunlara dikkat et" |
| **Veri modeli** | `docs/project/data-model.md` | Tablolar, alanlar, saklama süreleri |
| **Kullanıcının kişisel tercihi / çalışma tarzı** | Ajanın kalıcı hafızası | "Kod okuyamıyor, Türkçe anlat" |

En sık atlanan satır **"dış dünyanın durumu"**. Depo kodu görür; üçüncü parti
panelleri, hesapları ve ortam değişkenlerini **göremez**. Onları biri yazmazsa
kimse bilmez.

## `altyapi-durumu.md` — zorunlu bölümler

Her projede bu dosya bulunur ve şunları içerir:

1. **Hesaplar** — hangi serviste hesap var, hangi e-postayla, ücretsiz katman
   sınırı ne
2. **Panelde ne yapılandırıldı** — widget adı, izin verilen alan adları, seçilen
   mod, oluşturulan anahtarın adı
3. **Ortam değişkeni matrisi** — hangi değişken hangi ortamda tanımlı
   (local / preview / production), zorunlu mu, eksikse ne olur
4. **Kim neyi yapabilir** — ajan hangi CLI'lara erişebiliyor, neyi yapamıyor
5. **Bilinçli olarak yapılmamış olanlar** — "şu ayar bilerek kapalı, gerekçesi şu"

### ⛔ Asla yazılmayacak

**Hiçbir `.md` dosyasına gizli anahtar DEĞERİ yazılmaz.** Yalnızca:
- değişkenin **adı** (`TURNSTILE_SECRET_KEY`)
- **nerede durduğu** ("Vercel panelinde, production")
- **ne işe yaradığı**

Depo herkese açık olabilir; olmasa bile sır bir kez yazıldığında git geçmişinden
temizlenmesi zordur. Değer gerekiyorsa `.env` (commit edilmez) ve sağlayıcının
kendi paneli vardır.

## Oturum sonu protokolü

Bir oturumu kapatmadan önce ajan şunları yapar:

1. **`altyapi-durumu.md`'yi güncelle** — bu oturumda hesap açıldı mı, panel
   ayarı değişti mi, yeni ortam değişkeni girildi mi
2. **`roadmap.md`'yi güncelle** — biten adımı işaretle, ödenen teknik borcu
   üstü çizili yap, yeni doğan borcu ekle
3. **`CHANGELOG.md`'ye yaz** — ne eklendi, ne değişti, ne düzeltildi
4. **`sonraki-adim-prompt.md`'yi yeniden yaz** — bir sonraki oturum bunu
   kopyalayıp yapıştıracak; içinde ne olması gerektiği aşağıda
5. **Öğrenilen kalıcı kuralı İKİ kopyaya da yaz ve diff ile kanıtla**
   (CLAUDE.md kapı 8 — aşağıdaki bölüm)
6. **Değişen durumu, o durumu yazan HER satırda güncelle** — aşağıdaki bölüm
7. Kullanıcıya **"yeni oturuma şunu ver"** diye tek bir cümle söyle

### ⛔ Bir durum değiştiğinde tek bir yeri düzeltmek YETMEZ

Aynı gerçek birden çok yerde yazılıdır: `altyapi-durumu.md`'nin özet satırı,
ortam değişkeni matrisi, adım bölümleri ve `sonraki-adim-prompt.md`'nin DURUM
başlığı. Biri güncellenip öteki unutulduğunda dosya **kendi içinde çelişir** ve
sonraki oturum ilk okuduğu satıra inanır.

**Gerçek olay (2026-08-11):** iki panel işi (hata takibi ve yasal değişkenler)
yapıldı, ilgili bölümler güncellendi — ama **ortam değişkeni matrisi hâlâ
"girilmeli" diyordu.** O tablo, "kullanıcıya panel işi vermeden önce oku" denen
tablodur; sonraki oturum proje sahibine **zaten yaptığı işi tekrar yaptıracaktı.**
Aynı gün `sonraki-adim-prompt.md`'nin ilk maddesi de "hata takibi hâlâ sessiz"
diyordu, oysa aynı dosyanın 20 satır altında "doğrulandı" yazıyordu.

**Kural — bir dış dünya durumu değiştiğinde:**
1. Değişen terimi **tüm `docs/` içinde `grep`'le** (`girilmeli`, `açılmadı`,
   `girilmedi`, `hâlâ`, `YOK`)
2. Her isabeti ya güncelle ya da **tarihli arşiv** olduğunu başlığında açıkça yaz
3. ⛔ **KANIT:** aynı `grep`'i tekrar koştur ve geriye yalnızca arşiv satırlarının
   kaldığını göster

**Arşiv satırı SİLİNMEZ** — geçmişteki fotoğraf, kararın nedenini açıklar. Ama
başlığı tarih taşımak ve "güncel durum değildir" demek zorundadır.

### ⛔ "Belgede öyle yazıyor" ile "ölçtüm" aynı şey değildir

Bir durumu kullanıcıya raporlarken **kanıtın kaynağını söyle:** canlıdan mı
ölçüldü, yoksa önceki bir oturumun notundan mı okundu. İkincisi geçerli bir
kaynaktır (dosyanın varlık sebebi budur) ama **daha zayıftır** ve belge bayatsa
hata sessizce çoğalır. "Doğrulandı" kelimesini yalnızca bu oturumda ölçtüğün
şey için kullan; okuduğun şey için "belgeye göre" de.

⚠️ Ölçüm aracının o soruyu cevaplayamadığı durumlar vardır. Cevaplayamıyorsa
**"ölçemedim" de** — başarısız bir sınamayı "çalışmıyor" diye raporlama.

## ⛔ Kurallar İKİ yerde yaşar — birine yazmak yetmez

| Nerede | Ne işe yarar | Ne zaman etkili olur |
|---|---|---|
| `<proje>/docs/standards/` | **Bu projenin bağlayıcı kuralları.** `CLAUDE.md` §1 hiyerarşisinde 1. sırada | **Hemen** — bir sonraki oturum bunu okur |
| `proje-kiti` → `skills/yeni-proje/dosyalar/docs/standards/` | **Yeni proje kurulurken kopyalanan şablon** | Yalnızca **yeni proje** kurulduğunda |

İkisi **birbirini güncellemez.** Sonuçlar:

- Yalnızca **kite** yazarsan → bu proje kuralı görmez; `/clear` sonrası yeni
  oturum onu bilmez. **Ders bugün işe yaramaz.**
- Yalnızca **projeye** yazarsan → sonraki proje dersi almadan başlar.
  **Aynı hataya yeniden düşülür.**

### Sıra ve kanıt

```
1. Projenin  docs/standards/<dosya>.md          → yaz
2. Kitin     .../dosyalar/docs/standards/<aynı> → yaz
3. KANIT:    diff <proje> <kit>   → çıktı boş olmalı
```

⛔ **3. adım olmadan iş bitmiş sayılmaz.** Bu adım atlandığı için 2026-08-11'de
üç kural yalnızca kite yazıldı ve projede eksik kaldı; hatayı ajan değil proje
sahibi fark etti ("bu kurallar bende var mı?").

### İstisnalar — DOSYA değil BÖLÜM seviyesinde

Tek bir dosya kısmen projeye özel olabilir. O dosyanın **tamamını** senkron
dışı bırakmak kolay ama pahalıdır: genel bölümlere yazılan dersler de kaybolur.

`00-stack.md` için kural:

| Kural | Bölüm |
|---|---|
| ⛔ Asla senkronlanmaz | `## Zorunlu stack` — fiilen kurulu sürümler |
| ⛔ Kite özel, projeye inmez | `## Sürüm sütunu nasıl doldurulur` |
| ✅ Senkronlanır | Diğer tüm bölümler |

**Karışık bölümlerde sınır bir işaretleyicidir:**

```
<!-- ⛔ SENKRON SINIRI -->
```

Üstü ortaktır ve eşitlenir; altı projeye aittir ve dokunulmaz.
⛔ **Sınırı silme.** Silinirse o bölümün tamamı senkron dışı kalır ve kite
yazılan yeni bir genel kural bu projeye hiç ulaşmaz — 2026-08-11'de yaşandı.

⚠️ **Kanıt bu dosyalarda `diff` değil, BÖLÜM karşılaştırmasıdır.** Dosyalar
farklı görünecektir ve bu normaldir; kanıtlanması gereken, **senkronlanması
gereken bölümlerin** aynı olduğudur.

### Kurulu plugin sürümü ne zaman güncellenir

⚠️ **Kural yazdıktan sonra DEĞİL.** Kurulu plugin yalnızca iki anda okunur:

| Ne zaman | Neden |
|---|---|
| `/yeni-proje` çalıştırmadan **önce** | Yeni projeye kopyalanacak şablon güncel olmalı |
| `/kit-senkron` çalıştırmadan **önce** | Karşılaştırma bayat bir kopyaya karşı yapılırsa yanlış sonuç verir |

Mevcut bir projede çalışırken kurulu sürümün eski olması **hiçbir şeyi
bozmaz** — o proje kendi `docs/standards/` klasörünü okur.

Güncelleme kullanıcı tarafından çekilir, kendiliğinden inmez:
```
/plugin marketplace update
/plugin update proje-kiti
```
ve Claude yeniden başlatılır.

## `sonraki-adim-prompt.md` — ne içerir

Yeni bir oturum bunu okuyup **soru sormadan** çalışmaya başlayabilmeli:

- **DURUM** — nerede kalındı, neler çalışıyor, canlı adresler
- **HAZIR BEKLEYEN PARÇALAR** — "bunları yeniden yazma, kullan" listesi.
  Yazılmış ama henüz bağlanmamış her şey buraya
- **YAPILACAK** — bir sonraki adımın kapsamı
- **ÖNCE ÇÖZÜLECEK MESELELER** — dokümanlar arası çelişki, eksik karar
- **TUZAKLAR** — bu projede daha önce vakit kaybettiren şeyler
- **KOMUTLAR** — çalıştırılabilir komut listesi
- **NOT** — çözülmüş ama tekrar edebilecek sorunlar

Adım bitince bu dosya **yeniden yazılır**, üstüne eklenmez. Eski talimat
kalırsa yeni oturum yanlış işi yapar.

### ⛔ DEVİR DOSYASININ "DURUM"U DAİMA MERGE'DEN ÖNCEKİ DÜNYAYI ANLATIR

Dosya, commit kapısında **beklerken** yazılır — yani "PR açıldı, onay
bekliyor" cümlesi yazıldığı an doğrudur. Sonra iş onaylanır ve merge edilir,
ama dosyayı güncelleyecek oturum çoktan kapanmıştır. Bu bir dikkatsizlik
değil, **sıranın kaçınılmaz sonucudur.**

Bu yüzden:

- **Yazan taraf:** "henüz merge edilmedi", "push edilmedi", "`main` şu
  commit'te" gibi cümlelerin yanına **kontrol komutunu** yaz, iddiayı tek
  başına bırakma. Cümle bir emir değil, doğrulanacak bir hipotezdir.
- **Okuyan taraf:** ⛔ **DEVİR DOSYASININ DURUM BÖLÜMÜNE İNANMA, ÖNCE ÖLÇ.**
  İlk iş `git log --oneline -5`, `git status` ve `gh pr list`. Depoda ve
  panelde görülen gerçek, dosyada yazandan üstündür.
- Çelişki bulunduğunda sessizce düzeltilmez: **kullanıcıya söylenir**, çünkü
  aynı yanlış bilgi başka dosyalara da yazılmış olabilir.

## Neden kalıcı ajan hafızası yeterli değil

Ajanın kendi hafızası makineye bağlıdır: başka bilgisayarda, başka araçta veya
başka bir ajanla açılan oturum onu göremez. **Depo taşınabilir hafızadır** —
projeyi klonlayan herkes (ve her ajan) aynı bilgiye ulaşır.

İkisi birlikte kullanılır:
- **Depodaki `.md` dosyaları** → projeye ait her şey
- **Ajan hafızası** → kullanıcının kişisel çalışma tarzı, tercihleri

Çakışırlarsa **depo doğrudur**.
