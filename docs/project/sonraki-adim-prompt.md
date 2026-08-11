# Sonraki oturum için hazır prompt — adım 18c

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Adım 18c bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **18c**'ye geçiyoruz. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/roadmap.md` — adım 18c satırı ve teknik borç listesi (#99-#107 YENİ)
- `docs/standards/11-agent-workflow.md` — ⭐ **"GERÇEK PROJE VARSAYILANI" bölümü YENİ**
- `docs/standards/15-oturum-devri.md` — oturum kapanmadan ne yazacağın

## ⭐ EN ÖNEMLİ YENİ KURAL — önce bunu oku

Proje sahibi 2026-08-11'de şunu söyledi ve bu **standarda yazıldı**
(`11-agent-workflow.md` → "Gerçek proje varsayılanı"):

> "Best practice neyse onu yap, **gerçek hayat projesi** örneği yapıyoruz,
> hep öyle düşün."

Yani ölçüt "hangisi daha hızlı biter" veya "portföyde iyi görünür" değil,
**"gerçek kullanıcısı ve gerçek nöbetçisi olan bir üründe hangisi doğru
olurdu"**. Sapılacaksa sapma yazılır: yerleşik pratik ne, biz ne yapıyoruz,
neden, ne zaman gerçeğine geçilir.

⛔ **"Portföy projesi" bir sapma gerekçesi DEĞİLDİR.** Sahte olması gereken tek
şey veridir; mühendislik sahte olmaz.

## DURUM

Roadmap adım **0 → 18b bitti**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- **Adım 18b (API belgeleri) tamamlandı ama HENÜZ MERGE EDİLMEDİ** —
  commit onayı bekliyor. `main` hâlâ `ab3c627`
- Hata takibi (Sentry) canlıda ve uçtan uca doğrulandı (2026-08-11)
- Preview ve production veritabanları dolu; gerçek kullanıcı 0

## 📌 ADIM 18b'DE NE YAPILDI

`/api/docs` — **46 ucun tamamı** OpenAPI 3.1 ile belgelendi (ADR-019).

- ⭐ **YENİ PAKET EKLENMEDİ.** Devir notu bir paket gerekeceğini yazıyordu;
  ölçüldü ve gerekmedi: Zod 4.4.3'ün `z.toJSONSchema`'sı **42/42 şemayı**
  dönüştürdü (katı modda da). Belge gerçek doğrulama şemalarından türetiliyor
