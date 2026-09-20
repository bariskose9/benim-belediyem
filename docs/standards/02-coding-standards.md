# 02 — Kod Standartları

## TypeScript
- `strict: true`. `any` yasak. Kaçınılmazsa `unknown` + daraltma kullan,
  gerçekten mecbursan üstüne `// gerekçe:` yorumu yaz.
- Fonksiyon dönüş tipleri açıkça yazılır (public/export edilenlerde zorunlu).
- `enum` yerine union tip veya `as const` nesne.
- `null` ve `undefined` ayrımı bilinçli yapılır.

## Yazım
- Prettier ayarları tartışılmaz; format kavgası yapılmaz.
- ⛔ **ESLint ile Prettier ÇAKIŞIR — `eslint-config-prettier` ile susturulur.**
  ESLint'in biçim kuralları (girinti, tırnak, noktalı virgül) Prettier'in
  yaptığıyla çelişir; ikisi de açıksa kaydedince biri diğerinin işini bozar ve
  CI kırmızı kalır. `eslint-config-prettier` bu kuralları **kapatır** ve
  ESLint yalnızca mantık hatalarına bakar.
  - Uzantı listesi **en sonda** olur; sonrakiler öncekini ezer.
  - ⭐ **Next tek başınaysa** `eslint-config-next` biçim kurallarını zaten
    getirmez, ama `eslint-config-prettier` yine eklenir — üçüncü parti
    eklentiler biçim kuralı taşıyabilir.
  - ⛔ **Next + NestJS ise iki ayrı yapılandırma gerekir.** Nest kendi ESLint
    kurulumuyla gelir ve Next'inkini bilmez; her paket kendi dosyasını taşır,
    ortak kurallar `packages/` altında paylaşılır. Tek bir kök dosyaya
    yığılırsa iki çatının kuralları birbirini ezer.
- ESLint hatası olan kod commit edilmez. Kural devre dışı bırakılacaksa
  satır bazlı ve gerekçeli: `// eslint-disable-next-line <kural> -- <neden>`
- Import sırası: dış paketler → iç modüller (`@/`) → göreli → tipler.

## Fonksiyonlar
- Tek iş yapar. Adı ne yaptığını söyler.
- 3'ten fazla parametre → nesne parametresi.
- Boolean parametre ile davranış değiştirme; ayrı fonksiyon yaz.
- Yan etkisi olan fonksiyon adında belli olsun (`sendMail`, `createOrder`).

## Hata yönetimi
- `catch` bloğu **asla boş bırakılmaz** ve hatayı sessizce yutmaz.
- Beklenen hatalar tiplenmiş hata sınıfıyla fırlatılır (`NotFoundError`, `ForbiddenError`).
- Beklenmeyen hata: logla + kullanıcıya genel mesaj göster + iç detay sızdırma.
- Kullanıcıya gösterilen mesajlar **Türkçe ve eyleme dönük**:
  "Bir hata oluştu" değil → "Seçtiğiniz saat dolmuş. Lütfen başka bir saat seçin."

## Yorumlar

### ⛔ KOD DİLİ PROJE MODUNA GÖRE, YORUM HER ZAMAN TÜRKÇE

Kod adının dili (değişken, fonksiyon, tip, dosya, tablo, kolon) **proje moduna**
bağlıdır (`SKILL.md` → *"Bu proje kimin için: sınıflandırmayı SEN yap"*). Karar `CLAUDE.md` §0'a yazılır ve
proje boyunca değişmez.

| Mod | Kod adı | Tablo · kolon | Neden |
|---|---|---|---|
| **Kendi projem** | **İngilizce** | **İngilizce** | Sektörün ortak dili; portföy ve açık kaynak dışarı açılır. Türkçe karakter ve çekim ekleri araç zincirinde bozulur |
| **İşyeri projesi** — kurumun DB standardı Türkçe | ⭐ **Türkçe, Türkçe karaktersiz** (`olusturmaTarihi`, `Basvuru`) | Kurum standardı (`tbl_basvuru.olusturma_tarihi`) | Kod İngilizce + tablo Türkçe olunca **aynı şeyin iki adı** olur: `Application` ↔ `tbl_basvuru`, 90 tabloda 90 çift. Okuyan her seferinde kafasında çevirir; hata buradan çıkar. Tek dil, tek sözlük |
| **İşyeri projesi** — kurum standardı yok veya İngilizce | İngilizce | İngilizce | Kendi projemle aynı |

⭐ **Türkçe ad kuralları (işyeri modu):** `ç ğ ı ö ş ü` **hiç** kullanılmaz
(`olusturma`, `basvuru`, `gecikmis`); `camelCase` / `PascalCase` aynen; soru eki
yok (`aktif`, `aktifMi` değil — kurumun kuralıyla aynı); çatı ve kütüphane
adları neyse o (`useState`, `findMany` çevrilmez).

