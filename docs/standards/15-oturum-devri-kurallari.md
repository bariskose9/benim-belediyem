# 15 — Oturum Devri KURALLARI ve Kurumsal Hafıza

> Bu dosya **her projede aynıdır** ve `docs/standards/` ile birlikte kopyalanır.
> Projeye özel hiçbir bilgi buraya yazılmaz.

## ⛔ OTURUM, KUTUCUK İŞARETLENMEDEN KAPATILMAZ

Bir adım tamamlandığında `docs/project/roadmap.md` içindeki kutucuk
`⬜` → `✅` yapılır. Bu, devir notunun **yerine geçmez**; ikisi farklı işe yarar:

| | Ne söyler |
|---|---|
| `roadmap.md` kutucukları | **Nerede kalındı** — bir bakışta, hafta sonra dönüldüğünde |
| `yeni-oturuma-verilecek-sonraki-adim-promptu.md` | **Sırada ne var** — ayrıntısıyla, yeni oturuma verilmek üzere |
| `teknoloji-ve-plan.md` | **Neden öyle yapıldı** — kararın gerekçesi ve teknolojinin ne olduğu |

⚠️ Kutucuk **adım gerçekten bittiğinde** işaretlenir: testler yeşil, kararlar
yazılı, commit atılmış. "Neredeyse bitti" işaretlenmez — sonraki oturum onu
bitmiş sayar ve üstüne kurar.

⛔ Oturum kapatılmadan önce kullanıcıya **tik atıldığı söylenir**:
*"Adım 6 tamamlandı, roadmap'te işaretledim. Sırada Adım 7 var."*

### ⛔ ÖĞRENİLEN ŞEYİ KULLANICIYA HATIRLATMA — SOR

Oturumda kullanıcı bir şeyi ilk kez anladıysa, bir soruyu sormayı unuttuysa veya
aynı hatayı ikinci kez yaptıysa, oturum kapanırken **ajan sorar**:

> *"Bu oturumda şunu fark ettim: <gözlem>. `calisilacak-konular.md` defterine
> yazayım mı?"*

⛔ Kullanıcının *"bunu deftere yaz"* demesi beklenmez. Kullanıcı zaten o anda
öğrenmekle meşguldür; not almayı hatırlaması beklenemez — **fark eden taraf
yazmayı teklif eder.**

**Hangi gözlem deftere girer:**

| Gözlem | Nereye |
|---|---|
| *"Bu terimi ilk kez anladım"* | `calisilacak-konular.md` → zor gelen kararlar |
| *"Şunu sormayı unutmuşuz"* | `calisilacak-konular.md` → sormayı unuttuğum sorular |
| Aynı hata **ikinci** kez | `calisilacak-konular.md` → tekrar eden hatalar |
| Aynı hata **üçüncü** kez | Artık kişisel değil → `/kit-senkron` ile **kite** |
| *"Her projede böyle yapılmalı"* | Doğrudan **kite** (`/kit-senkron`) |

⚠️ **Ayrım:** Kite **kural** gider (*"şu durumda şu yapılır"* → `docs/standards/`).
Deftere **deneyim** girer (*"ben şunu atlamıştım"* → `calisilacak-konular.md`).
Deneyim üç kez tekrarlanırsa kurala dönüşür.

⭐ **Ama defter de kite gider.** İkisi ayrı dosyalara gider, ikisi de
`/kit-senkron` ile taşınır: kural standarda, deftere yazılan öğrenme ise
defterin kendisine. Böylece bir sonraki proje **hem kuralı hem öğrenilmişi**
alır. ⛔ Defter **birleştirilir, üzerine yazılmaz** — hiçbir satır silinmez.

