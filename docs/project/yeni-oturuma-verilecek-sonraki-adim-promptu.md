# Yeni oturuma verilecek sonraki adım promptu — borç #107'nin 107d adımı

> ⚠️ **Adı ne anlatıyor:** bu dosya *"yeni oturuma verilecek metin"*dir.
> `docs/standards/15-oturum-devri-kurallari.md` **KURALDIR**; bu dosya o kuralın **ÜRÜNÜDÜR**.

> Bu dosya bir sonraki oturuma kopyala-yapıştır yapılmak için var.
> Adım bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde **borç #107'nin 107d adımına** geçiyoruz (profil,
hizmetler ve **gövdesi JSON olmayan iki uç** — 7 uç; bitince liste boşalır ve
`RESPONSE_BODY_PENDING` sabiti SİLİNİR). Başlamadan önce `CLAUDE.md` + `docs/`
klasörünü oku. Özellikle:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku; zaten yapılmış olabilir
- `docs/project/roadmap.md` — nerede kalındı + teknik borç listesi
- `docs/standards/15-oturum-devri-kurallari.md` — oturum kapanmadan ne yazacağın
- ⭐ `docs/kullanici/calisilacak-konular.md` ve `docs/kullanici/ogrendigim-konular.md`
  — **bana neyi ne kadar açıklayacağın buradan okunur.** Kullanıcı defteri projeler
  arası birleşir
- `docs/project/decisions/ADR-021-*.md` — yanıt sözleşmesi neden üç kapıya bağlı
- ⭐ **Proje kit 3.21.0'da** (`docs/standards/KIT-SURUM` damgası: `3.21.0 @ d24334f`;
  açılış kancası bununla "proje kopyası geride mi" der — gerideyse `/kit-senkron`
  sorar, senkron sonunda damga EN SON yazılır): `.claude/rules/` (9 dosya), kısa
  `CLAUDE.md` (§0 orada), 19 standart
- ⭐ **YENİ KURAL (kit 3.20.0, `15` → "KURAL RAPORU"):** oturum sonunda, devir
  dosyasını yazmadan ÖNCE kural raporu koşturulur, çıktısı DURUM'a olduğu gibi
  yapıştırılır; "⚠️ İşaretçiye gidilmedi" varken oturum KAPANMAZ — işaret edilen
  standart açılır, yazılan kod ona karşı yeniden okunur. Komut `15`'te ve
  aşağıda KOMUTLAR'da. ⚠️ Alan kuralı (`kod.md`, `test.md`…) bir dosyaya
  dokununca gelir ve "şu standardı oku" der — **oku**, adını görmek okumak değil

## ⛔ İLK İŞ: DURUM BÖLÜMÜNE İNANMA, ÖLÇ

`15-oturum-devri-kurallari.md` kuralı: bu dosyanın DURUM bölümü **merge'den önceki
dünyayı** anlatıyor olabilir.

```
git log --oneline -5
git status
gh pr list
curl -s https://benim-belediyem.vercel.app/api/health
```

Depoda görülen, dosyada yazandan üstündür. Çelişki bulursan **söyle.**

## DURUM

Roadmap adım **0 → 18i bitti** (18h — kitin iki proje belgesi — **atlanmış
durumda, bilerek; 107d'nin önüne alma**). Borç **#103 ödendi**, **#107 üç
adımda kısmen ödendi (mekanizma + 22 uç hazır, 7 uç kaldı)**. Kalan: **107d**,
sonra **18h**, sonra **adım 19 (Expo mobil)**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- ⚠️ **107c'nin PR'ı bu dosya yazılırken HENÜZ AÇILMAMIŞTI** (dal:
  `feature/107c-commerce-response-schemas`, `main` = `369938c`). Kontrol:
  `gh pr list` + `git log --oneline -3`. Merge olduysa `/api/health`'teki
  `commit` alanı `369938c`'den farklı olmalı — **doğrula, varsayma**
- Testler: **870** birim+entegrasyon (107c'de +27) · **344** veritabanı ·
  **325** E2E · **19** kalite
- ✅ **CRON'UN ÇALIŞTIĞI KANITLANDI** — production denetim kaydında
  `scheduled_task_run`. Bir daha sorgulama
- ⭐ **Bu proje YALNIZCA bu Mac'te çalışılıyor** (2026-09-21 kararı). Öteki
  bilgisayarda `backend-ogrenme` ve kit geliştirme (`deneme-proje`) var; oradan
  bu depoya dokunulmuyor. "Öteki makinede ilerlemiş mi" diye sorma, ölç: `git
  fetch && git status -sb`
- Gerçek kullanıcı 0 · Sentry canlıda ve uçtan uca doğrulanmış

### Kural raporu — 107c oturumu (b56cd330), 15 → "KURAL RAPORU" gereği

```
━━━ Oturum b56cd330 · 2026-09-21 01:31 → 01:47 · 4 olay ━━━
Açılışta yüklenen (2): CLAUDE.md · .claude/rules/00-cekirdek.md
Tetiklenen (2):
  .claude/rules/kod.md               ← src/features/cart/schemas/cart-summary.schema.ts
  .claude/rules/test.md              ← tests/unit/cart-summary-response.test.ts
Fiilen okunan standart (0): — HİÇ
⚠️ İşaretçiye gidilmedi: kod.md geldi ama 01-architecture.md/02-coding-standards.md açılmadı · test.md geldi ama 06-testing.md açılmadı
```

Uyarı kapatıldıktan sonra ikinci koşum:

```
━━━ Oturum b56cd330 · 2026-09-21 01:31 → 02:55 · 11 olay ━━━
Fiilen okunan standart (4): 02-coding-standards.md ×3 · 06-testing.md · 03-api-guidelines.md · 01-architecture.md ×2
✓ Gelen her tetikleyicinin standardı en az bir kez açıldı
```

**Uyarı kapatıldı (aynı oturumda, kit 3.20.0 geldikten sonra):** `02` → "Para"
ve "Türkçe karşılık", `01` → "Bu kod hangi katmana ait" + "Tip ve şema tek
yerde", `03` → "Yanıt gövdesi de belgelenir", `06` → "Yeşil test yanlış şeyi
ölçüyor olabilir" açıldı; 107c'nin şema ve testleri onlara karşı yeniden
okundu. **Bulunan sapma: 1** — `kurusSchema` standardın kanonik biçiminde
değildi (`min(0)` yerine `nonnegative()`, açıklama örneksiz); hizalandı,
davranış aynı. **Eklenen:** yeni dosyalarda kod adlarına ilk geçtikleri yerde
parantezli Türkçe karşılık. **Sapma yok:** 01 (çevirmen API katmanı işi —
karar/kural yok, HTTP yok), 06 (her yeni kapı mutasyonla kırmızıya döndürüldü),
03 (kodla tutarlı).
⚠️ **Ölçüm notu:** "Fiilen okunan: HİÇ" satırı **eksik ölçüm** — o oturumda
çalışan kanca 3.15.1'di ve yalnızca `Read` aracını görüyordu; oturum boyunca
`cat`/`sed` ile okunan 10, 11, 15, 02 (başlık bloğu), 03 loglanmadı. Ama
uyarı **yine de doğruydu**: 02 → "Para" ve 06 gerçekten açılmamıştı. Kurulu
plugin artık 3.20.0 (Bash okumalarını görür); bu oturumun raporu güvenilir olur.

## ÖNCE ÇÖZÜLECEK MESELELER

1. **Kullanıcı defteri 2026-09-21'de DEĞİŞMEDİ** — 107c'de yeni terim
   anlatıldı ("tel biçimi / DTO", "belgede integer ile number farkı") ama
   kullanıcı **soru sormadı, kendi cümlesinde kullanmadı**; kanıt yok, satır
   açılmadı. Bu oturumda o iki kavram geçerse tepkisine bak; ikinci gözlem
   gelirse seviye 1 satırı **teklif et** (kendiliğinden yazma)
2. **Kit iki dosya daha bekliyor — KARAR VERİLDİ → roadmap adım 18h.**
   ⚠️ 107d'nin önüne alma; ayrı küçük adım
3. **Roadmap biçimi:** kit `⬜/✅` kutucuk bekliyor; proje `~~…~~ **BİTTİ**`
   kullanıyor. Kozmetik; dönüştürmek istersen sor, kendiliğinden değiştirme
4. **#23 sızmış şifre kontrolü** ve **#89 Google hesabında ikinci kanıt** —
   proje sahibinin kararını bekliyor, mühendislik tercihi DEĞİL. Acelesi yok
5. ⭐ **Yeni borç #116 — başlık bloğu.** Kit 3.15 kuralı ("her dosya sabit
   başlık bloğuyla başlar") mevcut 526 dosyada yok, 107c'nin 5 yeni dosyasında
   var. **107d'de açtığın her yeni dosya bloğu alır** (`02-coding-standards.md`
   → *"BAŞLIK BLOĞU SABİT BİÇİMDE YAZILIR"*: `NEREDEN · NE · NEREYE · SONUÇ ·
   KAYNAK · NEDEN · DİKKAT`, gerçek dosya yolları, uydurma `KAYNAK` yok).
   Mevcut dosyalara geriye dönük yazım ayrı adım — 107d'ye karıştırma
6. ✅ **Kapı 8 kapandı (2026-09-21):** 107c'nin iki kuralı (`03-api-guidelines.md`
   → "Yanıt gövdesi de belgelenir") ve defterin altı satırı `/kit-senkron` ile kite
   yazıldı, **kit 3.19.0 @ `a338135`** GitHub'da; ardından kit 3.20.0
   (`bbb8581`, kural raporu) ve 3.21.0 (`d24334f`, `KIT-SURUM` damgası)
   projeye getirildi. Kanıt: `diff` boş.
   ⚠️ Ders: 2026-09-20'nin beş defter satırı 3.16–3.18 senkronlarında kitten
   projeye gelirken projeden kite HİÇ gitmemişti — senkronda defter farkı
   **her seferinde** `diff` ile ölçülür, "birebir" varsayılmaz