⛔ **Kitin kendi örnekleri her zaman İngilizcedir.** Gerekçe: ajan kuralı
değil **örneği** taklit eder. Türkçe adlı bir örnek kitte dursa, kendi
projesinde de Türkçe üretir. Modu **proje** belirler, kit değil.

| Ne | Dil | Neden |
|---|---|---|
| Commit mesajı | **İngilizce** (her modda) | `08-git-workflow.md` |
| ⭐ **Yorumlar** | **Türkçe** (her modda) | Yorumun okuyucusu koddan farklıdır: kararı veren, denetleyen, kodu okumayan kişi |
| ⭐ **Kod örneklerinin açıklamaları** | **Türkçe** | Örnek öğretmek içindir; öğretilen kişi Türkçe okur |
| Kullanıcıya görünen metin | **Türkçe** | Son kullanıcı Türk |

### ⭐ TÜRKÇE KARŞILIK YORUMDA, PARANTEZ İÇİNDE VERİLİR

Kod İngilizce olduğu için okuyan kişi bir adı ilk gördüğünde ne olduğunu
bilmeyebilir. Çözüm adı Türkçeleştirmek değil, **yorumda karşılığını yazmaktır.**

```ts
// ⭐ workOrder (iş emri) — bir talebin sistemdeki kaydı.
//    slaDueAt (SLA bitiş zamanı): bu tarihten sonra iş gecikmiş sayılır.
const workOrder = await this.workOrders.create({ ...dto, slaDueAt: plan.dueAt });
```

| Kural | Ayrıntı |
|---|---|
| Ne zaman | Bir kod adı o dosyada **ilk kez** geçtiğinde |
| Nerede | Yorumun içinde, parantezde: `workOrder (iş emri)` |
| Kaç kez | **Bir kez** — aynı dosyada tekrar yazılmaz (`11-agent-workflow.md` → *"AYNI BİLGİ İKİ YERDE YAZILMAZ"*) |
| ⛔ Ne değil | Adı Türkçeleştirmek. `isEmri` yazılmaz, `workOrder` yazılır ve karşılığı yorumda durur |

⭐ **Kazanç aranabilirliktir:** kullanıcı `grep "iş emri"` de yazsa
`grep "workOrder"` de yazsa aynı yeri bulur. Türkçe okuyan ile İngilizce
arayan aynı kod tabanında buluşur.

⭐ **İşyeri modunda yön tersine döner:** kod zaten Türkçe olduğu için
parantezde **İngilizce** karşılık verilir — `basvuru (application)`,
`olusturmaTarihi (createdAt)`. Amaç aynı: sektör terimini öğretmek ve
`grep "createdAt"` yazanın da bulabilmesi.

### ⭐ HER DOSYANIN BAŞINDA BAŞLIK BLOĞU — istisnasız, her modda

Satır satır yorum bir ağacın yapraklarını anlatır; **dosya başı bloğu**
ormanı. Her kaynak dosya (`.ts`, `.tsx`, `.sql`, `.prisma`, `.yml`, `.mjs`)
aşağıdaki *"BAŞLIK BLOĞU SABİT BİÇİMDE YAZILIR"* bloğuyla başlar — halkalar:
**NEREDEN · NE · NEREYE · SONUÇ · KAYNAK**, ve iki ek halka:

| Halka | Cevapladığı soru |
|---|---|
| **NEDEN** | Bu dosya neden var, neden başka yerde değil — olmasaydı ne bozulurdu |
| **DİKKAT** | Değiştirirken ne kırılır; hangi tabloya/dosyaya dokunmadan buraya dokunulmaz |

⛔ Bir halkanın cevabı yoksa halka **silinmez**, `—` yazılır: sonraki okuyan
*"unutulmuş mu, gerçekten yok mu"* diye düşünmez. ⭐ Bu blok *"Kodu sil,
yorumları bırak"* ölçütünün dosya düzeyindeki hâlidir: yalnızca başlık blokları
okunarak sistemin **haritası** çıkarılabilmeli (`11-agent-workflow.md` →
*"DOSYANIN TAMAMI OKUNMAZ"*).

### ⛔ KOD, OKUYAMAYAN BİRİ İÇİN DE ANLAŞILIR OLUR

Bu projelerin kodunu yalnızca kıdemli yazılımcılar okumuyor:

| Okuyucu | Ne arıyor |
|---|---|
| **Junior geliştirici** | "Burada ne oluyor, ben nasıl benzerini yazarım" |
| **Denetçi / değerlendirmeci** | ⭐ Kodu **hiç okumadan**: "bu parça neden var, neyi çözüyor" |
| **Kararı savunan kişi** | "Bu neden böyle yapıldı, alternatifi neydi" |
| **Kurumdaki iş birimi** | "Bizim istediğimiz kural burada mı duruyor" |

Bu yüzden **her kod bloğu, kod okumayı hiç bilmeyen birinin de takip
edebileceği kadar Türkçe yorumla açıklanır.**