⛔ **Aynı anda `teknoloji-ve-plan.md` da güncellenir.** O adımda alınan kararlar
— hangi teknoloji neden seçildi, hangi alternatif neden elendi — oraya yazılır.
Sona bırakılırsa gerekçe unutulur; karar kalır, sebebi kaybolur.

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
| **Hangi karar ADR olur, hangisi olmaz** | `00-stack.md` → *"KARAR NEREYE YAZILIR"* | Dayatma vardı mı, sapıldı mı — tabloya bakılır |
| **Teknoloji ne, neden burada** (anlatım) | `docs/project/teknoloji-ve-plan.md` | Gerekçe ADR'de; burada ona işaret edilir |
| **Ne yayınlandı** (sürüm günlüğü) | `docs/project/CHANGELOG.md` | "Kayıt akışı eklendi, şu üç hata düzeltildi" |
| **Nerede kaldık, sırada ne var** | `docs/project/roadmap.md` | Adım tablosu + teknik borç listesi |
| **Bilinen eksik, kabul edilmiş bedel** | `docs/project/roadmap.md` teknik borç | "Telefon doğrulaması simüle ediliyor" |
| **DIŞ DÜNYANIN DURUMU** | `docs/project/altyapi-durumu.md` | "Cloudflare hesabı açık, widget kurulu, 2 hostname tanımlı" |
| **Bir sonraki oturuma talimat** | `docs/project/yeni-oturuma-verilecek-sonraki-adim-promptu.md` | "Şu adıma geç, şunlara dikkat et" |
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

### ⛔ "OTURUM SONU" BİR AN DEĞİL — YAZMA ANINDA OLUR

⚠️ **Kullanıcı "bitiriyorum" demeyebilir.** Doğrudan `/clear` yazabilir,
pencereyi kapatabilir, bilgisayarı uyutabilir. Her şeyi sona bırakan bir
protokol, o an gelmediğinde **hiçbir şey yazmamış** olur.

⛔ **Kural: bir şey olduğu anda yazılır, sonraya bırakılmaz.**

| Ne olduğunda | O anda yazılır |
|---|---|
| Roadmap adımı bitti | ⛔ Hemen kutucuk işaretlenir |
| Hesap açıldı, anahtar girildi | ⛔ Hemen `altyapi-durumu.md` |
| Yeni terim öğrenildi / seviye değişti | ⛔ Hemen deftere (**sorularak**) |
| Karar verildi | ⛔ Hemen ADR |
| Özellik bitti | ⛔ Hemen `CHANGELOG.md` |

⭐ **Aşağıdaki protokol bir TARAMA'dır, ilk yazma değil.** Kapanışta yapılan
iş *"unutulan var mı"* diye bakmaktır; her şey zaten yazılmış olmalıdır.

⚠️ **Ölçüt:** *"Kullanıcı şu an haber vermeden `/clear` yapsa, ne kaybederiz?"*
Cevap *"hiçbir şey"* değilse, yazılmamış bir şey var demektir.

---

Bir oturumu kapatmadan önce ajan şu **taramayı** yapar:

1. **`altyapi-durumu.md`'yi güncelle** — bu oturumda hesap açıldı mı, panel
   ayarı değişti mi, yeni ortam değişkeni girildi mi
2. **`roadmap.md`'yi güncelle** — biten adımı işaretle, ödenen teknik borcu
   üstü çizili yap, yeni doğan borcu ekle
3. **`CHANGELOG.md`'ye yaz** — ne eklendi, ne değişti, ne düzeltildi
4. **`yeni-oturuma-verilecek-sonraki-adim-promptu.md`'yi yeniden yaz** — bir sonraki oturum bunu
   kopyalayıp yapıştıracak; içinde ne olması gerektiği aşağıda
4b. ⭐ **Kural raporunu koştur, uyarısını kapat, çıktısını devir dosyasına koy** —
   aşağıdaki *"KURAL RAPORU"* bölümü
5. **Öğrenilen kalıcı kuralı İKİ kopyaya da yaz ve diff ile kanıtla**
   (`00-cekirdek.md` → *"Zorunlu kapılar"* kapı 8 — aşağıdaki bölüm)
5b. ⛔ **Defterler değiştiyse kite GERİ TAŞINMASINI hatırlat** — aşağıdaki bölüm
6. **Değişen durumu, o durumu yazan HER satırda güncelle** — aşağıdaki bölüm
7. ⛔ **Uzak depoya GÖNDER** — aşağıdaki bölüm
8. Kullanıcıya **"yeni oturuma şunu ver"** diye tek bir cümle söyle

