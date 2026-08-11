# Sonraki oturum için hazır prompt — adım 18d

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 18d bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **18d**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/roadmap.md` — adım 18d satırı ve teknik borç listesi (#108-#110 YENİ)
- `docs/standards/09-ci-cd-deploy.md` — ⭐ **"cırcır (ratchet)" bölümü YENİ**
- `docs/standards/06-testing.md` — ⭐ **"yeşil test yanlış şeyi ölçüyor olabilir" YENİ**

## ⛔ İLK İŞ: DURUM BÖLÜMÜNE İNANMA, ÖLÇ

`15-oturum-devri.md`'ye bu adımda yazılan yeni kural: bu dosyanın DURUM
bölümü **daima merge'den önceki dünyayı** anlatır, çünkü commit kapısında
beklerken yazılıyor. Geçen oturum tam da bunu yaşadı — dosya "18b merge
edilmedi, `main` `ab3c627`" diyordu, oysa `main` `cbf1a99`'daydı ve hem 18b
hem kit çoktan gitmişti.

**İlk üç komut:**

```
git log --oneline -5
git status
gh pr list
```

Depoda görülen, dosyada yazandan üstündür. Çelişki bulursan **söyle.**

## DURUM

Roadmap adım **0 → 18c bitti**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Adım 18c commit onayı bekliyordu** — dal
  `feature/performans-ve-erisilebilirlik-kapilari`. ⚠️ Yukarıdaki komutlarla
  DOĞRULA, bu satıra güvenme
- Uygulama kodu (`src/`) adım 18c'de **hiç değişmedi** — iş tamamen test,
  CI ve belge tarafında
- Hata takibi (Sentry) canlıda ve uçtan uca doğrulandı (2026-08-11)
- Gerçek kullanıcı 0

## 📌 ADIM 18c'DE NE YAPILDI

`09-ci-cd-deploy.md`'nin üç kapısı (`bundle-size` · `lighthouse` · `axe`)
yazılı bir dilekten CI'da fiilen ölçülen kapıya döndü. Yeni klasör
`tests/quality/`, ayrı Playwright projesi `quality`, tek eşik dosyası
`tests/quality/budget.ts`.

- ⭐ **YALNIZCA BİR PAKET EKLENDİ:** `@axe-core/playwright` (geliştirme
  bağımlılığı, kullanıcıya giden pakete girmiyor, `npm audit` 0 açık).
  **Lighthouse paketi GEREKMEDİ** — ölçüldü, Playwright + Chrome protokolü
  (4 kat CPU kısıtı + Yavaş 4G) yetti
- CI'da **ayrı bir adım**: `npm run test:quality`. `npm run test:e2e` artık
  yalnızca davranış projelerini koşuyor
- Kapılar **mutasyonla kanıtlandı**: bütçe 100 KB'a indirildi → altı sayfa
  kırmızı; `/iletisim`'e `alt`sız görsel eklendi → yalnızca o sayfa
  `critical: image-alt` ile düştü

### ⭐ 18c'NİN ÜÇ DERSİ

1. **DEVRALINAN BİR BORCUN SEBEBİ DE BİR İDDİADIR.** Borç #84 "çerez bandı
   tüm sayfaları dinamik yaptı" diyordu. Mutasyonla ölçüldü: bant tek başına
   hiçbir şeyi statikleştirmiyor, `SiteHeader` de öyle — başlık oturum
   çerezini **adım 4a'dan beri** okuyor. Yanlış sebep, doğru ölçülmüş bir
   soruna yanlış çözüm yazdırır.
2. **`200` DÖNMESİ "DOĞRU SAYFA AÇILDI" DEMEK DEĞİL.** İlk bütçe listesinde
   `/spor-salonu` vardı; personele özel, `guardPage()` yönlendirmesi
   **hidrasyondan sonra** uygulanıyor. Ölçüm sessizce giriş sayfasını ölçtü ve
   `/spor-salonu` "en hızlı sayfa" göründü (240 ms). Çözüm `expectRoute`.
3. ⛔ **AYAKTA KALMIŞ `npm run start` ESKİ YAPIYI SERVİS EDİYOR — VE BU BİR
   MUTASYON DENEYİNİ YANLIŞLIKLA YEŞİL GEÇİRDİ.** `alt`sız görsel eklendi,
   `npm run build` koşturuldu, test yeşil kaldı. Sebep: Playwright
   `reuseExistingServer` ile eski sunucuyu kullandı. **Ölçüm yapmadan önce
   `lsof -ti:3000 | xargs kill -9`.**

## ⚠️ İKİ BÜTÇE HEDEFİ TUTMUYOR — cırcırla kapatıldı (#108, #109)

Kapılar hedefe değil **bugün ölçülen değere** kuruldu. Gerekçe ve ilke
`09-ci-cd-deploy.md` → "Bütçe zaten aşılmışken kapı nasıl kurulur".

| # | Ne | Sayı |
|---|---|---|
| 108 | ⛔ **İlk yük JS bütçesi aşılıyor** — ağırlığın ~150 KB'ı Sentry SDK'sı | 281,7 KB / hedef 200 KB |
| 109 | **LCP kapısı gerçek ağı ölçmüyor** — CI localhost'a bakıyor | local 588 ms / canlı **2844 ms** / hedef 2500 |
| 110 | Değişiklik günlüğünde 17c, 18a, 18b girdisi yok | — |

⛔ **#108 muhtemelen borç #96 ile aynı iş:** Sentry'nin ağaç budama seçenekleri
SDK'da `webpack.` altında, bu proje Turbopack ile derleniyor. **Emin değilim —
doğrulanmadı.** Önce ÖLÇ: budama açılabiliyor mu, açılınca kaç KB düşüyor.

⛔ **#103 ve #107 adım 19 (mobil uygulama) başlamadan ÖNCE ödenmeli.**

## ✅ LİSANS SORUSU KAPANDI (18c) — ve soru YANLIŞ BİLGİYLE sorulmuştu

⛔ **`LICENSE` DOSYASI ZATEN VARDI.** Bir önceki devir notu "depoda `LICENSE`
dosyası yok" diyordu; ajan bunu **doğrulamadan devraldı** ve proje sahibine
yanlış bilgiyle soru sordu. Hata ancak `git status` dosyayı "yeni" değil
"değişti" gösterince yakalandı.

Bu, 18c'nin 1. dersinin ta kendisidir ve ajan onu yazdıktan SONRA yine
düştü: **devraldığın her iddia doğrulanana kadar hipotezdir.** Bir dosyanın
varlığı `ls` ile bir saniyede ölçülür — ölçmeden soru sorma.

Fiilen yapılan iş: MIT metnindeki bozukluk (`OUT OF,` → `OUT OF OR`)
düzeltildi ve lisans `tests/unit/license.test.ts` ile korunuyor.
**Bir daha sorma.** ⚠️ Testin bugün yakalayamadığı boşluk: teknik borç #111.

## ❓ PROJE SAHİBİNE SORULACAK — 18d SONUNDA, TEK CÜMLEYLE

**Toplu elle test listesi** — on birinci kez ertelendi ve proje sahibi
18c'de "kendi yapacaklarımı yine sonraki oturuma ver" dedi, yani bilinçli
olarak bir kez daha ertelendi (sayaç: **12**).

> ⛔ **Oturumun BAŞINDA bu konuyu AÇMA.** Hatırlatma, iş listesine koyma,
> "önce şunu yap" deme. 18d'nin önünde engel değil.
>
> ⛔ Listeyi **yeniden sunma** ve tek madde önerisini de **tekrarlama** —
> ikisi de denendi, ikisi de tutmadı.
>
> ✅ **Adım 18d BİTTİKTEN sonra**, tek seferlik ve tek cümlelik şu kararı sor:
> "bu liste hiç yapılmayacaksa roadmap'ten silelim mi, yoksa 'yapılmadı'
> etiketiyle teknik borç olarak mı bırakalım?" Cevap yine "sonra" olursa
> **ısrar etme**, sayacı bir artır ve geç.

Liste git geçmişinde (`sonraki-adim-prompt.md`, commit `ab3c627`).
**Nerede:** https://benim-belediyem.vercel.app · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → şifre `Test1234!`,
**personel olan** bir hesap seç. ⛔ #11-#16 arası hesaplar production'da YOK.

## ⏰ CRON — 12 AĞUSTOS PENCERESİ KONTROL EDİLMEDİ

11 Ağustos penceresi ölçüldü → **0 kayıt** (`CRON_SECRET` o günün penceresi
geçtikten sonra girilmişti). **12 Ağustos penceresi bu oturumda BAKILMADI.**

**Sonraki oturum:** sorguyu tekrarla. Yine 0 çıkarsa Vercel → Settings →
Cron Jobs → View Logs incelenmeli.

⛔ **UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA.**

**Production veritabanına okuma erişimi:**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
Çıkan adresi `PROD_DATABASE_URL` verip **proje kökünde `.mts`** betik koştur.
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **yalnızca
okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT SÜRÜM 1.12.0 — kapı 8 geçildi

18c'nin dört standart güncellemesi (`06-testing`, `09-ci-cd-deploy`,
`15-oturum-devri`, `16-yeni-proje-kurulumu`) **hem projeye hem kite** yazıldı.
✅ `diff` kanıtı: **18 standart dosyasından 17'si birebir aynı**; tek fark
`00-stack.md` (bilinen/beklenen).

⛔ **PROJE SAHİBİNİN KURULU SÜRÜMÜ 1.11.0 — ESKİ.** Bu kapı 8'in parçası
DEĞİL; yalnızca `/yeni-proje` veya `/kit-senkron` çalıştırılacağı gün
"önce `/plugin` ekranından kiti güncelle" de. **Bilinçli olarak ertelendi;
kendiliğinden hatırlatma.**

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu AÇIK BİR SORU.** Sürüm 1.7.0 istisnayı
bölüm seviyesine indirdi (`<!-- ⛔ SENKRON SINIRI -->`) ama projedeki fark
**sınırın ÜSTÜNDE** kalıyor (satır 19-68): oradaki Auth.js metni bu projeye
özel. Ya sınır yanlış yerde ya da o metin sınırın altına taşınmalı.
Adım 18c bu dosyaya dokunmadı (§7: aynı anda tek modül) — **karar hâlâ bekliyor**.

⚠️ Kit deposunu karşılaştırmadan önce daima `git fetch` + `git pull` yap.

## YAPILACAK — roadmap adım 18d

"Güvenlik denetimi raporu — borç #10 (sıkı CSP), #23, #78, #89 toplu
değerlendirilir"

Dal: `feature/guvenlik-denetimi` (öneri)

### Bu adımda özellikle dikkat
- ⛔ **Borç #99 bu adıma yazılı:** 11 `uses:` satırı tam commit SHA'sına
  çevrilir (yanına `# vX.Y.Z` yorumu) + her iş akışına açık `permissions:`
  bloğu. ⚠️ `e2e.yml` 18c'de değişti, önce onu oku
