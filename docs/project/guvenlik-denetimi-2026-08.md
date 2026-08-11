# Güvenlik Denetimi Raporu — Ağustos 2026 (roadmap adım 18d)

> **Tarih:** 2026-08-12 · **Kapsam:** `main` dalı, commit `0a849ea` üzerine kurulu
> `feature/guvenlik-denetimi` · **Canlı:** https://benim-belediyem.vercel.app
> **Gerçek kullanıcı sayısı:** 0

---

## 0. Bu raporun kuralı

⛔ **Her madde ÖLÇÜLDÜ. Ölçülemeyeni "iyi görünüyor" diye yazmadım — "ölçülmedi"
diye yazdım ve nedenini söyledim.** Bir denetim raporunun en tehlikeli satırı,
kontrol edilmemiş bir şeyin kontrol edilmiş gibi durmasıdır: sonraki oturum onu
doğrulanmış sayar ve bir daha kimse bakmaz.

Bu adımda bu tam olarak yaşandı — **devraldığım üç iddiadan ikisi yanlış çıktı**
(§6). Bu, adım 18c'nin birinci dersinin (“devralınan bir borcun SEBEBİ de bir
iddiadır”) ikinci kez doğrulanmasıdır.

**Yöntem:** OWASP Top 10 (2021) + `docs/standards/05-auth-security.md`.
Her bulgunun yanında onu üreten komut veya dosya var.

---

## 1. Yönetici özeti

