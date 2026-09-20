# Çalışılacak konular

<!-- ŞABLON — `docs/kullanici/calisilacak-konular.md` olarak kopyalanır. ⛔ `docs/project/` DEĞİL — defterler üçüncü bölgede yaşar. -->

> **Bu defter kitle birlikte gelir ve HER PROJEDE AYNIDIR.** Ajan her oturum
> başında okur ve sana nasıl anlatacağını buradan ayarlar — kendi izleniminden
> değil.
>
> ⭐ **Amacı zamanla senin best practice'ine dönüşmek.** Bir projede öğrenilen
> burada birikir, `/kit-senkron` ile kite döner ve **bir sonraki projeye zaten
> öğrenilmiş olarak** gelir.

⛔ **KURULUMDA ÜZERİNE YAZILMAZ, BİRLEŞTİRİLİR.** Projede zaten bir defter
varsa kitteki satırlar **eklenir**; var olan satır ikinci kez eklenmez, hiçbir
satır silinmez. Bir maddeyi yalnızca **sen** *"bunu sil"* dediğinde çıkar.

⚠️ **Bu depo herkese açıktır.** Buraya yazılan her satırı kiti kuran herkes
okuyabilir. Bu bilinçli bir karardır (`TARTISILMIS-KARARLAR.md`); yine de
buraya **şifre, anahtar, kurum içi bilgi ve müşteri adı yazılmaz.**

**Kapsam:** tüm projeler + kit geliştirme oturumları — tek defter

⭐ **İkiz dosyası var:** bir konu tam oturduğunda `ogrendigim-konular.md`'ye
taşınır. Bu dosya *"üzerinde çalışılan"*, o dosya *"artık bilinen"* demektir.
⛔ Taşımayı ajan tek başına yapmaz — **kullanıcı söyler ya da ajan teklif eder.**

---

## ⭐ SEVİYE DEFTERİ — ajan anlatım düzeyini buradan ayarlar

> **Bu bölüm ikili bir liste değil, dört seviyeli bir ölçüm.** Sebebi:
> bir konu tek seferde öğrenilmez. Kullanıcı kavramı anlamış ama içindeki
> bir kelimeyi bilmiyor olabilir; ya da anladığını sanıp kaçırmış olabilir.
>
> ⚠️ **Gerçekçi süre:** full-stack + mobil + DevOps + test + veritabanı +
> API + AI ile çalışma — hepsinin oturması **3–6 ay** sürer. Defter bu
> süreyi taşıyacak şekilde tasarlandı.

### Dört seviye

| Seviye | Ne demek | Ajan ne yapar |
|---|---|---|
| **0 — Yeni** | İlk kez geçiyor | Dört adımda **tam** aç: ad (TR/EN) → gerçek hayat → yazılım dünyası → bu projede nerede (`11-agent-workflow.md` → *"HER KAVRAM ÖĞRETİLİR"*) |
| **1 — Tanıdık** | Gördü, soru sordu | Kısa hatırlatma + ilk anlatıldığı yere işaret |
| **2 — Takip ediyor** | Soru sormadan izledi | Terimi kullan, **tek cümlelik** hatırlatma |
| **3 — Sahipleniyor** | ⭐ Kendisi kullandı, sordu veya **düzeltti** | Doğrudan kullan, açıklama yok |

### ⛔ NEYİ KANIT SAYARIZ — en kritik kural

| Sinyal | Kanıt gücü |
|---|---|
| ⭐ Kullanıcı ajanı o konuda **düzeltti** | **En güçlü** — anlamadan düzeltemez |
| ⭐ Terimi **kendi cümlesinde** doğru kullandı | Güçlü |
| Kavramın **sonucunu** sordu (*"peki o zaman şu olmaz mı?"*) | Güçlü — temeli almış |
| Açıklamayı okuyup soru sormadı | ⚠️ **Zayıf** — tek başına yetmez |
| *"Tamam"* dedi | ⛔ **KANIT DEĞİL** |

⛔ **Son satır kuralın kalbi.** *"Tamam"* demek anlamak değildir; sessizlik de
öyle. Seviye yalnızca **kullanıcının ürettiği** bir şeyle yükselir — bir
düzeltme, bir kullanım, bir sonuç sorusu.

### Seviye nasıl yükselir

⛔ **Tek gözlemle yükselmez.** Bir seviye atlamak için **farklı oturumlarda,
en az iki kez** kanıt gerekir. Sebebi: aynı oturumdaki tekrar, öğrenmeyi değil
**o anki bağlamı** ölçer.

Ajan yükseltmeyi **teklif eder**, kendiliğinden yazmaz:

> *"`transaction` konusunu iki ayrı oturumda soru sormadan kullandın, birinde
> de beni düzelttin. Seviyeyi 2'den 3'e çıkarayım mı? Çıkarırsam bundan sonra
> açıklamadan geçerim."*

