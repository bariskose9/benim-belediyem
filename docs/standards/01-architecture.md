# 01 — Mimari ve Klasör Yapısı

## Katmanlar (yukarıdan aşağıya, tek yön)

```
UI (React bileşeni)
   ↓ sadece veri ister, iş kuralı bilmez
API katmanı (route handler)   → doğrulama (Zod) + auth + HTTP çevirisi
   ↓
Servis katmanı (iş mantığı)   → kurallar burada. "Aynı gün ikinci randevu alınamaz" burada
   ↓
Repository katmanı (Prisma)   → sadece veri erişimi. İş kuralı içermez
   ↓
Veritabanı
```

**Kural:** Katman atlanmaz. Bileşen içinden Prisma çağrılmaz. Route handler içine
iş mantığı yazılmaz. Servis katmanı `Request`/`Response` nesnesi tanımaz.

## ⭐ BİR İSTEĞİN TAM YOLU — kim ne yapar, ORM nerede durur

Katman listesi *hangi kutuların olduğunu* söyler; bu bölüm **bir isteğin
baştan sona nereden geçtiğini** ve her durakta kimin sorumlu olduğunu.

```
İstemci → API → Servis → Repository → ORM (Prisma) → SQL → PostgreSQL
   │        │       │          │            │
tarayıcı  ────── senin yazdığın kod ────  kütüphane   veritabanı
mobil                                     (kurulur,
                                        yazılmaz)
```

⛔ **Repository ile ORM aynı şey DEĞİLDİR.** Repository senin yazdığın bir
dosyadır (`appointment.repository.ts`); ORM onun **kullandığı** pakettir. Şemada
*"Repository (Prisma)"* biçiminde birleştirilmesi yaygın bir hatadır ve katman
sınırını görünmez kılar.

### Durak durak — randevu oluşturma örneği

| # | Durak | Ne yapar | Ne YAPMAZ |
|---|---|---|---|
| 1 | **İstemci** | `POST /api/appointments` ile gövdeyi gönderir | İş kuralı bilmez |
| 2 | **API katmanı**<br>`*.controller.ts` / `route.ts` / `actions.ts` | Zod ile gövdeyi doğrular · kimliği çözer · servisi çağırır · sonucu HTTP'ye çevirir (201/422) | ⛔ İş kuralı **yazılmaz** |
| 3 | **Servis katmanı**<br>`*.service.ts` | Kuralları uygular: çalışma saati içinde mi · aynı gün ikinci randevu var mı · slot dolu mu | ⛔ `req`/`res` **tanımaz**, HTTP kodu döndürmez |
| 4 | **Repository katmanı**<br>`*.repository.ts` | ORM'e ne isteneceğini söyler: `prisma.appointment.create({ data })` | ⛔ Tek bir `if` bile **bulunmaz** |
| 5 | **ORM (Prisma)** | Çağrıyı SQL'e, dönen satırı nesneye çevirir — **iki yönlü eşleme** | Karar vermez, kural bilmez |
| 6 | **PostgreSQL** | SQL'i çalıştırır, satırı döndürür | — |

Cevap aynı yoldan **geri tırmanır**: repository nesneyi döndürür → servis
döndürür → API onu HTTP yanıtına çevirir.

### ⭐ Server Action mı, Route Handler mı — iki kapı, iki görev