Yorumlar **üç** şeyi birden anlatır:

| # | Ne yazar | Cevapladığı soru |
|---|---|---|
| 1 | **Veri akışı** | Bu veri **nereden** geliyor, burada **ne** oluyor, **nereye** gidiyor |
| 2 | ⭐ **Çözülen problem** | Bu blok **neden var**; olmasaydı ne bozulurdu |
| 3 | ⭐ **Etki alanı** | Bu satır **başka nereyi** etkiliyor; değiştirilirse ne kırılır |

⛔ **Üçü de yazılır, hiçbiri atlanmaz.**

- Yalnızca akış yazılırsa denetçi *"tamam ama bu neden gerekliydi"* sorusuyla
  baş başa kalır — ve o soru, teknik incelemede sorulan **ilk** sorudur.
- Etki alanı yazılmazsa, kodu sonradan değiştiren kişi **neyi kırdığını
  bilmeden** değiştirir. En pahalı hatalar buradan çıkar.

**Üçü birlikte — örnek:**

```ts
// 1️⃣ AKIŞ: Kullanıcının okuduğu sürüm numarası isteğin içinde geliyor.
// 2️⃣ NEDEN: İki kişi aynı kaydı aynı anda düzenlerse, ikincisi birincinin
//    yazdığını sessizce silerdi. Bu şart onu engelliyor.
// 3️⃣ ETKİ: version kolonu her başarılı yazmada +1 artıyor. Bu satır
//    kaldırılırsa iyimser kilit TAMAMEN devre dışı kalır — testler yine
//    yeşil yanar, sorun yalnızca canlıda iki kullanıcıyla görünür.
const sonuc = await prisma.workOrder.updateMany({
  where: { id: input.id, version: input.version },
  data:  { status: input.status, version: { increment: 1 } },
});
```

⭐ **Ölçüt:** Kodu **hiç okumayan** bir denetçi, yalnızca yorumları okuyarak
*"bu parça ne yapıyor, neden var, dokunursam ne olur"* sorularının üçüne de
cevap verebilmeli.

### ⛔ ÖLÇÜT: KODU SİL, YORUMLARI BIRAK — SİSTEM HÂLÂ ANLAŞILIYOR MU

Bu, yorum kuralının **tek gerçek ölçüsüdür.** Satır sayısı değil, **anlatının
bütünlüğü**.

> **Bir dosyadaki bütün kodu silip yalnızca yorumları bıraktığında, okuyan
> kişi o dosyanın ne yaptığını, veriyi nereden alıp nereye götürdüğünü ve
> sonunda ekranda ya da veritabanında ne olduğunu anlayabilmeli.**

Anlatıda **boşluk kalan her yer**, yorum eksiği demektir. Ölçüt budur;
"şu satıra yorum yazılır, şuna yazılmaz" listesi değildir.

#### Yorum dosya sınırlarını GEÇER — zincir kesilmez

⛔ En sık yapılan eksiklik: yorumun yalnızca **o dosyanın içini** anlatması.
Sistem birden çok dosyaya yayılıyor; yorum da zinciri göstermeli.

Her önemli yorumda **dört halka** bulunur:

| Halka | Ne yazar |
|---|---|
| **NEREDEN** | Bu veri hangi **dosyadan**, hangi biçimde geliyor |
| **NE** | Burada ne oluyor, hangi kural uygulanıyor |
| **NEREYE** | Hangi **dosyaya**, hangi biçimde gidiyor |
| ⭐ **SONUÇ** | Bunun **görünür** karşılığı ne: ekranda ne beliriyor, veritabanına hangi kayıt hangi biçimde yazılıyor |

⭐ **Dördüncü halka atlanmaz.** Kodu okumayan biri için tek somut şey odur.

