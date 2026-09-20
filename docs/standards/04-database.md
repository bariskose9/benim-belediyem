# 04 — Veritabanı Kuralları

## Şema ve migration

### Önce migration nedir, neden var

Bir tablonun yapısını değiştirmen gerekiyor: başvuru tablosuna "e-posta"
kolonu ekleyeceksin. Kendi bilgisayarındaki veritabanına `ALTER TABLE …
ADD COLUMN email TEXT` yazarsın, olur. Ama aynı değişiklik **test**
sunucusundaki ve **canlı**daki veritabanında da yapılmalı; üçünün yapısı
birbirinin aynısı olmak zorunda, yoksa kod canlıda *"email diye bir kolon
yok"* diye patlar. Elle üçüne de girmek bir gün unutulur, bir gün yanlış
yazılır; altı ay sonra *"canlıda hangi kolonlar var"* sorusuna kimse cevap
veremez.

Bu yüzden kural: **veritabanının yapısı elle değiştirilmez, dosyayla
değiştirilir.** Her yapı değişikliği bir SQL dosyası olur, kodla birlikte
git'e girer, her ortamda **aynı dosyalar aynı sırayla** çalıştırılır. Bu
dosyalara **migration / şema göçü / şema değişikliği betiği** denir. Gerçek
hayat: binanın **tadilat defteri** — her tadilat numaralı bir sayfa; üç şubeye
aynı defter gider, her şube sayfaları sırayla uygular; hangi şubenin kaçıncı
sayfada olduğu bellidir.

Üç kural, hangi aracı kullanırsan kullan:

| # | Kural | Neden |
|---|---|---|
| 1 | **Sıra** — dosyalar numaralı, hep aynı sırada çalışır | V3, V2'nin açtığı tabloya kolon ekliyor olabilir |
| 2 | **Değişmezlik (immutability)** — bir kez çalışan dosya bir daha değiştirilmez; yanlışsa **yeni** dosya yazılır | Canlı V4'ü uyguladı; sen V4'ü değiştirsen canlı onu tekrar çalıştırmaz, test ile canlı ayrışır |
| 3 | **Kayıt** — veritabanının içinde bir tablo "hangi dosyalar uygulandı" listesini tutar (`_prisma_migrations` / `schema_history`) | Araç bu tabloya bakıp yalnızca uygulanmamış olanları uygular |

- Veritabanına **elle** tablo/kolon eklenmez. Her değişiklik migration ile.
- Migration adı ne yaptığını söyler: `20260729_add_order_status_index` /
  `V12__add_email_to_applications.sql`
- Üretim ortamında veri silen/kolon düşüren migration **ayrı PR** ve açık onay
  ister; migration istek hattında **hiç** yer almaz (`01-architecture.md` →
  *"İKİ YAYGIN YANLIŞ ANLAMA"*).

### ⭐ MIGRATION ARACI — proje moduna göre, ikisi de kendi ortamının en iyisi

**Prisma Migrate** (kendi projem): şemanın tek kaynağı `prisma/schema.prisma`.
Kolonu oraya yazarsın, `prisma migrate dev` dersin; Prisma eski ile yeni
şemanın **farkını alır**, SQL'i **kendisi yazar**
(`prisma/migrations/20260913_add_email/migration.sql`), local'e uygular,
`_prisma_migrations`'a kaydeder, TypeScript tiplerini yeniler. Canlıda
`prisma migrate deploy` uygulanmamışları uygular. Gerçek hayat: mimar (sen)
plana bir oda çizer, müteahhit (Prisma) hangi duvarın yıkılacağını kendisi
çıkarıp deftere yazar. Tek geliştirici, tek dil, yönetilen veritabanı, DBA
yok — burada en iyisi bu.

**Flyway biçimi** (kurum standardı): Flyway, Java dünyasından gelen yaygın
bir migration aracı; kurum aracın kendisini değil **dosya düzenini** ister:

```
/database
  /migrations    V1__create_applications.sql     ← bir kez çalışır, değişmez
                 V2__insert_status_types.sql     ← DDL ve DML aynı klasörde, sırayla
  /repeatable    R__active_applications_view.sql ← içeriği değişince yeniden çalışır
  /undo          U1__create_applications.sql     ← V1'i geri alan script
  /seeds                                         ← test verisi, canlıya girmez
```

SQL'i **sen yazarsın**; araç sıralar, kaydeder, çalıştırır. `R__` dosyaları
view, fonksiyon, trigger içindir: *"tanımın tamamı yeniden yazılır"*
(`CREATE OR REPLACE`), araç dosyanın **checksum**'ının (içeriğin parmak izi)
değiştiğini görünce yeniden koşturur — Prisma bu nesneleri hiç bilmez. `U__`
geri almadır: canlı bozulursa nöbetçi DevOps `U7`'yi koşturur, geliştiriciyi
gece 3'te aramaz.

**Kurumlar neden bunu ister — "bilmedikleri için" değil:**

| Sebep | Açıklama |
|---|---|
| **Çok dil, tek DBA** | .NET, Java, PHP, Node projeleri aynı veritabanı birimine gelir. Prisma yalnızca Node'un aracı; düz SQL dilden bağımsız — DBA her ekipten aynı klasörü görür. Her müdürlüğün kendi dilekçe formunu değil, tek standart formu kabul eden evrak bürosu |
| **DBA kapı bekçisi** | Aynı sunucuda onlarca şema; kötü bir `ALTER` diğer projeleri kilitler. DBA uygulamadan **önce SQL'i okumak** ister; "SQL'i ben üretip ben uygularım" diyen araç bekçinin önünden atlar |
| **Oracle mirası** | Standart iki veritabanını kapsar; Flyway ikisini destekler, Prisma Oracle'ı hiç desteklemez |
| **Geri alma zorunlu** | Nöbet, ISO 27001, gece yayına alma: "nasıl geri alınır" **dosya olarak** hazır olmalı |
| **View / trigger** | Kurumsal veritabanları bunları çok kullanır; Prisma'da karşılığı yok |
| **Ömür** | ORM'ler on yılda dört kez değişti; SQL kaldı. Otuz yıllık kurum veritabanının defteri evrensel dilde tutulur |