- **Borç #10 (nonce tabanlı CSP) bir ara katman gerektiriyor** — #97, #102 ve
  #104 de aynı ara katmanla ödenebilir. Dördü tek işte birleşir, ama bu
  adımın kapsamını genişletir: önce ÖLÇ, sonra karar ver
- ⛔ **Yeni bir paket gerekiyorsa proje sahibine SOR** (CLAUDE.md §7). Ama
  önce 18b ve 18c'deki gibi **gerçekten gerekli mi diye ÖLÇ** — iki adımda da
  devir notu "paket gerekir" demişti ve iki adımda da gerekmedi

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`tests/quality/`** — YENİ. Bütçe eşikleri (`budget.ts`), performans ve
  erişilebilirlik kapıları, `expectRoute` yardımcısı.
  **Yeni bir genel sayfa eklersen `accessibility.spec.ts` listesine de yaz**
- **`src/features/api-docs/`** — kütük + üretici + sapma kapıları.
  **Yeni bir uç eklersen kütüğe de yaz, yoksa CI kırmızıya döner**
- **`src/lib/log-redact.ts`** — log, Sentry ve API belgesi aynı süzgeçten geçiyor
- **`src/lib/logger.ts`** · **`src/lib/sentry-options.ts`**
- **`src/lib/http.ts`** — `ok`/`created`/`noContent`/`fail`, tek tip hata biçimi
- **`src/features/staff-verification/`** — iki adımlı doğrulama deseni
- **`src/features/account/`** — geri alınamaz işlem deseni
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** · **`src/features/profile/`**
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`),
  `guardPage()` (⚠️ yönlendirme hidrasyondan SONRA uygulanıyor)
- **`src/features/identity/`** · **`src/features/otp/`** · **`src/features/catalog/`**
- **`src/lib/external-fetch.ts`** — **yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — tembel senkronizasyon
- **`recordAuditLog()`** · **`requireAccess()`** · **`guardPage()`**
- `messages.ts` (tek istisna `messages-legal.ts`) · tasarım token'ları

## TUZAKLAR — daha önce vakit kaybettirenler

**Adım 18c'de yeni öğrenilenler**
- ⛔ **ÖLÇÜM YAPMADAN ÖNCE PORTU BOŞALT** (`lsof -ti:3000 | xargs kill -9`).
  Ayakta kalmış `npm run start` eski yapıyı servis ediyor ve Playwright onu
  `reuseExistingServer` ile kullanıyor — bir mutasyon deneyi bu yüzden
  yanlışlıkla yeşil geçti
- ⛔ **KORUNAN SAYFA `page.goto`'ya `200` DÖNDÜRÜYOR.** Yönlendirme
  hidrasyondan sonra. Ölçüm/denetim yapan test `expectRoute` ile hangi adreste
  olduğunu doğrulamak zorunda
- ⚠️ **CHROME'UN AĞ KISITI ANA BELGEYE UYGULANMIYOR** — alt kaynaklara
  uygulanıyor (ölçüldü: en yavaş kaynak 32 ms → 15 059 ms, ama TTFB 10 ms →
  6 ms). Yani localhost LCP ölçümü gerçek kullanıcıyı temsil etmiyor
- ⚠️ **`tsx` İLE KOŞULAN BETİKTE `page.evaluate` İÇİNE İSİMLİ FONKSİYON
  YAZMA** — esbuild `--keep-names` `__name` yardımcısı enjekte ediyor ve
  tarayıcıda `ReferenceError: __name is not defined` alıyorsun. Düz döngü yaz
- ⚠️ **`encodedBodySize` GZİP'Lİ BOYUTTUR** ama `loadEventEnd`'den sonra gelen
  istekleri saymazsan doğru olur: Next görünürdeki bağlantıları önden indiriyor
- ⚠️ **`requestfailed` OLAYI İPTAL EDİLEN ÖN-YÜKLEMELERİ DE SAYIYOR** —
  `net::ERR_ABORTED` ayıklanmazsa 13 sayfada 367 sahte "başarısız istek" çıkar
- ⚠️ **Next 16 + Turbopack BUILD ÇIKTISINDA ARTIK BOYUT SÜTUNU YOK** ve
  `app-build-manifest.json` de yok — paket boyutu ancak tarayıcıda ölçülür
- ⚠️ **`fish` KABUĞUNDA `2>&1`'İ KAÇIRMA** (`2>\&1` yazma) — `&1` adında bir
  dosya oluşturur ve depoda kalır

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  Doğrusu: portu boşalt, sonra tek başına `npx playwright test`
- ⚠️ **PLAYWRIGHT SONRASI `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor → önce `npm run build`
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak (< 2.5)
- ⚠️ **LOCAL'DE İKİ İŞÇİYLE KOŞARKEN `hospital.spec.ts` DÜŞEBİLİYOR** — iki
  Playwright projesi aynı personel hesabını paylaşıyor. CI tek işçi olduğu için
  orada çıkmıyor; `CI=1 npx playwright test` ile doğrula
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
- ⚠️ **`vi.resetModules()` + dinamik `import` ile `instanceof` ÇALIŞMAZ** —
  hata KODUNA bak