```ts
// apps/api/src/work-orders/work-orders.service.ts

/**
 * İŞ EMRİ OLUŞTURMA
 *
 * NEREDEN : apps/web/.../talep-formu.tsx  → kullanıcının doldurduğu form
 *           HTTP POST /api/v1/work-orders ile JSON olarak geliyor.
 *           Gövde, packages/contracts/work-order.ts şemasından GEÇMİŞ durumda
 *           (geçmeseydi bu metot hiç çağrılmazdı, 400 dönerdi).
 *
 * NE      : Üç kural sırayla uygulanıyor — location (lokasyon) aktif mi,
 *           asset (varlık) kullanımda mı, SLA süresi ne. Kurallar
 *           packages/domain içinde, burada değil.
 *
 * NEREYE  : prisma → PostgreSQL "WorkOrder" ve "WorkOrderHistory" tabloları
 *           (tek transaction) · BullMQ kuyruğuna gecikmeli hatırlatma işi
 *
 * SONUÇ   : Veritabanında IE-2026-000148 numaralı YENİ BİR SATIR oluşur,
 *           status (durum) alanı "OPEN", sla_due_at (SLA bitiş zamanı) dolu.
 *           Kullanıcının ekranında iş emri listesi tazelenir ve kayıt en üstte
 *           görünür. SLA süresinin yarısında atanan kişiye bildirim düşer.
 *
 * KAYNAK  : `teknoloji-ve-plan.md` → "BÖLÜM E" (SLA politikası nasıl seçilir)
 */
async create(input: CreateWorkOrderDto) {

  // NEREDEN: input.locationId (lokasyon kimliği), formdaki açılır listeden geldi.
  // NE     : location (lokasyon) pasifse iş emri açılamaz — şartname kuralı.
  // ETKİ   : Bu kontrol kaldırılırsa kapatılmış binalara iş emri açılır ve
  //          hiç kimseye atanamaz — kayıt sistemde asılı kalır.
  const location = await this.locations.findActive(input.locationId);
  if (!location) throw new LocationInactiveError(input.locationId);

  // NE   : SLA hesabı — hangi politikanın uygulanacağını Factory seçiyor.
  //        Seçim önceliğe + varlık kritikliğine + iş emri türüne bakıyor.
  // KAYNAK: `teknoloji-ve-plan.md` → "BÖLÜM E" · kararın gerekçesi ADR'de
  // NEREYE: Çıkan tarih aşağıda sla_due_at (SLA bitiş zamanı) kolonuna yazılacak.
  const policy = this.slaFactory.resolve(input);
  const plan = policy.calculate(input);

  // ⭐ NE   : Kayıt ve ilk geçmiş satırı TEK transaction içinde yazılıyor.
  //    ETKİ: Ayrılırsa, ikincisi hata verdiğinde geçmişi olmayan bir iş emri
  //          kalır. O kayıt hiçbir raporda doğru görünmez ve durum makinesi
  //          "nereden geldi" sorusuna cevap veremez.
  return this.prisma.$transaction(async (tx) => {
    const olusan = await tx.workOrder.create({ … });
    await tx.workOrderHistory.create({ … });
    return olusan;
  });
}
```

#### "Bu kadar yorum performansı etkilemez mi" — ÖLÇÜLDÜ, hayır

Bu itiraz her projede çıkar. Cevabı ölçümle verilir, tartışmayla değil.

**Ölçüm (2026-08-26, esbuild ile üretim derlemesi):**

| | Yorumlu | Yorumsuz | Fark |
|---|---|---|---|
| Kaynak dosya | 2.138 bayt | 522 bayt | 4.1 kat |
| **Üretim derlemesi** | **364 bayt** | **364 bayt** | ⭐ **bayt bayt AYNI** |
| Sıkıştırılmış | 264 bayt | 265 bayt | 1 bayt (gürültü) |

⭐ **Derleyici üretim derlemesinde yorumları tamamen siler.** Kullanıcının
tarayıcısına inen dosyada tek bir yorum yoktur.

| Neyi etkiler | Cevap |
|---|---|
| İşlemci · RAM | ⛔ **Sıfır** — yorum çalıştırılmaz, belleğe yüklenmez |
| Kullanıcının indirdiği dosya | ⛔ **Sıfır** — çıktı birebir aynı (ölçüldü) |
| Disk / depo | Kaynak ~4 kat büyür; metin olduğu için mutlak artış küçük ve git sıkıştırır |
| Derleme süresi | Ölçülemeyecek kadar az |

**⚠️ Gerçek maliyet başka yerde — ikisi de teknik değil:**

1. **AI bağlam penceresi.** Yorumlu dosyayı okumak ~4 kat jeton harcar.
   Yönetimi: dosya baştan sona değil, **gereken bölüm** okunur.
2. ⛔ **Bayat yorum riski.** Kod değişip yorum kalırsa okuyan **yanlış
   bilgilenir** — ve *yanlış bir gerekçe, yorumsuz bırakmaktan kötüdür*
   (aşağıda). Bu yüzden `10-definition-of-done.md`'de bir işin bitmiş
   sayılma şartına *"ilgili yorumlar güncellendi"* dahildir.

⛔ **Yani "performans" bu kuralı gevşetmek için gerekçe değildir.** Gevşetmenin
tek meşru gerekçesi tekrar/gürültüdür ve onun da ölçütü aşağıda.

#### ⭐ BAŞLIK BLOĞU SABİT BİÇİMDE YAZILIR — aranabilir olsun diye

Dört halka **serbest metin değil, sabit etiketlerle** yazılır. Sebebi
pratik: bu blok yalnızca insan için değil, ⭐ **aranabilir bir bağımlılık
haritasıdır.**

