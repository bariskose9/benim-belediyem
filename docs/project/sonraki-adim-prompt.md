# Sonraki oturum için hazır prompt — adım 19 (Expo mobil)

> Bu dosya bir sonraki Claude oturumuna kopyala-yapıştır yapılmak için var.
> Sonraki adım bitince **yeniden yazılır** (üstüne eklenmez).

---

benim-belediyem projesinde roadmap adım **18d bitti**. Başlamadan önce
`CLAUDE.md` + `docs/` klasörünü oku. Özellikle şu dördü:

- `docs/project/altyapi-durumu.md` — **hangi hesap açık, ne yapılandırılmış.**
  Kullanıcıya "şunu aç" demeden önce burayı oku
- `docs/project/guvenlik-denetimi-2026-08.md` — ⭐ **YENİ, adım 18d'nin ana
  çıktısı.** OWASP Top 10 denetimi + sahibin karar vermesi gereken iki konu
- `docs/project/roadmap.md` — teknik borç listesi (#112, #113 YENİ)
- `docs/standards/05-auth-security.md` + `09-ci-cd-deploy.md`

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

Roadmap adım **0 → 18d bitti**. Roadmap'te yazılı olarak **tek adım kaldı: 19
(Expo mobil uygulama)**.

- Canlı: https://benim-belediyem.vercel.app · sağlık ucu `/api/health`
- ✅ **Adım 18d MERGE EDİLDİ ve CANLIDA** (PR #64 → `main` = `a07c99d`).
  ⭐ Bu satır merge'den SONRA yazıldı. Dağıtım doğrulandı:
  `commit: a07c99d`, `db: ok`. Duman testi temiz — altı sayfa 200 döndü ve
  hepsinde nonce'lu CSP var, `script-src`'de `unsafe-inline` YOK.
  `vercel.live` production'a sızmadı (0). Yine de körü körüne güvenme:
  `git log --oneline -3` ve `curl -s .../api/health` ile teyit et
- ✅ **BORÇ #115 ÖDENDİ ve CANLIDA** (PR #66 → `main` = `d281935`, `/api/health`
  ile doğrulandı): bot doğrulaması ulaşılamazken gönder düğmesi artık
  kilitleniyor. Beş form, 7 bileşen testi, mutasyonla kanıtlandı
- ✅ **BORÇ #113 KAPANDI (2026-08-12): sorun yokmuş.** Proje sahibi canlıda
  `/kayit` sayfasına gerçek tarayıcıyla baktı — bulmaca kutusu **"Başarılı"**
  diyor. Sıkı CSP Turnstile'ı bozmuyor
- ✅ **CRON'UN ÇALIŞTIĞI KANITLANDI:** production denetim kaydında 12 Ağustos
  00:40:53–00:40:59 UTC arasında **9 adet `scheduled_task_run`** ölçüldü — tam
  cron penceresinin içinde. Aylardır süren belirsizlik kapandı
- Gerçek kullanıcı 0
- Hata takibi (Sentry) canlıda ve uçtan uca doğrulanmış

## 📌 ADIM 18d'DE NE YAPILDI

Güvenlik denetimi raporu yazıldı (`docs/project/guvenlik-denetimi-2026-08.md`)
ve üç borç ödendi. **Bilinen kritik/yüksek açık: 0.**

- **#10 ÖDENDİ — nonce tabanlı sıkı CSP.** `script-src`'den `'unsafe-inline'`
  kalktı. Politika artık `src/proxy.ts`'te
- **#78 ÖDENDİ** — ve endişesi yanlış çıktı (aşağıda)
- **#99 ÖDENDİ** — 11/11 action tam SHA'ya sabitlendi
- **#110 ÖDENDİ** — CHANGELOG'daki 17c/18a/18b boşluğu commit gövdelerinden
  dolduruldu
- Güvenlik başlıkları için **19 testlik kapı** (`tests/e2e/guvenlik-basliklari.spec.ts`)
  ve action sabitlemesi için `tests/unit/workflows.test.ts`
- Üç kapı da **mutasyonla** kırmızıya döndürülerek kanıtlandı

### ⭐ 18d'NİN DÖRT DERSİ

1. ⛔ **BİR BORÇ KAYDININ ÖNERDİĞİ ÇÖZÜM DE BİR İDDİADIR.** 18c "borcun SEBEBİ
   bir iddiadır" demişti; bu adım bir üstünü öğretti. Borç #78 hem yanlış bir
   risk hem **yanlış bir çözüm** yazıyordu (`x-real-ip`'i önce oku — oysa Vercel
   belgesi "identical" diyor, yani hiçbir şey değişmezdi). Borç #99 ise işin
   yarısını "yapılacak" diye yazıyordu, oysa `permissions:` blokları zaten vardı.
2. ⛔ **"KONSOL TEMİZ" ≠ "ÇALIŞIYOR".** `style-src` nonce'a çevrildiğinde 45
   görsel ve 14 859 karakterlik bir stil sayfası bloklandı — **tarayıcı konsoluna
   tek satır bile düşmeden.** Kırıklık ancak `getComputedStyle` ile ÖLÇÜLEREK
   görüldü. Görsel bir şeyi doğrularken konsola bakmak yetmez, hesaplanan
   değeri ölç.
3. ⭐ **KORKULAN MALİYETİ ÖDEMEDEN ÖNCE ÖLÇ.** Next belgesi nonce CSP için "tüm
   sayfalar dinamik olur, statik render ve CDN önbelleği kaybolur" diye
   uyarıyor. Ölçüldü: statik rota **3→3**, dinamik **77→77**. Bu projede
   kaybedilecek statik render zaten yoktu, yani bedel **sıfırdı**.
4. ⭐ **BİR KIRILMAYI SUÇLAMADAN ÖNCE KONTROLLÜ DENEY YAP.** Turnstile iframe'i
   çizilmeyince bunu CSP'ye yormak çok kolaydı. Proxy tamamen kaldırıldı,
   yeniden derlendi, ölçüm tekrarlandı — **iframe CSP olmadan da çizilmiyordu.**

## ⭐ 2026-08-12'DE ÖĞRENİLEN DERS — ARACIN ÖLÇEBİLDİĞİNİ ÖNCE KANITLA

Borç #113 "canlıda bulmaca çizilmiyor" diyordu. Ajan bunu otomatik tarayıcıyla
(Chrome DevTools MCP) ölçtü ve **dört hipotezi eledi**: alan adı yetkisi, nonce
eksikliği, `unsafe-eval`, hatta CSP'nin **tamamen kaldırılması**. Hiçbiri
değişiklik yaratmadı.

Sebep sonunda ölçüldü: **`navigator.webdriver === true`**. Turnstile bir BOT
KORUMASIDIR ve otomasyon tarayıcısını tanıyıp bulmacayı hiç açmaz. Sorun üründe
değil, **ölçüm aracındaydı**.

⛔ **Ajan ayrıca proje sahibinin "kutu görünüyor" gözlemini kendi ölçümüne
dayanarak çürütmeye çalıştı. Gözlem doğruydu.** Kural artık
`06-testing.md` → "Önce aracın o işi ölçebildiğini doğrula" bölümünde ve
kite de yazıldı (sürüm 1.14.0).

⚠️ **Ayırt edici işaret:** ürün hatası genelde HATA ÜRETİR, araç engeli genelde
SESSİZDİR. Burada sahte jeton dönen test anahtarları çalışıyor, gerçek
doğrulama çalıştıran her anahtar hata callback'i bile tetiklemeden ölüyordu.

## ⚠️ İKİ KONU PROJE SAHİBİNİN KARARINI BEKLİYOR

Rapor §5'te ayrıntılı. **Teknik iş değil, karar işi** — sen karar verme, sor:

- **#23 sızmış şifre kontrolü:** (a) HIBP ekle, (b) yerel listeyi büyüt (dış
  servis yok), (c) bugünkü hâliyle bırak