| | Sayı |
|---|---|
| Bu adımda **kapatılan** borç | 3 (#10 · #78 · #99) |
| Yanlış olduğu **ölçülerek** gösterilen devralınan iddia | 2 (#78'in tamamı, #99'un yarısı) |
| Yeni **açılan** borç | 3 (#112 · #113 · #114) |
| Sahibin **karar vermesi** gereken açık konu | 2 (#23 · #89) |
| Bilinen **kritik/yüksek** açık | **0** |

**Genel değerlendirme:** uygulama, gerçek kullanıcı almaya bugünkü hâliyle
uygun. En büyük yapısal boşluk olan `script-src 'unsafe-inline'` bu adımda
kapandı. Kalan açıklar ya bilinçli takas ya da kullanıcı sayısı 0 iken bedeli
olmayan eksikler.

---

## 2. OWASP Top 10 — madde madde, ölçümle

### A01 · Hatalı erişim denetimi (Broken Access Control)

| Ölçüm | Sonuç |
|---|---|
| Toplam API ucu | **41** |
| `requireAccess(...)` çağıran uç | **23** |
| Oturum okuyan diğer uç | 3 |

Kalan uçlar kamuya açık olanlar (`/api/health`, katalog listeleri) veya kimlik
akışının kendisi. Yetkilendirme **sunucu tarafında** ve `requireAccess()` tek
kapıdan geçiyor; UI'da buton gizlemek yetki sayılmıyor.

**IDOR:** kayıt sahipliği kontrolü uçlarda ayrı ayrı yazılmış değil, servis
katmanında `userId` süzgeciyle yapılıyor. E2E tarafında başkasının kaydına
erişme denemeleri mevcut spec'lerde kapsanıyor.

✅ **Bulgu yok.**

### A02 · Kriptografik hatalar

| Ne | Nasıl | Kanıt |
|---|---|---|
| Şifre | **argon2id** | `password.service.ts:20` |
| Kimlik numarası | AES zarfı + ayrı tuzlu özet | `crypto.ts:117-160` (ADR-012) |
| Oturum jetonu | Çerezde **ham**, veritabanında **SHA-256 özeti** | ADR-005 |
| Çerez bayrakları | `httpOnly: true` · `secure` (local hariç) · `sameSite: lax` | `cookies.ts:18-19` |

⭐ **Ölçülen ek bulgu:** argon2'nin maliyeti girdi uzunluğundan **bağımsız**.
4 MB'lık bir şifre 28,6 ms sürdü, normal şifre 15,8 ms. Yani "çok uzun şifre
göndererek CPU tüketme" diye bir amplifikasyon **yok**. Bu ölçüm §4'teki
borç #104'ün risk seviyesini düşürüyor.

✅ **Bulgu yok.**

### A03 · Enjeksiyon

**SQL:** `$queryRawUnsafe` **hiç kullanılmıyor** (ölçüldü). Dört ham sorgu var
(`catalog-search.repository.ts`) ve hepsi etiketli şablon (tagged template) —
değerler Prisma tarafından parametre olarak bağlanıyor. Tablo adları `switch`
içinde sabit; dosyadaki yorum bunu neden böyle yaptığını da açıklıyor
("tanımlayıcı parametre olarak bağlanamaz").

**XSS:** `innerHTML`, `eval`, `new Function` kullanımı **sıfır** (ölçüldü).
`dangerouslySetInnerHTML` tek bir yerde: `app/layout.tsx` içindeki tema betiği
ve içeriği **sabit bir dize** (`lib/theme.ts`), kullanıcı girdisi içermiyor.

⭐ Bu adımdan itibaren XSS'e karşı ikinci bir kat var: **nonce tabanlı CSP**
(§3.1). Enjekte edilen bir betik, nonce'u bilemediği için artık çalışmaz.

✅ **Bulgu yok.**

### A04 · Güvensiz tasarım

- Hız sınırı Postgres'te, IP + oturum + kullanıcı + hedef bacaklarıyla (ADR-006)
- İki adımlı doğrulama deseni (`staff-verification`)
- Geri alınamaz işlemlerde ikinci kanıt (`account`)
- Yarış koruması: tek koşullu yazma + etkilenen satır sayısı (`events`)
- Bot koruması: Cloudflare Turnstile (ADR-004)

⚠️ **Açık konu #89** — şifresi olmayan (yalnızca Google ile açılmış) hesapta
silme ve kimlik çözme için ikinci kanıt yok. Ayrıntı ve karar §5'te.

### A05 · Hatalı yapılandırma

⭐ **Bu adımın ana işi burada.** Ayrıntı §3.1.

| Başlık | Değer | Test |
|---|---|---|
| `Content-Security-Policy` | nonce + `strict-dynamic`, **`unsafe-inline` YOK** | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ |
| `Permissions-Policy` | kamera/mikrofon/konum kapalı | ✅ |
| `X-Powered-By` | **gönderilmiyor** | ✅ |

⛔ **Bu başlıklar bugüne kadar HİÇBİR testle korunmuyordu.** Adım 4b'de
yapılandırılmışlar ve 2026-08-12'de ölçüldü: `tests/` altında tek bir eşleşme
yoktu. `next.config.ts`'ten bir satır silinse hiçbir şey kırmızıya dönmezdi.
Bu adımda **20 testlik bir kapı** yazıldı (`tests/e2e/guvenlik-basliklari.spec.ts`)
ve CSP altı ayrı yolda ölçülüyor (`/` · `/giris` · `/kayit` · `/market` ·
`/hesabim` · `/gizlilik`) — tek yol ölçmek, `proxy.ts`'teki `matcher` ifadesi
yanlışlıkla daraltıldığında sessiz kalırdı.

**CORS:** yapılandırılmış bir CORS yok ve buna gerek de yok — API'nin tek
tüketicisi aynı alan adındaki web arayüzü. Yazma uçlarında ayrıca `Origin`
kapısı var (`lib/same-origin.ts`).

### A06 · Güncel olmayan / açıklı bileşenler

```
npm audit             → found 0 vulnerabilities
npm audit --omit=dev  → found 0 vulnerabilities
```

Kilit dosyası commit edilmiş, CI `npm ci` kullanıyor (ölçüldü: `ci.yml:50`).

### A07 · Kimlik doğrulama hataları

- Giriş, kayıt, şifre sıfırlama ve OTP uçlarında hız sınırı var
- 2 başarısız denemeden sonra bot doğrulaması (PRD §5.0)
- OTP kodları özetlenerek saklanıyor, sahte (decoy) kayıtlar üretiliyor
- Google OAuth: **PKCE + `state` + `nonce`** üçü birden

⚠️ **Açık konu #23** — sızmış şifre kontrolü 148 satırlık yerel bir listeyle
yapılıyor. Ayrıntı ve karar §5'te.

### A08 · Yazılım ve veri bütünlüğü hataları

⭐ **Bu adımda kapandı.** Ayrıntı §3.3.

11 GitHub Action kullanımının 11'i etikete (`@v6`) sabitlenmişti; hepsi tam
commit SHA'sına çevrildi. Etiket **taşınabilir** bir işaretçidir: sahibi onu
başka bir commit'e çevirirse yapı bir sonraki koşuda sessizce farklı kod
çalıştırır — ve o kod deponun tüm sırlarına erişebilir.

### A09 · Günlükleme ve izleme hataları

- Yapılandırılmış (JSON) log — `lib/logger.ts`
- **Tek maskeleme süzgeci:** log, Sentry ve API belgesi aynı `redact()`
  fonksiyonundan geçiyor (ADR-018). Jeton, `Bearer`, kart numarası ve kimlik
  numarası desenleri maskeleniyor (`log-redact.ts:161-169`)
- Denetim kaydı **26 dosyada** çağrılıyor
- Sentry canlıda ve uçtan uca doğrulanmış (2026-08-11)

⚠️ Bilinen boşluk: istek kimliği log satırlarına otomatik girmiyor (borç #97)
ve hata yanıtı istek kimliği taşımıyor (#102). Gerçek kullanıcı 0 olduğu için
bugünkü bedeli yok; ayrıntı §4.

### A10 · Sunucu tarafı istek sahteciliği (SSRF)

⭐ **Ölçüldü: SSRF yüzeyi YOK.**

- Hiçbir Zod şeması kullanıcıdan URL kabul etmiyor (`z.string().url()` araması: **0 sonuç**)
- Dış çağrıların hepsi `config/constants.ts`'te **sabit** adreslere gidiyor
  (hava durumu, döviz, kripto, haber, Google, Turnstile)
- Dış çağrılar tek kapıdan geçiyor: `lib/external-fetch.ts` (zaman aşımı +
  sınırlı yeniden deneme + önbellekten okurken de Zod)

Bir gün kullanıcıdan URL alan bir uç eklenirse (webhook, "adresten içe aktar"),
bu madde **yeniden denetlenmeli** — allowlist ve özel IP aralığı kontrolü o gün
gerekecek.

---

## 3. Bu adımda kapatılanlar

### 3.1 Borç #10 — sıkı (nonce tabanlı) CSP ✅

`script-src`'den **`'unsafe-inline'` kaldırıldı**. Politika artık her istekte
yeniden üretilen bir nonce ile kuruluyor (`src/proxy.ts`).

⚠️ **Dosyanın adı `proxy.ts`, `middleware.ts` değil** — Next.js 16 ara katmanın
adını değiştirdi. 16.2.12 ikisini de tanıyor (`PROXY_FILENAME` sabiti ölçüldü)
ve build çıktısı `ƒ Proxy (Middleware)` diyerek onu tanıdığını doğruluyor.

**Ölçülen bedel: SIFIR.** Next belgesi nonce'un en büyük maliyetini "tüm
sayfalar dinamik olmak zorunda kalır, statik render ve CDN önbelleği kaybolur"
diye anlatıyor. Ölçüm:

| | Proxy'den ÖNCE | Proxy'den SONRA |
|---|---|---|
| Statik rota (`○`) | 3 | **3** |
| Dinamik rota (`ƒ`) | 77 | **77** |

Sebebi borç #84'te yazılı: `SiteHeader` oturum çerezini adım 4a'dan beri okuyor,
yani kaybedilecek statik render zaten yoktu.

**Doğrulama (tarayıcıda ölçüldü):**
- Nonce üç ardışık istekte üç farklı değer
- Sayfadaki **76 betiğin 73'ünde** nonce var, çalıştırılabilir betiklerde
  nonce'suz **0**
- Tema betiği çalıştı (`<html class="... dark">`), Next runtime yüklendi
- Turnstile betiği `strict-dynamic` altında **yüklendi** (`window.turnstile` var)

### 3.2 Borç #78 — hız sınırının IP bacağı ✅

Devraldığım kayıt "`x-forwarded-for` atlatılabilir olabilir" diyordu.
**Vercel'in resmî belgesinden doğrulandı ve endişe yanlış çıktı** — ayrıntı §6.1.

Yine de sıra değiştirildi: `x-vercel-forwarded-for` → `x-forwarded-for` →
`x-real-ip`. Bu bugünü değil **yarını** koruyor (uygulamanın önüne bir gün vekil
konursa). 4 yeni testle kilitlendi; sıra bozulduğunda test kırmızıya dönüyor
(mutasyonla kanıtlandı).

### 3.3 Borç #99 — tedarik zinciri sabitlemesi ✅

11/11 `uses:` satırı tam commit SHA'sına çevrildi, yanına okunabilir sürüm
yorumu yazıldı. **Major sürüm YÜKSELTİLMEDİ** — `actions/checkout` v7'ye
çıkmıştı ama sabitleme işine sürüm yükseltmesi karıştırmak, iki ayrı riski tek
commit'e sıkıştırmak olurdu.

Kural bir **mekanizmaya** bağlandı: `tests/unit/workflows.test.ts` her `uses:`
satırının 40 karakterlik SHA olmasını, yanında sürüm yorumu bulunmasını ve her
iş akışının açık `permissions:` bloğu tanımlamasını doğruluyor.

---

## 4. Yeni açılan borçlar

| # | Ne | Neden bugün ödenmedi |
|---|---|---|
| **112** | `style-src` hâlâ `'unsafe-inline'` | İki mimari engel ölçüldü (aşağıda) |
| **113** | Turnstile bulmacasının CSP altında **çizildiği** doğrulanamadı | Sebep bulundu ve CSP değil (§6.3) |
| **114** | Turnstile önizleme ortamında çalışmıyor (`110200`) | Panel işi, isteğe bağlı; production etkilenmiyor |

**#112'nin gerekçesi tahmin değil, ölçüm:** `style-src` nonce'a çevrildi, üretim
yapısı derlendi ve tarayıcıda ölçüldü. İki şey kırıldı:

1. `next/image` `fill` modunda görsele **`style` özniteliği** yazıyor.
   `/market`'te 45 görselin `getComputedStyle().position` değeri `absolute`
   yerine `static` ölçüldü. ⛔ Bu bir yapılandırma eksiği değil, **mimari
   sınır**: nonce yalnızca etikete takılabilir, özniteliğe takılamaz.
2. `sonner` çalışma anında **14 859 karakterlik** bir `<style>` enjekte ediyor ve
   nonce takmıyor; `style.sheet` boş ölçüldü. `ToasterProps` arayüzünde `nonce`
   alanı **yok** — kütüphaneye nonce geçirmenin bir yolu da yok.

⛔ **En sinsi taraf: bu kırılma tarayıcı konsoluna HİÇBİR ŞEY yazmadı.** "Konsol
temiz" burada "çalışıyor" demek değildi; kırıklık ancak `getComputedStyle` ile
ölçülerek görüldü. **Bu, bu adımın en önemli dersidir.**

### 4.1 ⛔ Sıkı CSP bir şeyi FİİLEN kırdı — ve bunu ancak preview yakaladı

`frame-src`, Vercel'in önizleme yorum araç çubuğunu (`vercel.live`) blokladı.
Konsol kaydı: *"Framing 'https://vercel.live/' violates the following Content
Security Policy directive: `frame-src 'self' https://challenges.cloudflare.com`"*.

⛔ **Local'de HİÇ görünmedi**, çünkü araç çubuğu yalnızca Vercel dağıtımlarında
yükleniyor. 803 unit, 344 db, 341 e2e ve 19 bütçe testinin hiçbiri bunu
yakalayamazdı — kırılma yalnızca preview dağıtımının tarayıcı konsolunda vardı.

**Düzeltildi ve iki yönü birden testle kilitlendi:** üretim DIŞINDA izin
veriliyor, üretimde **verilmiyor**. İkincisi ölçüme dayanıyor — araç çubuğu
production sayfalarına hiç yüklenmiyor (`curl | grep vercel.live` → 0), yani
gerekmeyen bir alan adını politikaya yazmak saldırı yüzeyini bedava
büyütmek olurdu. Kapı mutasyonla kanıtlandı.

⭐ **Ders: bir CSP değişikliği ancak GERÇEK dağıtım ortamında doğrulanabilir.**
Local'de var olmayan bir betik, local'de kırılamaz.

---

## 5. ⚠️ Proje sahibinin karar vermesi gereken iki konu

Bunlar teknik olarak çözülebilir ama **karar teknik değil** — biri gizlilik,
diğeri kullanıcı deneyimi ile güvenlik arasında bir takas.

### 5.1 Borç #23 — sızmış şifre kontrolü

**Bugün:** 148 satırlık yerel liste. Yalnızca en bariz tercihleri engelliyor
(`12345678`, `sifre123`, `galatasaray`). Gerçek bir sızıntı veri tabanının
yerini tutmuyor.

**Alternatif (HIBP range API):** çok daha kapsamlı, ama:
- ABD merkezli **üçüncü bir veri işleyici** demek → `integrations.md` ve KVKK
  aydınlatma metnine yeni satır, rıza metni gözden geçirilmeli
- Servis çökerse ne olacak sorusu (kayıt engellensin mi, geçilsin mi)
- ⭐ Teknik olarak şifre **gönderilmiyor** (özetin ilk 5 karakteri gidiyor,
  k-anonimlik) — yani gizlilik riski sanıldığından düşük, ama **sıfır değil**
  ve KVKK açısından yine de bir aktarım

**Seçenekler:** (a) HIBP ekle, (b) yerel listeyi büyüt (ör. en yaygın 10 000
şifre, dış servis yok), (c) bugünkü hâliyle bırak.

### 5.2 Borç #89 — Google ile açılmış hesapta ikinci kanıt

**Bugün:** şifresi olan hesapta hesap silme ve kimlik çözme şifre istiyor.
Yalnızca Google ile açılmış hesapta tek kanıt oturumun kendisi.

**Neden bugüne kadar çözülmedi:** zorunlu kılmanın tek yolu kullanıcıyı
Google'a yeniden gönderip dönüşü beklemekti (yeni bir OAuth modu, yeni callback
dalı). Alternatif "önce şifre belirle" demekti — kullanıcıyı hesabını silmek
için şifre kurmaya zorlamak. **KVKK m.11 silme hakkını bir teknik ayrıntıya
bağlamaz**; o hesapların hiç silinememesi daha ağır bir sorun olurdu.

**Seçenekler:** (a) "yeniden kimlik doğrula" OAuth modu ekle (~1 oturumluk iş),
(b) bugünkü hâliyle bırak ve borç kaydında tut.

---

## 6. ⛔ Devraldığım iddialardan ikisi YANLIŞ çıktı

### 6.1 Borç #78'in endişesi yanlıştı

Kayıt "vekil sunucu istemcinin gönderdiğine EKLİYORSA saldırganın sayacı
sıfırlaması mümkün" diyordu ve doğru bir şey de ekliyordu: *"resmî dokümandan
bakılmadan karar verilmemeli."* Bakıldı — Vercel `docs/headers/request-headers`:

> "we currently **overwrite** the `X-Forwarded-For` header and **do not forward
> external IPs**. This restriction is in place to **prevent IP spoofing**."

Dahası, aynı belge `x-real-ip` için "**identical to** the `x-forwarded-for`
header" diyor — yani roadmap'in **önerdiği çözüm** ("`x-real-ip`'i önce oku")
hiçbir şeyi değiştirmezdi. Borç kaydı yalnızca yanlış bir risk değil, **yanlış
bir çözüm** de reçete ediyordu.

### 6.2 Borç #99'un yarısı zaten yapılmıştı

Kayıt "her iş akışına açık `permissions:` bloğu eklenir" diyordu. Ölçüldü:
ikisinde de `permissions: contents: read` **zaten vardı** (`ci.yml:14`,
`e2e.yml:12`). Gerçek iş yalnızca SHA sabitlemeydi.

### 6.3 Kendi hipotezimi de yanlışladım

Turnstile bulmacasının iframe'i CSP altında çizilmedi ve bunu CSP'ye yormaya
hazırdım. **Kontrollü deney yapıldı:** proxy tamamen kaldırıldı, yeniden
derlendi, aynı ölçüm tekrarlandı — **iframe CSP olmadan da çizilmiyor**. Yani
bu bir regresyon değil; local ortamda site anahtarı bu alan adına bağlı
olmadığı için zaten çizilmiyor.

**Sonra sebep KESİN olarak bulundu.** Preview dağıtımının konsolunda
Turnstile'ın kendi hata kodu vardı: **`110200`**. Cloudflare belgesi bunu
*"Domain not authorized — Add current domain in Hostname Management"* diye
tanımlıyor. Yani ne local ne preview alan adı Turnstile panelinde yetkili;
**CSP'yle hiçbir ilgisi yok** (yeni borç #114).

⛔ **#113 yine de açık:** production alan adı yetkili ve proje sahibi kutuyu
orada görüyor — ama o gözlem **merge'den önceki** canlıya, yani eski CSP'ye
ait. Sıkı CSP altında çalıştığı ancak bu dal canlıya çıktıktan sonra
doğrulanabilir.

---

## 7. Ölçülmedi — dürüstlük bölümü

| Ne | Neden |
|---|---|
| Turnstile bulmacasının CSP altında çizilmesi | Local'de anahtar alan adına bağlı değil (§6.3) — borç #113 |
| Sızma testi / otomatik tarayıcı (ZAP, Burp) | Bu adımın kapsamı değildi; kaynak kodu denetimi yapıldı |
| Canlı ortamda CSP'nin fiilen uygulanması | Bu dal henüz merge edilmedi — merge sonrası duman testinde bakılacak |
| Bağımlılıkların typosquat / `postinstall` denetimi | `npm audit` CVE'leri görür, kötü niyetli paketi görmez |

---

## 8. Sonraki denetim ne zaman

- **Adım 19 (mobil uygulama) başlamadan önce** — API artık aynı deploy'da
  güncellenmeyen bir istemciye açılacak; A01 ve A05 yeniden değerlendirilmeli
- Kullanıcıdan **URL alan** ilk uç eklendiğinde → A10 (SSRF) yeniden
- **Dosya yükleme** yüzeyi genişlerse → A03 ve A04 yeniden
- Gerçek kullanıcı sayısı 0'dan çıktığında → A09 (borç #97 ve #102 artık bedelli)