Next.js'te sunucuya yazma göndermenin iki yolu var; ikisi de App Router'da
(Next 16). **Route Handler** (`app/api/**/route.ts`): klasik HTTP ucu — URL,
method, durum kodu; tarayıcı standardı `Request`/`Response` nesneleriyle
(Node'un `req`/`res`'i değil; bu yüzden aynı kod Edge'de de çalışır).
**Server Action** (`"use server"` fonksiyonu): URL yazmazsın; sunucuda
çalışacak bir fonksiyon yazar, formun `action` özelliğine fonksiyonun
**kendisini** verirsin; Next perde arkasında gizli kimlikli bir `POST` üretir.
*Gerçek hayat:* mutfağa "4 numaralı formu doldurup gönder" (Route Handler)
yerine garsona "bunu mutfağa söyle" demek (Server Action) — sipariş yine
mutfağa gider, formu sen bilmezsin.

```ts
// features/applications/actions.ts
"use server";                                   // bu dosyadaki fonksiyonlar SUNUCUDA çalışır, tarayıcıya inmez

export async function createApplication(_prev: State, formData: FormData) {
  const session = await getSession();                                   // 1) kimlik — atlanmaz
  if (!session) return { error: "Oturum yok" };
  const parsed = CreateApplicationSchema.safeParse(Object.fromEntries(formData)); // 2) Zod — atlanmaz
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  await applicationService.create(parsed.data, session.user);           // 3) servis — iş kuralı burada, action'da değil
  revalidatePath("/applications");                                      // 4) listeyi yeniden üret
  return { ok: true };
}
// page.tsx (istemci): const [state, formAction] = useActionState(createApplication, init);
//                     <form action={formAction}> — URL yok, fetch yok
```

⛔ **`"use server"` güvenli yapmaz, yalnızca sunucuda çalıştırır.** Gizli
kimliği bilen herkes fonksiyonu `curl` ile çağırabilir. Route Handler'da
yapılan her şey — kimlik, Zod, yetki, hız sınırı — action'ın **içinde** de
yapılır. Action bir API katmanıdır: iş kuralı yazılmaz, servisi çağırır.

| Durum | Araç | Neden |
|---|---|---|
| Kendi arayüzünden **form yazması** (kaydet, güncelle, sil) | **Server Action** | URL ve fetch kodu yok; `useActionState` ile hata/yükleniyor durumu hazır; JavaScript kapalıyken bile çalışır (progressive enhancement) |
| Kendi arayüzünden **okuma** | Sunucu bileşeni doğrudan servis/repository'yi çağırır | İstek bile yok |
| **Başkasının** çağıracağı uç (mobil, başka sistem) · webhook · dosya indirme/yükleme akışı · herkese açık okuma API'si | **Route Handler** | HTTP sözleşmesi gerekiyor: URL, method, durum kodu, OpenAPI |
| Kurgu [A]/[C] — asıl API kurumda veya NestJS'te (`00-stack.md` → *"DÖRT KURGU"*) | Server Action **ince BFF**: token'ı sunucuda ekleyip API'yi çağırır | Anahtar tarayıcıya inmez; Next tarafında iş kuralı yazılmaz |

Route Handler ölmedi; **görev bölüşümü** oldu: dışa açılan kapı Route
Handler, kendi formun Server Action. İkisi de `01-architecture.md`'deki API
katmanıdır; altındaki servis ve repository aynıdır.

⚠️ Next 16'da ara katman dosyası `middleware.ts` değil **`proxy.ts`**, dışa
aktarılan fonksiyon `proxy()`. Edge'de çalışır; içinde veritabanı istemcisi
(Prisma) kullanılamaz — yalnızca çerez/JWT okuyup yönlendirir, veritabanı
gerektiren karar Route Handler / Server Action katmanına bırakılır.

### ORM ne demek, somut olarak

**ORM / Object-Relational Mapping / nesne-ilişki eşleme** — koddaki nesneler
ile veritabanı tabloları arasında çeviri yapan kütüphane. Repository'de şunu
yazarsın:

```ts
// appointment (randevu) · doctorId (doktor kimliği) · scheduledAt (randevu zamanı)
prisma.appointment.create({ data: { doctorId: "d-42", scheduledAt: "2026-09-10" } })
```

Prisma bunu şuna çevirir ve veritabanına o gider:

```sql
INSERT INTO "appointments" ("doctor_id","scheduled_at") VALUES ('d-42','2026-09-10') RETURNING *;
```

Dönen satırı da geri çevirip TypeScript nesnesi olarak verir. Adındaki
*"eşleme"* bu çift yönlü çeviridir.

### ⛔ İKİ YAYGIN YANLIŞ ANLAMA

**1. "ORM gelen isteği doğrular."** Hayır. İki ayrı şey karışıyor:

| Ne doğrulanır | Ne zaman | Kim yapar |
|---|---|---|
| Gelen **isteğin** içeriği | Çalışma anında, her istekte | **Zod** |
| **Kodun** tabloyla uyumu | Derleme anında, sen yazarken | **TypeScript**, Prisma'nın ürettiği tiplerden |

Olmayan bir alana yazmaya çalışırsan proje **derlenmez** — hata kullanıcıya
değil sana çıkar. Ama bu bir çalışma anı kontrolü değil, tip sisteminin işidir.

**2. "Gerekirse migration istek sırasında çalışır."** ⛔ **Asla.** Migration /
şema göçü veritabanının **yapısını** değiştirir (tablo açmak, sütun eklemek,
index koymak) ve yukarıdaki okun üstünde **hiç yer almaz**:

| Ne zaman | Komut |
|---|---|
| Şemayı değiştirdiğinde, kendi bilgisayarında | `prisma migrate dev` |
| Yayına alırken, bir kez | `prisma migrate deploy` |

*Gerekçe:* ani yükte 20.000 isteğin her birinin veritabanı yapısını değiştirmeye
kalkması felaket olurdu. Yapı **önceden** hazırdır; istekler yalnızca veri
okur ve yazar.

## ⭐ BU KOD HANGİ KATMANA AİT — pratik test

*"Route handler'a iş mantığı yazılmaz"* kuralı, **iş mantığının ne olduğu**
bilinmeden uygulanamaz. Yazmak üzere olduğun koda şunu sor:

| Soru | Cevabı "evet" ise |
|---|---|
| İçinde **if/else, döngü veya hesap** var mı? | **Servis** |
| Bir **karar** veriyor mu — *"bu izin verilir mi"*, *"tutar ne olur"*? | **Servis** |
| İşin bir **kuralını** uyguluyor mu? | **Servis** |
| Sadece veri **okuyup yazıyor** mu (`findMany`, `create`, `update`)? | **Repository** |
| Gelen isteği **doğruluyor**, yetki bakıyor, HTTP koduna çeviriyor mu? | **API** |
| Ekranda bir şey **gösteriyor** mu? | **UI** |

### Ayırt edici cümle
Servis **"ne yapılmalı"** sorusunu cevaplar · Repository **"nereden alınır"** ·
API **"kim istedi, cevabı nasıl döneriz"** · UI **"nasıl görünür"**.

### Aynı iş, üç katmana bölünmüş

```
API           → Zod ile gövdeyi doğrula · oturumdan kullanıcıyı al
                · servisi çağır · sonucu 201 olarak dön
                (⛔ burada "aynı gün ikinci randevu" kontrolü YAPILMAZ)

Servis        → Çalışma saati içinde mi?  ← karar
                Aynı gün başka randevu var mı?  ← kural
                Yoksa hata fırlat; varsa repository'yi çağır
                (⛔ burada `res.status(400)` YAZILMAZ — servis HTTP bilmez)

Repository    → prisma.appointment.create({ data })
                (⛔ burada tek bir if bile OLMAZ)
```

⚠️ **Repository'de `if` görürsen kural sızmıştır**, servise taşı.
⚠️ **Serviste `req`/`res` görürsen HTTP sızmıştır**, API'ye taşı.
Bu iki sızıntı, katman ihlalinin en sık iki biçimidir.

### ⛔ "KÜÇÜK PROJEDE BİRLEŞTİRİLEBİLİR" — DEĞERLENDİRİLDİ, REDDEDİLDİ

Yaygın tavsiye şudur: *"prototip veya hafta sonu projesinde API ve iş mantığı
aynı dosyaya yazılabilir, hantallıktan kaçınılır."* **Bu kitte geçerli değildir.**

*Gerekçe — tavsiyenin dayanağı çökmüştür:* birleştirmenin klasik sebebi
**geliştiricinin yazma süresiydi**. Üç dosya açmak, üç kez `import` yazmak
zaman alıyordu. Kod bir ajan tarafından yazıldığında bu maliyet **sıfırdır** —
üç dosya da bir dosya da aynı sürede oluşur. Ödünleşmenin maliyet tarafı
kalktı, fayda tarafı (bakım, test edilebilirlik, **anlaşılabilirlik**) aynen
duruyor.

İkinci gerekçe: bu kitin amacı yalnızca çalışan kod değil, **sahiplenilen**
koddur (`02-coding-standards.md` → *"Kod, okuyamayan biri için de anlaşılır
olur"*). Katmanların birleştirilmesi, kodu anlaşılır kılan sınırları tam da
siler.

⛔ **"Bu proje küçük" bir istisna gerekçesi değildir.** Küçük projelerin çoğu
küçük kalmaz; kalanlarda da maliyet zaten sıfırdı.

⚠️ Gerçek bir istisna çıkarsa (ölçülmüş bir sebep, bu ikisinden birini
çürüten bir durum) ajan **önerir ve gerekçelendirir**; kullanıcı karar verir
ve karar **ADR'ye** yazılır. Sessizce birleştirilmez.

## ⭐ Durum makinesi — servis katmanının tek kapısı

**Durum makinesi / state machine / iş akışı durumu:** bir kaydın alabileceği
durumların listesi + **izinli geçişlerin** tablosu + her geçişte olan şeyler.
*Gerçek hayat:* nüfus müdürlüğündeki işlem sırası — evrak teslim alınmadan
onay damgası vurulmaz; sırayı memurun hafızası değil duvardaki **işlem
şeması** belirler; hangi memur bakarsa baksın aynı sıra.

**Sorun:** başvuru *beklemede → incelemede → onaylandı / reddedildi*, bir de
*iptal*. "Reddedilen onaylanamaz" kuralı her uçta `if (status === …) throw`
diye yazılırsa on yere dağılır; on birinci uçta unutulur ve reddedilen
başvuru onaylanır. Kural **tek yerde**, geçiş **tek kapıdan**:

```ts
// features/applications/status.ts — durumlar ve geçiş tablosu; başka hiçbir yerde tekrarlanmaz
export const STATUS = ["pending", "in_review", "approved", "rejected", "cancelled"] as const;
export type Status = (typeof STATUS)[number];

// Hangi durumdan hangisine geçilebilir — boş dizi = son durum, geri dönüş yok
export const TRANSITIONS: Record<Status, readonly Status[]> = {
  pending:   ["in_review", "cancelled"],
  in_review: ["approved", "rejected"],
  approved:  [],
  rejected:  [],
  cancelled: [],
};

// application.service.ts — TEK KAPI: durumu değiştirmenin başka yolu yoktur
async transition(id: bigint, to: Status, actor: Actor) {
  return this.prisma.$transaction(async (tx) => {
    const app = await tx.application.findUniqueOrThrow({ where: { id } });
    if (!TRANSITIONS[app.status].includes(to)) {          // yasak geçiş → 409, kayıt değişmez
      throw new InvalidTransitionError(app.status, to);
    }
    await tx.application.update({ where: { id }, data: { status: to } });
    await tx.applicationEvent.create({                     // kim, ne zaman, neyden neye — iş akışı geçmişi
      data: { applicationId: id, from: app.status, to, actorId: actor.id },
    });
    // audit before-image'ı Prisma extension kendisi yazar (04-database.md → "Denetim kaydı")
    return app;
  });
  // commit'ten SONRA: SMS / e-Belediye işi kuyruğa (00-stack.md → "Kuyruğa ne zaman atılır")
}
```

| Kural | Neden |
|---|---|
| ⛔ Repository'de doğrudan `status` güncelleyen `update` **yok**; tek kapı `transition()` | Kapıyı atlayan bir uç, kuralı atlar |
| Geçiş tablosu = **test tablosu**: her satır bir test ("rejected → approved fırlatır") | Tablo değişince test kırılır, kural sessizce gevşemez |
| `application_events` ayrı tablo: iş akışı geçmişi ("3 kez incelemeye döndü") | Audit satırın tamamını tutar, olay tablosu akışı; ikisi ayrı soru cevaplar |
| Durum değerleri tanım tablosunda **da** durur (`04-database.md` → *"Sabit değer kümesi"*); senkron testi | Tablo ekranın, kod kuralın kaynağı |
| BullMQ'nun `waiting/active/completed/failed`'i ile **ilgisi yok** | O kuyruğun kendi makinesi; `sms` işi `failed` olsa başvuru yine onaylıdır |

⭐ **Kararı veren soru:** *"Bu alanın yeni bir değerinde kod farklı mı
davranıyor?"* Evet → durum makinesi; hayır → yalnızca tanım tablosu.

## Klasör yapısı — özellik bazlı

```
src/
├── app/
│   ├── (public)/          → login gerektirmeyen sayfalar
│   ├── (protected)/       → login zorunlu sayfalar
│   ├── api/<kaynak>/      → route handler'lar
│   ├── layout.tsx
│   └── page.tsx
├── features/<özellik>/    → HER ÖZELLİK KENDİ KLASÖRÜNDE
│   ├── components/
│   ├── actions.ts         → Server Action'lar (form yazmaları) — API katmanı
│   ├── services/          → iş mantığı
│   ├── repositories/      → Prisma erişimi
│   ├── schemas/           → Zod şemaları
│   └── types.ts
├── components/ui/         → paylaşılan tasarım sistemi bileşenleri
├── lib/                   → auth, db client, http, cache, utils
└── config/                → sabitler, env okuma (tek yerden)
```

## Ayrı backend varsa — monorepo yapısı

Karar kuralı `00-stack.md` → "Backend kurgusu"nda. Ayrı backend seçildiyse
**tek git deposu** kullanılır (monorepo), pnpm workspaces + Turborepo ile.

```
apps/
├─ web/       → Next.js (yalnızca arayüz — Prisma'yı GÖRMEZ)
├─ api/       → NestJS (HTTP API)
├─ worker/    → NestJS (arka plan işleri, HTTP dinlemez)
└─ mobile/    → Expo (varsa)
packages/
├─ contracts/ → Zod şemaları + türetilen tipler — web, api, mobile buradan okur
└─ domain/    → saf iş kuralları (Prisma/Nest/HTTP bilmez)
```

⚠️ **Monorepo ≠ monolit.** Monorepo *kodun nerede durduğu*, monolit *programın
nasıl çalıştığı* hakkındadır. Bunlar bağımsız eksenlerdir.

**Polyrepo (ayrı depolar) neden değil:** ortak tipler özel bir npm paketi
olarak yayınlanmak zorunda kalır; her değişiklikte sürüm yükselt–yayınla–güncelle
döngüsü gelir ve iki depo arasında **sürümler kaçınılmaz olarak ayrışır.** Tek
mantıklı olduğu durum: depoların farklı ekiplere ve farklı yayın takvimlerine
ait olması.

### ⛔ Tip ve şema TEK yerde tanımlanır

Aynı veri şeklini iki projede ayrı ayrı yazmak yasaktır. Sebep somut: API'de
bir alanın adı değişir, diğer taraf güncellenmeyi unutur, **TypeScript hata
vermez** (kendi kopyasına bakıyordur) ve hata çalışma anında ekranda `undefined`
olarak çıkar.

Kural: şema `packages/contracts` içinde **bir kez** tanımlanır; API alanı
değiştiğinde tüketen taraf **derlenmez.** Hata ekrana değil, derleyiciye düşer.

## Servis yaşam döngüleri (ayrı backend varsa)

| Nest | .NET karşılığı | Ne zaman |
|---|---|---|
| `DEFAULT` (singleton) | `Singleton` | Durumsuz servisler: yapılandırma, sistem saati, politika sınıfları, mapper |
| `REQUEST` | `Scoped` | İsteğe özel veri: aktif kullanıcı, correlation ID |
| `TRANSIENT` | `Transient` | Nadir — gerekçesiz kullanılmaz |

⛔ **İstek bazlı veri singleton serviste tutulmaz.** Tutulursa iki kullanıcının
verisi karışır: *Ali'nin isteği Veli'nin bilgisiyle işlenir.* Bu hata tek
kullanıcılı testte **hiç görünmez**, yük altında ortaya çıkar ve kurumsal bir
sistemde yanlış kişinin verisini göstermek — yani KVKK ihlali — demektir.

⛔ **Captive dependency:** scoped bir servis singleton içine enjekte edilmez;
singleton onu ilk istekteki hâliyle dondurur.

**Aktif kullanıcı ve sistem saati** doğrudan statik yapılardan okunmaz;
`nestjs-cls` (AsyncLocalStorage) ve `Clock` soyutlaması üzerinden gelir —
her istek kendi izole bağlamında yaşar, ikisi de test edilebilir.
Arka plan işlerinde HTTP bağlamı **yoktur**; iş kendi bağlamını kurar.

## İsimlendirme

⚠️ **Önce dayatmaya bak.** Analiz dokümanı, şartname veya kurumun standardı bir
isimlendirme kuralı veriyorsa **o geçerlidir**; aşağısı yalnızca sessiz
kaldıklarında uygulanır (`00-stack.md` → *"DAYATILAN SEÇİM"*).

| Ne | Biçim | Örnek |
|---|---|---|
| Klasör ve dosya | `kebab-case` | `work-orders/` |
| Rol soneki | **nokta ile** | `work-order.service.ts` · `work-order.repository.ts` · `work-order.controller.ts` |
| ⭐ React bileşen **dosyası** | `kebab-case` | `user-card.tsx` |
| ⭐ React bileşenin **kendisi** | `PascalCase` | `export function UserCard()` |
| Değişken · fonksiyon | `camelCase` | `getUserAppointments()` |
| Tip · Interface | `PascalCase` | `WorkOrder` |
| Sabit | `UPPER_SNAKE` | `MAX_UPLOAD_BYTES` |

⛔ **Bileşen dosyası da `kebab-case`'dir** — dosya adı ile bileşen adının
farklı biçimde olması bilerek seçilmiştir, kaza değil. Üç gerekçe:

1. **shadcn/ui zaten böyle üretiyor.** `components/ui/alert-dialog.tsx`
   dosyalarını CLI yazar; bileşen dosyalarını `PascalCase` yapmak aynı klasörde
   **iki ayrı biçim** doğurur.
2. **Next.js App Router'ın özel dosyaları küçük harflidir** (`page.tsx`,
   `layout.tsx`, `route.ts`). Tek biçim, istisnasız okunur.
3. ⛔ **Büyük/küçük harf tuzağını kapatır.** macOS ve Windows dosya adında
   harf büyüklüğüne duyarsızdır, Linux konteyneri ve CI duyarlıdır; tek biçim
   kuralı bu sessiz kırılmayı baştan imkânsız kılar
   (`13-environments.md` → *"DOSYA ADI BÜYÜK/KÜÇÜK HARF"*).

⛔ **`import` yolu dosya adıyla birebir aynı yazılır.**

### Dil — kod dili proje moduna göre, anlatım Türkçe

- **Kod isimleri** (değişken, fonksiyon, tip, dosya, klasör, tablo, kolon,
  enum, API yolu) **proje moduna** göre: kendi projede İngilizce; kurumun
  Türkçe DB standardı olan işyeri projesinde Türkçe (Türkçe karaktersiz).
  Commit mesajı her modda İngilizce.
- **Yorumlar, açıklamalar ve kullanıcıya görünen metinler Türkçe.**
- ⭐ Bir kod adı ilk geçtiğinde **diğer dildeki karşılığı yorumda parantez
  içinde** verilir (`workOrder` → *iş emri* · `basvuru` → *application*), ki
  iki adı da aranabilir olsun. Kuralın tamamı ve örnekleri:
  `02-coding-standards.md` → *"KOD DİLİ PROJE MODUNA GÖRE, YORUM HER ZAMAN TÜRKÇE"*.

## Boyut sınırları
Dosya > 300 satır → böl. Fonksiyon > 50 satır → böl. İç içe if > 3 seviye → erken return.

## Veri akışı kuralları
- Sunucu bileşeni varsayılandır; `"use client"` sadece etkileşim gerekiyorsa.
- Gizli anahtar veya iş kuralı istemciye gönderilmez.
- Dış API çağrıları **sunucu tarafında** yapılır ve önbelleklenir (aşağıda).

### ⭐ Önbellek ve tazelik — "her istekte veritabanı" varsayılan DEĞİLDİR

**Önbellek / cache**: pahalı bir sonucu (veritabanı sorgusu, dış API cevabı,
üretilmiş sayfa) bir süre saklayıp aynı isteğe **yeniden hesaplamadan** vermek.
*Gerçek hayat:* fırının vitrini — her müşteri için sıfırdan ekmek pişirilmez,
raftaki verilir; raf boşalınca ya da ekmek bayatlayınca yenisi pişer. Sorun
şu: **ne zaman bayatladığını** kim söyleyecek?

Next.js'te üç katman vardır ve hepsinin varsayılanı farklıdır:

| Katman | Ne saklar | Ne zaman bayatlar | Nasıl yenilenir |
|---|---|---|---|
| **Tam sayfa / route cache** | Sunucu bileşeninin ürettiği HTML | Statik sayfa hiç; `revalidate = 60` ile 60 sn | Yönetici kaydedince `revalidatePath("/haberler")` |
| **Veri önbelleği** (`fetch` / `unstable_cache`) | Tek bir sorgu/çağrı sonucu, **etiketle** (`tags: ["news"]`) | Süre dolunca ya da etiket geçersiz kılınınca | ⭐ `revalidateTag("news")` — yazma işleminden sonra, Server Action / servis içinde |
| **İstemci** (TanStack Query) | Tarayıcıdaki liste/detay | `staleTime` (varsayılan 0 = hemen bayat) | Yazma sonrası `invalidateQueries`; odak dönüşünde yeniden çekme |

**Kural — etiketle ve yazarken geçersiz kıl:**

```ts
// Okuma: sorgu etiketlenir — "bu veri 'news' etiketine bağlı"
const getNews = unstable_cache(() => newsRepository.findPublished(), ["news"], { tags: ["news"] });

// Yazma: servis kaydettikten sonra YALNIZCA o etiket düşer — site geneli değil
await newsService.publish(input);
revalidateTag("news");   // haberler listesi ve detayları sonraki istekte taze
```

⛔ **Her rotaya `export const dynamic = "force-dynamic"` yazılmaz.** Bu,
"vitrini kaldır, her müşteriye sıfırdan pişir" demektir: yönetici panelden
kaydettiği anda görsün diye **tüm** ziyaretçi sayfaları her istekte veritabanına
iner — yük, önbelleksiz sunucunun yüküdür. Tazeliği **yazma anında etiketle**
sağlarsın; okuma tarafı önbellekli kalır. `force-dynamic` yalnızca gerçekten
kişiye özel (oturum, sepet) sayfalarda.

| Veri | Yaklaşım |
|---|---|
| Herkese aynı, seyrek değişen (haber, duyuru, doktor listesi, menü) | Etiketli veri önbelleği + yazarken `revalidateTag` |
| Herkese aynı, zamanla değişen (döviz, hava) | `revalidate = <saniye>` |
| Kişiye özel (panel, sepet, "randevularım") | Önbellek yok — `dynamic`, çerezle |
| Dış API cevabı | Sunucuda çağır + süreli önbellek; dış servis çökerse **son iyi** cevap gösterilir (`integrations.md`) |

⭐ **Kararı veren soru:** *"Bu veriyi kim değiştiriyor ve değiştiği anda kim
görmek zorunda?"* Değiştiren belliyse (yönetici, servis) → yazma anında
etiket düşür; kimse görmek zorunda değilse → süre; herkes anında görmek
zorundaysa → önbellek yok, ama önce *"gerçekten anında mı"* diye sor — çoğu
"anında" 60 saniyeye razıdır.

Sunucu tarafı önbellek (Redis) yalnızca ölçüm gösterirse ve sıra geldiğinde
(`12-operations-and-scaling.md` → *"Performans ve büyütme sırası"*).