- ⚠️ **`vi.resetModules()` KULLANAN TESTLERDE LOG SATIRINI METİN OLARAK
  KARŞILAŞTIRMA** — satır artık JSON; `JSON.parse` edip ALANLARINA bak
- ⛔ **BİR TEST DOSYASINDA HEM `vi.mock("@/config/env")` HEM GERÇEK `__testing`
  KULLANILAMAZ** — mock modülün tamamını değiştiriyor
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
- ⚠️ **`click` ARAÇ ÇAĞRISI BAZEN SESSİZCE İŞLEMİYOR** → `evaluate_script`
  içinden gerçek DOM `click()` çağır
- ⚠️ **`document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** (`httpOnly`) →
  `new_page` çağrısına `isolatedContext` ver
- ⚠️ **React kontrollü `<input>`'a `value` ATAMAK YETMİYOR** — React'in kendi
  setter'ını çağır + `new Event("input",{bubbles:true})`
- ⚠️ **macOS'ta pencere 375px'e İNMİYOR** (alt sınır ~485px) → `mobile-375`
  Playwright projesiyle ölç
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI gösteriyor**
  → `document.elementFromPoint` ile ölç
- ⚠️ **`get_network_request` dosya yolu ÇALIŞMA ALANI İÇİNDE olmalı**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** — bunu
  hem `SiteHeader` hem `CookieNotice` yapıyor (borç #84 ÖLÇÜLDÜ ve KAPANDI:
  bedel kabul edilebilir çıktı)
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
  `npx vercel redeploy <dagitim-url> --scope barisss` (panel adresini DEĞİL
  dağıtım adresini ver). Merge sonrası `/api/health` içindeki `commit`
  alanının değiştiğini **mutlaka doğrula**
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
- `psql` **kurulu değil** → `npx tsx` + Prisma betiği (proje kökünde, `.mts`,
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

**Bütçe kapısını tek başına koşturma:**
`lsof -ti:3000 | xargs kill -9`, sonra `npm run test:quality`
(sunucuyu Playwright kendi kurar). Ölçülen sayılar test raporunda "ölçüm"
başlığı altında yazıyor.

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

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