### ⚠️ Seviye DÜŞER de — unutmak normaldir

| Durum | Etki |
|---|---|
| Konu **8 haftadır** hiç geçmedi | Bir seviye **düşer** |
| Kullanıcı *"bunu tekrar açıkla"* dedi | ⭐ Doğrudan **0'a** iner |
| Kullanıcı o konuda yanlış bir şey söyledi | Bir seviye düşer, ajan **sessizce** düzeltir |

⛔ Seviye düşmesi başarısızlık değildir. 3–6 aylık bir öğrenmede unutma
kaçınılmazdır; defterin işi bunu **görmek**, gizlemek değil.

### ⭐ Kavram ile KELİME ayrı ölçülür

Kullanıcı bir kavramı anlamış olabilir ama anlatımda geçen bir kelimeyi
bilmiyordur. Bu **ayrı bir eksiktir** ve kavramın seviyesini düşürmez.

- Kavram seviyesi → aşağıdaki tablolarda
- Bilinmeyen tek kelimeler → **"Kelime defteri"** bölümünde

---

## Konu alanları

<!--
Her satır:  konu · seviye (0-3) · son kanıt (ne oldu) · tarih
Ajan her oturum başında bu tabloyu okur; anlatım düzeyini buna göre seçer.
Boş bırakılan alan seviye 0 sayılır.
-->

### Mimari ve tasarım

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Katmanlı mimari · bağımlılık yönü | 1 | "Repository ne demek" diye sordu; katman testi eklenince kabul etti | 2026-09 |
| SOLID | 0 | | |
| Tasarım desenleri (Factory, Strategy…) | 0 | | |
| Durum makinesi | 0 | | |

### Backend

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| API sözleşmesi · sürümleme | 1 | "Contract da ne" diye sordu, açıklandı | 2026-09 |
| Kimlik doğrulama · yetki | 0 | | |
| Transaction · eşzamanlılık | 0 | | |
| Arka plan işleri · kuyruk | 1 | BullMQ'nun sunucusuzda çalışmadığını kendi getirdi, maliyeti sordu | 2026-09 |
| Hata yönetimi | 0 | | |

### Frontend (UI)

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Bileşen · durum yönetimi | 0 | | |
| Sunucu / istemci bileşeni | 0 | | |
| Veri getirme · önbellek | 0 | | |
| Form · doğrulama | 0 | | |

### Veritabanı

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Modelleme · ilişkiler | 1 | ER diyagramı ve Prisma Studio'yu kendi araştırıp sordu | 2026-09 |
| Index · sorgu performansı | 1 | Kit metinlerinde geçiyor, henüz kendi cümlesinde kullanmadı | 2026-09 |
| Migration · araç seçimi (Prisma Migrate / Flyway biçimi) | 1 | "Madem ikisi de en iyisi, neden bize Prisma, kuruma Flyway?" ve "SQL'i AI yazıyorsa zorluğu ne?" diye sonuç soruları sordu | 2026-09-13 |
| Sayfalama (offset / cursor) | 0 | | |
| SQL okuma — Prisma'nın ürettiği JOIN · GROUP BY · `EXPLAIN` çıktısı | 0 | | |
| Sabit değer kümesi (enum / tanım tablosu) | 1 | Enum ve lookup farkını "veri mi mantık mı" ölçütüyle okudu; henüz kendi cümlesinde kullanmadı | 2026-09-13 |
| Birincil anahtar (UUIDv7 / BIGINT IDENTITY) | 1 | "Belediyeninki daha iyiyse bize de o olsun, değilse ayrı" diye kararı kendi ölçütüyle verdi | 2026-09-13 |

### Test

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Test piramidi | 1 | TestSprite sorusuyla katman farkını sordu | 2026-09 |
| Birim · entegrasyon · uçtan uca | 0 | | |
| Koruma testi (bozup görme) | 0 | | |

### DevOps ve işletim

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Docker · konteyner | 2 | Docker'daki Postgres'e nasıl bakılacağını sordu — kurulu olduğunu biliyor | 2026-09 |
| CI/CD hattı | 1 | Kitte yazılı, henüz üzerine konuşmadık | 2026-09 |
| Ortamlar · gizli değerler | 0 | | |
| İzleme · günlük · uyarı | 0 | | |

### Güvenlik ve uyum

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Yaygın açıklar (XSS, IDOR…) | 0 | | |
| KVKK · kişisel veri | 0 | | |

### Mobil

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| Mobil ile web farkı | 0 | | |
| Mağaza süreci | 0 | | |

### ⭐ AI ile çalışma