- **#89 Google hesabında ikinci kanıt:** (a) "yeniden kimlik doğrula" OAuth modu
  (~1 oturumluk iş), (b) bugünkü hâliyle bırak

## ⛔ ADIM 19'DAN ÖNCE ÖDENMESİ ZORUNLU İKİ BORÇ

Bunlar mobil uygulama başlamadan **önce** ödenmeli, çünkü o günden itibaren
kullanıcının telefonundaki eski sürüm güncellenemez:

- **#103** — API sürümlenmemiş, kırıcı değişiklik politikası uygulanmıyor. ADR gerektirir
- **#107** — yanıt gövdelerinin şeması belgelenmedi. ~40 route'a dokunmayı gerektirir

## ⚠️ YENİ BORÇLAR — #112, #113

- ⛔ **SIKI CSP BİR ŞEYİ FİİLEN KIRDI VE LOCAL'DE HİÇ GÖRÜNMEDİ:** `frame-src`
  Vercel'in önizleme araç çubuğunu (`vercel.live`) blokladı. 803 unit + 344 db
  + 341 e2e + 19 bütçe testinin hiçbiri yakalayamazdı; yalnızca **preview
  dağıtımının tarayıcı konsolunda** vardı. Düzeltildi (üretim DIŞINDA izinli,
  üretimde değil — orada hiç yüklenmiyor, ölçüldü) ve testle kilitlendi.
  ⭐ **Ders: bir CSP değişikliği ancak GERÇEK dağıtım ortamında doğrulanabilir.**
