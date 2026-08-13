# Sonraki oturum için hazır prompt — borç #107'nin 107c adımı, sonra 107d, sonra adım 19

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Sonraki adım bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde **borç #107'nin 107a ve 107b adımları bitti ve
canlıya çıktı.** Sıradaki iş **107c**, sonra 107d, en son adım 19 (mobil).
Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/decisions/ADR-021-yanit-sozlesmesi-uc-kapiya-baglanir.md` —
  ⭐ **YENİ.** Yanıt şeması neden üç kapıya birden bağlı, bayrak neden
  `NODE_ENV`'e bağlanmadı
- `docs/project/roadmap.md` — borç #107 satırı ve **adım 19'un bölünme notu**
- `docs/standards/03-api-guidelines.md` (yeni "Yanıt gövdesi de belgelenir") +
  `docs/standards/06-testing.md` (⭐ yeni "BİR KAPIYI `NODE_ENV`'E BAĞLAMA")

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

## DURUM

Roadmap adım **0 → 18f bitti**. Borç **#103 ödendi**, **#107 kısmen ödendi
(mekanizma + 15 uç hazır, 14 uç kaldı)**. Kalan: **107c → 107d**, sonra
**adım 19 (Expo mobil)**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- ✅ **107b MERGE EDİLDİ ve CANLIDA** (PR #73 → `b4a1398`; devir + CHANGELOG
  commit'leri de merge edildi, `main` = en son `docs(handoff)` commit'i).
  ⭐ Bu satır merge'den SONRA yazıldı. Dağıtım doğrulandı: `commit: 6d13e1c`,
  `db: ok`, `env: production`. Canlı duman testi temiz — altı sayfa **200**,
  `/api/cron/daily` **401**. Yine de körü körüne güvenme: `git log --oneline -3`
  ve `curl -s .../api/health` ile teyit et
- ✅ 107a canlıda (PR #71 → `2adce12`), #103 canlıda (PR #69 → `8bb0419`)
- ✅ **CRON'UN ÇALIŞTIĞI KANITLANDI** — production denetim kaydında 9 adet
  `scheduled_task_run`. Bir daha sorgulama
- Gerçek kullanıcı 0 · Sentry canlıda ve uçtan uca doğrulanmış

## ⛔ 2026-08-13 OLAYI — CANLI 80 SANİYE ESKİ SÜRÜME DÜŞTÜ

**Ne oldu:** PR #73'ün preview derlemesi, Neon uykuda olduğu için `P1001` ile
düştü. Kurtarmak için bir dağıtım yeniden dağıtıldı ama seçilen dağıtım
**preview değil production**'dı; Vercel onu canlı alan adına alias'ladı ve site
üç sürüm eski bir yapıya (`490713e`) döndü.

**Nasıl düzeltildi:** doğru dağıtım bulunup `vercel promote` ile terfi ettirildi.

**Kural artık yazılı:** `09-ci-cd-deploy.md` → "BİR DAĞITIMI YENİDEN DAĞITMADAN
ÖNCE ORTAMINI DOĞRULA". Kite de senkronlandı (1.19.0).

⛔ **Doğru ilk hamle yeniden dağıtmak DEĞİL, önce veritabanını uyandırmaktır:**
o ortamın çalışan bir dağıtımındaki `/api/health` ucuna istek at. Preview ve
production AYRI Neon dalları kullanıyor — production'ı uyandırmak preview'ı
uyandırmaz.

## 📌 107a + 107b'DE NE YAPILDI

**Yanıt gövdesi artık belgede GERÇEK Zod şemasıyla görünüyor.** Şema kütüğe elle
yazılmıyor: ucun `ok()`/`created()` çağrısında kullandığı şemanın AYNISI kütüğe
giriyor (ADR-021).

**Ölçüm:** 46 uçtan **29'u gövdeli**, 17'si gövdesiz (204/302/303).
107a'da platform grubu (3 uç), 107b'de auth+hesap grubu (12 uç) taşındı.
**14 uç kaldı.**

### ⭐ DÖRT DERS

1. ⛔ **YANIT SÖZLEŞMESİ TİP SİSTEMİYLE BELGELENEMEZ.** Tip JSON'a hayatta
   kalmıyor: `Date` derlemede `Date` telde ISO **metin**, `undefined` alan telde
   **hiç yok**. Kontrol gövdeyi `JSON.parse(JSON.stringify(...))` ile **telden
   geçmiş hâline** çevirip öyle doğruluyor
2. ⛔ **BİR KAPIYI `NODE_ENV`'E BAĞLAMA — ÖLÇÜLDÜ.** E2E `next build &&
   next start` ile **production modunda** koşuyor; kapı en çok gerektiği yerde
   sessizce kapanırdı. Bayrak ayrı: `API_RESPONSE_CONTRACT_CHECK`
3. ⚠️ **`serverEnv` HER YERDEN İÇE AKTARILAN BİR MODÜLDE OKUNAMAZ.** Tarayıcıda
   bilerek istisna fırlatıyor; `jsdom` ortamındaki 5 test kırmızıya döndü
4. ⭐ **BİR UÇ İKİ FARKLI BAŞARI DÖNDÜREBİLİR ve kütük bunu tutabilmeli.**
   `POST /api/v1/registrations/current/verifications` hem `200` hem `201`
   dönüyordu ama `200` HİÇ belgelenmemişti. `alternateSuccess` eklendi

### HAZIR MEKANİZMA — 107c'DE YENİDEN YAZMA, KULLAN

| Parça | Ne işe yarar |
|---|---|
| `src/lib/api-response-contract.ts` | Çalışma anı kontrolü. **Dokunma, sadece şema ver** |
| `ok(data, { schema })` · `created(data, { schema })` | Derleme anı bağı (`ZodType<T>`) |
| `success.body` (`api-docs/types.ts`) | Kütükte şema beyanı. `envelope: "raw"` ve `externalContract` seçenekleri var |
| `alternateSuccess` (`api-docs/types.ts`) | İkinci başarı yanıtı (farklı durum kodu) |
| `RESPONSE_BODY_PENDING` (`registry/index.ts`) | ⏳ **Kalan 14 uç.** Çözülen uçlar buradan DÜŞÜRÜLÜR |
| `tests/unit/api-docs-response.test.ts` | 8 kapı: eksik şema, liste hijyeni, gövdesiz uç, dönüştürme yasağı, ikinci yanıt, route↔kütük eşleşmesi |

**Örnek almak için bak:** `src/features/auth/schemas/registration.schema.ts`
(dosyanın alt yarısı) — beş yanıt şeması, gerekçeleriyle birlikte.

## YAPILACAK — 107c (ticaret, 7 uç)

`RESPONSE_BODY_PENDING` listesinin **"107c" başlıklı satırları**:

```
POST   /api/v1/carts/current/items            POST   /api/v1/payments
PATCH  /api/v1/carts/current/items/{itemId}   POST   /api/v1/memberships
DELETE /api/v1/carts/current/items/{itemId}   PATCH  /api/v1/memberships/{membershipId}
                                              DELETE /api/v1/memberships/{membershipId}