⭐ Standart genelde **biçimi** zorunlu kılar, **aracı** değil: `V__`/`R__`/`U__`
düzeni ve `schema_history` istenir; bunu Flyway CLI da koşturabilir, ~150
satırlık kendi koşucun da. Kurumda Flyway'in kendisi kuruluysa o kullanılır;
değilse koşucu yazılır (`kurumdan-ogrenilecekler.md` → *"BÖLÜM 4 —
Veritabanı birimi"* satır 4.3).

⭐ **Aracı belirleyen üç şey:** **veritabanını kim kontrol ediyor · kaç
ekip/dil paylaşıyor · inceleme ve geri alma zorunluluğu var mı.** Kendi projede
"ben · bir · yok" → Prisma Migrate; kurumda "DB birimi · çok · var" → Flyway
biçimi. Bu üçü aynı olan iki ortamda araç da aynı olur — ortamın adı
(bulut, kiralık sunucu, kurum) değil, bu üç cevap belirler.

**İkisi aynı anda çalıştırılamaz:** iki araç aynı veritabanını iki ayrı
defterle takip eder, biri diğerinin yaptığını bilmez. Üç yol:

| Yol | Ne | Karar |
|---|---|---|
| Prisma Migrate + teslimde `V__`'ye çevir | İki defter | ⛔ Birinde unutulan diğerinde olmaz; DBA'nin `schema_history`'si Prisma'nınkiyle uyuşmaz |
| ORM'i bırak, düz SQL + elle tip | Tip güvenliği kaybı | ⛔ Şema değişince elle güncellenen tipler; hata derleyicide değil canlıda. Gerekçesi de yanlış: Prisma **Client** çalışırken DDL istemez, DDL yalnızca **Migrate**'te — ikisi ayrılabilir |
| ⭐ **Prisma Client + kurum biçiminde SQL** | Migrate kapalı, Client açık | ✅ Aşağıda |

### Neden kendi projede Flyway biçimi değil — SQL'i ajan yazsa bile

*"SQL'i nasılsa ajan yazıyor, kendi projede de düz SQL kullansak?"* — zorluk
**yazmakta değil**, şurada: **birbiriyle tutarlı olmak zorunda olan kaç
kaynak var ve tutarlılığı kim garanti ediyor?**

Veritabanı yapısını "bilen" beş şey vardır: veritabanının kendisi · migration
dosyaları · `schema.prisma` · üretilen TypeScript tipleri · repository kodu.
Hepsi aynı gerçeği söylemek zorunda; biri sapınca hata **sessizdir** — derleyici
yakalamaz, canlıda *"kolon yok"* der.

| | Kaynak sayısı | Tutarlılığı kim sağlar |
|---|---|---|
| **Prisma Migrate** | **Bir** — `schema.prisma`. Migration ondan üretilir, DB onunla değişir, tipler ondan üretilir | **Yapı** — her halka öncekinden türetilmiş, elle senkron tutulan şey yok. Üstüne **kayma denetimi (drift detection)**: `migrate dev` her seferinde "DB, dosyaların dediği hâlde mi" diye bakar, değilse durur |
| **Flyway biçimi + Prisma Client** | **İki** — SQL dosyaları ve `schema.prisma` (ayna) | **Disiplin + CI** — `db pull` komutu ve onu çalıştırmayı **hatırlamak**; ajan da adım atlar, kit tam bu yüzden var. Bu yüzden kurum döngüsünün 8. adımı CI'da `migrate diff --exit-code` ile kaymayı **hata** yapar (aşağıda) |

*Gerçek hayat:* tek ana plandan çıkan kopyalar plandan sapamaz — kopya oldukları
için; iki ayrı defter tutan muhasebede ise ikisi de doğru olabilir ama *"ikisi
de doğru mu"* sorusunu her gün birinin kontrol etmesi gerekir. Kurumda ikinci
defter **zorunlu** (DBA SQL'i okuyacak) — bedeli ödenir. Kendi projede o
zorunluluk yok; ikinci defteri gönüllü açmak, kendine bir hata kaynağı satın
almaktır.

**Handikaplar — iki taraf için dürüstçe:**

| Flyway biçiminin kendi projedeki bedeli | Prisma Migrate'in gerçek handikapları |
|---|---|
| Koşucu senin sorumluluğun — ~150 satır `migrate.mjs` ya da Node projesine Java tabanlı Flyway. Kurumda bu bedel zaten ödeniyor | **Geri alma (`U__`) yok** — "yeni migration yaz" der. Nöbet sistemi olan kurumda kabul edilemez; tek geliştiricili projede kabul edilebilir |
| `U__` dosyaları iki kat iş; asıl tehlike: **test edilmemiş undo, olmayan undo'dan kötüdür** — gece 3'te ilk kez çalışan geri alma veri siler | View, trigger, fonksiyon, `CHECK` kısıtı `schema.prisma`'da ifade edilemez — migration SQL'ine elle eklenir (dosya senindir, Prisma korur) ama şema onları göstermez |
| Kayma denetimi yok — DB ile dosyaların ayrıştığını kimse söylemez | `migrate dev` kaymada **sıfırlamayı teklif eder** — local'de faydalı, paylaşılan bir DB'ye doğrultulursa felaket. ⛔ `migrate dev` yalnızca local'de |
| Vercel + Neon akışı (her PR'a önizleme DB dalı, build'de `migrate deploy`) hazır; kendi koşucunu o akışa sen takarsın | Dosya düzeni Prisma'nın — ORM değişirse geçmiş taşınır (SQL dosyaları düz SQL, kaybolmaz) |
| `db pull` her şeyi geri getirmez: `@map`, ilişki adı, `uuid(7)` korunur; Prisma'nın tanımadığı nesneler (partial index, trigger) şemaya girmez, yalnızca SQL'de yaşar | Büyük tabloda `ALTER` kilidi — her araçta aynı; Prisma seni uyarmaz |
| 7 adım / 1 adım — her adım bir atlama noktası | — |

⭐ **"Prisma SQL'i gizliyor, SQL öğrenemem" endişesi — yersiz, çünkü Prisma
SQL'i gizlemez, senin yerine yazıp önüne koyar.** `prisma migrate dev`
dediğinde proje klasöründe şu dosya oluşur:

```
prisma/migrations/20260913120000_add_email/migration.sql
```

İçinde düz SQL vardır — `ALTER TABLE "applications" ADD COLUMN "email" TEXT;`
— elle yazsan aynısını yazacağın satır. Dosya git'e girer, her migration'da
açılıp okunur, gerekirse **düzenlenir** (`BIGSERIAL` → `IDENTITY` gibi);
`--create-only` bayrağı *"üret ama uygulama, önce bakayım"* der. Fark "SQL
görüyor musun" değil; fark **SQL'i sen mi yazıyorsun (author), sen mi
inceliyorsun (review).** Öğrenme için ikincisi daha verimlidir: şemaya bir
ilişki eklersin, Prisma'nın ürettiği `ADD CONSTRAINT … FOREIGN KEY` satırını
okursun — söz diziminde takılmadan "FK böyle yazılıyormuş" dersin.

### Kurum modunda döngü — Prisma Client + `V__` dosyaları

Prisma'nın iki parçası ayrılır: **Migrate** kapatılır (migration'lar
`database/` altında düz SQL, koşucu `scripts/migrate.mjs` ~150 satır ya da
DevOps'ta Flyway varsa onun CLI'ı); **Client** kalır (`schema.prisma` artık
kaynak değil **ayna**: `prisma db pull` veritabanına bakıp dosyayı üretir —
buna **introspection / içe bakış** denir — `prisma generate` tipleri yeniler).
Repository'de yine `prisma.application.findMany(...)`; tip güvenliği yerinde.

SQL'i elle yazmak zor değil, çünkü `prisma migrate diff` var: şemaya kolonu
ekle, *"mevcut veritabanı ile bu şema arasındaki farkın SQL'ini yaz"* de,
taslağı al. Prisma'nın "SQL'i benim yerime yaz" yeteneği kaybolmaz; dosya
yalnızca **kurumun klasörüne, kurumun adıyla** konur.

```
1. schema.prisma'ya değişikliği yaz (email String?)
2. pnpm prisma migrate diff --from-url $DATABASE_URL \
     --to-schema-datamodel prisma/schema.prisma --script
   → çıktıyı database/migrations/V12__add_email_to_applications.sql olarak kaydet
3. Dosyaya kurum kurallarını ekle: yeni tabloysa GRANT (uygulama hesabına DML);
   BIGSERIAL çıktıysa IDENTITY yap (yukarıdaki "Birincil anahtar")
4. U12__add_email_to_applications.sql yaz (geri alma: DROP COLUMN email)
5. node scripts/migrate.mjs            → local DB'ye uygular, schema_history'ye yazar
6. pnpm prisma db pull && pnpm prisma generate   → schema.prisma ve tipler DB ile eşit
7. git'e: V12 + U12 + schema.prisma birlikte
8. CI'da KAYMA DENETİMİ:
   pnpm prisma migrate diff --from-url $DATABASE_URL \
     --to-schema-datamodel prisma/schema.prisma --exit-code
   → fark varsa hata koduyla biter, MR birleşemez: 6. adım atlanmışsa sessiz kalmaz
```

⭐ 8. adım, kurum modunda kaybedilen **kayma denetimini geri alır**: iki
defterin eşitliğini "hatırlamak" değil, **CI** garanti eder. Disiplin yeniden
yapıya döner; fark kendi projeyle tamamen kapanmaz (yine iki kaynak var) ama
sessiz sapma kalmaz.

Bedeli 2–4. adımlar (kendi projede tek komuttu). Kazancı: DBA tanıdığı
dosyaları görür, `R__` ile view'lar yönetilir, `U__` hazır, tip güvenliği
kaybolmaz, şemanın **tek doğru kaynağı veritabanının kendisi** olur — kurumda
zaten öyle olmak zorunda, tabloyu son tahlilde DB birimi açıyor.

Koşucu (`migrate.mjs`) üç şeyi mutlaka yapar: `schema_history` tablosunu
açar · dosyaları **sayısal** sıralar (alfabetik `V10` `V2`'nin önüne geçer)
· `pg_advisory_lock` alır (iki kopya aynı anda açılırsa yalnızca biri
migrate eder — tuvalet kapısındaki kilit).

| Mod | Araç | Şemanın kaynağı |
|---|---|---|
| **Kendi projem** | Prisma Migrate | `schema.prisma` |
| **İşyeri** — kurumun migration standardı var | Prisma Client + kurum biçimi SQL + koşucu | Veritabanının kendisi; `schema.prisma` ayna |
| **İşyeri** — standart yok | Prisma Migrate; teslim paketinde geri alma notu | `schema.prisma` |

⭐ **Kararı veren soru:** *"Bu veritabanının yapısını son tahlilde kim
kontrol ediyor — ben mi, başka bir birim mi?"* Ben'sem kaynak `schema.prisma`;
başkasıysa kaynak veritabanı, Prisma aynadır. Kurumun koşucu ve `schema_history`
beklentisi `kurumdan-ogrenilecekler.md` → *"BÖLÜM 4 — Veritabanı birimi"*
(satır 4.3) ile netleşir.

## İsimlendirme
- Tablo: çoğul `snake_case` (`appointments`, `order_items`)
- Kolon: `snake_case` · Prisma model adı: `PascalCase` tekil (`Appointment`)

### ⭐ İKİ DÜNYA, İKİ STANDART — köprü `@map` ile kurulur

Yukarıdaki kural bir çelişki doğuruyor gibi görünür:

| Katman | Yerleşik standart |
|---|---|
| **TypeScript / NestJS** | `camelCase` alan · `PascalCase` tip · **tekil** |
| **PostgreSQL** | `snake_case` kolon · **çoğul** tablo |

⛔ **Birini diğerine feda etme.** İki katman da kendi yerleşik pratiğini korur;
aradaki çeviriyi **Prisma** yapar.

Aynı alanın üç ayrı yerdeki adı:

| Nerede | Adı |
|---|---|
| TypeScript kodunda | `dueAt` |
| **Prisma şemasında** | ⭐ `dueAt @map("due_at")` — ikisini bağlayan satır |
| PostgreSQL tablosunda | `due_at` |

```
 SEN YAZARSIN          PRİSMA ÇEVİRİR              VERİTABANINDA OLUŞUR
 wo.dueAt         ←→   dueAt @map("due_at")   ←→   kolon: due_at
 prisma.workOrder ←→   @@map("work_orders")   ←→   tablo: work_orders
```

```prisma
model WorkOrder {
  // Bu satırlarda @map YOK — ad iki dünyada da aynı
  id    String @id @default(uuid())
  code  String @unique

  //  dueAt   DateTime   @map("due_at")
  //  ─────              ──────────────
  //    ↑                      ↑
  //    │                      └── PostgreSQL'de oluşacak KOLON adı
  //    └───────────────────────── Kodda yazacağın ALAN adı
  dueAt     DateTime @map("due_at")
  createdAt DateTime @default(now()) @map("created_at")

  // @@map (İKİ @) alanı değil, TABLONUN KENDİSİNİ eşler
  @@map("work_orders")
}
```

⭐ **Özeti:** `@map` bir **alanı**, `@@map` bir **tabloyu** eşler. Sol taraf
senin yazdığın, sağ taraf veritabanında duran.

Kod tarafında **hiç alt çizgi görmezsin**:

```ts
// NESNE: TypeScript standardı — temiz camelCase
const created = await this.prisma.workOrder.create({
  data: { code, dueAt },
});

// ⭐ Prisma arka planda şu SQL'i üretir — PostgreSQL standardı:
// INSERT INTO "work_orders" ("id","code","due_at","created_at") VALUES (…)
```

⭐ **Bu, katman bağımsızlığının somut karşılığıdır** (`01-architecture.md`):
veritabanı adlandırması değişirse yalnızca `@map` satırları değişir, uygulama
kodunun tek satırı bile dokunulmaz.

⛔ **`@map` sonradan eklenmez.** İlk migration'dan **önce** yazılır; sonra
eklenirse kolon yeniden adlandırma migration'ı gerekir ve veri taşıma riski
doğar.

⚠️ **Kurum kendi isimlendirme kuralını verirse** yalnızca `@map` tarafı ona
uydurulur; TypeScript tarafı **değişmez**. Köprünün varlık sebebi tam olarak
budur.
⭐ **İşyeri modunda kod da Türkçe** (`02-coding-standards.md` → *"Kod dili
proje moduna göre"*): köprünün iki yanı aynı dilde olur, `@map` yalnızca
**biçimi** çevirir — `olusturmaTarihi @map("olusturma_tarihi")`,
`@@map("tbl_basvuru")`. Sözlük tektir; çeviri yükü kalkar.


> **ℹ️ Elle yazmak zorunda mıyım — evet, ve bu iyi**
>
> `prisma-case-format` gibi araçlar `@map` satırlarını otomatik üretebiliyor
> (2026-08 ölçümü: 44K indirme/hafta — Prisma'nın 16.8M'i yanında **niş**).
>
> ⛔ Kite alınmadı: yaygınlık ölçütünü geçmiyor ve şemayı **üreten** bir araç,
> şemanın tek doğru kaynağı olma özelliğini zayıflatır. `@map` satırları elle
> yazılır; zaten model başına birkaç satırdır.
- Yabancı anahtar: `<tekil_tablo>_id` (`user_id`)
- Boolean: `is_`/`has_` öneki (`is_active`)
- Tarih: `created_at`, `updated_at`, `deleted_at` — `TIMESTAMPTZ`, UTC; saatsiz gün (`DATE`) ayrımı ve hesaplama kuralları `02-coding-standards.md` → *"Zaman dilimi"*

## ⭐ VERİ MODELİNİ GÖRMEK — tablolar ve ilişkiler gözle izlenir

⛔ **Şemayı yalnızca `schema.prisma` dosyasından okumak yetmez.** Kod okuyarak
"hangi tablo hangisine bağlı" sorusunu cevaplamak, ilişki sayısı arttıkça
imkânsızlaşır. İki araç kurulur ve **kullanıcıya nasıl açacağı öğretilir.**

### 1. Prisma Studio — tabloları gezmek

```bash
pnpm prisma studio         # tarayıcıda localhost:5555
```

Excel tablosu gibi açılır: kayıtları görürsün, ilişki alanına tıklayınca bağlı
kayda gidersin, elle kayıt ekleyip silebilirsin. Docker'daki PostgreSQL'e
`DATABASE_URL` üzerinden bağlanır — ek kurulum gerekmez.

⭐ **Kurulumdan sonra bir kez açılır ve kullanıcıya gösterilir.** Tohum (seed)
verisi yazıldıktan sonra "işte kayıtların burada" demek, veritabanını soyut bir
şey olmaktan çıkarır.

⛔ **Üretim veritabanına Studio ile bağlanılmaz.** Yanlışlıkla kayıt silmek tek
tıklıktır. Yalnızca local ve gerekiyorsa preview.

### 2. ER diyagramı — ilişkileri tek resimde görmek

Prisma'da hazır gelmez; üreteciyle şemadan **otomatik** çıkarılır:

```bash
pnpm add -D prisma-erd-generator @mermaid-js/mermaid-cli
```

`schema.prisma` içine üretici eklenir; `prisma generate` her çalıştığında
diyagram `docs/project/veri-modeli.md` (veya `.svg`) olarak **yeniden yazılır**.

⭐ **Elle çizilmez.** Elle çizilen diyagram ilk şema değişikliğinde yalan söyler
ve kimse fark etmez. Şemadan üretilen diyagram yalan söyleyemez.

⚠️ Diyagram `data-model.md` şablonunun yerine geçmez: diyagram **ne bağlı**
olduğunu gösterir, `data-model.md` **neden öyle** olduğunu anlatır.

### Bu proje bunlara ihtiyaç duyar mı

| Proje | Gerek var mı |
|---|---|
| Backend'i biz yazıyoruz (Next route handler veya NestJS) | ✅ **Evet** — veri modelini görmeden doğru API tasarlanmaz |
| API tasarlıyoruz | ✅ Evet |
| Yalnızca hazır API tüketiliyor, veritabanı bizde değil | ➖ **Hayır.** Bize lazım olan veri modeli değil, **API sözleşmesi** (`03-api-guidelines.md`) |

## Zorunlu alanlar
Her tabloda: `id`, `created_at`, `updated_at` (adlar proje moduna göre —
yukarıdaki *"İsimlendirme"*). Kullanıcı verisi tutan tablolarda `user_id` +
yabancı anahtar kısıtı.

### ⭐ BİRİNCİL ANAHTAR — proje moduna göre, ikisi de gerekçeli

**Birincil anahtar / primary key / PK** — *Gerçek hayat:* TC kimlik numarası:
iki kişinin adı aynı olabilir, numarası olamaz. *Yazılım:* satırı tek başına
ayırt eden kolon; başka tablolar ona **yabancı anahtar / foreign key / FK** ile
bağlanır. *Bu projede:* her tablonun `id` kolonu.

| Mod | Seçim | Neden |
|---|---|---|
| **Kendi projem** | **UUIDv7** — `id String @id @default(uuid(7))` (PostgreSQL 18'de yerleşik `uuidv7()` da var) | Sunucusuz ortamda kimliği **uygulama** üretir, veritabanına sormaz; iki kaynak aynı anda üretse çakışmaz; URL'de görünse komşu kayıt tahmin edilemez. ⭐ v7'nin başı **zaman damgası**: index'e sıralı girer — v4'ün "dağınık index" eksisi yok. *Gerçek hayat:* takip numarasının başına tarih yazmak |
| **İşyeri projesi** (kurum DB standardı) | **`BIGINT GENERATED ALWAYS AS IDENTITY`** — `id BigInt @id @default(autoincrement())` + migration SQL düzeltmesi (aşağıda) | Tek veritabanı, tek merkez: 8 bayt, sıralı, `ORDER BY id` = oluşturma sırası, DBA sayıyla çalışır. Kurum standardı ve teknik olarak da bu ortamda en iyisi |

⛔ **Kurgu büyüyünce çakışma yok:** BIGINT 9 kentilyona kadar sayar; tek risk
iki veritabanını birleştirmektir, kurumda olmaz. UUIDv7 zaten birleştirmeye
dayanıklıdır.

**`SERIAL` neden yasak, `IDENTITY` neden doğru:** ikisi de artan sayı üretir.
`SERIAL` perde arkasında **ayrı bir sequence nesnesi** açıp kolona bağlar;
yetki ve sahiplik o nesnede ayrı takip edilir — `svc_` hesabına tabloya izin
verip sequence'e vermeyi unutursan `INSERT` patlar. `GENERATED ALWAYS AS
IDENTITY` SQL standardıdır: sequence kolonun parçasıdır, yetkiyle birlikte
gelir. *Gerçek hayat:* SERIAL = arabanın anahtarı ayrı kasada; IDENTITY =
anahtar arabayla teslim.

⛔ **Prisma tuzağı:** `autoincrement()` migration'da `BIGSERIAL` üretir. Kurum
modunda migration **önce dosya olarak** üretilir, sonra elle düzeltilir:

```bash
pnpm prisma migrate dev --create-only --name create_tbl_basvuru
# üretilen migration.sql içinde:
#   "id" BIGSERIAL NOT NULL            → ⛔ kurum yasak
#   "id" BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL   → ✅ elle değiştir
pnpm prisma migrate dev                # sonra uygula
```

Çalışma anında Prisma için fark yoktur; yalnızca DDL değişir.

⭐ **Dışa açılan kayıt için `public_id`:** vatandaşın gördüğü başvuru numarası
gibi bir değer URL'de `…/basvuru/4813` diye görünürse komşu kayıt tahmin
edilir (**IDOR / insecure direct object reference**). Bunun çözümü PK'yı
değiştirmek değil, iki şey: her uçta **yetki kontrolü** (`05-auth-security.md`)
ve dışa açılan kayıtta ayrıca tahmin edilemez bir `public_id` (UUIDv7 veya kısa
rastgele kod) kolonu. Kurumun bu kolona itirazı olup olmadığı
`kurumdan-ogrenilecekler.md` → *"BÖLÜM 4 — Veritabanı birimi"* (satır 4.6) sorulur.


## Bütünlük
- İlişkiler veritabanı seviyesinde yabancı anahtarla zorlanır — uygulamaya bırakılmaz.
- Benzersizlik kuralları unique index ile zorlanır (örn. aynı doktor + aynı saat).
- Para **asla** float değil: `Decimal` veya kuruş cinsinden `Integer`.
- Sabit değer kümeleri (durum, tür, kategori) için PostgreSQL `ENUM` tipi
  **hiç** kullanılmaz — kural ve gerekçesi aşağıda, *"Sabit değer kümesi"*.

### ⭐ SABİT DEĞER KÜMESİ — enum değil, tanım tablosu (+ gerekirse kodda liste)

Bir başvuru sistemi düşün. Her başvurunun bir **durumu** var: *beklemede*,
*onaylandı*, *reddedildi*. Bu bilgiyi tutan kolona yalnızca bu üç değerden
biri yazılabilsin istiyoruz — kimse "belki" yazamasın. Bu üç değerlik listeyi
**nereye** koyacağız? İki yol var.

**Yol 1 — Enum (enumeration / sabit değer kümesi):** listeyi veritabanının
**yapısına** gömmek. PostgreSQL'de `CREATE TYPE durum AS ENUM ('beklemede',
'onaylandi', 'reddedildi')` diye bir tip tanımlanır, kolon o tipi alır.
Gerçek hayattaki karşılığı trafik ışığı: kırmızı, sarı, yeşil cihaza gömülü;
"bir de mavi olsun" demek ışığa lamba takmak, yani cihazı değiştirmek.
Güvenli ama değiştirmesi pahalı. Gücü şurada: Prisma bu tipi TypeScript'e
taşır, `durum: "belki"` yazan kod **derlenmez** — hata canlıya çıkmadan, sen
yazarken yakalanır (derleme zamanı / compile time). Zayıflığı da aynı yerde:
yeni değer eklemek **DDL**'dir (yapıyı değiştiren komut — `ALTER TYPE … ADD
VALUE`), yani migration + deploy; kurumda DDL'i ayrı birim koşturuyorsa
günler. PostgreSQL enum'dan değer **silinemez**. Ekranda "Onaylandı" yazmak
için etiket sözlüğü kodda ayrıca tutulur.

**Yol 2 — Tanım tablosu (lookup table / referans tablosu / kod tablosu):**
listeyi ayrı bir tabloya **satır** olarak koymak; ana tablo ona yabancı
anahtarla bağlanır:

```sql
-- Durumlar artık bir tablonun satırları; ekran metni ve sırası da burada
CREATE TABLE status_types (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,          -- ekranda görünen ad
  description TEXT,                   -- uzun açıklama
  sort_order  SMALLINT,               -- açılır listede sıra
  is_active   BOOLEAN DEFAULT true    -- kaldırılan değer silinmez, pasife alınır
);

CREATE TABLE applications (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- REFERENCES = yabancı anahtar (foreign key, FK): bu kolon status_types'taki
  -- bir satırı işaret eder ve veritabanı bunu ZORLAR — 99 numaralı durum yoksa
  -- 99 yazılamaz. Faturadaki "müşteri no" gibi: defterde o müşteri olmak zorunda.
  status_id      BIGINT NOT NULL REFERENCES status_types(id)
);
```

Gerçek hayattaki karşılığı kurum koridorundaki "işlem türleri" panosu: yeni
tür gelince panoya satır eklenir, bina değişmez. Yeni değer = `INSERT`
(**DML** — veriyi değiştiren komut, uygulamanın kendi hesabıyla yapabildiği
şey). Panelden bir "Tanımlar" ekranıyla iş birimi kendisi yönetir. Ekran
metni, açıklama, sıra tabloda; kaldırmak `is_active = false`. Bedeli: listede
adı göstermek için bir **JOIN** (iki tabloyu `id` üstünden birleştirme —
5 satırlık tablo, maliyeti yok) ve **derleyici artık listeyi bilmez**:
`status_id = 99` derlenir, hata çalışma zamanında döner.

**Kararı veren soru — bu liste kimin?** *"Yarın listeye bir değer eklense
kod değişir mi?"*

| Cevap | Liste kimin | Ne yapılır |
|---|---|---|
| **Hayır** — kod hepsine aynı davranır (duyuru kategorisi, personel tipi, ilçe) | İş biriminin — **veri** | Tanım tablosu. Kod tarafında liste tutulmaz; panelden yönetilir |
| **Evet** — kod değerleri tanır, `if` var (başvuru durumu: geçiş kuralı, "onaylanınca SMS") | Kodun — **mantık** | Tanım tablosu **+** kodda sabit liste **+** ikisini eşleştiren test. Tabloya panelden eklenen yeni değer kodun bilmediği bir duruma yol açmasın |

Kodda sabit liste Prisma enum değil, `as const` ile yazılır:

```ts
// "as const": TypeScript'e "bu dizi değişmez, elemanları tam olarak bu üç kelime" der
export const STATUS = ["pending", "approved", "rejected"] as const;
// Bu satır o üç kelimeden bir TİP üretir: "pending" | "approved" | "rejected"
// "|" ile ayrılan tipe union tip (birleşim tipi) denir: "şunlardan biri"
export type Status = (typeof STATUS)[number];

function canTransition(from: Status, to: Status) { /* geçiş kuralı */ }
// canTransition("maybe", "approved") ← derleyici burada durdurur
```

Tablo ile kodun ayrışmaması için bir **test** yazılır: `status_types`
satırlarını okur, `STATUS` ile karşılaştırır, eşleşmiyorsa kırmızı. CI'da
(kod her gönderildiğinde otomatik koşan kontrol hattı) çalışır; ayrışma canlıya
değil ekrana düşer.

⭐ **Her iki modda aynı kural.** Kurum standardı ("ENUM yerine tanım tablosu")
bizi daha iyi bir kurala itti: enum'un verdiği tek şey (derleyici bilsin)
`as const` ile alınır, getirdiği dertler (silinemez, etiketi yok, her
değişiklik DDL) alınmaz. Tanım tablosunda asgari kolonlar `id · name ·
description`; `sort_order` ve `is_active` eklenir (kurum modunda adlar kurum
standardında — *"İsimlendirme"*).

## Performans
- Sık filtrelenen ve sıralanan kolonlara index eklenir.
- N+1 sorgu yasak: ilişkili veri `include`/`select` ile tek sorguda çekilir.
- `select` ile sadece gereken kolonlar çekilir; `SELECT *` alışkanlığı yok.
- Birden fazla yazma içeren işlemler (sipariş + stok düşme) **transaction** içinde.

## Güvenlik
- Ham SQL yazılacaksa parametreli. String birleştirme ile sorgu kurulmaz.
- Kişisel veri gerekmedikçe saklanmaz; log'a kişisel veri yazılmaz. Saklanacaksa
  `*_encrypted BYTEA` (AES-256-GCM) + aranacaksa `*_hash` (tuzlu HMAC, unique) —
  kural ve gerekçe `14-privacy-and-compliance.md` → *"Kişisel veriyi şifreli
  saklamak — ve sonra aramak"*. Şifreli kolonda `LIKE` yoktur.

### Soft delete VARSAYILAN DEĞİLDİR — tablo tablo karar verilir

⛔ **"Her şeyi soft delete yap" yaygın ama yanlış bir varsayılandır.** İki ayrı
sorun üretir:

1. **Kişisel veride hukuka aykırıdır.** KVKK/GDPR silme hakkı, satırın yerinde
   durup yalnızca gizlenmesini değil, verinin **gerçekten yok edilmesini veya
   geri döndürülemez biçimde anonimleştirilmesini** ister. `deleted_at` dolduran
   bir "silme", silme değil **saklamaya devam etmedir**
   (`14-privacy-and-compliance.md`).
2. **Sessiz veri sızıntısı üretir.** Filtreyi bir sorguda unutmak yeterlidir:
   hata vermez, çökme olmaz — silinmiş kayıt bir listede, bir sayımda veya bir
   dışa aktarmada geri belirir.

**Doğrusu — üçe ayır:**

| Ne siliniyor | Davranış |
|---|---|
| **Kişisel veri** (hesap, adres, iletişim bilgisi) | Gerçekten silinir ya da **geri döndürülemez** anonimleştirilir |
| **Ticari/mali kayıt** (sipariş, ödeme, fatura) | Silinmez — yasal saklama süresi boyunca durur, kişiye bağı koparılır |
| **Kullanıcının geri alabilmesi beklenen kayıt** | Soft delete meşrudur; süresi ve otomatik temizliği **baştan tanımlanır** |

**Soft delete kullanılan her tablo için zorunlu üç şey:**
- Tablo, gerekçesiyle birlikte `data-model.md` içinde **sayılı olarak** listelenir
  ("bu 8 tablo") — belirsiz bir "gerektiğinde" listesi denetlenemez
- Filtre **tek bir noktadan** uygulanır (repository katmanı / Prisma extension).
  Her sorguya elle `deleted_at IS NULL` yazmak, unutulacak bir şeyi tekrar etmektir
- `deleted_at` üzerinde index bulunur ve kayıtların **ne zaman kalıcı silineceği**
  saklama politikasında yazılıdır. Süresiz duran soft delete, gizlenmiş bir sızıntıdır

## Metin arama
- **Veritabanının "büyük/küçük harf duyarsız" araması kullanıcının dilini bilmez.**
  ORM'in `insensitive` kipi ASCII kurallarına göre çalışır; Türkçe'de `I` harfini
  `i`'ye katlar (doğrusu `ı`), Almanca `ß`, Fransızca aksanlar da eşleşmez.
  Sonuç sessizdir: hata yok, çökme yok, sadece **kullanıcı ürünü bulamaz.**
- **Arama davranışı tahmin edilmez, GERÇEK VERİYE KARŞI ÖLÇÜLÜR.** Bir arama
  kutusu yazmadan önce birkaç örnek kelimeyi veritabanında dene ve sonucu gör.
- **Sorgu ile aranan alan AYNI sadeleştirmeden geçer** (`unaccent` eklentisi,
  dile uygun collation veya eşdeğeri). Yalnızca bir tarafı normalleştirmek
  eşleşmeyi bozar.
- Sadeleştirmenin yeri **veritabanıdır**, uygulama katmanı değil: iki yerde
  yapılırsa ikinci bir doğruluk kaynağı doğar ve zamanla sapar.
- **Kullanıcı metni bir `LIKE` desenine giriyorsa `%` ve `_` kaçırılır** ve
  `ESCAPE` belirtilir. Bu bir enjeksiyon açığı değildir (değer parametreyle
  bağlanır) ama sorgunun **anlamını** kullanıcıya devretmektir: tek bir `%`
  yazan kişi tüm tabloyu eşleştirir.
- Aksan/harf katlaması için index gerekiyorsa **önce ölç**: küçük tablolarda
  ifade index'i, onu mümkün kılan sarmalayıcı fonksiyonlar ve bakım yükü
  kazançtan büyüktür.
- Yazım hatası toleransı, eş anlamlı ve alaka sıralaması **veritabanının işi
  değildir**; gerçekten gerekiyorsa ayrı bir arama motoru ADR ile kararlaştırılır.

## Seed
- `prisma/seed.ts` idempotent olur (tekrar çalıştırınca veri katlanmaz).
- Tüm örnek veri **açıkça sahtedir**: isimler uydurma, kart numaraları test aralığında.
- Gerçek kişi adı, gerçek telefon, gerçek TCKN kullanılmaz.

## Eşzamanlılık
- Aynı kaynağa iki kişi aynı anda talip olabiliyorsa (randevu saati, koltuk, stok):
  benzersiz index + transaction ile korunur; "önce kontrol et sonra yaz" yeterli değildir.
- Güncellemede kayıp yazma riski varsa iyimser kilitleme (`version` kolonu) kullanılır.
- Transaction mümkün olduğunca kısa tutulur; içinde dış API çağrısı yapılmaz.

## Denetim kaydı ve saklama

### Sorun — "bu kaydı kim, ne zaman, neyden neye çevirdi?"

Bir memur bir başvurunun durumunu "reddedildi"den "onaylandı"ya çevirdi. Üç
ay sonra teftiş soruyor: *"Bu başvuruyu kim onayladı, ne zaman, önceki değeri
neydi, hangi bilgisayardan?"* Başvuru tablosunda yalnızca şu anki hâl var —
`UPDATE` eskisinin üstüne yazdı. Önceki hâl yok, kim yaptığı yok. Cevap
verilemiyor; kamu kurumunda bu hukuki sorundur.

Çözüm **denetim kaydı / audit log / audit trail**: veride yapılan her
değişikliğin, **değişiklikten önceki hâliyle birlikte**, ayrı bir tabloya
yazılması. *Gerçek hayat:* bankadaki dekontlar — bakiye "bakiye" alanında
durur, ama her hareket ayrıca dekontta; kim, ne zaman, kaç liradan kaç liraya
getirdi, dekontlardan geri sarılır. Dekont **silinmez, değiştirilmez**; öyle
olsaydı hiçbir işe yaramazdı.

### Tablo yapısı — kurum standardı kitin eski kuralını yükseltti

Kitin eski kuralı *"audit_logs: kim, ne zaman, hangi kayıt, hangi işlem;
append-only"* idi — doğru ama **eksik**: kolonlar belirsiz, "önceki hâl"
saklanıyor mu belli değil. Kurum veritabanı standardı tam bir şema veriyor;
daha iyi olduğu için **her iki modda** bu şema kullanılır (kendi projede
İngilizce adlarla):

| Kolon (kendi projem) | Kurum modu | Ne tutar | Neden var |
|---|---|---|---|
| `occurred_at TIMESTAMPTZ` | `islem_zamani` | İşlem anı — saat dilimli, yaz saati geçişinde bile doğru | "Ne zaman" |
| `user_id BIGINT` | `kullanici_id` | İşlemi yapan kullanıcı | "Kim" |
| `app_name VARCHAR(100)` | `uygulama_adi` | Hangi uygulama | Aynı tabloya birden fazla sistem yazabilir |
| `table_name VARCHAR(128)` · `record_key VARCHAR(256)` | `tablo_adi` · `kayit_anahtari` | Hangi tablonun hangi satırı | "Neyi" |
| `operation VARCHAR(10)` | `islem_tipi` | `INSERT` / `UPDATE` / `DELETE` | "Ne yaptı" |
| `before_image JSONB` | `snapshot_veri` | ⭐ İşlemden **önceki satırın tamamı** | "Önceki hâl neydi" — asıl mesele |
| `client_ip INET` · `internal_ip INET` | `dis_ip` · `ic_ip` | Dış ve iç ağ IP'si | "Nereden" — kurum içi/dışı ayrımı; ISO 27001 ister |
| `os_user VARCHAR(128)` · `machine_name VARCHAR(128)` | `os_kullanici` · `makine_adi` | İşletim sistemi kullanıcısı, bilgisayar adı | Ortak hesapla girilmişse bile makine bilinsin |

İki kural: **before-image** (önceki görüntü) — `UPDATE` ve `DELETE`'te satırın
**önceki** hâli JSON olarak yazılır, `INSERT`'te boş kalır (öncesi yok); ve
tablo **INSERT-only** — üzerinde `UPDATE`/`DELETE` yapılmaz, uygulama
hesabının bu tabloda yalnızca `INSERT` ve `SELECT` yetkisi olur.

**Before-image neden, diff neden değil:** alternatif yalnızca değişen alanı
yazmaktır (`durum: reddedildi → onaylandi`) — az yer tutar ama *"o gün satırın
tamamı neydi"* sorusunu cevaplayamaz. Şu anki hâl zaten ana tabloda; önceki
hâlin tamamı audit'te olunca ikisi yan yana konur, fark çıkar. `JSONB`
sorgulanabilir: `before_image->>'status'`; sık sorgulanacaksa **GIN index**
(JSON'un içini indeksleyen index türü).

### Kim yazacak — uygulama mı, veritabanı mı?

| Yol | Nasıl | Artısı | Eksisi |
|---|---|---|---|
| **Trigger** (veritabanı tetikleyicisi) | Tabloya `UPDATE` gelince veritabanı **kendisi** audit satırını yazar | **Atlanamaz** — DBA'nin elle yaptığı `UPDATE` bile kaydedilir. Kapıdaki otomatik sayaç: kim geçerse sayar | Kullanıcı, IP, makine adını veritabanı **bilmez** — HTTP isteğindedir; her sorgudan önce `SET LOCAL app.user_id = …` ile oturum değişkeni geçirmek gerekir. Trigger `R__` dosyasında yaşar, Prisma bilmez |
| **Servis katmanında elle** | Her servis metodunda "eskiyi oku → değiştir → audit yaz" | Bağlam elde: kullanıcı, IP, makine | **Unutulabilir** — yeni bir uç yazan geliştirici audit çağrısını atlarsa o değişiklik kayda girmez; teftişte "bu neden yok" |
| ⭐ **Tek noktadan otomatik** | Prisma **extension** (her `update`/`delete`'ten önce çalışan eklenti) ya da NestJS **interceptor**: eski satırı okur, istek bağlamındaki kullanıcı/IP'yi (`nestjs-cls`) alır, audit yazar | Trigger'ın "atlanamaz"ı + uygulamanın "bağlamı bilir"i birleşir; geliştirici audit'i **çağırmaz**, mekanizma kendiliğinden çalışır | Kurulumu bir kez yapılır; DBA'nin elle `UPDATE`'i yakalanmaz — o, DBA'nin kendi denetim aracının işidir |

⛔ **Elle `audit.write()` çağrısı yasak** — unutulacak bir şeyi her yerde
tekrar etmektir. ⛔ **Audit yazımı ana işlemle aynı transaction'da**: audit
yazılamadıysa değişiklik de olmaz. "Audit patlarsa sadece logla, işlem devam
etsin" kabul edilmez — kaydı olmayan değişiklik, teftişte olmamış değişikliktir.

Giriş/çıkış olayları ayrı bir tabloda tutulur (`login_events`: başarılı,
başarısız + sebep, çıkış, IP) — `05-auth-security.md`.

⭐ **Kararı veren soru:** *"Bu değişikliği bir teftişte savunmam gerekirse
önceki hâli ve kim yaptığını gösterebiliyor muyum — ve bir geliştirici bunu
unutarak bozabilir mi?"* İkinci soruya "evet" çıkıyorsa mekanizma tek
noktaya taşınır. Kurumun merkezî audit tablosu ve IP başlıkları
`kurumdan-ogrenilecekler.md` → *"BÖLÜM 4 — Veritabanı birimi"* (satır 4.7).

### Saklama
- Her tablo için saklama süresi `docs/standards/14-privacy-and-compliance.md` uyarınca tanımlıdır.
- Kişisel veri içeren tablolarda anonimleştirme yolu baştan düşünülür; audit
  tablosundaki `before_image` de kişisel veri taşır — saklama süresi ve
  maskeleme kuralı ona da uygulanır.

## Bakım
- Migration'lar sırayla ve tekrarlanabilir çalışmalıdır; local'de sıfırdan kurulum denenir.
- `prisma migrate diff` ile şema ile veritabanı arasındaki sapma düzenli kontrol edilir.
- Yavaş sorgular (>200ms) tespit edilip index veya sorgu düzeltmesiyle giderilir.
- Geliştirici Prisma'nın ürettiği SQL'i (JOIN, GROUP BY, `EXPLAIN` planı) **okuyabilmeli** —
  ORM yazmayı üstlenir, anlamayı değil. Öğrenme yolu seviye defterinde (`calisilacak-konular.md`).