### ⭐ KURAL RAPORU — hangi kural yüklendi, hangisi açılmadı

**Sorun:** alan kuralları (`.claude/rules/kod.md`, `test.md`…) bir dosyaya
dokununca yüklenir ve "şu standardı oku" der; ama okunup okunmadığını kimse
görmüyordu. Ölçüm 2026-09-21: bir oturumda `kod.md` (← sepet şeması) ve
`test.md` (← test dosyası) geldi, işaret ettikleri `02` ve `06` **hiç
açılmadı**. Kod yazıldı, kural okunmadı; kural adı görülmüştü, içeriği değil.

**Araç:** plugin kancası her yüklemeyi ve her standart okumasını (`Read` ya
da `cat`/`sed`/`grep`) `~/.claude/proje-kiti/log/<proje>.jsonl` dosyasına
yazar; rapor betiği oturum başına özetler:

```bash
node "$(ls -d ~/.claude/plugins/cache/bariskose-skills/proje-kiti/*/ | sort -V | tail -1)hooks/kural-rapor.mjs" <proje-klasör-adı> --son 1
```

Çıktı dört satır: **açılışta yüklenen** (çekirdek gelmiş mi) · **tetiklenen ←
hangi dosya** · **fiilen okunan standart** · **⚠️ İşaretçiye gidilmedi** (geldi
ama işaret ettiği standart açılmadı).

**Kural:**
1. Devir dosyasını yazmadan önce rapor koşturulur; çıktısı devir dosyasının
   *DURUM* bölümüne **olduğu gibi** yapıştırılır (bir sonraki oturum ve kit
   sahibi ölçümü görür; `11-agent-workflow.md` → *"Bağlam yönetimi"*
   gözden geçirmesi bu kayıtlarla yapılır).
2. ⚠️ uyarısı varsa oturum **kapanmaz**: işaret edilen standardın ilgili
   bölümü açılır, bu oturumda yazılan kod o bölüme karşı **yeniden okunur**,
   bulunan sapma düzeltilir ya da gerekçesiyle devir dosyasına yazılır.
   "Kuralı zaten biliyordum" kanıt değildir — ölçüm, bilmediğini gösterdi.
3. Rapor "log yok" diyorsa plugin kancası çalışmıyordur: sürümü kontrol et
   (*"Kurulu plugin sürümü ne zaman güncellenir"*), kullanıcıya söyle.

Windows'ta komut Git Bash'te aynen çalışır; PowerShell'de değil.

### ⛔ DEFTER KİTE DÖNMEZSE SONRAKİ PROJE GERİDE BAŞLAR

Bu oturumda `calisilacak-konular.md` veya `ogrendigim-konular.md` değiştiyse,
o değişiklik **yalnızca bu projede** duruyor demektir. Kit kopyası eski kalır
ve **bir sonraki proje geride başlar** — kullanıcı o konuyu öğrenmiş olduğu
hâlde ajan onu baştan anlatır.

⛔ **Oturumu kapatmadan hatırlat:**

> *"Bu oturumda defterlere şu satırlar eklendi: `<liste>`. Bunların kite
> dönmesi için `/kit-senkron` çalıştırılmalı — yoksa bir sonraki proje bu
> konuları öğrenilmemiş sayar. Şimdi çalıştıralım mı?"*

| Durum | Ne yapılır |
|---|---|
| Defterlerde değişiklik **yok** | Sessizce geç, hatırlatma yapma |
| Değişiklik var, kullanıcı *"evet"* der | `/kit-senkron` çalıştırılır |
| Değişiklik var, kullanıcı *"sonra"* der | ⛔ Devir notuna **açık madde** olarak yazılır, kaybolmaz |

⚠️ **Kit deposunda çalışıyorsan bu adım gerekmez** — orada defterin kendisini
doğrudan düzenliyorsun, kopya yok.

⭐ *Neden hatırlatma, otomatik değil:* `/kit-senkron` kite yazar ve kit **herkese
açık** bir depodur. Kullanıcının haberi olmadan oraya satır eklenmez.

### ⛔ İKİ MAKİNE — defter yalnızca PUSH edilirse ötekine geçer