- **Sapma CI kapısı:** uç · hayalet uç · **erişim seviyesi** · hata kataloğu
- **Belge production'da varsayılan KAPALI** (`404`), `API_DOCS_PUBLIC=true` ile açılır
- Bağımsız doğrulayıcıyla (`npx @redocly/cli lint`) ölçüldü: **0 hata**, 9 uyarı
  (8'i doğru davranış: yönlendirme uçları ve hata üretemeyen uçlar)

### ⭐ ADIM 18b'NİN EN ÖNEMLİ DERSİ — MUTASYON GERÇEK BİR ZAAF BULDU

Erişim testleri önce yalnızca "kütükte korumalı yazan uç belgede de korumalı mı"
ölçüyordu. `/api/addresses` POST'unun erişimi deneme amaçlı
`authenticated` → `public` yapıldı ve **testlerin HEPSİ yeşil kaldı.**

Testler kütükle tutarlıydı ama **gerçekle bağı yoktu** — yani yanlış etiketlenmiş
bir uç belgede "giriş gerekmez" diye görünebilirdi. Test artık etiketi route
dosyasındaki gerçek `requireAccess` çağrısına bağlıyor ve aynı mutasyonda
kırmızıya dönüyor.

⛔ **DERS: Bir testin ölçtüğü şeyi, ölçtüğünü sandığın şeyle karıştırma.
Kendi verinle tutarlı bir test, hiçbir şey ölçmüyor olabilir.**

## 🔎 BELGELEME ÜÇ GERÇEK KUSUR ORTAYA ÇIKARDI (borç #105-#107)

Belge yazmak, kodu okumanın kendisiydi ve şunlar bulundu:

- **#105 — aynı hata kodu iki farklı HTTP durumu dönüyor:** `BOT_CHECK_FAILED`
  (403/400), `PAYMENT_DECLINED` (409/402), `INSUFFICIENT_FUNDS` (409/402).
  ⭐ Sayının BÜYÜMESİ testle engellendi; dördüncüsü CI'ı kırar
- **#106 — iki uçta yol parametresi Zod'dan geçmiyor** (sepet kalemi, üyelik)
- **#107 — yanıt gövdelerinin şeması belgelenmedi** (yalnızca zarf + tarif)

Üçü de belgede **gizlenmedi**, açıkça yazıldı.

## ⚠️ STANDARTLAR GÜNCELLENDİ — YENİ BORÇLAR DOĞDU (#99-#104)

"Best practice" talimatı üzerine dört standart dosyası güncellendi ve bu, **bu
projede duran ihlalleri görünür yaptı**. Hepsi ölçülerek yazıldı:

| # | Ne | Nerede ödenir |
|---|---|---|
| 99 | CI action'ları etiketle sabitlenmiş, **tam commit SHA'sıyla değil** (11/11) | adım 18d |
| 100 | ⛔ **Depo public ama sır taraması ve push koruması KAPALI** | **tek tık panel işi** |
| 101 | `429` yanıtları `Retry-After` taşımıyor | hız sınırına dokunulan ilk adım |
| 102 | Hata yanıtı istek kimliği taşımıyor (#97'nin istemci bacağı) | ara katman işi |
| 103 | API sürümlenmemiş, `Deprecation`/`Sunset` yok | ⛔ **adım 19'dan ÖNCE** |
| 104 | Uygulama düzeyinde gövde boyutu sınırı yok (platform 4,5 MB'de kesiyor) | ara katman işi |

⛔ **#103 ve #107 adım 19 (mobil uygulama) başlamadan ÖNCE ödenmeli.** O günden
sonra kullanıcının telefonundaki eski sürüm güncellenemez; kaldırılan bir uç
veya değişen bir yanıt, güncellemeyi almamış herkes için çökme demektir.

## ❓ PROJE SAHİBİNE SORULACAK TEK ŞEY (18c'nin SONUNDA)

**Depoda `LICENSE` dosyası yok.** Public bir depo lisanssızken hukuken "her hakkı
saklı"dır — kimse kullanamaz, katkı veremez. Portföy için genelde MIT tercih
edilir. Bu proje sahibinin kararı, ajanın değil. Tek cümleyle sor, cevap
"sonra" olursa ısrar etme.

## 📱 TOPLU ELLE TEST — ON BİRİNCİ KEZ ERTELENDİ

> ⛔ **Oturumun BAŞINDA bu listeyi AÇMA.** Hatırlatma, iş listesine koyma,
> "önce şunu yap" deme. 18c'nin önünde engel değil.
>
> ⛔ Listeyi **yeniden sunma** ve tek madde önerisini de **tekrarlama** —
> ikisi de denendi, ikisi de tutmadı.
>
> ✅ **Adım 18c BİTTİKTEN sonra**, tek seferlik ve tek cümlelik şu kararı sor:
> "bu liste hiç yapılmayacaksa roadmap'ten silelim mi, yoksa 'yapılmadı'
> etiketiyle teknik borç olarak mı bırakalım?" Cevap yine "sonra" olursa
> **ısrar etme**, sayacı bir artır ve geç.

Listenin tamamı git geçmişinde duruyor (`sonraki-adim-prompt.md`, commit `ab3c627`).
Kapsanan borçlar: **#50 · #62 · #73 · #83** + adım 15c-1 · 15c-2 · 16 · 17 ·
17b · 17c · 18a.

**Nerede:** https://benim-belediyem.vercel.app · **telefondan**
**Hesap:** `docs/project/test-hesaplari.md` → şifre `Test1234!`,
**personel olan** bir hesap seç. ⛔ #11-#16 arası hesaplar production'da YOK.

## ⏰ CRON — SONRAKİ PENCERE 12 AĞUSTOS 00:00 UTC

11 Ağustos penceresi ölçüldü → **0 kayıt**. `CRON_SECRET` 10 Ağustos ~14:54
UTC'de girilmiş, yani o günün penceresi geçtikten SONRA.

**Sonraki oturum:** 12 Ağustos 01:00 UTC'den sonra sorguyu tekrarla. Yine 0
çıkarsa Vercel → Settings → Cron Jobs → View Logs incelenmeli.

⛔ **DERS: UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA.**

**Production veritabanına okuma erişimi:**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
Çıkan adresi `PROD_DATABASE_URL` verip **proje kökünde `.mts`** betik koştur.
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **yalnızca
okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT SÜRÜM 1.10.0 — kapı 8 geçildi

18b'nin dört standart güncellemesi (`03-api-guidelines`, `04-database`,
`09-ci-cd-deploy`, `11-agent-workflow`) **hem projeye hem kite** yazıldı.
✅ `diff` kanıtı: **18 standart dosyasından 17'si birebir aynı**; tek fark
`00-stack.md` (bilinen/beklenen).

⛔ **Kit deposu HENÜZ PUSH EDİLMEDİ** — commit onayı bekliyor
(`/Users/bariskose/baris_projects/bariskose-skills`, sürüm 1.9.0 → 1.10.0).

⛔ **PROJE SAHİBİNİN KURULU SÜRÜMÜ ESKİ.** Bu kapı 8'in parçası DEĞİL — yalnızca
`/yeni-proje` veya `/kit-senkron` çalıştırılacağı gün "önce kiti güncelle" de.
**Bilinçli olarak ertelendi; kendiliğinden hatırlatma.**

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu AÇIK BİR SORU.** Sürüm 1.7.0 istisnayı
bölüm seviyesine indirdi (`<!-- ⛔ SENKRON SINIRI -->`) ama projedeki fark
**sınırın ÜSTÜNDE** kalıyor (satır 19-68): oradaki Auth.js metni bu projeye
özel. Ya sınır yanlış yerde ya da o metin sınırın altına taşınmalı.
Adım 18b bu dosyaya dokunmadı (§7: aynı anda tek modül) — **karar hâlâ bekliyor**.

⚠️ Kit deposunu karşılaştırmadan önce daima `git fetch` + `git pull` yap.

## YAPILACAK — roadmap adım 18c

"Performans bütçesi ölçümü (borç #84 ölçülür) + axe erişilebilirlik kapısı
(borç #11)" — `09-ci-cd-deploy.md` bu iki kapıyı zaten yazılı olarak istiyor
ama **CI'da fiilen ölçülmüyorlar**; ölçüm yoksa kapı da yoktur.

Dal: `feature/performans-ve-erisilebilirlik-kapilari` (öneri)

### Bu adımda özellikle dikkat
- **Borç #84:** kök yerleşimde `cookies()` okumak TÜM sayfaları dinamik yapıyor.
  Önce ÖLÇ, sonra düzelt, sonra tekrar ölç (§5.10) — tahminle optimizasyon yok
- `09-ci-cd-deploy.md` üç kapı sayıyor: `bundle-size` (>200KB gzip),
  `lighthouse` (LCP >2.5s · CLS >0.1), `axe` (kritik ihlal)
- ⛔ **Yeni bir paket gerekiyorsa proje sahibine SOR** (CLAUDE.md §7). Ama önce
  18b'deki gibi **gerçekten gerekli mi diye ÖLÇ** — devir notunun "paket gerekir"
  demesi yetmiyor
- ⛔ **CI iş akışına dokunulacaksa borç #99 da aynı işte ödenebilir** (action'ları
  SHA'ya sabitleme + `permissions:` blokları). İkisi aynı dosyalar

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`src/features/api-docs/`** — YENİ. Kütük + üretici + sapma kapıları.
  **Yeni bir uç eklersen kütüğe de yaz, yoksa CI kırmızıya döner**
- **`src/lib/log-redact.ts`** — log, Sentry ve artık API belgesi aynı süzgeçten geçiyor
- **`src/lib/logger.ts`** · **`src/lib/sentry-options.ts`**
- **`src/lib/http.ts`** — `ok`/`created`/`noContent`/`fail`, tek tip hata biçimi
- **`src/features/staff-verification/`** — iki adımlı doğrulama deseni
- **`src/features/account/`** — geri alınamaz işlem deseni
- **`src/lib/same-origin.ts`** — `Origin` kapısı
- **`src/features/legal/`** — rıza kaydı, çerez kataloğu, yasal sayfa deseni
- **`src/features/scheduled-tasks/`** · **`src/features/profile/`**
- **`src/features/auth/`** — oturum, Google OAuth (PKCE + `state` + `nonce`)
- **`src/features/identity/`** · **`src/features/otp/`** · **`src/features/catalog/`**
- **`src/lib/external-fetch.ts`** — **yeni dış servis buradan geçer**
- **`src/lib/money.ts`** — para TAM SAYI KURUŞ
- **`src/features/events/`** — **YARIŞ KORUMASI DESENİ**
- **`src/features/notifications/`** — tembel senkronizasyon
- **`recordAuditLog()`** · **`requireAccess()`** · **`guardPage()`**
- `messages.ts` (tek istisna `messages-legal.ts`) · tasarım token'ları

## TUZAKLAR — daha önce vakit kaybettirenler

**Adım 18b'de yeni öğrenilenler**
- ⛔ **SÜZGECİ BÜYÜK BİR NESNENİN TAMAMINA SERİLEŞTİRİP UYGULAMA.**
  `redactString` 512 karakterde kırpıyor; 80.000 karakterlik belgeyi tek metin
  olarak geçirince çıktı her hâlükârda farklı döndü ve test "kişisel veri var"
  diye YANLIŞ ALARM verdi. Doğrusu: yaprak metinlere tek tek uygula.
  (Aynı tuzak adım 18a'da Sentry olayında da yaşandı)
- ⛔ **BİR TEST DOSYASINDA HEM `vi.mock("@/config/env")` HEM GERÇEK `__testing`
  KULLANILAMAZ** — mock modülün tamamını değiştiriyor. Şema testleri
  `env.test.ts`'e, kapı testleri kendi dosyasına ayrıldı
- ⚠️ **`NEXT_PUBLIC_ENV_LABEL`'i "production" yapmak env.ts'in TÜM tutarlılık
  kurallarını tetikliyor** (sahte OTP kanalı yasağı gibi) — test ölçmek
  istediği şey yerine ilgisiz bir doğrulamada düşer. Modülü mock'la
- ⚠️ **`z.coerce.boolean()` ORTAM DEĞİŞKENİNDE KULLANILMAZ:** `"false"` dizesini
  `true` sayar ("boş olmayan metin"). `z.enum(["true","false"])` + `transform`
- ⚠️ **Zod'un `z.toJSONSchema`'sı `io: "input"` almalı** — `.transform()` taşıyan
  şemada çıktı biçimini belgelemek istemciyi yanlış yönlendirir
- ⭐ **OpenAPI'de genel uç `security: []` YAZAR, alanı ATLAMAZ.** Alanı yazmamak
  "kök güvenliği devral" demek; boş dizi "bilerek korumasız" demek
- ⚠️ **`npx @redocly/cli lint` ile belgeyi DOĞRULA** — ilk üretimde 19 hata verdi.
  Paket KURULMAZ, `npx` ile bir kez koşulur

**E2E koşarken**
- **`npm run start` ile KENDİ sunucunu açıp sonra `npx playwright test` KOŞMA.**
  Doğrusu: portu boşalt (`lsof -ti:3000 | xargs kill -9`), sonra tek başına
  `npx playwright test` — sunucuyu Playwright kendi kurar
- ⚠️ **PLAYWRIGHT SONRASI `npm run start` YANLIŞ YAPIYI SERVİS EDİYOR**:
  `NEXT_PUBLIC_*` değerleri DERLEME ANINDA gömülüyor → önce `npm run build`
- **Sunucu ayaktayken `.next`'i silme**
- **YÜK 3'ÜN ÜZERİNDEYKEN TAM SET KOŞMA.** `uptime` bak (< 2.5)
- ⚠️ **E2E'Yİ 15 DAKİKA İÇİNDE ÜST ÜSTE KOŞTURMA** (hız sınırı). Çözüm:
  `rate_limit_counters` tablosunu boşalt, sonra **tek sefer** koş.
  **Bir testin düşmesini koda yormadan ÖNCE kaç kez koştuğuna bak**
- **Adres kontrolünde `toHaveURL` DEĞİL `waitForURL` kullan**
- **`npm run test:db` `docs/project/test-hesaplari.md` dosyasını YENİDEN
  ÜRETİYOR** (tarihler kayıyor). Commit öncesi `git status`'a bak ve geri al —
  **adım 18b'de YİNE yaşandı**
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
  içinden gerçek DOM `click()` çağır ve `performance.getEntriesByType("resource")`
  ile isteğin gidip gitmediğini ölç
- ⚠️ **`document.cookie` İLE OTURUM ÇEREZİ YAZILAMIYOR** (`httpOnly`) →
  `new_page` çağrısına `isolatedContext` ver
- ⚠️ **React kontrollü `<input>`'a `value` ATAMAK YETMİYOR** — React'in kendi
  setter'ını çağır + `new Event("input",{bubbles:true})`
- ⚠️ **macOS'ta pencere 375px'e İNMİYOR** (alt sınır ~485px) → `mobile-375`
  Playwright projesiyle ölç
- ⚠️ **`fullPage` ekran görüntüsü `sticky`/`fixed` öğeleri YANILTICI gösteriyor**
  → `document.elementFromPoint` ile ölç
- ⚠️ **`get_network_request` dosya yolu ÇALIŞMA ALANI İÇİNDE olmalı** —
  scratchpad'e yazamıyor. Depo köküne yaz ve **hemen sil**

**Next.js**
- ⚠️ **`router.refresh()`'i BAŞARI PANELİNİ ÇİZDİĞİN ANDA ÇAĞIRMA**
- **Sunucu bileşeninde `cookies().set()` İSTİSNA FIRLATIR**
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** (borç #84)
- **Sunucuda çizilen sayfa istemci yazdıktan sonra tazelenmez** → `router.refresh()`.
  ⛔ **Ama hesabı SİLDİKTEN sonra çağırma**
- **Formu sıfırlamak için bileşene `key` ver**
- **Zamana bağlı metin hidrasyon uyuşmazlığı üretir** → `suppressHydrationWarning`
- **`FormData` gövdesinde `content-type` başlığını ELLE YAZMA**
- **Kendi kimlik üretme, `useId()` kullan**
- ⚠️ **SUNUCU BİLEŞENİ SAYFANIN ADRESİNİ OKUYAMAZ** → `Referer` (ama aynı alan
  adı kontrolünden ve `sanitizeRedirectPath`'ten geçir)
- ⛔ **DERLEME TURBOPACK İLE YAPILIYOR** — `webpack.*` altındaki SDK seçenekleri
  SESSİZCE ETKİSİZ kalır (borç #96)

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
- **Neon uykudayken deploy PATLIYOR** (`P1001`) — production'da da preview'da da.
  Çözüm `npx vercel redeploy <dagitim-url> --scope barisss` (panel adresini
  DEĞİL dağıtım adresini ver). Merge sonrası `/api/health` içindeki `commit`
  alanının değiştiğini **mutlaka doğrula**
- **Cloudflare kutusu production'da OTOMATİZE EDİLEMİYOR**
- ⚠️ **Ücretsiz planda cron GÜNDE 1 ve saati garanti DEĞİL**
- ⛔ **UTC 00:00–00:59 ARASINDA MERGE ETME** — o pencere cron'un penceresi

**Git**
- **YENİ DALI HER ZAMAN `main`'DEN AÇ**
- ⛔ **AÇIK BİR PR VARKEN DAL AÇMA; önce onu merge et.** Çakışan bir PR'da
  GitHub `refs/pull/<N>/merge` üretemiyor ve `pull_request` iş akışları HİÇ
  BAŞLAMIYOR — **hata SESSİZ**. Teşhis: `gh pr view <N> --json
  mergeable,mergeStateStatus` → `CONFLICTING`/`DIRTY`. Çözüm (force-push YOK):
  `git merge origin/main` → çakışmayı çöz → commit → push

**Diğer**
- `vercel` ve `neonctl` PATH'te **değil** → `npx`. `neonctl` için
  `--org-id org-still-water-86075112` şart
- `psql` **kurulu değil** → `npx tsx` + Prisma betiği (proje kökünde, `.mts`,
  commit edilmeden SİLİNİR). `--env-file=.env` ile koştur
- ⚠️ **ESLint geçici `.mts` betiklerdeki `console.log`'u da yakalıyor** →
  `console.error` kullan veya betiği lint'ten önce sil
- **Chrome DevTools MCP yalnızca ÇALIŞMA ALANI İÇİNDEKİ dosyayı yükleyebiliyor**
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- **`.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır**
- Uzun süren işlerde `caffeinate -dimsu &`; **oturum bitince `pkill caffeinate`**.
  ⚠️ Uzun beklemeden sonra `pgrep -x caffeinate` ile hâlâ ayakta mı diye BAK

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · lint · typecheck · format · format:check · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

**API belgesini doğrulama:**
`npm run build && npm run start`, sonra
`curl -s -o /tmp/docs.json http://localhost:3000/api/docs`, sonra
`npx --yes @redocly/cli@latest lint /tmp/docs.json`

**Planlı görevi elle tetikleme (local):**
`npm run build && npm run start`, sonra
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`

**E2E'yi elle koşturma sırası:** `rate_limit_counters`'ı boşalt → `uptime` bak
(yük < 2.5) → portu boşalt (`lsof -ti:3000 | xargs kill -9`) → `npx playwright
test`. **Sunucuyu SEN başlatma.**

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