```ts
/**
 * <BİR CÜMLELİK BAŞLIK>
 *
 * NEREDEN : <dosya/yolu.ts> → <ne geliyor, hangi biçimde>
 * NE      : <burada ne oluyor, hangi kural uygulanıyor>
 * NEREYE  : <dosya/yolu.ts> → <ne gidiyor, hangi biçimde>
 * SONUÇ   : <görünür karşılığı — ekranda ne, veritabanında hangi kayıt>
 * KAYNAK  : <kuralın kararlaştırıldığı yer — aşağıda>
 * NEDEN   : <bu dosya neden var, neden başka yerde değil>
 * DİKKAT  : <değiştirirken ne kırılır>
 */
```

#### ⭐ BEŞİNCİ HALKA: `KAYNAK` — bu kural nereden geliyor

Bir yorum bir **iş kuralı** anlatıyorsa ("kapalı lokasyona iş emri açılamaz"),
o kuralın nerede kararlaştırıldığı da yazılır. Aksi hâlde sonraki oturum kuralı
kodda görür, gerekçesini bulamaz ve *"gereksiz galiba"* diye kaldırır.

| Kaynak | Biçim |
|---|---|
| Projenin öğretici belgesi | `teknoloji-ve-plan.md` → *"BÖLÜM E"* · alt bölümü varsa *"E.4"* |
| Mimari karar | `ADR-006` |
| İş gereksinimi | `PRD.md` → *"§5.2"* |

⭐ **Bu atıflar denetlenir.** `denetim.mjs` her `<dosya>.md` → *"Bölüm"* atfını
hedef dosyadaki gerçek başlığa karşı doğrular; olmayan bir bölüme atıf yapmak
**commit'i durdurur**. Numaralı biçim (`BÖLÜM E`, `E.4`, `§9`) da tanınır.

⛔ **Uydurma bölüm adı yazma.** Kuralın nerede kararlaştırıldığını bilmiyorsan
`KAYNAK` satırını boş bırakma — **kararı ara ve bul**, yoksa kural
kararlaştırılmamış demektir ve `11-agent-workflow.md` → *"GEREKSİNİM DOĞRU
VARSAYILMAZ"* işler.

⛔ **`NEREDEN` ve `NEREYE` satırlarında GERÇEK DOSYA YOLU geçer.** *"Servis
katmanından geliyor"* değil, `apps/api/src/work-orders/work-orders.service.ts`.

**Neden bu kadar katı:** Bir dosyayı değiştirmeden önce kimin etkileneceği tek
komutla bulunuyor:

```bash
grep -rn "NEREDEN.*work-orders.service\|NEREYE.*work-orders.service" apps/ packages/
```

⭐ Böylece on dosyanın **gövdesini** okumak yerine yalnızca **başlık bloklarını**
okumak yetiyor — 2.000 satır yerine ~150 satır. Yöntemin tamamı
`11-agent-workflow.md` → *"Dosyanın tamamı okunmaz — önce başlık bloğu"*.

⚠️ **Bu, yorumu güncel tutmayı zorunlu kılar.** Bayat bir `NEREYE` satırı
sonraki oturumu yanlış dosyaya götürür.

#### Kapsam — istisna yok

| Nerede | Yorumlanır mı |
|---|---|
| Backend servisleri, controller'lar | ✅ |
| Frontend bileşenleri, hook'lar | ✅ |
| `packages/domain` iş kuralları | ✅ — ⭐ **en çok buraya** gerekiyor |
| Prisma şeması, migration'lar | ✅ — hangi kolon neden var |
| Testler | ✅ — bu test **neyi** kanıtlıyor |
| `Dockerfile`, `compose`, CI dosyaları | ✅ |
| Yapılandırma dosyaları | ✅ — hangi ayar neyi değiştiriyor |

⛔ *"Burası basit, gerek yok"* denmez. Basit görünen yer, o sistemi ilk kez
gören için basit değildir.

#### Tekrar ve gürültü nasıl önlenir

Eksiksizlik **tekrar** demek değil:

| Durum | Nasıl yazılır |
|---|---|
| Aynı kalıp bir dosyada 5 kez | ⭐ **İlkinde tam anlat**, sonrakilerde `// aynı kalıp — yukarıdaki açıklamaya bak` |
| Değişken adı zaten anlatıyor | Ayrı yorum yerine **bloğun** anlatısına dahil et |
| Bir işin adımları | Adım başına kısa satır: `// 1) Doğrula  2) Kaydet  3) Bildir` |
| Dosyanın tamamı tek iş yapıyor | Dosya başına **blok yorum**, içeride yalnızca kararlar |

⛔ **Yorum "ne" yazmaz, kodun söylemediğini yazar.**

```ts
// ⛔ GÜRÜLTÜ — kod zaten söylüyor, anlatıya hiçbir şey katmıyor
const kullanici = await prisma.user.findUnique({ where: { id } }); // kullanıcıyı bul

// ✅ DEĞER — kodun söylemediği
// ⚠️ findUnique NULL döner (findUniqueOrThrow değil). Aşağıdaki kontrol
//    kaldırılırsa kullanıcı silinmiş bir kayda tıkladığında 500 alır ve
//    ekranda sebebi anlaşılmayan bir hata görür.
const kullanici = await prisma.user.findUnique({ where: { id } });
```