- **#112** — `style-src` hâlâ `'unsafe-inline'`. **Sebebi ölçüldü:**
  `next/image` `fill` modu inline `style` ÖZNİTELİĞİ yazıyor (nonce özniteliğe
  takılamaz — mimari sınır) ve `sonner` nonce'suz `<style>` enjekte ediyor
  (`ToasterProps`'ta `nonce` alanı yok). ⛔ `'nonce-…'` + `'unsafe-inline'`
  birlikte yazmak ÇÖZÜM DEĞİL: CSP'ye göre nonce varken `'unsafe-inline'`
  yok sayılır
- **#113** — ⛔ **BU DAL CANLIYA ÇIKINCA ELLE DOĞRULA:** `/kayit` sayfasında
  Turnstile bulmaca kutusu hâlâ görünüyor mu ve gönder düğmesi kilitli
  kalmıyor mu? (Formu göndermeye gerek YOK — bozulursa `onUnavailable`
  tetiklenip düğme kilitlenir, yani kilitsiz olması yeterli kanıt.)
  ⭐ **Local ve preview'da çizilmemesinin sebebi ARTIK KESİN:** Turnstile
  `110200` = *"Domain not authorized"* veriyor, yani o alan adları panelde
  yetkili değil. CSP'yle ilgisi yok
- **#114** — Turnstile önizleme ortamında çalışmıyor (yukarıdaki `110200`).
  ⚠️ **İSTEĞE BAĞLI panel işi**, zorunlu değil — production etkilenmiyor

## ⛔ PROJE SAHİBİNE İŞ VERME — HEPSİ BİLİNÇLİ ERTELENDİ

2026-08-12'de proje sahibi açıkça şunu söyledi: **"benim yapmam gerekenleri
yine sonraya bırak."** Aşağıdakilerin hiçbirini oturumun başında açma,
hatırlatma, iş listesine koyma.

| Ne | Durum |
|---|---|
| Telefondan toplu elle test | 14. kez ertelendi. ⛔ Listeyi yeniden sunma, tek madde önerisini de tekrarlama — ikisi de denendi, tutmadı |
| `proje-kiti`'nin Windows makineye kurulumu | Ertelendi. Gerektiğinde: `/plugin marketplace add bariskose9/bariskose-skills` → `/plugin install proje-kiti@bariskose-skills` (market adı **bariskose-skills**, plugin adı **proje-kiti**, güncel sürüm **1.14.0**) |
| Cloudflare panelinde preview alan adı yetkilendirme (#114) | ⚠️ İSTEĞE BAĞLI, zorunlu değil — production etkilenmiyor |
| #23 (sızmış şifre listesi) ve #89 (Google'da ikinci kanıt) | Kararı bekliyor, acelesi yok |

✅ **Bir işi bitirdiğinde tek cümleyle sorabileceğin TEK şey:** telefon testi
listesinin roadmap'te kalıp kalmayacağı. Cevap yine "sonra" olursa **ısrar
etme**, sayacı bir artır ve geç.

## ✅ CRON ÇALIŞIYOR — KANITLANDI, BİR DAHA SORGULAMA

12 Ağustos penceresi ölçüldü: production `audit_logs` tablosunda
**00:40:53–00:40:59 UTC arasında 9 adet `scheduled_task_run`** kaydı var —
tam da cron penceresinin (UTC 00:00–00:59) içinde. Aylardır süren "cron
gerçekten koşuyor mu" belirsizliği kapandı.

⛔ **UTC 00:00–00:59 arasında production'a dağıtım tetikleyen merge YAPMA** —
o pencere cron'un penceresi.

**Production veritabanına okuma erişimi (gerekirse):**
```
npx neonctl connection-string production --project-id lively-night-99128871 \
  --org-id org-still-water-86075112 --pooled false
```
⚠️ Prisma 7'de istemci `@prisma/client`'tan DEĞİL `./src/generated/prisma/client`
yolundan gelir ve `PrismaPg` adaptörü verilmek zorundadır. Betik **proje
kökünde** `.mts` olmalı (`/tmp`'de `node_modules` çözümlenmiyor), **yalnızca
okur** ve **commit edilmeden SİLİNİR**.

## 📦 KİT — sürüm 1.14.0 yayınlandı, kurulu sürüm 1.11.0

✅ **KAPI 8 GEÇİLDİ.** Adım 18d'nin iki dersi hem projeye hem kite yazıldı:
`06-testing.md` ("konsol temiz bir kanıt değildir") ve `11-agent-workflow.md`
("devralınan kaydın ÖNERDİĞİ ÇÖZÜM de bir iddiadır").
⭐ **diff KANITI: 18 standart dosyasından 17'si birebir AYNI**; tek fark
`00-stack.md` ve o bilinen/beklenen (aşağıdaki açık soru).
Kit commit'leri: `79292c9` (1.13.0) ve `f17d6b8` (**1.14.0** — "önce aracın ölçebildiğini kanıtla").

⚠️ **Bu adımda kit deposunda bir engel çıktı ve çözüldü** — not olarak dursun:
yerel klon uzaktan 4 commit gerideydi ve içinde commit edilmemiş 20 satırlık
bir değişiklik vardı, bu yüzden `git pull` iptal oluyordu. Ölçüldü: o
değişiklik uzaktaki sürümle **birebir aynıydı** (yani önceki oturum push
etmiş, yerel kopya artık gereksizdi), bu yüzden atmak kayıpsızdı.
⭐ **Ders: kirli bir çalışma alanını temizlemeden ÖNCE, o değişikliğin uzakta
zaten var olup olmadığını ölç.** Körlemesine `stash` veya `checkout` iş
kaybettirebilirdi.

⛔ **PROJE SAHİBİNİN KURULU SÜRÜMÜ 1.11.0 — ESKİ (artık iki sürüm geride).**
Yalnızca `/yeni-proje` veya `/kit-senkron` çalıştırılacağı gün "önce `/plugin`
ekranından kiti güncelle" de. **Bilinçli olarak ertelendi; kendiliğinden
hatırlatma.**

⛔ **`00-stack.md` HÂLÂ FARKLI ve bu AÇIK BİR SORU.** Sürüm 1.7.0 istisnayı
bölüm seviyesine indirdi (`<!-- ⛔ SENKRON SINIRI -->`) ama projedeki fark
**sınırın ÜSTÜNDE** kalıyor (satır 19-68): oradaki Auth.js metni bu projeye
özel. Ya sınır yanlış yerde ya da o metin sınırın altına taşınmalı.
**Karar hâlâ bekliyor.**

⚠️ Kit deposunu karşılaştırmadan önce daima `git fetch` + `git pull` yap.

## YAPILACAK — ÖNCE #103, SONRA #107, EN SON adım 19

⛔ **Adım 19 (Expo mobil) DOĞRUDAN BAŞLAMAZ.** İki borç önce ödenmeli, çünkü o
günden itibaren kullanıcının telefonundaki eski sürüm güncellenemez ve
kaldırılan her uç, güncellemeyi almamış herkes için çökme demektir:

1. **#103 — API sürümlenmemiş, kırıcı değişiklik politikası uygulanmıyor.**
   Uçlar `/api/<kaynak>` biçiminde, sürüm segmenti yok; `Deprecation`/`Sunset`
   başlıkları hiç kullanılmıyor. **ADR gerektiriyor.**
   ⚠️ Bugün API'nin tek tüketicisi kendi arayüzümüz ve sunucuyla AYNI deploy'da
   güncelleniyor — yani sözleşmeyi bozmanın bedeli şu an sıfır. Bu yüzden karar
   "sürüm segmenti mi, yoksa başlık tabanlı sürümleme mi" olarak sorulmalı,
   ezberden `/v1/` eklenmemeli.
2. **#107 — yanıt gövdelerinin şeması belgelenmedi.** `/api/docs` istek tarafını
   gerçek Zod şemalarından türetiyor ama yanıt tarafında yalnızca zarfı
   belgeliyor. ~40 route'a dokunmayı gerektirir; `ok<T>()` jenerik olduğu için
   `T` çalışma anında okunamıyor.

**Sonra adım 19.** ⚠️ Tek satır ama devasa — 17 ve 18 nasıl a/b/c/d'ye
bölündüyse 19 da bölünmeli. Kod yazmadan önce **plan sun** ve bölünmeyi öner.

## HAZIR BEKLEYEN PARÇALAR — YENİDEN YAZMA, KULLAN

- ⭐ **`src/proxy.ts`** — YENİ. Nonce üretimi + tüm CSP politikası tek yerde.
  **Yeni bir dış alan adı (CDN, analytics, ödeme) eklenirse CSP'ye buradan
  yazılır** — `next.config.ts`'e İKİNCİ bir CSP satırı EKLEME, test yakalar
- ⭐ **`tests/e2e/guvenlik-basliklari.spec.ts`** — YENİ. **Yeni bir genel sayfa
  eklersen `korunmasiSartYollar` listesine de yaz**
- ⭐ **`tests/unit/workflows.test.ts`** — YENİ. Yeni bir action eklersen tam SHA
  + `# vX.Y.Z` yorumu ŞART, yoksa CI kırmızı
- **`tests/quality/`** — bütçe eşikleri (`budget.ts`), performans ve
  erişilebilirlik kapıları. **Yeni genel sayfa `accessibility.spec.ts`'e de yazılır**
- **`src/features/api-docs/`** — kütük + üretici + sapma kapıları.
  **Yeni bir uç eklersen kütüğe de yaz, yoksa CI kırmızıya döner**
- **`src/lib/log-redact.ts`** — log, Sentry ve API belgesi aynı süzgeçten geçiyor
- **`src/lib/logger.ts`** · **`src/lib/sentry-options.ts`**
- **`src/lib/http.ts`** — `ok`/`created`/`noContent`/`fail`, tek tip hata biçimi
- **`src/lib/rate-limit.ts`** — `readActorIp` (⚠️ başlık sırası 18d'de değişti,
  4 test onu kilitliyor) · `consumeRateLimit` · `rateLimitKey`
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

**Adım 18d'de yeni öğrenilenler**
- ⛔ **CSP İNLINE STİLİ SESSİZCE BLOKLUYOR** — konsola tek satır düşmüyor.
  Doğrulama `getComputedStyle` ile yapılmak zorunda
- ⚠️ **NEXT 16'DA ARA KATMANIN ADI `middleware` DEĞİL `proxy`.** 16.2.12 ikisini
  de tanıyor ama belge ve gelecek sürümler `proxy` diyor. Build çıktısı
  `ƒ Proxy (Middleware)` satırıyla tanıdığını doğruluyor
- ⚠️ **TARAYICI NONCE'U DOM'DAN GİZLİYOR** ("nonce hiding" — CSS seçici
  saldırısına karşı). `getAttribute("nonce")` **boş döner**; değer yalnızca
  `.nonce` property'sinde. Öznitelikle ölçen test yanlış alarm verir
- ⚠️ **ELLE YAZILAN `<script>`'E NEXT NONCE TAKMIYOR** — yalnızca kendi
  ürettiklerine takıyor. `layout.tsx`'teki tema betiğine nonce ELLE veriliyor
- ⚠️ **`'nonce-…'` VARKEN `'unsafe-inline'` YOK SAYILIR** (CSP kuralı). İkisini
  yan yana yazmak "sıkı görünen ama yine kırık" bir politika üretir
- ⚠️ **İKİ `Content-Security-Policy` BAŞLIĞI = KESİŞİM.** Gevşek olan sıkı olanı
  gevşetmez, ama sıkı olanın izin verdiğini bloklar
- ⚠️ **`argon2` MALİYETİ GİRDİ UZUNLUĞUNDAN BAĞIMSIZ** (ölçüldü: 4 MB → 28,6 ms,
  normal → 15,8 ms). "Uzun şifre göndererek CPU tüketme" diye bir vektör yok
- ⚠️ **GEÇİCİ `.mts` BETİK PROJE KÖKÜNDE OLMALI** — `/tmp`'de `node_modules`
  çözümlenmiyor, `ERR_MODULE_NOT_FOUND` alırsın
- ⚠️ **CHROME DEVTOOLS EKRAN GÖRÜNTÜSÜ ÇALIŞMA ALANI DIŞINA YAZILAMIYOR**

**Adım 18c'de öğrenilenler**
- ⛔ **ÖLÇÜM YAPMADAN ÖNCE PORTU BOŞALT** (`lsof -ti:3000 | xargs kill -9`).
  Ayakta kalmış `npm run start` eski yapıyı servis ediyor
- ⛔ **KORUNAN SAYFA `page.goto`'ya `200` DÖNDÜRÜYOR.** Yönlendirme hidrasyondan
  sonra → `expectRoute`
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
- ⚠️ **KÖK YERLEŞİMDE `cookies()` OKUMAK TÜM SAYFALARI DİNAMİK YAPAR** — bunu
  hem `SiteHeader` hem `CookieNotice` yapıyor (borç #84 ÖLÇÜLDÜ ve KAPANDI).
  ⭐ **18d'de bu bir AVANTAJA dönüştü:** nonce CSP zaten dinamik olan bir
  uygulamada hiçbir şey kaybettirmedi
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

## BENİMLE İLETİŞİM

Kodu okuyup anlayamıyorum. Her adımı **Türkçe, kod göstermeden, en fazla 5
maddede** anlat. Sadece "ne" değil **"neden"** de söyle. Emin olmadığın yerde
**"emin değilim"** de, uydurma. Bir şeyi bozduğunu fark edersen hemen söyle.
Kod yazmadan önce **plan sun**; PC başında değilsem onay bekleme, yalnızca
commit/merge kapısında dur (CLAUDE.md §3 kapı 2'nin istisnası).