## 📌 107a + 107b + 107c'DE NE YAPILDI — mekanizma burada

**Yanıt gövdesi belgede GERÇEK Zod şemasıyla görünüyor.** Şema kütüğe elle
yazılmıyor: ucun `ok()`/`created()` çağrısında kullandığı şemanın AYNISI kütüğe
giriyor (ADR-021). 46 uçtan **29'u gövdeli**; 107a platform (3), 107b auth+hesap
(12), 107c ticaret (7) taşındı. **7 uç kaldı.**

### ⭐ ALTI DERS (107a-c)

1. ⛔ **YANIT SÖZLEŞMESİ TİP SİSTEMİYLE BELGELENEMEZ.** `Date` derlemede `Date`
   telde ISO **metin**, `undefined` alan telde **hiç yok**. Kontrol gövdeyi
   `JSON.parse(JSON.stringify(...))` ile telden geçmiş hâline çevirip doğruluyor
2. ⛔ **BİR KAPIYI `NODE_ENV`'E BAĞLAMA.** E2E production modunda koşuyor;
   bayrak ayrı: `API_RESPONSE_CONTRACT_CHECK`
3. ⚠️ **`serverEnv` HER YERDEN İÇE AKTARILAN BİR MODÜLDE OKUNAMAZ** (tarayıcıda
   bilerek istisna fırlatıyor)
4. ⭐ **BİR UÇ İKİ FARKLI BAŞARI DÖNDÜREBİLİR** → `alternateSuccess`
5. ⭐ **(107c) İÇ İÇE GÖVDE `Date` TAŞIYORSA ROUTE'TA SATIR İÇİ `toISOString()`
   YETMEZ — AÇIK ÇEVİRMEN YAZ, ALANLARI TEK TEK SAY.** Sepet özeti
   `toCartSummaryResponse` ile tel biçimine çevriliyor; `...spread`
   KULLANILMIYOR ki iç kullanım için eklenen bir alan belgeye yazılmadan API'ye
   sızmasın. Sızıntı deneyi `tests/unit/cart-summary-response.test.ts` içinde;
   spread'e dönülürse kırmızı. Örnek: `src/features/cart/schemas/cart-summary.schema.ts`
6. ⭐ **(107c) PARA BELGEDE `integer`** — `z.int()`, `z.number()` DEĞİL; ikisi
   derlemede aynı, fark belgede. Tek kaynak `src/lib/money-schema.ts` →
   `kurusSchema`. CI kapısı: belgedeki her `…Kurus` alanı `integer` olmak
   zorunda, sıfır alan bulmak da kırmızı. ⚠️ `money.ts`'e `zod` KOYMA — beş
   istemci bileşeni onu içe aktarıyor, tarayıcı paketine girer

### HAZIR MEKANİZMA — 107d'DE YENİDEN YAZMA, KULLAN