⭐ **İki testi birlikte uygula:**

| Test | Sorusu | Başarısızsa |
|---|---|---|
| **Bütünlük** | Kodu silsem, yorumlardan sistemi anlar mıyım | Yorum **eksik** |
| **Gürültü** | Bu yorumu silsem, bir şey kaybeder miyim | Yorum **fazla** |

### Blok başı yorumu — uzun fonksiyonlarda

10 satırdan uzun bir işte, üstüne **ne yaptığının özeti** yazılır; içeride
yalnızca karar satırları yorumlanır:

```ts
/**
 * İş emrini kapatır.
 *
 * AKIŞ  : istek → kural kontrolü → durum güncelleme → geçmiş kaydı → bildirim
 * KURAL : yalnızca ASSIGNED (atanmış) veya IN_PROGRESS (devam ediyor)
 *         durumundan kapatılabilir — şartname kuralı, ADR'ye yazılır
 * ETKİ  : kapanan iş emri normal güncellemeyle DEĞİŞTİRİLEMEZ; SLA sayacı durur
 *         ve bekleyen hatırlatma işi iptal edilir
 */
// close (kapat) · resolution (çözüm açıklaması)
async close(id: string, resolution: string) { … }
```

⛔ **Yorum uzunluğundan tasarruf edilmez** (`CLAUDE.md` → *"Eksiksizlik,
kısalığa feda edilmez"*). Anlaşılırlığa hizmet eden satır bedava; okuyanın
kafasında soru bırakmak pahalıdır.

```ts
// Kullanıcının formda doldurduğu bilgiler buraya geliyor
async create(dto: CreateWorkOrderDto) {

  // Önce kural kontrolü: kapalı bir location'a (lokasyon) iş emri açılamaz
  const location = await this.locations.findActive(dto.locationId);
  if (!location) throw new LocationInactiveError(dto.locationId);

  // SLA süresini hesaplayan sınıfı seç (önceliğe ve varlığa göre değişir)
  const policy = this.slaFactory.resolve(dto);
  const plan = policy.calculate(dto);

  // Kaydı ve ilk geçmiş satırını BİRLİKTE yaz — biri olup diğeri olmasın diye
  return this.prisma.$transaction(async (tx) => {
    const created = await tx.workOrder.create({ data: { ...dto, slaDueAt: plan.dueAt } });
    await tx.workOrderHistory.create({ data: { workOrderId: created.id, to: 'OPEN' } });
    return created;
  });
}
```

**Kapsam:** frontend, backend, testler, altyapı dosyaları (Dockerfile, CI,
compose) — hepsi. İstisna yok.

### Yorumlar ÖNEM SIRASINA göre işaretlenir

Her satır yorumluysa, hayati bir uyarı ile sıradan bir açıklama aynı görsel
ağırlıkta durur ve uyarı gözden kaçar. Bu yüzden yorumlar dört seviyeye ayrılır:

| İşaret | Ne zaman | Örnek |
|---|---|---|
| `⛔` | **Yapılırsa sistem bozulur.** Yasak, ihlali kabul edilemez | `⛔ Bu alan response şemasına eklenmez — şifre özeti dışarı sızar` |
| `⚠️` | **Kolayca gözden kaçar, sonucu ağır.** Tuzak, yan etki, sıra bağımlılığı | `⚠️ Bu kontrol kaldırılırsa iki kullanıcının verisi karışır` |
| `⭐` | **Tasarımın kalbi.** Kararın "neden"i burada; sorulduğunda anlatılacak yer | `⭐ Kontrol ve yazma tek ifadede — ayrılırsa yarış koşulu doğar` |
| *(işaretsiz)* | Sıradan açıklama: bu veri nereden geliyor, ne oluyor, nereye gidiyor | `// Kullanıcının formda doldurduğu bilgiler buraya geliyor` |

⛔ **İşaretler enflasyona uğratılmaz.** Her yoruma `⚠️` konursa hiçbiri uyarı
olmaz. Bir blokta genellikle **en fazla bir** işaretli yorum bulunur.

⚠️ **`⚠️` ve `⛔` bir davranış iddiasıdır** — aşağıdaki "iddiayı ölç" kuralı
bunlara **zorunlu** olarak uygulanır. İddian ölçülemiyorsa işaret koyma, düz
yorum yaz.

### Yorumun anlatacağı şey

> Ana ölçüt yukarıda: *"Kodu sil, yorumları bırak — sistem hâlâ anlaşılıyor
> mu?"* Bu tablo o ölçütün **satır düzeyindeki** karşılığı.

| Yaz | Yazma |
|---|---|
| Veri nereden geliyor, nereye gidiyor | Değişken adının tekrarı (`// id'yi al` → `const id`) |
| Neden bu kontrol var, olmazsa ne olur | Dilin kendi sözdizimi (`// döngü başlıyor`) |
| Hangi kütüphane/API devreye giriyor | Kodda zaten açıkça yazan şey |
| İş kuralının Türkçe karşılığı | — |

⚠️ **Yorum kodla birlikte güncellenir.** Kod değişip yorum kalırsa okuyan
yanlış bilgilenir; kitin kendi kuralına göre *yanlış bir gerekçe, yorumsuz
bırakmaktan kötüdür.* Bu yüzden kod değişikliğinin tamamlanma şartına
"ilgili yorumlar güncellendi" dahildir (`10-definition-of-done.md`).

### Ayrıca geçerli olanlar
- **"Neden"** her zaman yazılır; "ne" açıklaması onu ortadan kaldırmaz.
- Ölü kod yorum satırına alınmaz, silinir (git'te duruyor zaten).
- `TODO` bırakılacaksa: `// TODO(#issue-no): <ne yapılacak>` — issue'suz TODO yasak.
- ⛔ **BİR "NEDEN" YAZMADAN ÖNCE İDDİAYI ÖLÇ.** Yorum bir davranış iddiası
  içeriyorsa ("bu sıra önemli", "bu kontrol şunu engelliyor"), iddiayı geçici
  olarak BOZ ve testin kırmızıya döndüğünü gör. Dönmüyorsa iddian yanlıştır.

  Bir projede yaşandı: "desenlerin sırası önemli, yoksa kartın ilk 11 hanesi
  kimlik sanılır" yazılmıştı; sıra ters çevrildi ve testler yeşil kaldı. Gerçek
  koruma sıra değil, düzenli ifadedeki lookaround'lardı. Yorum düzeltildi.

  **Yanlış bir gerekçe, yorumsuz bırakmaktan kötüdür:** sonraki geliştirici onu
  doğru sanıp üzerine karar kurar ve gerçek korumayı fark etmeden kaldırabilir.

- ⛔ **BAŞKASINA DEVRETTİĞİN SORUMLULUĞUN YAPILDIĞINI DOĞRULA.** Yukarıdaki
  kural kendi dosyandaki iddiayı ölçmeni söylüyor. Bir adım ötesi: bir
  parametrenin, callback'in veya arayüzün yorumu **çağıranın** yapacağı bir şeyi
  anlatıyorsa ("bununla form kilitlenir", "bunu alan tarafın yetkiyi kontrol
  etmesi gerekir"), o iş **hiçbir çağıranda yapılmıyor olabilir** — ve senin
  dosyanda ölçülecek bir şey olmadığı için mutasyon testi bunu YAKALAMAZ.

  Bir projede yaşandı: bir bot doğrulama bileşeninin `onUnavailable` prop'u
  *"form gönderimi kilitlensin diye"* diyordu; onu kullanan **beş formun
  hiçbiri** düğmeyi kilitlemiyordu. Ekranda "servise ulaşılamıyor" yazarken
  düğme tıklanabilir kalıyor, kullanıcı basıyor ve ikinci bir hata alıyordu.
  ⚠️ **Kod okunarak değil, EKRAN GÖRÜNTÜSÜNE bakılarak fark edildi** — hata
  metni ile aktif düğme aynı karedeydi.

  **Kural:** böyle bir yorum yazarken üç şeyi birden yap — (1) çağıranların
  hepsini `grep` ile bul, (2) her birinde o işin fiilen yapıldığını gör,
  (3) yapılmasını bir testle kilitle. Aksi hâlde yorum, var olmayan bir
  korumayı belgelemiş olur.

## Sihirli değerler
Sayı ve metin sabitleri koda gömülmez; `src/config/` altında adlandırılır.

## Yerelleştirme, para ve tarih
- Kullanıcıya görünen metinler koda gömülmez; `src/config/` altında tek yerden gelir.
- Para birimi `Intl.NumberFormat("tr-TR", { currency: "TRY" })` ile biçimlendirilir.
  Hesaplama **kuruş cinsinden tam sayı** veya `Decimal` ile yapılır, float ile asla.
- Sıralama ve arama Türkçe karakter duyarlıdır (`localeCompare("tr")`);
  "İ/ı" dönüşümü için `toLocaleLowerCase("tr")`.
  ⛔ **İstisna — URL slug'ında Türkçe küçültme KULLANILMAZ.** Türkçe kuralında
  `I` harfinin küçüğü `ı`'dır; `IZMIR` → `ızmır` olur ve adres bozulur. Slug
  üretimi `en-US` kuralıyla yapılır, gerekçesi ve dönüşüm tablosu
  `18-seo.md` → *"URL biçimi"* içinde. İkisi çelişmiyor: **ekranda okunan
  metin** Türkçe kuralla, **adres** İngilizce kuralla küçültülür.

### ⭐ Çok dillilik (i18n) — baştan karar, sonradan eklenmez

**i18n / internationalization / çok dillilik**: arayüzün ve içeriğin birden
fazla dilde sunulması. *Gerçek hayat:* havalimanı tabelası — Türkçe ve
İngilizce aynı levhada; levhayı sonradan iki dilli yapmak, bütün tabelaları
sökmek demektir. Kamu sitesinde "İngilizce sürüm" isteği sık gelir; PRD'de
sorulur (`kurumdan-ogrenilecekler.md` → *"BÖLÜM 6"* satır 6.5). Cevap "hayır"
ise tek dil; ama metinler yine `src/config/` altında — yapı hazır, bedel sıfır.

Cevap "evet" ise iki ayrı sorun vardır ve karıştırılmaz:

| Ne çevriliyor | Nerede yaşar | Nasıl |
|---|---|---|
| **Arayüz metni** (menü, buton, hata mesajı) | Sözlük dosyaları `messages/tr.json`, `messages/en.json` | `next-intl` — App Router uyumlu, sunucu bileşeninde çalışır; URL `/en/...` |
| **İçerik** (haber, duyuru, sayfa metni — yöneticinin girdiği) | Veritabanı | ⛔ `baslik_en` gibi kolon başına dil **değil** — üçüncü dilde tablo değişir. **Çeviri tablosu:** `news_translations(news_id, locale, title, body)`; yönetici panelde dil sekmesi |
| **Makine çevirisi** (Google Translate widget vb.) | Dış servis | ⛔ Kurum sitesinde kullanılmaz: kalitesi denetlenemez, kurum ağından dışarı çıkış ister, kişisel veriyi Google'a gönderir |

- Dil seçimi URL'de (`/en/haberler`) — paylaşılabilir, aranabilir; çerezde
  değil. `hreflang` ve alternatif adresler `18-seo.md`.
- Tarih, sayı, para biçimi dille birlikte değişir (`Intl` + `locale`); "12.09.2026"
  İngilizcede "09/12/2026" olur — biçim koda gömülmez.
- Çevrilmemiş içerik için **geri düşüş** (fallback) kuralı baştan: Türkçesi
  gösterilir + "bu içerik yalnızca Türkçe" notu; boş sayfa asla.

### ⭐ Zaman dilimi — sakla UTC, göster İstanbul, hesapla dikkatle

- Veritabanında **`TIMESTAMPTZ`** (saat dilimli zaman); değer **UTC** olarak
  durur. Ekranda `Europe/Istanbul`. Sunucunun saat dilimine güvenilmez —
  konteynerde `TZ=UTC` sabitlenir ki "hangi makinede koştu" sonucu değiştirmesin.
- ⛔ **Saatsiz tarih ayrıdır:** doğum tarihi, randevu günü, son başvuru günü
  bir **an** değil bir **gün**dür — `DATE` tipinde saklanır, saat dilimine
  hiç girmez. `TIMESTAMPTZ`'de saklanırsa "31 Aralık 23:30 İstanbul" UTC'de
  "31 Aralık 20:30" olur, gün doğru; ama "1 Ocak 01:00 İstanbul" UTC'de
  **31 Aralık 22:00** — gün kayar, doğum günü bir gün erkene gelir.
- **"Gün sonu", "bu ay", "son başvuru saati 17:00"** gibi kurallar **İstanbul
  saatinde** hesaplanır, sonra UTC'ye çevrilir — `date-fns-tz` ile
  `zonedTimeToUtc("2026-09-30T17:00", "Europe/Istanbul")`. UTC'de "gün sonu"
  almak, İstanbul'da gün sonundan 3 saat sapar.
- Türkiye yaz saati uygulamıyor (sabit UTC+3) ama kural **yine `Europe/Istanbul`
  adıyla** yazılır, `+03:00` sabit sayı olarak değil — politika değişirse tek
  yerden düzelir; geçmiş tarihlerde (2016 öncesi) sapma zaten var.
- Planlı görevler (`cron`) İstanbul saatiyle tanımlanır ve bu açıkça yazılır
  (`12-operations-and-scaling.md` → *"Planlı görevler"*).
- Kullanıcıya gösterilen her zaman damgasında dilim bellidir; "14:00" tek başına
  yazılmaz, `14:00 (TSİ)` ya da bağlamdan kesinse en azından tek dilim.

## Kullanıcıya görünen metin (copy) kuralları
- Sade, kısa, teknik terimsiz Türkçe. "Hata: 500" değil → "Şu an bağlanamıyoruz, biraz sonra tekrar deneyin."
- Suçlayıcı dil yok: "Yanlış girdiniz" değil → "Bu alan e-posta biçiminde olmalı."
- Her hata mesajı **ne yapılacağını** söyler.
- Buton metni eylem bildirir: "Tamam" değil → "Randevuyu onayla".