```

**Her uç için sıra:**
1. Yanıt şemasını ilgili feature'ın `schemas/` dosyasına yaz (mevcut şema
   dosyasının altına ekle — auth'ta böyle yapıldı)
2. Route'ta `ok`/`created` çağrısına `schema:` ver
3. Kütükte `success.body: { schema: ... }` yaz
4. `RESPONSE_BODY_PENDING`'den adını **DÜŞÜR** (düşürmezsen kapı kırmızıya döner)

⚠️ **107c'YE ÖZEL DİKKAT**
- ⛔ **PARA TAM SAYI KURUŞ.** Şema `z.int()` olmalı, `z.number()` DEĞİL — belge
  "ondalık olabilir" derse mobil istemci kuruşu lira sanar
- ⚠️ Sepet özeti iç içe (kalemler + ara toplam + toplam) — en büyük şema bu
- ⚠️ Sipariş/üyelik durumları KOLONDA DEĞİL, okuma anında türetiliyor (ADR-013)
- ⛔ Şema `.transform()` taşıyamaz · tarihler `z.iso.datetime()`

**Sonra 107d** (7 uç: bildirim, talep, randevu, koltuk + **iki ham dosya
indirmesi**). ⚠️ `GET /api/v1/account/export` ve
`GET /api/v1/support-tickets/{ticketId}/attachments/{attachmentId}` ikisi de
`ok()` KULLANMIYOR ve `{ data }` zarfına sarmıyor; `account/export`'un gövdesi
bugün `Record<string, unknown>` — yani tipi bile yok. İkisi birlikte, kendi
kararıyla ele alınmalı.

**107d bitince** `RESPONSE_BODY_PENDING` boşalır ve sabit **silinir**.

## ⚠️ İKİ KONU PROJE SAHİBİNİN KARARINI BEKLİYOR

⚠️ **Bunlar mühendislik tercihi DEĞİL** — biri dış servise bağlanma (#23), biri
kullanıcı deneyimi/maliyet takası (#89). Bu yüzden hâlâ ona sorulur.

- **#23 sızmış şifre kontrolü:** (a) HIBP ekle, (b) yerel listeyi büyüt, (c) bırak
- **#89 Google hesabında ikinci kanıt:** (a) "yeniden kimlik doğrula" OAuth modu,
  (b) bırak

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
| **107a + 107b'nin elle kontrolü** | `/api/health` (commit `6d13e1c` görünmeli) · `/giris` · `/kayit` · `/sifremi-unuttum` | 2026-08-14'te ertelendi. ⚠️ İkisinin de ekranda görünen karşılığı YOK (arayüz, akış ve veritabanı hiç değişmedi); kontrol "bozulmamış mı" diye bakmak için |
| **#103'ün preview'da elle kontrolü** | preview URL → market → sepete ekle → sepet | Ertelendi. ⚠️ Otomatik taraf zaten kanıtlı (`POST /api/v1/carts/current/items` → `201`, gerçek tarayıcıda) |
| Telefondan toplu elle test | — | **18. kez ertelendi.** ⛔ Listeyi ÜRETME, tek satırla an ve geç |
| `proje-kiti`'nin Windows makineye kurulumu | `/plugin marketplace add bariskose9/bariskose-skills` → `/plugin install proje-kiti@bariskose-skills` | Ertelendi |
| Cloudflare'da preview alan adı yetkilendirme (#114) | Cloudflare paneli | ⚠️ İSTEĞE BAĞLI, zorunlu değil |
| #23 (sızmış şifre) ve #89 (Google ikinci kanıt) | — | Kararı bekliyor, acelesi yok |

### ⚠️ KURULU KİT SÜRÜMÜ — HATIRLATMA 2026-08-14'TE ZATEN YAPILDI

Kurulu sürüm **1.11.0**, güncel sürüm **1.19.0** (sekiz sürüm geride).
Proje sahibi ikinci bir proje açmayı planladığını söyleyince **tetik geldi ve
uyarı verildi:** `/yeni-proje` çalıştırmadan önce `/plugin` ekranından kiti
güncellemesi gerektiği söylendi.

⛔ **Kendiliğinden TEKRAR hatırlatma.** Yalnızca `/yeni-proje` veya
`/kit-senkron` fiilen çalıştırılacağı an tekrar söyle.

⚠️ Proje sahibi **aynı anda ikinci bir projede** çalışmayı planlıyor (ayrı VS
Code penceresi). Bu projede ölçüm yaparken bunu hesaba kat: **E2E yüke duyarlı**
(`uptime` < 2.5) ve iki projenin build'i aynı anda koşarsa testler kararsızlaşır.
Port 3000 de çakışabilir.

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

## 📦 KİT — sürüm 1.19.0, kurulu sürüm 1.11.0

✅ **KAPI 8 GEÇİLDİ, diff ile kanıtlandı (üç dosyada da çıktı boş).**

- **1.18.0** (`0e40146`) — `03-api-guidelines.md`: yanıt gövdesi de belgelenir,
  şema telden doğrulanır, sözleşme borcu yalnızca küçülen listeyle kapatılır ·
  `06-testing.md`: bir kapıyı `NODE_ENV`'e bağlama, açık olduğunu ölç
- **1.19.0** (`926bfc5`) — `09-ci-cd-deploy.md`: bir dağıtımı yeniden dağıtmadan önce
  ortamını doğrula (production'ı yeniden dağıtmak canlıyı GERİ ALIR); uyuyan
  veritabanını önce uyandır

⛔ **PROJE SAHİBİNİN KURULU SÜRÜMÜ 1.11.0 — ESKİ (yedi sürüm geride).**
Yalnızca `/yeni-proje` veya `/kit-senkron` çalıştırılacağı gün "önce `/plugin`
ekranından kiti güncelle" de. **Bilinçli olarak ertelendi; kendiliğinden
hatırlatma.**

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu AÇIK BİR SORU.** Sürüm 1.7.0 istisnayı bölüm
seviyesine indirdi (`<!-- ⛔ SENKRON SINIRI -->`) ama projedeki fark **sınırın
ÜSTÜNDE** kalıyor (satır 19-68). Ya sınır yanlış yerde ya da o metin sınırın
altına taşınmalı. **Karar hâlâ bekliyor.** (18 dosyadan **17'si** birebir aynı — 2026-08-14'te ölçüldü.)

⚠️ Kit deposunu karşılaştırmadan önce daima `git fetch` + `git pull` yap.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`src/lib/api-response-contract.ts`** — YENİ. Yanıt sözleşmesi kontrolü
- ⭐ **`src/features/api-docs/types.ts` → `SuccessBody`** — YENİ. Gövde beyanı
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

**107a/107b'de yeni öğrenilenler**
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
  `/api/health` ucuna istek at. Sonra `npx vercel redeploy <PREVIEW-URL>
  --scope barisss` — ⛔ **hedefin `Preview` olduğunu ÖNCE doğrula.** Merge sonrası
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
- ⚠️ **`npx tsx -e` İLE `src/features/api-docs/registry`'Yİ İÇE AKTARMA** —
  ortam doğrulaması yüzünden ASILI KALIYOR. Kütüğü statik olarak (regex ile)
  oku ya da vitest içinden çalış
- Docker Desktop kapalı olabilir → `open -a Docker`, sonra `npm run db:up`
- **`.ts`/`.tsx` yazdıktan sonra `npm run format` çalıştır**
- Uzun süren işlerde `caffeinate -dimsu &`; **oturum bitince `pkill caffeinate`**

## KOMUTLAR

`npm run db:up · db:migrate · db:reset · db:studio`
`npm run test · test:db · test:e2e · test:quality · lint · typecheck · format · build`
`gh` PATH'te. `vercel` ve `neonctl` için `npx`.

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

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
⛔ **Mühendislik tercihini bana menü olarak sunma — kararı sen ver.**