| Parça | Ne işe yarar |
|---|---|
| `src/lib/api-response-contract.ts` | Çalışma anı kontrolü. **Dokunma, sadece şema ver** |
| `ok(data, { schema })` · `created(data, { schema })` | Derleme anı bağı (`ZodType<T>`) |
| `success.body` (`api-docs/types.ts`) | Kütükte şema beyanı. `envelope: "raw"` ve `externalContract` seçenekleri var |
| `alternateSuccess` (`api-docs/types.ts`) | İkinci başarı yanıtı (farklı durum kodu) |
| `kurusSchema` (`src/lib/money-schema.ts`) | Her para alanı buradan; belgede `integer` + "tam sayı kuruş" |
| `RESPONSE_BODY_PENDING` (`registry/index.ts`) | ⏳ **Kalan 7 uç.** Çözülen uçlar buradan DÜŞÜRÜLÜR; 107d bitince sabit SİLİNİR |
| `tests/unit/api-docs-response.test.ts` | 9 kapı: eksik şema, liste hijyeni, gövdesiz uç, dönüştürme yasağı, ikinci yanıt, route↔kütük eşleşmesi, **para integer** |
| `tests/integration/cart-items-route.test.ts` · `memberships-route.test.ts` | ⭐ **"Kapı bu uca bağlı mı" deseni:** servis taklidi sözleşme dışı gövde döndürür → uç `500` vermeli. 107d'nin uçları için aynı deseni kur |

**Örnek almak için bak:** `src/features/gym/schemas/membership.schema.ts`
(alt yarısı — `nullable()` alanlar ve gerekçeleri) · `src/features/cart/schemas/cart-summary.schema.ts`
(iç içe gövde + çevirmen).

## YAPILACAK — 107d (7 uç)

`RESPONSE_BODY_PENDING` listesinin tamamı:

```
PATCH  /api/v1/notifications                         → { updated: number }           (ok, noStore)
POST   /api/v1/addresses                             → { id: string }                (created)
POST   /api/v1/appointments                          → { id, startsAt: ISO metin }   (created)
POST   /api/v1/events/{eventId}/seat-holds           → { id, block, rowLabel, seatNumber, holdExpiresAt: ISO metin } (created)
POST   /api/v1/support-tickets                       → { id: string }                (created; istek gövdesi multipart)
GET    /api/v1/account/export                        → HAM JSON DOSYASI — ok() KULLANMIYOR
GET    /api/v1/support-tickets/{ticketId}/attachments/{attachmentId} → HAM İKİLİ DOSYA — ok() KULLANMIYOR
```

**İlk beş uç için sıra (107b/107c ile aynı):**
1. Yanıt şemasını ilgili feature'ın `schemas/` dosyasına yaz (mevcut şema
   dosyasının altına; feature'ın `schemas/` klasörü yoksa yeni dosya + başlık bloğu)
2. Route'ta `ok`/`created` çağrısına `schema:` ver
3. Kütükte `success.body: { schema: ... }` yaz
4. `RESPONSE_BODY_PENDING`'den adını **DÜŞÜR**
5. "Kapı bağlı mı" entegrasyon testi (yukarıdaki desen)

⚠️ **107d'YE ÖZEL DİKKAT — İKİ HAM DOSYA UCU AYRI BİR KARAR İSTİYOR**

- ⛔ **Belge üreticisi her gövdeyi `application/json` olarak basıyor**
  (`openapi.service.ts` → `toResponseEntry`: `content: { "application/json": … }`).
  `externalContract` bile bu medya tipinin altına düşüyor. Ek dosyası ucu
  **ikili** (`Content-Type` veritabanından, `Content-Disposition: inline`);
  ona JSON şeması yazmak yanlış belge olur. **Kütüğe yeni bir gövde türü
  gerekiyor** (örn. `file: { contentTypes: [...] }` → belgede
  `application/octet-stream` / `*/*` + `contentMediaType`), üretici ona göre
  medya tipini seçmeli. Bu, mekanizmaya **107a'dan beri ilk dokunuş** —
  `types.ts` + `openapi.service.ts` + `api-docs-response.test.ts` üçü birlikte
  değişir; ADR-021'e ek karar notu gerekir mi diye düşün (kararı sen ver)
- ⚠️ **`account/export` JSON ama `ok()` zarfına sarılı DEĞİL** ve gövdesi
  bugün `Record<string, unknown>` — tipi bile yok. İki yol: gövdenin gerçek
  şemasını yazıp `envelope: "raw"` ile beyan etmek (KVKK m.11 dışa aktarımı
  bir SÖZLEŞMEDİR, dokuz bölüm; şema büyük ama gerçek) ya da dosya türü olarak
  işaretlemek. **Mühendislik tercihi sana ait**; ölçüt: belgeyi okuyan mobil
  istemci bu dosyayı ayrıştırmak isteyecek mi? (`/hesabim/verilerim` ekranı
  onu yalnızca indiriyor)
- ⚠️ Çalışma anı kontrolü `ok()`/`created()` içinde çalışıyor; ham `Response`
  dönen iki uçta hiç çalışmaz. Kapı yoksa bunu **yazılı** bırak (ADR-021
  "kabul edilen bedel" tarzında), sessizce geçme
- ⚠️ `POST /api/v1/support-tickets` istek gövdesi `multipart/form-data`;
  yanıt tarafı normal JSON — karıştırma
- ⛔ Şema `.transform()` taşıyamaz · tarihler `z.iso.datetime()` · para `kurusSchema`

**107d bitince** `RESPONSE_BODY_PENDING` boşalır ve sabit **silinir**;
`openapi.service.ts`'teki "HENÜZ BELGELENMEDİ" uyarı dalı da ölü koda döner —
onu ve `api-docs-response.test.ts`'teki liste testlerini kaldır (ölü uyarı
arşiv değildir, `15-oturum-devri-kurallari.md`).

## 📋 PROJE SAHİBİNİN BEKLEYEN İŞLERİ — ⭐ BU OTURUMDA **KISACA HATIRLAT**

⭐ **KURAL 2026-08-14'TE DEĞİŞTİ.** Proje sahibi bugüne kadar "sonraya bırak,
açma" diyordu; **2026-08-14'te açıkça şunu istedi: "benim yapacaklarımı yine
sonraki session'da hatırlat."**

**Nasıl hatırlatılır:**

- ✅ Oturumun başında **tek seferlik, kısa bir liste** olarak sun (madde başına
  bir satır, aşağıdaki tablodan)
- ⛔ **Sonra konuyu kapat ve roadmap adımına geç.** Onay bekleme, ısrar etme,
  aynı oturumda ikinci kez açma
- ⛔ Maddeleri yeniden GEREKÇELENDİRME, adım adım tıklama listesi ÜRETME,
  "şunu da yapsan iyi olur" diye genişletme. O davranış ertelenmelerinin sebebiydi
- ⛔ Hiçbiri **engelleyici değil** — hepsi ertelenebilir ve ertelenmesi normal