Kullanıcı işte bir makinede, evde başka bir makinede çalışıyorsa defterin
**tek doğru kopyası GitHub'daki kit deposudur.** Yerelde commit etmek yetmez;
commit edilip **push edilmeyen** satır öteki makinede **yoktur.**

| Adım | Nerede |
|---|---|
| 1. Defter projede doldu | Proje klasörü |
| 2. `/kit-senkron` → kit deposuna birleştirildi | Kit deposunun **klonu** |
| 3. ⛔ **`git push`** | GitHub |
| 4. Öteki makinede `git pull` | O makinedeki klon |
| 5. `/plugin update` → yeni projeler bunu alır | Önbellek |

⛔ **Kurulu kopyaya (`~/.claude/plugins/cache/`) yazılmaz.** Orası salt
okunurdur ve `/plugin update` onu silip üzerine yazar. Yazılabilir kopya
**`git clone` ile alınan depodur** — her iki makinede de bir klon bulunmalıdır.

⚠️ **Adım 3 atlanırsa defter o makinede hapsolur.** Kullanıcı öteki makinede
*"bunu öğrenmiştim"* der, ajan bilmez, baştan anlatır.

### ⛔ OTURUM, PUSH EDİLMEDEN KAPANMAZ

Diskte duran bir devir notu **hiçbir makinede yok** demektir. Yeni oturum başka
bir bilgisayarda, başka bir hesapta açılabilir; gördüğü tek şey **uzak depodaki**
hâldir.

⭐ **Hedef platform proje tipine göre değişir** (`CLAUDE.md` §0 → proje tipi):

| Proje tipi | Uzak depo | İnceleme |
|---|---|---|
| **Kendi projem** | GitHub | Pull Request |
| **İşyeri projesi** | ⛔ **Kurumun GitLab'ı** — kişisel GitHub'a **gönderilmez** | Merge Request |

⛔ **İşyeri projesinde kod kişisel hesaba gönderilmez.** Kurum kodu kurumun
deposunda durur; kişisel hesaba push etmek, çoğu kurumda sözleşme ihlalidir ve
geri alınması git geçmişini temizlemeyi gerektirir.

⚠️ **Onaysız push yok** (`00-cekirdek.md` → *"Git ve commit"*). Rapor sunulur, onay alınır, sonra
gönderilir.

#### Hangi dil nerede — karıştırılmaz

Bu ayrım sık karışır ve yanlış "düzeltilir":

| Ne | Dil | Neden |
|---|---|---|
| **Commit özeti** (`feat(x): add …`) | **İngilizce** | Conventional Commits; kod dilinin parçası (`08-git-workflow.md`) |
| **Değişiklik raporu** (sana sunulan) | **Türkçe** | Okuyan sensin (`00-cekirdek.md` → *"Git ve commit"*) |
| **`CHANGELOG.md`** | **Türkçe**, tam cümle | Okuyan kullanıcı ve devralan |
| **Devir notu** (`yeni-oturuma-verilecek-sonraki-adim-promptu.md`) | **Türkçe** | Sonraki oturuma ve sana |
| Kod, değişken, tablo, kolon | **İngilizce** | `02-coding-standards.md` |

⭐ **Yani "ne yapıldı" iki kez yazılır ve ikisi farklı dildedir:** commit
başlığında İngilizce ve kısa, `CHANGELOG.md` ile devir notunda Türkçe ve
anlatan. Bu tekrar değil — iki ayrı okuyucu içindir.

### ⛔ Bir durum değiştiğinde tek bir yeri düzeltmek YETMEZ

Aynı gerçek birden çok yerde yazılıdır: `altyapi-durumu.md`'nin özet satırı,
ortam değişkeni matrisi, adım bölümleri ve `yeni-oturuma-verilecek-sonraki-adim-promptu.md`'nin DURUM
başlığı. Biri güncellenip öteki unutulduğunda dosya **kendi içinde çelişir** ve
sonraki oturum ilk okuduğu satıra inanır.