| Konu | Sv | Son kanıt | Tarih |
|---|:--:|---|---|
| İyi istem (prompt) yazma | 3 | ⭐ Kendi plugin'ini ve dört skill'ini yazdı | 2026-09 |
| Bağlam yönetimi · `/clear` | 3 | ⭐ "Senin context window mu doldu" diye sordu; oturum-bellek farkını kavradı | 2026-09 |
| Ajanın çıktısını denetleme | 3 | ⭐ EN GÜÇLÜ: beni defalarca düzeltti — Adım 0 sıralaması, GitHub'a push, bayat belge, küçük proje istisnası | 2026-09 |
| Kite kural yazma | 3 | ⭐ Kural/araç ayrımını kendisi kurdu; hangi istisnanın reddedileceğine karar verdi | 2026-09 |
| Skill ile MCP sunucusu (yetenek) ayrımı | 3 | ⭐ chrome-devtools'un skill değil sunucu olduğunu kendisi ayırt etti | 2026-09 |

---

## ⭐ Artık biliyorum

<!--
Seviye 3'e (sahipleniyor) çıkmış terimlerin DÜZ LİSTESİ. Yukarıdaki tablolar
"hangi konu kaç seviyede" der; bu liste onun ajana bakan çıktısıdır:
⛔ buradaki bir terim bir daha BAŞTAN AÇIKLANMAZ, doğrudan kullanılır.

