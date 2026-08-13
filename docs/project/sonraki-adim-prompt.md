# Sonraki oturum için hazır prompt — borç #107, sonra adım 19 (Expo mobil)

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Sonraki adım bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde **borç #103 (API sürümleme) bitti**. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/decisions/ADR-020-api-surumu-yol-segmentinde.md` — ⭐ **YENİ.**
  Sürüm neden yolda, hangi beş uç neden sürümsüz
- `docs/project/roadmap.md` — teknik borç listesi
- `docs/standards/03-api-guidelines.md` (yeni "Sözleşme ömrü" bölümleri) +
  `docs/standards/11-agent-workflow.md` (⭐ yeni "MÜHENDİSLİK SEÇİMİ
  KULLANICIYA DEVREDİLMEZ" bölümü)

## ⛔ İLK İŞ: DURUM BÖLÜMÜNE İNANMA, ÖLÇ

`15-oturum-devri.md` kuralı: bu dosyanın DURUM bölümü **merge'den önceki
dünyayı** anlatıyor olabilir, çünkü commit kapısında beklerken yazılıyor.

**İlk üç komut:**

```
git log --oneline -5
git status
gh pr list
```

Depoda görülen, dosyada yazandan üstündür. Çelişki bulursan **söyle.**

## ⭐ EN ÖNEMLİ YENİ KURAL — 2026-08-13

Proje sahibi mühendislik seçeneklerinin kendisine **menü olarak sunulmasını
istemiyor.** Kararı ajan verir; ölçüt: *"bu ürünü gerçekten kullanan bir
büyükşehir belediyesi ve nöbetçi ekibi için sektörde yerleşik pratik hangisi?"*

- ⛔ **"ADR gerektirir" ≠ "kullanıcıya sor."** ADR kararın **yazılmasını** şart
  koşar, kimin verdiğini değil
- **İş gereksinimi** (iptal süresi kaç saat?) ve **dış dünya** (panelde ne var?)
  soruları kullanıcıya gider. **Mühendislik tercihi** (sürümleme biçimi, index,
  cursor mu offset mi) ajana aittir
- ⚠️ **Ayırt edici test:** cevaplamak için kod okumak veya sektör pratiğini
  bilmek gerekiyorsa, o soru sorulmamalıydı
- Kural `11-agent-workflow.md`'de ve kitte **1.16.0**'da

## DURUM

Roadmap adım **0 → 18d bitti**. Borç **#103 ödendi.** Kalan: borç **#107**,
sonra **adım 19 (Expo mobil)**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- ⛔ **#103 DALI HENÜZ MERGE EDİLMEDİ.** `feature/api-versioning` dalı commit
  onayı bekliyor. `git log --oneline -3` ile teyit et — merge edildiyse bu satır
  eskimiştir
- ✅ Adım 18d canlıda (`a07c99d`), borç #115 ödendi (`d281935`), #113 kapandı
- ✅ **CRON'UN ÇALIŞTIĞI KANITLANDI** — production denetim kaydında 12 Ağustos
  00:40:53–00:40:59 UTC arasında 9 adet `scheduled_task_run`. Bir daha sorgulama
- Gerçek kullanıcı 0 · Sentry canlıda ve uçtan uca doğrulanmış

## 📌 BORÇ #103'TE NE YAPILDI

**36 iş ucu `/api/v1/` altına taşındı**, 5 uç bilinçli olarak sürümsüz bırakıldı.

- ⭐ **Karar ezberden `/v1/` eklemek DEĞİLDİ.** Kamu sektörü için yazılmış
  [GOV.UK API standardı](https://www.gov.uk/guidance/gds-api-technical-and-data-standards)
  sürümü URI'ye koymayı söylüyor ve başlık/medya tipi tabanlı sürümleme için
  açıkça *"avoid these approaches"* diyor — proxy ve güvenlik duvarları
  engelleyebiliyor
- **Belirleyici gerekçe:** başlığı göndermeyi unutan istemci `200` + **yanlış
  sürüm** alır (sessiz); yanlış yola giden istemci `404` alır (gürültülü)
- **Eski adresler takma ad olarak BIRAKILMADI** — koruyacağı tüketici yok
- **`src/lib/api-deprecation.ts`** yazıldı: `Deprecation` + `Sunset` + `Link`
- **15 yeni test** (`api-versioning` 5 + `api-deprecation` 10), üç mutasyonla
  kanıtlandı

### ⛔ SÜRÜMSÜZ KALAN BEŞ UÇ — TAŞIMA

Ölçüt: *adresini bizim dışımızda biri sabitlemişse sürümlenmez.*

| Uç | Kim sabitlemiş |
|---|---|
| `/api/health` | İzleme, duman testi, README, CLAUDE.md §5.9 |
| `/api/cron/daily` | `vercel.json`. ⛔ Taşımak görevi **SESSİZCE** durdurur |
| `/api/docs` | Belgenin kendisi |
| `/api/auth/google/callback` | ⛔ Google Cloud paneli — taşımak canlı girişi kırar |
| `/api/mock-kps/identity-queries` | Bir **üçüncü tarafın** API'sini taklit ediyor |

⚠️ `/api/auth/google` (başlangıç) **taşındı**, `callback` taşınmadı. Google
yalnızca callback'i biliyor.

### ⭐ #103'ÜN ÜÇ DERSİ

1. ⛔ **`Deprecation` BİR HTTP-DATE DEĞİLDİR.** RFC 9745 §2 onu Structured Field
   Date olarak tanımlıyor: `@<unix-saniye>`. `Sunset` ise HTTP-date (RFC 8594).
   İkisini karıştırmak **hiçbir yerde yakalanmaz**: başlık yazılır, `200`
   döner, istemci okuyamaz. Bu yüzden mekanizma ilk emeklilikten ÖNCE yazıldı
2. ⭐ **BİR İSTİSNAYI GEREKÇESİNE BAĞLA, YOKSA İDDİA OLARAK KALIR.** "Bu uç
   sürümsüz çünkü adresi panelde kayıtlı" cümlesi test edilmeden bir iddiadır.
   Kapı artık cron yolunu `vercel.json`'dan, callback adresini
   `GOOGLE_CALLBACK_PATH`'ten okuyup karşılaştırıyor
3. ⚠️ **`fish` KABUĞU BASH SÖZDİZİMİNİ SESSİZCE YUTUYOR.** `FILES=$(...)` +
   `for f in $FILES` hiçbir dosyayı değiştirmedi ama hata da vermedi; "122 dosya
   işlendi" yazıp çıktı. Çok dosyalı toplu değişikliği `bash <betik.sh>` ile
   koştur ve **sonucu ayrıca ölç** (`grep -c`). ⚠️ macOS bash 3.2'de `mapfile`
   yok

## ⚠️ İKİ KONU PROJE SAHİBİNİN KARARINI BEKLİYOR

⚠️ **Bunlar mühendislik tercihi DEĞİL** — biri dış servise bağlanma (#23), biri
kullanıcı deneyimi/maliyet takası (#89). Bu yüzden hâlâ ona sorulur.

- **#23 sızmış şifre kontrolü:** (a) HIBP ekle, (b) yerel listeyi büyüt, (c) bırak
- **#89 Google hesabında ikinci kanıt:** (a) "yeniden kimlik doğrula" OAuth modu,
  (b) bırak

## YAPILACAK — ÖNCE #107, SONRA adım 19

1. **#107 — yanıt gövdelerinin şeması belgelenmedi.** `/api/docs` istek tarafını
   gerçek Zod şemalarından türetiyor ama yanıt tarafında yalnızca zarfı
   belgeliyor. ~40 route'a dokunmayı gerektirir; `ok<T>()` jenerik olduğu için
   `T` çalışma anında okunamıyor. **ADR-020'nin tamamlayıcısı:** sürüm segmenti
   sözleşmenin **adresini** sabitledi, **içeriğini** değil
2. **Sonra adım 19.** ⚠️ Tek satır ama devasa — 17 ve 18 nasıl a/b/c/d'ye
   bölündüyse 19 da bölünmeli. Kod yazmadan önce **plan sun** ve bölünmeyi öner

## ⛔ PROJE SAHİBİNE İŞ VERME — HEPSİ BİLİNÇLİ ERTELENDİ

2026-08-12'de proje sahibi açıkça şunu söyledi: **"benim yapmam gerekenleri
yine sonraya bırak."** Aşağıdakilerin hiçbirini oturumun başında açma,
hatırlatma, iş listesine koyma.

| Ne | Durum |
|---|---|
| **#103'ün preview'da elle kontrolü** | ⏸️ **2026-08-13'te bilinçli olarak ertelendi.** Onaylarken "benim kontrol etmem gerekenleri sonraya bırak" dedi. Yapılmayan tek şey: preview URL'de market → sepete ekle → sepet akışını tıklamak. ⚠️ Otomatik taraf zaten kanıtlı (825+344+342 test, gerçek tarayıcıda `POST /api/v1/carts/current/items` → `201`, ürün sepette göründü). ⛔ Bunu oturum başında hatırlatma; **yalnızca canlıda sepet/market ile ilgili bir arıza görülürse** "şu kontrol hiç yapılmamıştı" diye hatırlat |
| Telefondan toplu elle test | 15. kez ertelendi. ⛔ Listeyi yeniden sunma, tek madde önerisini de tekrarlama |
| `proje-kiti`'nin Windows makineye kurulumu | Ertelendi. Gerektiğinde: `/plugin marketplace add bariskose9/bariskose-skills` → `/plugin install proje-kiti@bariskose-skills` (market **bariskose-skills**, plugin **proje-kiti**, güncel sürüm **1.17.0**) |
| Cloudflare panelinde preview alan adı yetkilendirme (#114) | ⚠️ İSTEĞE BAĞLI, zorunlu değil |
| #23 ve #89 | Kararı bekliyor, acelesi yok |

## ✅ CRON ÇALIŞIYOR — KANITLANDI, BİR DAHA SORGULAMA

⛔ **UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA** —
o pencere cron'un penceresi.

**Production veritabanına okuma erişimi (gerekirse):**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **proje
kökünde** `.mts` olmalı, **yalnızca okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT — sürüm 1.17.0 yayınlandı, kurulu sürüm 1.11.0

✅ **KAPI 8 GEÇİLDİ, diff ile kanıtlandı (iki dosyada da çıktı boş).**

- **1.16.0** (`0ab8066`) — `11-agent-workflow.md`: mühendislik seçimi ajana aittir
- **1.17.0** (`ca78ac6`) — `03-api-guidelines.md`: sürüm yolda taşınır · adresi
  dışarıda sabitlenmiş uç sürümlenmez · `Deprecation` HTTP-date değildir

⛔ **PROJE SAHİBİNİN KURULU SÜRÜMÜ 1.11.0 — ESKİ (altı sürüm geride).**
Yalnızca `/yeni-proje` veya `/kit-senkron` çalıştırılacağı gün "önce `/plugin`
ekranından kiti güncelle" de. **Bilinçli olarak ertelendi; kendiliğinden
hatırlatma.**

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu AÇIK BİR SORU.** Sürüm 1.7.0 istisnayı bölüm
seviyesine indirdi (`<!-- ⛔ SENKRON SINIRI -->`) ama projedeki fark **sınırın
ÜSTÜNDE** kalıyor (satır 19-68). Ya sınır yanlış yerde ya da o metin sınırın
altına taşınmalı. **Karar hâlâ bekliyor.** (18 dosyadan 17'si birebir aynı.)

⚠️ Kit deposunu karşılaştırmadan önce daima `git fetch` + `git pull` yap.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`src/lib/api-deprecation.ts`** — YENİ. Bir ucu emekliye ayırırken
  **buradan geç**, başlığı elle yazma
- ⭐ **`tests/unit/api-versioning.test.ts`** — YENİ. Yeni bir iş ucu `/api/v1/`
  altına açılır; sürümsüz istisna eklemek **bilinçli** bir karardır
- ⭐ **`src/proxy.ts`** — nonce üretimi + tüm CSP politikası tek yerde. **Yeni
  bir dış alan adı eklenirse CSP'ye buradan yazılır** — `next.config.ts`'e
  İKİNCİ bir CSP satırı EKLEME
- ⭐ **`tests/e2e/guvenlik-basliklari.spec.ts`** — **Yeni bir genel sayfa
  eklersen `korunmasiSartYollar` listesine de yaz**
- ⭐ **`tests/unit/workflows.test.ts`** — Yeni action eklersen tam SHA + `# vX.Y.Z`
- **`tests/quality/`** — bütçe eşikleri, performans ve erişilebilirlik kapıları
- **`src/features/api-docs/`** — kütük + üretici + sapma kapıları. **Yeni bir uç
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

**#103'te yeni öğrenilenler**
- ⚠️ **`fish` KABUĞU BASH SÖZDİZİMİNİ SESSİZCE YUTUYOR** — `VAR=$(...)` ve
  `for f in $VAR` hata vermeden HİÇBİR ŞEY yapmıyor. Toplu değişikliği
  `bash <betik>` ile koştur, sonucu `grep -c` ile ÖLÇ
- ⚠️ **macOS bash 3.2'de `mapfile` YOK** — dosya listesini geçici dosyaya yaz
- ⚠️ **`git checkout <dosya>` HENÜZ COMMIT EDİLMEMİŞ dosyayı geri getiremez**
  ("did not match any file(s) known to git"). Mutasyon deneyini yeni bir
  dosyada yapıyorsan geri almayı ELLE planla
- ⚠️ **`docker exec ... psql -U postgres` ÇALIŞMIYOR** — kullanıcı `belediye`
  (`.env`'deki `DATABASE_URL`'den oku)
- ⚠️ **`operationId`'de sürüm segmenti KALIR** — `v2` geldiğinde
  `postV1Addresses` ile `postV2Addresses` çakışmasın diye

**Adım 18d'de öğrenilenler**
- ⛔ **CSP İNLINE STİLİ SESSİZCE BLOKLUYOR** — konsola tek satır düşmüyor.
  Doğrulama `getComputedStyle` ile yapılmak zorunda
- ⚠️ **NEXT 16'DA ARA KATMANIN ADI `middleware` DEĞİL `proxy`**
- ⚠️ **TARAYICI NONCE'U DOM'DAN GİZLİYOR** — `getAttribute("nonce")` boş döner,
  değer yalnızca `.nonce` property'sinde
- ⚠️ **ELLE YAZILAN `<script>`'E NEXT NONCE TAKMIYOR**
- ⚠️ **`'nonce-…'` VARKEN `'unsafe-inline'` YOK SAYILIR** (CSP kuralı)
- ⚠️ **İKİ `Content-Security-Policy` BAŞLIĞI = KESİŞİM**
- ⚠️ **`argon2` MALİYETİ GİRDİ UZUNLUĞUNDAN BAĞIMSIZ** (ölçüldü)
- ⚠️ **GEÇİCİ `.mts` BETİK PROJE KÖKÜNDE OLMALI** — `/tmp`'de `node_modules`
  çözümlenmiyor
- ⚠️ **CHROME DEVTOOLS EKRAN GÖRÜNTÜSÜ ÇALIŞMA ALANI DIŞINA YAZILAMIYOR**
- ⭐ **BİR CSP DEĞİŞİKLİĞİ ANCAK GERÇEK DAĞITIM ORTAMINDA DOĞRULANABİLİR** —
  `vercel.live` bloklanması 1507 testin hiçbirine düşmedi, yalnızca preview
  konsolunda vardı

**Adım 18c'de öğrenilenler**
- ⛔ **ÖLÇÜM YAPMADAN ÖNCE PORTU BOŞALT** (`lsof -ti:3000 | xargs kill -9`)
- ⛔ **KORUNAN SAYFA `page.goto`'ya `200` DÖNDÜRÜYOR** → `expectRoute`
- ⚠️ **CHROME'UN AĞ KISITI ANA BELGEYE UYGULANMIYOR**, alt kaynaklara uygulanıyor
- ⚠️ **`tsx` İLE KOŞULAN BETİKTE `page.evaluate` İÇİNE İSİMLİ FONKSİYON YAZMA**
- ⚠️ **`encodedBodySize` GZİP'Lİ BOYUTTUR**
- ⚠️ **`requestfailed` OLAYI İPTAL EDİLEN ÖN-YÜKLEMELERİ DE SAYIYOR**
- ⚠️ **Next 16 + Turbopack BUILD ÇIKTISINDA BOYUT SÜTUNU YOK**
- ⚠️ **`fish` KABUĞUNDA `2>&1`'İ KAÇIRMA** (`2>\&1` yazma)

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA**
- ⚠️ **PLAYWRIGHT SONRASI `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  `NEXT_PUBLIC_*` DERLEME ANINDA gömülüyor → önce `npm run build`
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak (< 2.5)
- ⚠️ **LOCAL'DE İKİ İŞÇİYLE KOŞARKEN `hospital.spec.ts` DÜŞEBİLİYOR** →
  `CI=1 npx playwright test` ile doğrula
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş.
  **Bir testin düşmesini koda yormadan ÖNCE kaç kez koştuğuna bak**
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (tarihler kayıyor). Commit öncesi `git status`'a bak ve geri al
- **HER PLAYWRIGHT PROJESİNE AYRI PAYLAŞILAN KAYNAK VER**
- ⚠️ **E2E KENDİ KULLANICISINI KURABİLİR**: oturum satırını yazıp çereze ham
  jetonu koymak yeterli (`sessionToken` = SHA-256 özeti, çerez `bb_session`)
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
- ⚠️ **`vi.resetModules()` + dinamik `import` ile `instanceof` ÇALIŞMAZ** →
  hata KODUNA bak
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
  yüzünden otomasyon tarayıcısında HİÇ açılmıyor — sorun üründe değil araçtaydı.
  ⚠️ Ayırt edici işaret: **ürün hatası HATA ÜRETİR, araç engeli SESSİZDİR**
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR** → `evaluate_script`
  içinden gerçek DOM `click()` çağır
- ⚠️ **`document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** (`httpOnly`) →
  `new_page` çağrısına `isolatedContext` ver
- ⚠️ **React kontrollü `<input>`'a `value` ATAMAK YETMİYOR** — React'in kendi
  setter'ını çağır + `new Event("input",{bubbles:true})`
- ⚠️ **macOS'ta pencere 375px'e İNMİYOR** (alt sınır ~485px) → `mobile-375`
  Playwright projesiyle ölç
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
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ** → `Referer` (ama aynı alan
  adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)
- ⛔ **DERLEME TURBOPACK İLE YAPILIYOR** — `webpack.*` altındaki SDK seçenekleri
  SESSİZCE ETKİSİZ kalır (borç #96 · muhtemelen #108'in de sebebi)

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
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — çözüm
  `npx vercel redeploy <dagitim-url> --scope barisss`. Merge sonrası
  `/api/health` içindeki `commit` alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**
- ⛔ **UTC 00:00–00:59 ARASINDA MERGE ETME** — o pencere cron'un penceresi

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ**
- ⛔ **AÇIK BİR PR VARKEN DAL AÇMA; önce onu merge et.** Çakışan bir PR'da
  GitHub `refs/pull/<N>/merge` üretemiyor ve `pull_request` iş akışları HİÇ
  BAŞLAMIYOR — **hata SESSİZ**. Teşhis: `gh pr view <N> --json
  mergeable,mergeStateStatus`. Çözüm (force-push YOK):
  `git merge origin/main` → çakışmayı çöz → commit → push

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → `npx tsx` + Prisma betiği (**proje kökünde**, `.mts`,
  commit edilmeden SİLİNİR). `--env-file=.env` ile koştur
- ⚠️ **ESLint geçici `.mts` betiklerdeki `console.log`'u da yakalıyor** →
  `console.error` kullan veya betiği lint'ten önce sil
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- **`.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır**
- Uzun süren işlerde `caffeinate -dimsu &`; **oturum bitince `pkill caffeinate`**.
  ⚠️ Uzun beklemeden sonra `pgrep -x caffeinate` ile hâlâ ayakta mı diye BAK

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · test:quality · lint · typecheck · format · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**Sürümleme kapısını tek başına koşturma:**
`npx vitest run tests/unit/api-versioning.test.ts tests/unit/api-deprecation.test.ts`

**Güvenlik başlıkları kapısını tek başına koşturma:**
`lsof -ti:3000 | xargs kill -9`, sonra
`CI=1 npx playwright test tests/e2e/guvenlik-basliklari.spec.ts --project=desktop-chrome`

**CSP'yi elle görme:**
`curl -sI http://localhost:3000/ | grep -i content-security-policy`

**Bütçe kapısını tek başına koşturma:**
`lsof -ti:3000 | xargs kill -9`, sonra `npm run test:quality`

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

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
⛔ **Mühendislik tercihini bana menü olarak sunma — kararı sen ver** (yukarıdaki
"EN ÖNEMLİ YENİ KURAL").