**Gerçek olay (2026-08-11):** iki panel işi (hata takibi ve yasal değişkenler)
yapıldı, ilgili bölümler güncellendi — ama **ortam değişkeni matrisi hâlâ
"girilmeli" diyordu.** O tablo, "kullanıcıya panel işi vermeden önce oku" denen
tablodur; sonraki oturum proje sahibine **zaten yaptığı işi tekrar yaptıracaktı.**
Aynı gün `yeni-oturuma-verilecek-sonraki-adim-promptu.md`'nin ilk maddesi de "hata takibi hâlâ sessiz"
diyordu, oysa aynı dosyanın 20 satır altında "doğrulandı" yazıyordu.

**Kural — bir dış dünya durumu değiştiğinde:**
1. Değişen terimi **tüm `docs/` içinde `grep`'le** (`girilmeli`, `açılmadı`,
   `girilmedi`, `hâlâ`, `YOK`)
2. Her isabeti ya güncelle ya da **tarihli arşiv** olduğunu başlığında açıkça yaz
3. ⛔ **KANIT:** aynı `grep`'i tekrar koştur ve geriye yalnızca arşiv satırlarının
   kaldığını göster

**Arşiv satırı SİLİNMEZ** — geçmişteki fotoğraf, kararın nedenini açıklar. Ama
başlığı tarih taşımak ve "güncel durum değildir" demek zorundadır.

### ⭐ Ama ÖLÜ UYARI arşiv değildir — o silinir

İki şey karıştırılıyor ve karıştırılınca belge şişer:

| | Ne yapar | Kaderi |
|---|---|---|
| **Arşiv satırı** | *"O tarihte durum şuydu"* — bugünkü kararın **nedenini** açıklar | ⛔ Silinmez, tarihlenir |
| **Ölü uyarı** | *"Şu dosyaya güvenme, bayat"* — işaret ettiği şey **artık yok** | ✅ **Silinir** |

⛔ **Ayırt edici soru:** *"Bu satırı okuyan biri bugün bir şey yapabilir mi?"*
Arşiv satırı *"demek bu yüzden böyle seçmişiz"* dedirtir — işe yarar. Ölü uyarı
ise var olmayan bir dosyayı aratır; okuyan onu **arar, bulamaz ve kendi
hatası sanır.**

⚠️ **Uyarı, konusu ortadan kalktığında uyarı olmaktan çıkar** — gürültü olur.
Bir dosyayı sildiğinde ona işaret eden uyarıları da `grep` ile bul ve kaldır
(`11-agent-workflow.md` → *"YAYILMA TABLOSU"*).

### ⛔ DEVİR BELGESİ KARARI TUTAR, KARARIN BİYOGRAFİSİNİ DEĞİL

Devir belgesini **her oturum ilk okur.** Oradaki her satır, henüz işe
başlamamış bir oturumun dikkatinden yer alır. Bu yüzden ölçüt sert:

> **Bu satır olmasaydı bir sonraki oturum yanlış bir iş yapar mıydı?**

Hayırsa satır oraya ait değildir.

| Ne | Devir belgesine | Standart dosyasına |
|---|---|---|
| **Karar** + gerekçesi | ✅ Girer | ✅ Girer |
| *"Şu tarihte şu hata yapıldı"* | ⛔ **Girmez** | ✅ Girer — kuralı ayakta tutar |
| *"Kullanıcı şuna gerek olmadığını söyledi"* | ⛔ Girmez — karar zaten yazılı | ⛔ Girmez |
| Yanlış bir iddianın **düzeltmesi** | ⛔ Girmez — ⭐ **doğrusunu yaz, yanlışı anlatma** | ⛔ Girmez |
| Nerede kalındı, sırada ne var | ✅ Girer | ⛔ Girmez |

⭐ **Aynı olay iki dosyada iki farklı işe yarar.** Bir standartta *"bir projede
yaşandı"* cümlesi kuralı **çiviler** — onu gereksiz bulup silmek isteyen biri
önce bu cümleyi okur. Devir belgesinde ise aynı cümle yalnızca yer kaplar,
çünkü orada zaten kural değil **durum** aranır.

#### ⛔ OLAY ANLATILIRKEN ANONİMLEŞTİRİLİR