Biçim:  - `terim` — tek cümlelik karşılığı (seviye 3'e çıktığı tarih)
-->

- `ajanın çıktısını denetleme` — üretileni doğrulamadan kabul etmemek (2026-09)
- `kite kural yazma` — projede öğrenileni kalıcı standarda çevirmek (2026-09)
- `prompt yazma` — modele ne isteneceğini eksiksiz tarif etmek (2026-09)
- `bağlam yönetimi` — oturuma neyin girip neyin girmeyeceğini seçmek (2026-09)

⚠️ **Ajan buraya kendiliğinden yazmaz, teklif eder.** Seviye yükseltme kuralı
yukarıda: iki ayrı oturumda kanıt + kullanıcı onayı.

---

## Kelime defteri

<!--
Kavramı anladığı hâlde takıldığı TEK KELİMELER. Kavram seviyesinden ayrı.
Biçim:  - `kelime` — kısa karşılığı (tarih)
-->

- `repository` — veritabanı sorgularının yazıldığı tek kod katmanı (2026-09-04)
- `contract` — API'nin ne alıp ne döneceği anlaşması, Zod şeması olarak (2026-09-04)
- `CRUD` — Create-Read-Update-Delete: oluştur, oku, güncelle, sil (2026-09-05)
- `spike traffic` — ani trafik patlaması (2026-09-03)
- `serverless` — sunucuyu sürekli açık tutmadan, istek geldikçe çalışan yapı (2026-09-03)
- `migration / şema göçü` — veritabanı yapısını elle değil dosyayla değiştirmek; her ortamda aynı dosyalar aynı sırayla (2026-09-13)
- `Flyway biçimi / V__ dosyaları / düz SQL migration` — üçü aynı şey: `V12__ad.sql` düzeninde elle yazılan SQL; kurumun istediği biçim (2026-09-13)
- `immutability / değişmezlik` — bir kez çalışan migration bir daha değiştirilmez, yanlışsa yeni dosya (2026-09-13)
- `schema_history` — veritabanının içinde "hangi migration'lar uygulandı" listesi; Prisma'da `_prisma_migrations` (2026-09-13)
- `introspection / içe bakış / prisma db pull` — Prisma'nın veritabanına bakıp `schema.prisma`'yı üretmesi; kurum modunda şema ayna olur (2026-09-13)
- `R__ / repeatable` — view, fonksiyon, trigger için "tanımın tamamı yeniden yazılır" dosyası; içeriği değişince yeniden koşar (2026-09-13)
- `U__ / undo` — bir migration'ı geri alan script; nöbetçi DevOps geliştiriciyi aramadan koşturur (2026-09-13)
- `advisory lock` — iki uygulama kopyası aynı anda açılırsa yalnızca birinin migrate etmesini sağlayan kilit (2026-09-13)
- `DDL / DML` — yapıyı değiştiren komutlar (CREATE/ALTER/DROP) / veriyi değiştiren komutlar (INSERT/UPDATE/DELETE/SELECT); kurumda ayrı hesaplar (2026-09-13)
- `lookup table / tanım tablosu` — sabit değer listesinin satır olarak tutulduğu tablo; yeni değer INSERT, DDL yok (2026-09-13)
- `UUIDv7` — başı zaman damgası olan UUID; tahmin edilemez ama index'e sıralı girer (2026-09-13)
- `IDENTITY vs SERIAL` — ikisi de artan sayı; SERIAL ayrı sequence açar (yetki tuzağı), IDENTITY kolonun parçası (2026-09-13)
- `skill` — ajana "bu işi nasıl yaparsın" diye öğreten talimat paketi; yetenek vermez, var olan aracı iyi kullanmayı öğretir (2026-09-20)
- `MCP sunucusu` — ajana yeni bir YETENEK veren program (tarayıcıyı sürmek gibi); o yoksa hangi skill kurulu olursa olsun iş yapılamaz (2026-09-20)

---

## ⛔ Öğretmeyi ne zaman bırakırız

Bu defterin asıl amacı **anlatımı sonunda gereksiz kılmak.**

| Durum | Ajan ne yapar |
|---|---|
| Bir konu **seviye 3** ve son 8 haftada düşmedi | O konuda anlatım **durur** |
| Bir alanın **tamamı** seviye 3 | O alanda yalnızca **yeni** şeyler anlatılır |
| Tüm alanlar seviye 3 | ⭐ Ajan yalnızca **karar ve gerekçe** sunar, öğretmez |

⚠️ **Bu bir bitiş çizgisi değil, kayan bir eşik.** Yeni teknoloji girdikçe
yeni satırlar açılır; öğrenme bitmez, **anlatım düzeyi** değişir.

---

## Sormayı unuttuğum sorular

<!--
Görüşmede atlanan ve sonradan pahalıya patlayan sorular.
Bir sonraki projede kontrol listesi olarak kullanılır.

Örnek:
- Kaç eş zamanlı kullanıcı olacağını sormadım; sayfalama sınırını
  buna göre belirleyecektik.
-->

| Tarih | Ne sormayı unuttum | Sonucu ne oldu |
|---|---|---|
| 2026-09-04 | Belgelerin GitHub'a gidip gitmeyeceğini sormadım | Kişisel notlar public depoya gitti; geri alındı ama geçmişte kaldı |
| 2026-09-20 | Ajanın hazır verdiği §0 metnindeki sürümü ölçmeden yapıştırdım (16 yazıldı, `docker-compose.yml` 18.4) | → ajanın verdiği sayı da önce ölçülür |

---

## Zor gelen kararlar

<!--
Anlaması veya savunması zorlanan konular. Zamanla bu liste kısalır —
kısalması öğrenmenin ölçüsüdür.

Örnek:
- Bağımlılığın tersine çevrilmesi: "arayüzü domain'de tanımlamak" fikri
  üçüncü örnekte oturdu.
-->

| Konu | Neresi zor geldi | Ne oturttu |
|---|---|---|
| Migration aracı: kendi projede Prisma Migrate, kurumda Flyway biçimi | "İkisi de en iyiyse neden farklı?" — aynı işin iki ortamda iki doğrusu olması | Belirleyen üç şey: **veritabanını kim kontrol ediyor · kaç ekip/dil paylaşıyor · inceleme ve geri alma zorunlu mu.** Tam anlatım: `docs/standards/04-database.md` → *"MIGRATION ARACI"* |
| Aynı anda iki proje (iki VS Code penceresi) | "İkinci pencere yeter mi?" — çakışmaların görünmez olması | Üç somut çakışma: **port 3000** (`PORT=3001`), **makine yükü** (E2E `uptime` < 2.5 ister; 2026-09-20'de yük 5–7'de bir test düştü, inince geçti), **Docker** konteyner adı/portu. Build ve test iki projede aynı anda koşturulmaz |

---

## Tekrar eden hatalar

<!--
İkinci kez yapıldığında buraya yazılır. Üçüncü kez yapılırsa artık
kişisel değildir — kite kural olarak yazılır.
-->

| Hata | Kaç kez | Kite taşındı mı |
|---|---|:---:|

---

## İşe yarayan kalıplar

<!--
Kendi bulduğun, işini kolaylaştıran yaklaşımlar. Genelleşirse kite gider.

Örnek:
- Bir bölümü okuduktan sonra kapatıp kendi cümlelerimle anlatmak;
  anlatamadığım yer okumadığım yer oluyor.
-->

| Kalıp | Neyi çözüyor |
|---|---|

---

## Kite taşınacaklar

<!--
Genelleşmiş, artık kural olabilecek maddeler. /kit-senkron ile taşınır
ve buradan silinir.
-->

- [ ] **Kit senkronuna başlamadan kaynak klonun YEREL durumuna bak:** `git -C ~/baris_projects/bariskose-skills status` ve `log -1 --format=%cd`. `status -sb` yalnızca uzak farkı gösterir, aynı makinede eşzamanlı atılmış commit'i göstermez. 2026-09-20'de benim-belediyem #81 karışık anlık görüntü oldu (`00-stack` 3.15.1'den, kalanı 3.15.2'den). Senkron boyunca tek anlık görüntüden çalış; klon değişirse baştan ölç → `kit-senkron` SKILL.md Adım 1