| Ne | Adres / komut | Durum |
|---|---|---|
| **107a + 107b + 107c'nin elle kontrolü** | Canlıda ya da preview'da: `/api/health` (commit alanı yeni) · `/giris` · `/kayit` · market → sepete ekle → `/sepet` → adet artır → satırı çıkar | 2026-09-21'de yine ertelendi — proje sahibi: *"diğer oturumda bakarım, belki topluca"*. ⚠️ Hiçbirinin ekranda görünen karşılığı YOK (arayüz, akış ve veritabanı değişmedi); kontrol "bozulmamış mı" diye bakmak için |
| **#103'ün preview'da elle kontrolü** | preview URL → market → sepete ekle → sepet | Ertelendi. ⚠️ Otomatik taraf zaten kanıtlı |
| Telefondan toplu elle test | — | **20. kez ertelendi** (2026-09-21'de gündeme gelmedi). ⛔ Listeyi ÜRETME, tek satırla an ve geç |
| `proje-kiti`'nin Windows makineye kurulumu | `/plugin marketplace add bariskose9/bariskose-skills` → `/plugin install proje-kiti@bariskose-skills` | Ertelendi |
| Cloudflare'da preview alan adı yetkilendirme (#114) | Cloudflare paneli | ⚠️ İSTEĞE BAĞLI, zorunlu değil |
| #23 (sızmış şifre) ve #89 (Google ikinci kanıt) | — | Kararı bekliyor, acelesi yok |

⚠️ Proje sahibi **aynı anda ikinci bir projede** çalışmayı planlıyor (ayrı VS
Code penceresi). Bu projede ölçüm yaparken bunu hesaba kat: **E2E yüke duyarlı**
(`uptime` < 2.5) ve iki projenin build'i aynı anda koşarsa testler kararsızlaşır.
Port 3000 de çakışabilir.

## ✅ CRON ÇALIŞIYOR — KANITLANDI, BİR DAHA SORGULAMA

⛔ **UTC 00:00–00:59 = TÜRKİYE 03:00–03:59 arasında production'a dağıtım
tetikleyen merge YAPMA** — o pencere cron'un penceresi (`vercel.json` →
`0 0 * * *`, Vercel cron'u UTC sayar). ⚠️ Saat söylerken hangisi olduğunu yaz
(`TR 04:00 / UTC 01:00`). Otomatik merge görevi kurarken `date -u +%H` ile
pencereyi bekle.

**Production veritabanına okuma erişimi (gerekirse):**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **proje
kökünde** `.mts` olmalı, **yalnızca okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT — kaynak 3.21.0 @ `d24334f`, kurulu 3.21.0, proje 3.21.0 (`KIT-SURUM` damgalı)

✅ **Üçü eşit** (2026-09-21, kit 3.20.0 + 3.21.0 senkronu — 15'e "KURAL RAPORU"
ve "kopya geride kaldığında kanca söyler", 07'de işaretçi düzeltmesi, 16'ya ve
`CLAUDE.md` tablosuna `KIT-SURUM` satırı, `sablonlar/calisilacak-konular.md`
şablon kopyası eşitlendi, damga yazıldı): 19/19 standart — `00` ve `05` farkı yalnızca korunan/projeye özel
bölgeler — `sablonlar` 15/15, defterler birebir, `.claude/rules` 9/9. Kurulu
plugin 3.21.0 (`installed_plugins.json`); Claude yeniden başlayınca etkin. ⚠️ Oturum kancası "3.15.1 kurulu" derse
Claude güncellemeden önce açılmış demektir — kancanın sürümü Claude yeniden
başlayınca düzelir, **güncelleme sorma**, yapılmış işi tekrar yaptırma.

⛔ **Kendiliğinden sürüm hatırlatması yapma.** Yalnızca `/yeni-proje` veya
`/kit-senkron` fiilen çalıştırılacağı an kaynak ile kuruluyu karşılaştır.

⛔ **`00-stack.md`'deki ADR-005 cümlesi SİLİNMEZ:** kitin `guvenlik.md`
tetikleyicisi "JWT çerezde + `tokenVersion`" der; bu projede oturum `sessions`
tablosuyla elle yazıldı. Kaynak hiyerarşisinde ADR üstün. Tetikleyiciyi görüp
oturumu yeniden yazmaya KALKMA.

⚠️ Kit deposunu karşılaştırmadan önce `git -C ~/baris_projects/bariskose-skills
pull --ff-only` **ve** son commit zamanına bak (`git -C <kit> log -1 --format=%cd`).

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`src/lib/money-schema.ts` → `kurusSchema`** — YENİ (107c). Her para alanı buradan
- ⭐ **`src/features/cart/schemas/cart-summary.schema.ts`** — YENİ (107c). İç içe
  gövde + açık çevirmen deseni (`toCartSummaryResponse`)
- ⭐ **`tests/integration/cart-items-route.test.ts`** — YENİ (107c). "Kapı bu uca
  bağlı mı" test deseni; yeni uç için kopyala
- ⭐ **`src/lib/api-response-contract.ts`** — Yanıt sözleşmesi kontrolü
- ⭐ **`src/features/api-docs/types.ts` → `SuccessBody`** — Gövde beyanı
- ⭐ **`src/lib/api-deprecation.ts`** — Bir ucu emekliye ayırırken **buradan geç**
- ⭐ **`tests/unit/api-versioning.test.ts`** — Yeni iş ucu `/api/v1/` altına açılır
- ⭐ **`src/proxy.ts`** — nonce + tüm CSP politikası tek yerde. **Yeni dış alan
  adı CSP'ye buradan yazılır** — `next.config.ts`'e İKİNCİ CSP satırı EKLEME
- ⭐ **`tests/e2e/guvenlik-basliklari.spec.ts`** — **Yeni genel sayfa eklersen
  `korunmasiSartYollar` listesine de yaz**
- ⭐ **`tests/unit/workflows.test.ts`** — Yeni action eklersen tam SHA + `# vX.Y.Z`
- **`tests/quality/`** — bütçe eşikleri, performans ve erişilebilirlik kapıları
- **`src/features/api-docs/`** — kütük + üretici + sapma kapıları. **Yeni uç
  eklersen kütüğe de yaz, yoksa CI kırmızıya döner**
- **`src/lib/log-redact.ts`** · **`src/lib/logger.ts`** · **`src/lib/sentry-options.ts`**
- **`src/lib/http.ts`** — `ok`/`created`/`noContent`/`fail`, tek tip hata biçimi
- **`src/lib/rate-limit.ts`** — `readActorIp` · `consumeRateLimit` · `rateLimitKey`
- **`src/features/staff-verification/`** — iki adımlı doğrulama deseni
- **`src/features/account/`** — geri alınamaz işlem deseni
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** · **`src/features/profile/`**
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`),
  `guardPage()` (⚠️ yönlendirme hidrasyondan SONRA uygulanıyor)
- **`src/features/identity/`** · **`src/features/otp/`** · **`src/features/catalog/`**
- **`src/lib/external-fetch.ts`** — **yeni dış servis buradan geçer**
- **`src/lib/file-upload.ts`** — bayt imzasından tür doğrulama
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — tembel senkronizasyon
- **`recordAuditLog()`** · **`requireAccess()`** · **`guardPage()`**
- `messages.ts` (tek istisna `messages-legal.ts`) · tasarım token'ları

## TUZAKLAR — daha önce vakit kaybettirenler

**2026-09-20'de öğrenilenler (güvenlik + kit senkronu)**
- ⛔ **DENETİM KAPISI TÜM AÇIKLARI GÖRÜR, O PR'IN KAPATTIĞINI DEĞİL** —
  `npm audit --omit=dev --audit-level=high` yüzünden dört Dependabot PR'ı
  haftalarca kırmızı kaldı; hiçbiri tek başına yeşile dönemezdi. Çözüm: hepsini
  birden kapatan tek PR, sonra Dependabot'unkileri "aştı" notuyla kapat
- ⚠️ **`--omit=dev` PRISMA'YI DIŞARIDA BIRAKMIYOR** — `prisma` devDependency ama
  `@prisma/client`'ın (üretim) bağımlılığı; `npm ls prisma --omit=dev` ile ölçüldü
- ⛔ **npm'in "fix available" ÖNERİSİ MAJOR GERİ ALMA OLABİLİR** — Prisma zinciri
  için `prisma@6.19.3` önerdi (ADR-008 ihlali). Kabul etme; minör yükselt +
  `overrides` yaz. Depodaki mevcut desen zaten bu
- ⛔ **`overrides` YAZDIKTAN SONRA KAPIYI YENİDEN ÖLÇ** — bir override BOŞ dizeye
  yazılınca koruma sessizce düştü, 3 yüksek açık geri geldi. "Yazdım" yetmez
- ⚠️ **`require('paket/package.json')` `exports` KULLANAN PAKETTE PATLAR**
  (`deepmerge-ts`). Sürümü `node_modules/<paket>/package.json`'ı doğrudan
  okuyarak al; boşsa DUR, yazma
- ⛔ **`npm install x@1.2.3` VARSAYILAN OLARAK `^` YAZAR** — artık `.npmrc`
  `save-exact=true` engelliyor (#83); yine de commit öncesi `grep '"\^' package.json`
- ⛔ **KİT KLONU AYNI MAKİNEDE EŞZAMANLI DÜZENLENİYOR OLABİLİR** — `git status -sb`
  yalnızca uzak farkı gösterir, yerel yeni commit'i değil. Senkrona başlamadan
  `git -C <kit> log -1 --format=%cd` ile zamana bak; #81 karışık anlık görüntü oldu
- ⚠️ **KİT ŞABLONLARINDAKİ DOSYA ADI SENİN VERDİĞİN AD DEĞİLDİR** — devir dosyası
  bir kez `yeni-oturuma-verilecek-sonraki-adim-promptu.md` yapıldı, kanonik ad
  `yeni-oturuma-verilecek-sonraki-adim-promptu.md` çıktı. Adı kitin `15`'inden oku
- ⚠️ **Prettier markdown'a DOKUNMUYOR** — kit dosyaları olduğu gibi kalıyor,
  `diff` kanıtı bozulmuyor (ölçüldü: `format:check` 19 dosyada temiz)

**107c'de öğrenilenler (2026-09-21)**
- ⛔ **ALAN KURALI GELİNCE İŞARET ETTİĞİ STANDARDI FİİLEN AÇ** — `kod.md` ve
  `test.md` yüklendi, 02 → "Para" ve 06 hiç açılmadı; rapor yakaladı. Adı
  görmek okumak değil. Ayrıca kanca `Read` ve Bash okumalarını loglar; hangi
  aracı kullandığın fark etmez (3.18.1+), ama eski kancada Bash görünmüyordu
- ⛔ **`ZodType<T>` KAPISI `Date` TAŞIYAN GÖVDEYİ DERLEMEDE REDDEDER** — şema
  `z.iso.datetime()` (metin) beklerken route `Date` verirse `typecheck`
  kırılır. Çözüm şemayı gevşetmek DEĞİL, route'un tel biçimini üretmesi
  (satır içi `toISOString()` ya da iç içe gövdede açık çevirmen)
- ⚠️ **BİLEREK YANLIŞ TEST NESNESİ `as X` İLE YAZILAMAZ** — fazladan alan
  taşıyan nesne literal'i `as CartSummary` derlemede düşer; `as unknown as X`
  gerekir ve neden olduğu yorumla yazılır
- ⚠️ **`kurusSchema.describe("...")` PAYLAŞILAN ŞEMAYI BOZMAZ** (ölçüldü:
  `describe` klonlar) — ama alan için yazılan açıklama "tam sayı kuruş"
  notunu EZER; alanın kendi açıklamasında parayı yeniden söyle ya da
  `.nullable().describe()` gibi sarmalayıcıya yaz
- ⚠️ **`z.enum(PrismaEnumObject)` ÇALIŞIYOR** (Zod 4, `as const` nesne) ve
  `@/generated/prisma/enums` değer olarak içe aktarılabiliyor — dosya düz, Prisma
  istemcisini çekmiyor (`consent.schema.ts` de böyle yapıyor)
- ⚠️ **CI'DAKİ route↔kütük METİN KAPISI `ok(`/`created(` SONRASI 400 KARAKTERE
  BAKIYOR** — çok uzun bir gövde literal'inden sonra gelen `{ schema: … }`
  pencereden çıkarsa kapı "route hiç şema vermiyor" der. Prettier'ın böldüğü
  hâli de say; şüphede `npx vitest run tests/unit/api-docs-response.test.ts`
- ⚠️ **YÜK: `npm run test` + `next build` ART ARDA MAKİNEYİ 6-7'YE ÇIKARIYOR** —
  E2E'den önce `uptime` < 2.5 için birkaç dakika bekle; bekleme arka planda
  `until` döngüsüyle, ön planda `sleep` engelli

- ⛔ **KAPIYI `NODE_ENV`'E BAĞLAMA** — E2E production modunda koşuyor
- ⚠️ **`serverEnv` TARAYICIDA İSTİSNA FIRLATIYOR** — her yerden içe aktarılan
  bir yardımcı modülde okuma; `process.env`'den oku, doğrulamayı şemada bırak
- ⚠️ **ZOD `io: "output"` MODUNDA `additionalProperties: false` EKLİYOR** —
  yanıt belgesi bu modla basılırsa "fazladan alan konamaz" der ve projenin
  kendi uyumluluk kuralıyla ÇELİŞİR. Yanıt da `io: "input"` ile basılır
- ⚠️ **`npm run test:db` `docs/project/test-hesaplari.md` DOSYASINI YENİDEN
  ÜRETİYOR** — commit öncesi `git checkout` ile geri al (bu oturumda da oldu)
- ⛔ **`vercel redeploy` HEDEFİN ORTAMINI DOĞRULAMADAN ÇALIŞTIRILMAZ** — bir
  PRODUCTION dağıtımını yeniden dağıtmak onu canlıya ALIAS'LAR ve sürümü geri
  alır. Komut hata vermez. 2026-08-13'te canlı 80 saniye eski sürüme düştü.
  Geri alma: doğru dağıtımı bul, `vercel promote` ile terfi ettir
- ⚠️ **`vercel ls` ÇIKTISINI `tail` İLE KIRPMA** — en eskileri gösterir ve
  yanlış dağıtımı "en yeni" sanmana yol açar. `head` kullan, `Preview` /
  `Production` sütununa BAK
- ⚠️ **PREVIEW VE PRODUCTION AYRI NEON DALLARI KULLANIYOR** — production'ı
  uyandırmak preview'ı uyandırmaz. Uyuyan veritabanı deploy'u `P1001` ile
  düşürüyor; önce O ORTAMIN çalışan bir dağıtımındaki `/api/health`'e istek at
- ⚠️ **`gh pr merge --delete-branch` ÇALIŞMA AĞACI KİRLİYKEN YARIDA KALIYOR** —
  merge GitHub'da olur ama yerel dal temizliği "Aborting" der. Önce `git stash`

**#103'te öğrenilenler**
- ⚠️ **`fish` KABUĞU BASH SÖZDİZİMİNİ SESSİZCE YUTUYOR** — `VAR=$(...)` ve
  `for f in $VAR` hata vermeden HİÇBİR ŞEY yapmıyor. Toplu değişikliği
  `bash <betik>` ile koştur, sonucu `grep -c` ile ÖLÇ
- ⚠️ **macOS bash 3.2'de `mapfile` YOK**
- ⚠️ **`git checkout <dosya>` HENÜZ COMMIT EDİLMEMİŞ dosyayı geri getiremez**
- ⚠️ **`docker exec ... psql -U postgres` ÇALIŞMIYOR** — kullanıcı `belediye`
- ⚠️ **`operationId`'de sürüm segmenti KALIR**

**Adım 18d'de öğrenilenler**
- ⛔ **CSP İNLINE STİLİ SESSİZCE BLOKLUYOR** → `getComputedStyle` ile doğrula
- ⚠️ **NEXT 16'DA ARA KATMANIN ADI `middleware` DEĞİL `proxy`**
- ⚠️ **TARAYICI NONCE'U DOM'DAN GİZLİYOR** — değer yalnızca `.nonce` property'sinde
- ⚠️ **ELLE YAZILAN `<script>`'E NEXT NONCE TAKMIYOR**
- ⚠️ **`'nonce-…'` VARKEN `'unsafe-inline'` YOK SAYILIR**
- ⚠️ **İKİ `Content-Security-Policy` BAŞLIĞI = KESİŞİM**
- ⚠️ **`argon2` MALİYETİ GİRDİ UZUNLUĞUNDAN BAĞIMSIZ** (ölçüldü)
- ⚠️ **GEÇİCİ `.mts` BETİK PROJE KÖKÜNDE OLMALI**
- ⚠️ **CHROME DEVTOOLS EKRAN GÖRÜNTÜSÜ ÇALIŞMA ALANI DIŞINA YAZILAMIYOR**
- ⭐ **BİR CSP DEĞİŞİKLİĞİ ANCAK GERÇEK DAĞITIM ORTAMINDA DOĞRULANABİLİR**

**Adım 18c'de öğrenilenler**
- ⛔ **ÖLÇÜM YAPMADAN ÖNCE PORTU BOŞALT** (`lsof -ti:3000 | xargs kill -9`)
- ⛔ **KORUNAN SAYFA `page.goto`'ya `200` DÖNDÜRÜYOR** → `expectRoute`
- ⚠️ **CHROME'UN AĞ KISITI ANA BELGEYE UYGULANMIYOR**
- ⚠️ **`tsx` İLE KOŞULAN BETİKTE `page.evaluate` İÇİNE İSİMLİ FONKSİYON YAZMA**
- ⚠️ **`encodedBodySize` GZİP'Lİ BOYUTTUR**
- ⚠️ **`requestfailed` OLAYI İPTAL EDİLEN ÖN-YÜKLEMELERİ DE SAYIYOR**
- ⚠️ **Next 16 + Turbopack BUILD ÇIKTISINDA BOYUT SÜTUNU YOK**
- ⚠️ **`fish` KABUĞUNDA `2>&1`'İ KAÇIRMA**

**E2E koşarken**
- ⚠️ **`layout.spec.ts` → "hiçbir sayfa yatay kaydırma oluşturmaz" YÜKE DUYARLI.**
  2026-08-13'te makine yükü ~3.5 iken düştü (önce ölçüm, sonra `ERR_ABORTED`),
  yük düşünce **tek başına yeşil geçti**. Testin kendi yorumunda da yazıyor.
  Kırmızı görürsen ÖNCE `uptime`'a bak
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA**
- ⚠️ **PLAYWRIGHT SONRASI `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR** → önce `npm run build`
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak (< 2.5)
- ⚠️ **LOCAL'DE İKİ İŞÇİYLE KOŞARKEN `hospital.spec.ts` DÜŞEBİLİYOR** → `CI=1`
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş.
  **Bir testin düşmesini koda yormadan ÖNCE kaç kez koştuğuna bak**
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: `sessionToken` = SHA-256 özeti,
  çerez `bb_session`
- ⚠️ **HIZ SINIRINI SAYAÇ SİLEREK DEĞİL, TAZE HEDEF KULLANARAK ÇÖZ.**
  `otp_send:` öneki kayıt ve şifre sıfırlamayla PAYLAŞILIYOR
- ⚠️ **E2E SPEC'İ `serverEnv` OKUYAN BİR MODÜLÜ IMPORT EDEMEZ**
- **E2E'nin ürettiği veriyi temizle — ama TOHUM VERİSİNİ ONAR, SİLME**
- **Sipariş temizliğinde SIRA:** `refund → orderItem → order → notification →
  payment → cartItem → cart`. **Üyelikte:** `membershipPayment → membership →
  notification → savedCard`. **Teşkilatta:** önce `user`, sonra `staffMember`,
  sonra `orgUnit`. ⚠️ `consentRecord` ve `auditLog` KULLANICIDAN ÖNCE silinmeli
- ⚠️ **SİLİNMİŞ HESABI E-POSTASINDAN BULAMAZSIN** — silme `users.email`i NULL yapıyor
- ⚠️ **SAHTE (decoy) OTP KAYITLARI `userId` TAŞIMAZ**; `registrationId`'den yakala

**Vitest**
- ⚠️ **`vi.resetModules()` + dinamik `import` ile `instanceof` ÇALIŞMAZ** → hata KODUNA bak
- ⚠️ **`vi.resetModules()` KULLANAN TESTLERDE LOG SATIRINI METİN OLARAK
  KARŞILAŞTIRMA** — satır JSON; `JSON.parse` edip ALANLARINA bak
- ⛔ **BİR TEST DOSYASINDA HEM `vi.mock("@/config/env")` HEM GERÇEK `__testing`
  KULLANILAMAZ**
- ⚠️ **`NEXT_PUBLIC_ENV_LABEL`'i "production" yapmak env.ts'in TÜM tutarlılık
  kurallarını tetikliyor** — modülü mock'la
- ⚠️ **`z.coerce.boolean()` ORTAM DEĞİŞKENİNDE KULLANILMAZ:** `"false"` dizesini
  `true` sayar. `z.enum(["true","false"])` + `transform`

**Playwright seçicileri**
- **`getByRole("button", { name: "Ara" })` ÇOK EŞLEŞİR** → `exact: true` şart
- ⚠️ **`getByText(BAŞLIK)` AÇIKLAMA METNİYLE DE EŞLEŞİYOR** → `{ exact: true }`
- ⚠️ **`exact: true` BİLE YETMEYEBİLİR** → aramayı BÖLGEYE sınırla
- ⚠️ **ÇIPLAK `getByRole("listitem")` SAYFA İSKELETİNİ DE SAYAR**
- ⚠️ **ÇIPLAK METİN DÜĞÜMÜ `getByText(…, { exact: true })` İLE BULUNAMAZ**
- ⚠️ **AYNI METNİ İKİ BAŞLIKTA VEYA İKİ ERİŞİLEBİLİR ADDA KULLANMA**
- **Kapalı `<details>` içindeki öğe GÖRÜNMEZ sayılır**
- ⚠️ **Yasal belgeler BİRBİRİNE de bağlantı veriyor** → `getByRole("navigation")`

**Chrome DevTools MCP ile elle test**
- ⛔ **ÖNCE ARACIN O İŞİ ÖLÇEBİLDİĞİNİ KANITLA.** Turnstile `navigator.webdriver`
  yüzünden otomasyon tarayıcısında HİÇ açılmıyor. ⚠️ Ayırt edici işaret:
  **ürün hatası HATA ÜRETİR, araç engeli SESSİZDİR**
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR** → `evaluate_script`
- ⚠️ **`document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** → `isolatedContext`
- ⚠️ **React kontrollü `<input>`'a `value` ATAMAK YETMİYOR**
- ⚠️ **macOS'ta pencere 375px'e İNMİYOR** (alt sınır ~485px) → `mobile-375` projesi
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI gösteriyor**
- ⚠️ **`get_network_request` VE EKRAN GÖRÜNTÜSÜ dosya yolu ÇALIŞMA ALANI İÇİNDE olmalı**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** (#84)
- **Sunucuda çizilen sayfa istemci yazdıktan sonra tazelenmez** → `router.refresh()`.
  ⛔ **Ama hesabı SİLDİKTEN sonra çağırma**
- **Formu sıfırlamak için bileşene `key` ver**
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ** → `Referer`
- ⛔ **DERLEME TURBOPACK İLE YAPILIYOR** — `webpack.*` SDK seçenekleri SESSİZCE
  ETKİSİZ kalır (borç #96 · muhtemelen #108'in de sebebi)

**Dosya indirme**
- ⛔ **DÜZ `<a download>` KULLANMA** · **`revokeObjectURL` ŞART** ·
  **DOSYA ADINI SUNUCU BAŞLIĞINDAN OKUMA**

**Test veritabanı temizliği**
- **`tests/db/helpers.ts` temizliği KİMLİK ÖNEKİNE GÜVENEMEZ** — `userId`/
  `anonymousId` üzerinden yakala

**Dış servis çağrısı**
- **`429` YENİDEN DENENMEZ** · **Önbelleğe HAM GÖVDE yazma** ·
  **Önbellekten OKURKEN de Zod çalıştır**

**Dosya yükleme**
- **İSTEMCİNİN SÖYLEDİĞİ TÜRE GÜVENME** — bayt imzasından doğrula
- **`next/image` YETKİLİ uçtan görsel çekerken `unoptimized` ŞART**

**Türkçe metin**
- **Prisma'nın `contains` + `mode: "insensitive"` KULLANMA** → `findIdsMatchingQuery`
- **`LIKE` deseni ŞART olarak `toLikePattern`'den geçer**

**Para**
- **Her yerde tam sayı kuruş** · **Tutar İSTEMCİDEN ALINMAZ** ·
  **DÖVİZ KURU PARA DEĞİLDİR**

**Zaman ve durum**
- **Sipariş, üyelik ve destek talebi durumları KOLONDA DEĞİL** (ADR-013)
- **Takvim ayı ekle, 30 gün EKLEME** (`addCalendarMonths`)
- **Süreye bağlı her sorgu ZAMAN KOŞULU içermek zorunda** (ADR-007)
- ⚠️ **Türkiye'nin UTC farkı `slot-calendar.ts` içinde SABİT +3**

**Eşzamanlılık**
- **"Önce oku, boşsa yaz" İKİ ADIMDIR ve yarışı çözmez** → tek koşullu yazma +
  etkilenen satır sayısı
- ⚠️ **TRANSACTION İÇİNDE `create` KULLANMA** → `createMany({skipDuplicates})`
- **Korumayı yazdıktan sonra geçici kaldırıp testin KIRMIZIYA döndüğünü GÖR**

**Arayüz**
- **Dark mode SINIF tabanlı** (`.dark`), `next-themes` BİLEREK kullanılmıyor
- **shadcn'de Dialog YOK ve bilerek eklenmedi** — onay SATIR İÇİ
- **Olmayan renk token'ı uydurma.** `warning` YOK, **`success` de YOK**
- Tailwind v4 kanonik biçimi `aspect-4/3` ve `wrap-break-word`
- Dokunma hedefleri en az 44px (`min-h-11`) · **Gövde metni en az 16px**
- **Geniş tablo `overflow-x-auto` sarmalayıcıya girer** + `tabIndex={0}`
- ⚠️ **ÇEREZ BANDI SAYFA ALTINDAKİ İÇERİĞİ ÖRTEBİLİYOR** (borç #91)

**Bağımlılık**
- **`shadcn add <bileşen>` İSTENMEYEN PAKET GETİREBİLİR** → `git diff package.json`
- **Yeni paket sonrası `npm audit` KOŞ**

**Prisma 7**
- `datasource` bloğunda `url` / `directUrl` **yok** (ADR-008)
- ⚠️ **İstemci `@prisma/client`'tan DEĞİL `@/generated/prisma/client`'tan gelir**
  ve `PrismaPg` adaptörü verilmek zorunda
- ⚠️ **`migrate dev` BU ORTAMDA ETKİLEŞİMLİ ÇALIŞAMIYOR** — migration klasörünü
  elle oluşturup `migrate deploy` + `generate` koş
- **ENUM DEĞERİ EKLEMEK GERİYE UYUMLU ama TEK YÖNLÜDÜR**
- **`prisma migrate reset --force` bayrağı yutuluyor** → `docker compose down -v`
- ⚠️ **`auditLog` modelinde `metadata` ALANI YOK** — `entityType` ve `entityId` var

**Yayın**
- **Neon uykudayken deploy PATLIYOR** (`P1001`). ⛔ **Çözüm ÖNCE veritabanını
  uyandırmaktır**, yeniden dağıtmak değil: o ortamın çalışan bir dağıtımındaki
  `/api/health` ucuna istek at (2026-09-21'de yaşandı: preview health 4,7 sn'de
  uyandı, `db: ok`). ⭐ **Sonra yeniden tetiklemenin GİRİŞSİZ yolu: dala boş
  commit** (`git commit --allow-empty -m "chore: retrigger preview deploy…"` +
  push) — Vercel Git entegrasyonu yeni dağıtım açar, PR kontrolü güncellenir,
  squash merge'de tarihçeden düşer. `npx vercel redeploy` bu Mac'te ÇALIŞMIYOR:
  Vercel CLI kimliksiz (cihaz girişi istiyor, ajan yapamaz; hesabın giriş
  yöntemi kayıtlı değil). Kullanıcı bir gün giriş yaparsa reçete geri döner —
  o zaman ⛔ **hedefin `Preview` olduğunu ÖNCE doğrula.** Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**
- ⛔ **UTC 00:00–00:59 = TÜRKİYE 03:00–03:59 ARASINDA MERGE ETME** — cron penceresi; saat verirken TR/UTC belirt

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ**
- ⛔ **AÇIK BİR PR VARKEN DAL AÇMA; önce onu merge et.** Çakışan bir PR'da
  GitHub `refs/pull/<N>/merge` üretemiyor ve `pull_request` iş akışları HİÇ
  BAŞLAMIYOR — **hata SESSİZ**. Teşhis: `gh pr view <N> --json
  mergeable,mergeStateStatus`. Çözüm (force-push YOK):
  `git merge origin/main` → çakışmayı çöz → commit → push

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. ⚠️ **`npx vercel` bu Mac'te
  KİMLİKSİZ** (2026-09-21): her komut cihaz girişi (OAuth) akışı başlatıyor ve
  asılı kalıyor — `ls`, `inspect`, `redeploy` hiçbiri çalışmaz; `timeout` ile
  koştur, girişi kullanıcıya bırak. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → `npx tsx` + Prisma betiği (**proje kökünde**, `.mts`,
  commit edilmeden SİLİNİR). `--env-file=.env` ile koştur
- ⚠️ **ESLint geçici `.mts` betiklerdeki `console.log`'u da yakalıyor** →
  `console.error` kullan veya betiği lint'ten önce sil
- ⚠️ **`npx tsx -e` İLE `src/features/api-docs/registry`'Yİ İÇE AKTARMA** —
  ortam doğrulaması yüzünden ASILI KALIYOR. Kütüğü statik olarak (regex ile)
  oku ya da vitest içinden çalış
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- **`.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır**
- Uzun süren işlerde `caffeinate -dimsu &`; **oturum bitince `pkill caffeinate`**

## KOMUTLAR

**Denetim kapısını CI ile aynı komutla koşturma:**
`npm audit --omit=dev --audit-level=high` — çıkış kodu 0 olmalı

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · test:quality · lint · typecheck · format · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**Kural raporu (oturum sonu, `15` → "KURAL RAPORU"):**
`node "$(ls -d ~/.claude/plugins/cache/bariskose-skills/proje-kiti/*/ | sort -V | tail -1)hooks/kural-rapor.mjs" benim-belediyem --son 1`

**Yanıt sözleşmesi kapısını tek başına koşturma:**
`npx vitest run tests/unit/api-docs-response.test.ts tests/unit/api-response-contract.test.ts`

**Sürümleme kapısını tek başına koşturma:**
`npx vitest run tests/unit/api-versioning.test.ts tests/unit/api-deprecation.test.ts`

**Güvenlik başlıkları kapısını tek başına koşturma:**
`lsof -ti:3000 | xargs kill -9`, sonra
`CI=1 npx playwright test tests/e2e/guvenlik-basliklari.spec.ts --project=desktop-chrome`

**API belgesini doğrulama:**
`npm run build && npm run start`, sonra
`curl -s -o /tmp/docs.json http://localhost:3000/api/docs`, sonra
`npx --yes @redocly/cli@latest lint /tmp/docs.json`

**Planlı görevi elle tetikleme (local):**
`npm run build && npm run start`, sonra
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`

**E2E'yi elle koşturma sırası:** `rate_limit_counters`'ı boşalt → `uptime` bak
(yük < 2.5) → portu boşalt (`lsof -ti:3000 | xargs kill -9`) → `CI=1 npx
playwright test`. **Sunucuyu SEN başlatma.**
⚠️ Sayaç silme: `docker exec benim-belediyem-db psql -U belediye -d
benim_belediyem -c "DELETE FROM rate_limit_counters;"` (kullanıcı `postgres` DEĞİL)

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. ⭐ **Anlatım kuralı 2026-09-20'de değişti** (kit
3.15.1, `11-agent-workflow.md` → "HER KAVRAM ÖĞRETİLİR"): *"en fazla 5 madde"*
KALKTI. Artık işe yeni başlamış bir junior'a ders anlatır gibi — sorunla başla,
tek örneği baştan sona taşı, ilk geçen her terimi geçtiği yerde aç, sonunda
kararı veren soruyu bırak. **Uzunluk sınırı yok, eksiklik sınırı var.**
Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde **"emin değilim"**
de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur.
⛔ **Mühendislik tercihini bana menü olarak sunma — kararı sen ver.**
