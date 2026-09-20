# <Proje Adı> — Teknoloji ve Plan

<!-- ŞABLON — `docs/project/teknoloji-ve-plan.md` olarak kopyalanır ve her adımda büyütülür. -->

> Bu belge iki soruyu birden cevaplar: **neyi neden kullanıyoruz** ve **hangi
> sırayla yapacağız.** Her bölüm kendi içinde yeterlidir; bir konuyu okurken
> başa dönmek gerekmez.
>
> Yalnızca *"ne yapılacak"* aranıyorsa doğrudan **BÖLÜM G**'ye gidilebilir.

---

## Giriş — kararlar neye göre verildi

<Üç ölçüt yazılır. Örnek: piyasada yaygın ve aktif bakımda olması ·
gerçek üretim pratiği olması · devralınabilir olması. Her ölçütün altına
somut bir örnek konur, soyut bırakılmaz.>

### ⛔ Bu belge ile ADR'nin iş bölümü

| | `decisions/ADR-*.md` | **Bu belge** |
|---|---|---|
| Ne tutar | Kararın **bağlayıcı kaydı**: bağlam, elenen alternatifler, kabul edilen bedel | Kararın **anlatımı**: bu teknoloji nedir, neden burada, hangi kutuda |
| Kim için | Sonraki oturum · başka geliştirici · denetçi | Öğrenen ve devralan kişi |
| Gerekçe nerede | ⭐ **Orada yaşar** | ⛔ Kopyalanmaz — *"neden bu seçildi — ADR-004"* denir |

⛔ **Aynı gerekçeyi iki yere yazma.** Yazılırsa biri güncellenir, öbürü bayatlar
ve okuyan hangisinin doğru olduğunu bilemez. Hangi kararın ADR gerektirdiği:
`docs/standards/00-stack.md` → *"KARAR NEREYE YAZILIR"*.

### Kararların dört kutusu

Her karar anlatılırken hangi kutuda olduğu söylenir:

| Kutu | Anlamı |
|---|---|
| **1** | İstenmişti, zaten doğrusuydu |
| **2** | İstenmişti, eşleniğini kullandım |
| **3** | İstenmemişti, gerçek hayat gerektirdi |
| **4** | İstenmişti, yapmadım — şunu tercih ettim |

⛔ 4. kutudaki her madde **ölçüyle** desteklenir (indirme sayısı, son yayın
tarihi, sürüm kısıtı). *"Bence daha iyi"* yazılmaz.

---

# BÖLÜM 0 — Sistem nasıl çalışıyor

<Zemin. Sonraki her teknoloji bu resmin bir yerinde duruyor.>

- İstemci ve sunucu ayrımı, neden istemciye güvenilmez
- Bir isteğin uçtan uca yolculuğu (adım adım)
- Hangi teknoloji bu yolculuğun hangi adımında çalışıyor — tablo
- Sık karıştırılan terim çiftleri
- **Tek cümlelik özet:** sistemin tamamını anlatan bir paragraf

---

# BÖLÜM A — Hızlı eşleme tablosu

| İstenen / gereken | Kullanılan | Tek cümlelik gerekçe |
|---|---|---|

<Ayrıca: istenmediği hâlde eklenenler ve neden eklendikleri.>

---

# BÖLÜM B — Sistemin yapması istenen şeyler

<Her talep tek tek. Her biri için:>

**İstenen:** …
**Kullanılan teknoloji:** …
**Bu teknolojiler nedir:** <günlük dille>
**Bu projede hangi sorunu çözüyor:** <somut örnek>
**Neden böyle seçildi:** …

---

# BÖLÜM C — Teknoloji kartları

<Kullanılan HER teknoloji için aynı şablon. "Küçük paket, geçiveririm" yok.>

**Nedir** · **Ne işe yarar** · **Bu projede nerede** · **Neden tercih edildi** ·
**Alternatifi neden değil** · **Karşılığı neydi**

⛔ Kod görülmeden anlaşılmayacak her kartta 5–15 satırlık örnek bulunur.
Örnekler satır satır Türkçe yorumlanır (`02-coding-standards.md`).

---

# BÖLÜM E — Kavramlar, prensipler, desenler

<Kurulan paketler değil, verilen kararlar. Her kavram DÖRT adımda — dört adım
şablon değil kontrol listesi; anlatım akar, ilk geçen her terim yerinde açılır
(`11-agent-workflow.md` → *"HER KAVRAM ÖĞRETİLİR"*):>

0. **Adı ve eş anlamlıları** — Türkçe ve İngilizce, eğik çizgiyle
1. **Gerçek hayattan karşılığı** — çarpıcı benzetme
2. **Yazılım dünyasındaki tanımı** — sektör terimiyle ve başka bir teknolojide aynı kavram
3. **BU projede tam olarak nerede** — hangi ekran, hangi tablo, hangi sorun

⛔ Üçüncü ve dördüncü adım atlanamaz. *"Katmanlar ayrılır"* hiçbir şey öğretmez;
*"ORM değişse yalnızca altyapı katmanı etkilenir"* öğretir.

**E.0 olarak temel kelimeler yazılır:** sınıf, nesne, metot, arayüz, katman,
bağımlılık. Bunlar bilinmeden geri kalanı ezber olur.

**Son bölüm — değerlendirilip seçilmeyen alternatifler.** *"Şunu düşündün mü?"*
sorusu mutlaka gelir; cevabı ölçümle hazır olmalı.

---

# BÖLÜM F — Bir isteğin uçtan uca hayatı

<Parçaları birleştiren anlatım: kullanıcı bir şey yaptığı andan sonuç
görünene kadar hangi katman devreye giriyor, hangi kural nerede çalışıyor.>

Sonuna tablo: her adımın hangi karara dayandığı ve o kararın hangi bölümde
anlatıldığı.

⭐ Sunumda en çok işe yarayan bölüm budur: mimariyi **anlatmadan göstermek**.

---

# BÖLÜM G — Yapım planı

## Bu plan nasıl kuruldu

<Dört kural yazılır — `16-yeni-proje-kurulumu.md` → "Yapım planı nasıl sıralanır".
Bağımlılık zinciri şema olarak, evreler tablo olarak verilir.>

## Adımlar

<Her adım `roadmap.md` biçiminde: kutucuk, amaç, teknoloji, nereye,
neye bağlanıyor, bitti sayılır, ayrıntısı nerede.>

⛔ Kutucuk işaretlenmeden oturum kapatılmaz (`15-oturum-devri-kurallari.md`).

---

# KAPANIŞ

- Bilinen teknik borçlar — **sorulmadan söylenir**
- Tek cümlelik özet
- Hangi yeteneğin nerede karşılandığı tablosu