Kit **herkese açık** bir depodur ve onu kuran herkes bu satırları okur. Bir
olay, kuralı gerekçelendirdiği kadar yazılır; kimin başına geldiği yazılmaz.

| ⛔ Yazma | ✅ Yaz |
|---|---|
| *"Kullanıcının kişisel notları public depoya gitti"* | *"Üretilen belge kişisel alıntı taşıyabilir"* |
| Özel bir dosyanın adı ve içeriği | Belgenin **türü** (*"iş yerine ait alıntı"*) |
| *"Kullanıcı temizlemeye gerek olmadığını söyledi"* | — (karar zaten kuralın kendisinde) |
| *"Bir projede yaşandı: sıra ters çevrildi, testler yeşil kaldı"* | ✅ Bu zaten doğru biçim |

⚠️ **Ölçüt:** *"Bu satırı hiç tanımadığım biri okusa, yazarı veya kurumu
hakkında bir şey öğrenir mi?"* Öğreniyorsa o cümle **kural değil veri**dir —
kural evrenseldir ve okunması zarar vermez, veri özeldir ve projede kalır.

⭐ Anonim örnek güveni **artırır** — kuralın ölçümden geldiğini gösterir.
Adı geçen özel bir olay ise okuyanı *"burada ne olmuş"* diye düşündürür ve
kuralın kendisinden uzaklaştırır.

⛔ **Düzeltme yazma tuzağı:** bir iddia yanlış çıktığında *"şöyle yazıyordu ama
yanlıştı, doğrusu şu"* diye yazmak iki katı yer kaplar ve okuyanı yanlış
iddiadan da haberdar eder. **Yanlışı sil, doğrusunu yaz.** Yanlışın kendisi
gerekiyorsa yeri `git log`'dur.

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
| `<proje>/docs/standards/` | **Bu projenin bağlayıcı kuralları.** `00-cekirdek.md` → *"Hangi soru → hangi dosya"* hiyerarşisinde 1. sırada | **Hemen** — bir sonraki oturum bunu okur |
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
| ⛔ Asla senkronlanmaz | `## Stack` tablosu — fiilen kurulu sürümler |
| ✅ Senkronlanır | **Diğer tüm bölümler**, `## Sürüm sütunu nasıl doldurulur` dahil |

⚠️ **`## Sürüm sütunu nasıl doldurulur` eskiden "kite özel, projeye inmez"
sayılıyordu; bu yanlıştı.** O bölüm, sürüm tablosunu **kim bakıyorsa** ona
talimat verir — ve o kişi projede de vardır: `SKILL.md` Adım 5 tabloyu
`package.json` ile eşitlemeyi projede zorunlu tutuyor. Kurulum zaten
`docs/standards/**` klasörünü olduğu gibi kopyaladığı için bölüm projeye
**fiilen iniyordu**; kural ile davranış çelişiyordu. Kural davranışa uyduruldu.

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

⭐ **Projenin kopyası geride kaldığında da kanca söyler** (3.21.0): açılışta
`docs/standards/KIT-SURUM` damgası (`sürüm @ hash`, senkron yazar) güncel kitle
karşılaştırılır; gerideyse ajan *"/kit-senkron ile getireyim mi?"* diye sorar.
Üç katman ayrıdır ve hiçbiri diğerine kendiliğinden yansımaz: kaynak depo →
kurulu plugin (`plugin update` + yeniden başlatma) → proje kopyası (yalnızca
senkron). Damga üçüncüsünü görünür kılar.

Güncelleme kendiliğinden inmez. ⭐ **Ajan fark ettiği an sorar** — oturum kancası
her açılışta GitHub'daki sürüme bakar, `/yeni-proje` ve `/kit-senkron` başında
yeniden kontrol edilir — ve kullanıcı onaylarsa komutları **kendisi** koşturur:
```
claude plugin marketplace update bariskose-skills
claude plugin update proje-kiti@bariskose-skills
```
Yeni sürüm bu oturumda etkin olmaz; Claude yeniden başlatılır — bunu söylemek
de ajanın işi.

## `yeni-oturuma-verilecek-sonraki-adim-promptu.md` — ne içerir

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
