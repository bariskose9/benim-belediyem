# 00 — Teknoloji Stack'i

Bu dosya "neyi kullanıyoruz, neyi kullanmıyoruz" sorusunun tek cevabıdır.
Burada olmayan bir kütüphane projeye eklenmeden önce **onay alınır** ve ADR yazılır.

## Stack — başlangıç noktası, dondurulmuş liste DEĞİL

⛔ **Bu tablo bir örnektir ve her projede yeniden ölçülür.** Aşağıdaki
*"STACK KURULURKEN HER TEKNOLOJİNİN GÜNCEL ALTERNATİFİ TARANIR"* bölümü
kurulumda fiilen çalıştırılır: ajan her satırı ölçer, itirazı veya daha iyi bir
alternatifi varsa **gerekçesiyle sunar**, kararı **geliştirici** verir.

- Kabul edilen değişiklik → projede ADR + `teknoloji-ve-plan.md`
- Her projede geçerliyse → `/kit-senkron` ile bu dosyaya geri yazılır
- Reddedilen → ADR'ye *"değerlendirildi, seçilmedi"* (aynı soru bir daha
  araştırılmasın)

⛔ Ajan **tek başına** stack değiştirmez; bulguyu sunar, onayı bekler.

### ⛔ DAYATILAN SEÇİM, KİTİN VARSAYILANINI YENER

Bu dosyadaki her seçim bir **varsayılandır**, bir dayatma değil. Sıra şudur ve
tartışmasızdır:

| # | Kaynak | Ne zaman geçerli |
|---|---|---|
| 1 | **Analiz dokümanı / şartname** | Yazılıysa **o uygulanır** — tartışma kapanır |
| 2 | **Kurumun zorunlu tuttuğu araç** | DevOps'un desteklediği neyse o |
| 3 | **Kitin varsayılanı** (bu dosya) | Yukarıdaki ikisi sessizse |

⛔ Kapsam yalnızca kütüphane seçimi değildir: **paket yöneticisi, dosya
isimlendirme biçimi, dizin düzeni ve CI platformu da bu sıraya tabidir.**
Kurum `npm` kullanıyorsa kitin `pnpm` tercihi geçmez; kurum `PascalCase`
dosya adı istiyorsa kitin `kebab-case` tercihi geçmez.

⚠️ **Dayatma olup olmadığı TAHMİN EDİLMEZ, SORULUR** — `SKILL.md` Adım 1,
*"STACK'İ HEMEN KURMA"*.

⭐ **Kurum sessiz kaldığı her konuda kalite DÜŞMEZ, YÜKSELİR.** İşyeri projesi
"kurum ne isterse o" demek değildir: kurumun kural koyduğu yerde kurum,
**geri kalan her yerde kitin en kapsamlı varsayılanı** (test, tip güvenliği,
mimari test, erişilebilirlik, performans bütçesi) uygulanır. DevOps'un ek
istekleri bunun **üstüne** eklenir, yerine geçmez.

⚠️ **Emsal (precedent) ≠ dayatma.** Kurumda daha önce yapılmış bir proje
(*"şu projede böyle yapılmış"*) ortamı **kanıtlı** anlatır — hesap adları,
DevOps'un ne verdiği, hangi dış servisin var olduğu. Ama o projenin mühendislik
seçimleri (ORM'siz SQL, test yokluğu, kod dili) **kural değildir**; öğrenilir,
sorgulanır, kopyalanmaz. Emsalden alınan her olgu
`kurumdan-ogrenilecekler.md`'de **"doğrulanacak"** olarak işaretlenir — o
projede doğru olan bu projede değişmiş olabilir.


### ⛔ KARAR NEREYE YAZILIR — yönlendirme tablosu

⛔ **Her seçim ADR gerektirmez, ama hiçbir seçim de kayıtsız kalmaz.** Ölçüt
şudur: *"altı ay sonra biri 'bu neden böyle' diye sorarsa cevabı nerede?"*
Cevap sohbet geçmişiyse, o cevap **yoktur**.

| Durum | Nereye yazılır | ADR şart mı |
|---|---|---|
| Dayatma vardı, kitin varsayılanıyla **aynıydı** | Stack tablosu + `teknoloji-ve-plan.md` **Kutu 1** | ⛔ Hayır |
| Dayatma vardı, **eşdeğerini** kullandık | ADR (kısa) + **Kutu 2** | ✅ Evet |
| Dayatma **yoktu**, kitin varsayılanı kuruldu | Stack tablosu yeter | ⛔ Hayır |
| ⭐ Dayatma **yoktu**, kitin varsayılanından **sapıldı** | ⛔ **ADR** + **Kutu 3** | ✅ Evet |
| Dayatma vardı, **uymadık** | ⛔ **ADR** + **Kutu 4** + ölçü | ✅ Evet |
| Geri dönüşü pahalı her karar (veritabanı, oturum, şifreleme, dış servis) | ⛔ **ADR** | ✅ Evet |

⭐ **"Kutu" ne demek:** `teknoloji-ve-plan.md` → *"Kararların dört kutusu"*.
Her teknoloji anlatılırken hangi kutuda olduğu yazılır; okuyan bir bakışta
*"bu istendi mi, biz mi ekledik"* sorusunu cevaplar.

#### İki dosya, iki ayrı iş — karıştırılmaz

| | `decisions/ADR-*.md` | `teknoloji-ve-plan.md` |
|---|---|---|
| Ne | Kararın **bağlayıcı kaydı** | Kararın **anlatımı** |
| Kim için | Sonraki oturum · başka geliştirici · denetçi | Öğrenen kişi · devralan kişi |
| İçinde ne var | Bağlam · karar · **elenen alternatifler** · bedel | Bu teknoloji nedir, neden burada, hangi kutuda |
| Kaç tane | Karar başına **bir dosya** | Projede **tek dosya**, her adımda büyür |
| Gerekçe nerede yaşar | ⭐ **Burada** | ⛔ Kopyalanmaz — ADR'ye **işaret edilir** |

⛔ **Gerekçe iki yerde yazılmaz** (`11-agent-workflow.md` → *"AYNI BİLGİ İKİ
YERDE YAZILMAZ"*). ADR gerekçenin evidir; `teknoloji-ve-plan.md` *"neden bu
seçildi — ADR-004"* der ve devam eder. İkisi ayrı ayrı yazılırsa biri
güncellenir, diğeri bayatlar ve hangisinin doğru olduğu anlaşılmaz.

⚠️ **İkisi de projenin deposunda durur** (`docs/project/`), kitte değil. Sebebi:
projeyi devralan başka bir yazılımcı depoyu klonladığında kararları da almış
olur. Kite yalnızca **her projede geçerli olan kural** gider (`/kit-senkron`).

#### Onay sırası — kullanıcı neyi onaylıyor

1. Ajan seçimi **yapar** ve gerekçesini söyler (`11-agent-workflow.md` →
   *"MÜHENDİSLİK SEÇİMİ KULLANICIYA DEVREDİLMEZ"*)
2. ⛔ Analiz dokümanında yazmayan bir seçimse bunu **açıkça belirtir**:
   *"Şartnamede bu konuda bir şey yok; ben şunu seçtim, sebebi şu"*
3. Kullanıcı onaylar veya itiraz eder — itiraz ederse karar değişir
4. ⭐ Karar **hangi kutuda olduğuyla birlikte** yukarıdaki tabloya göre yazılır

⛔ **3. adım atlanamaz ama 1. adım da atlanamaz.** Kullanıcıya menü sunmak
(*"hangisini istersin?"*) ile seçimi bildirmek (*"şunu seçtim, çünkü…"*) farklı
şeylerdir; bu kit ikincisini yapar.

Sürüm sütunu **fiilen kurulu** olanı gösterir; `package.json` ile birebir aynıdır.

⭐ **Bu projede gerekmeyen satır SİLİNMEZ, DURUMU YAZILIR.** Silinirse altı ay
sonra *"bunu neden kurmadık"* sorusu yeniden araştırılır. Üç durum:

| İşaret | Anlamı |
|---|---|
| `✅ kurulu` | Fiilen var; sürüm sütunu doludur |
| `⏳ sonra` | Gerekecek ama henüz değil — **hangi adımda** geleceği yazılır |
| `➖ bu projede yok` | **Gerekçesiyle** — örn. *"mobil yok, Expo kurulmadı"* |

| Katman | Seçim | Sürüm | Not |
|---|---|---|---|
| Framework | Next.js (App Router) | 16 | Pages Router kullanılmaz |
| Dil | TypeScript (strict) | 6 | JavaScript dosyası eklenmez · TS 7 henüz kullanılamıyor, aşağıya bak |
| Stil | Tailwind CSS | 4 | v4 CSS-first: `tailwind.config.ts` yok, token'lar `src/app/globals.css` içinde |
| UI bileşen | shadcn/ui (Radix tabanlı) | CLI 4 | Bileşen repoya kopyalanır, paket olarak bağlanmaz |
| Backend | Next.js Route Handlers (`src/app/api/**`) | — | Ayrı Express sunucusu kurulmaz |
| ORM | Prisma | 7 | Ham SQL sadece performans gerekçesiyle, ADR ile |
| Veritabanı | PostgreSQL | 18 | Local Docker imajı Neon'daki yama sürümüyle eşitlenir |
| Oturum (şifreyle giriş) | Paket yok — elle yazılmış veritabanı oturumu | — | Jeton httpOnly çerezde, oturum `sessions` tablosunda · ADR-002 · ADR-005 |
| Auth (Google ile giriş) | `openid-client` — elle yazıldı (PKCE + `state` + `nonce`) | 6.8 | ✅ kurulu · **Auth.js YOK**: `Credentials` sağlayıcısı JWT'ye zorluyor, ADR-005 anlık iptal istiyor · Google callback'i şifreyle girişle aynı `sessions` tablosuna yazar · aşağıya bak |
| Şifre özetleme | `argon2` (argon2id) | 0.45.1 | Parametreler `src/config/constants.ts` içinde · ADR-011 |
| Bot koruması | Cloudflare Turnstile | — | Giriş gerektirmeyen formlarda zorunlu · ADR ile kabul edildi |
| Validasyon | Zod | 4 | Her API girişinde zorunlu |
| Form | React Hook Form + Zod resolver | 7.83 / 5.5 | |
| Sunucu durumu | TanStack Query | — | ➖ bu projede yok — bugüne kadar gerekmedi: sayfalar sunucu bileşeni, tazeleme `router.refresh()` ile |
| İstemci durumu | Zustand | — | ➖ bu projede yok — gerekmedi · Redux kullanılmaz |
| Tarih | date-fns (+ `tr` yerel ayarı) | 4.4.0 | `moment.js` kullanılmaz |
| Unit test | Vitest + Testing Library | 4 | |
| E2E test | Playwright | 1.62 | Masaüstü + 375px mobil viewport |
| Erişilebilirlik denetimi | `@axe-core/playwright` | — | CI'da kritik ihlal = kırmızı |
| Performans denetimi | Playwright + Chrome DevTools protokolü (`tests/quality/`) | — | ✅ kurulu · Lighthouse paketi **GEREKMEDİ** (adım 18c'de ölçüldü) · bütçe kapısı `07-ui-design-system.md` |
| Hata takibi | Sentry (`@sentry/nextjs`) | 10.70 | ✅ kurulu · ücretsiz katman · tek süzgeçten geçer (ADR-018) |
| Hız sınırı | Ayrı paket yok — Postgres sayaç tablosu | — | Sunucusuzda bellek sayacı çalışmaz · ADR ile kabul edildi |
| Lint/Format | ESLint + Prettier | 9 / 3 | ESLint 10 kullanılamıyor, aşağıya bak |
| CI | GitHub Actions | — | |
| Hosting | Vercel | — | |
| Dosya depolama | PostgreSQL `BYTEA` (`data Bytes?`) | — | ✅ kurulu · Vercel Blob **kurulmadı**; destek ekleri küçük ve DB'de · repoya dosya yüklenmez, `public/` altına asla |
| Konteyner | Docker + Docker Compose | — | Sadece local geliştirme ve öğrenme amaçlı |
| Mobil | Expo (React Native) | — | ⏳ adım 19 — aynı REST API'yi tüketecek |

## Sürüm tavanları — neden en yenisi değil

Bunlar tercih değil, **kısıt**. Kısıt kalkınca yükseltilir.

| Paket | Kullanılan | En yenisi | Neden yükseltilmedi |
|---|---|---|---|
| TypeScript | 6 | 7 | `typescript-eslint` TS 7'yi desteklemiyor (peer aralığı `<6.1.0`). TS 7'ye çıkmak lint kapısını tamamen devre dışı bırakırdı |
| ESLint | 9 | 10 | `eslint-config-next`'in içindeki `eslint-plugin-import` ve `eslint-plugin-jsx-a11y` en fazla ESLint 9 kabul ediyor |
| Node.js | 24 | 26 | 24 Active LTS; 26 henüz LTS değil (`00-stack.md` "Node.js LTS" kuralı) |

## Kimlik doğrulama — bilinen tuzak

`next-auth` (Auth.js) v5 hâlâ **beta** yayınlanıyor (`5.0.0-beta.*`); `latest`
etiketi v4'te. Daha önemlisi, **kaynak koddan doğrulanmış** bir sınır var
(`@auth/core` → `assert.ts`):

> `"Signing in with credentials only supported if JWT strategy is enabled"`

Yani **şifreyle giriş, veritabanı oturumu stratejisiyle çalışmıyor.** Oturumun
anında iptal edilebilir olması gerekiyorsa (çıkış ve şifre değişimi tüm
oturumları gerçekten düşürsün — `05-auth-security.md`) şifre girişi **elle**
yazılır; Auth.js yalnızca OAuth sağlayıcıları için kullanılır. Bu karar her
projede ADR ile kayda geçer.

### Bu projede — Auth.js YOK, oturum modeli ADR-005


**Şifreyle giriş Auth.js kullanmıyor.** Adım 4b-2'de karar verildi ve kaynaktan
doğrulandı: `@auth/core`, `Credentials` sağlayıcısını yalnızca JWT oturum
stratejisiyle çalıştırıyor (`packages/core/src/lib/utils/assert.ts` →
_"Signing in with credentials only supported if JWT strategy is enabled"_).
JWT ise ADR-005'in tek varlık sebebini — çıkışın ve şifre değişiminin oturumu
**anında** düşürmesi — teknik olarak sağlayamıyor. Bu yüzden oturum elle
yazıldı: `sessions` tablosu, httpOnly çerezde rastgele jeton, jetonun
veritabanında yalnızca özeti. Ayrıntı: ADR-005'in 2026-08-01 tarihli güncelleme notu.

**Google ile giriş (adım 4c) de aynı kararla yazıldı:** `next-auth` kurulmadı; akış `openid-client` ile elle (PKCE + `state` + `nonce`) ve callback, şifreyle girişle aynı `sessions` tablosuna yazıyor — çerez adı ve biçimi tek. Ayrıntı: `src/app/api/auth/google/callback/route.ts`.

⛔ **Bu projede oturum modeli ADR-005'tir.** Kitin `.claude/rules/guvenlik.md` tetikleyicisi "JWT çerezde + `tokenVersion`" der; kaynak hiyerarşisinde (CLAUDE.md §1) ADR standarttan ÜSTÜNDÜR. Tetikleyici buna uymuyorsa **ADR geçerlidir** — oturum yeniden yazılmaz, tetikleyici bu projede uygulanmaz.


## Backend kurgusu — Next tek başına mı, Next + NestJS mi

**Varsayılan: Next.js tek başına** (arayüz + Route Handler API, tek deploy
hedefi). Ayrı backend, ikinci bir deploy · CORS · kimlik doğrulamanın iki
tarafta kurgulanması · tiplerin elle paylaşılması · yerel geliştirmede dört
süreç demektir. Bu bedel **karşılığı varsa** ödenir.

⛔ **Soruları sormadan önce NEDEN sorulduğunu söyle:**

> *"Dört soru soracağım. Amacım şunu belirlemek: her şeyi tek bir programda mı
> yazacağız (Next.js), yoksa arayüzü ve API'yi ayrı iki programa mı böleceğiz
> (Next.js + NestJS). Ayırmanın bedeli var — iki deploy, ek ayar, iki yerde
> kimlik doğrulama — bu yüzden karşılığı olmadan ayırmıyoruz."*

**Sorularda geçen terimler:**

| Terim | Ne demek |
|---|---|
| **İstemci / tüketici** | API'den veri çeken program (web arayüzü, mobil uygulama, başka kurumun sistemi) |
| **Zamanlanmış görev** | Kimse ekranı açmasa da belirli saatlerde kendiliğinden çalışan iş |
| **Webhook** | Dış bir sistemin sana istek atması (ödeme sağlayıcısının "ödeme tamamlandı" bildirimi gibi) |
| **DI yaşam döngüsü** | Bir nesnenin bellekte ne kadar yaşayacağı: uygulama boyunca tek kopya mı, her istekte yeni mi |
| **Sunucusuz platform** | Vercel gibi, sürekli açık bir sunucu yerine istek geldikçe çalışan ortamlar |

**Sorular. Hepsi "hayır" ise Next tek başına; en az biri "evet" ise
Next (arayüz) + NestJS (API + worker):**

1. API'yi kendi web arayüzünden **başkası** tüketecek mi? (mobil uygulama,
   başka bir sistem)
2. Kullanıcı istek atmasa da **kendiliğinden** çalışması gereken iş var mı?
   (gece çalışan tarama, zamanlanmış hatırlatma, webhook karşılama)
3. Katmanlı mimari, **DI yaşam döngüsü** ve çok modüllü bir yapı gerekiyor mu?
4. ~~Kod kurumun kendi sunucusunda mı çalışacak?~~ ⛔ **Tetikleyici değil.**
   Kurum sunucusu yalnızca *"ayrı worker mümkün"* demektir; Next tek başına da
   orada çalışır. Kararı 1 ve 2 verir — ayrıntı aşağıda *"DÖRT KURGU"* → *"Karar
   akışı"*.

**Gerekçe:** Next Route Handler ile API yazılabilir ama iki şeyi veremez —
sürekli çalışan arka plan süreci ve başkasının tüketeceği birinci sınıf bir API
(otomatik OpenAPI, sürümleme, Guard/Pipe). Bunlara ihtiyaç yoksa ikinci sunucu
saf maliyettir. ⭐ **İşyeri projesinde varsayılan Next + NestJS'tir** —
gerekçesi *"DÖRT KURGU"* bölümünde.

⛔ **"Ayrı backend" kararı ADR'siz alınmaz.** Hangi koşulun sağlandığı yazılır.

Ayrı backend seçildiyse:

| Konu | Seçim | Gerekçe |
|---|---|---|
| Çatı | **NestJS** (çıplak Express değil) | Nest zaten Express'in üstünde çalışır; ayrıca modül, DI, Guard, Interceptor, Pipe, Filter getirir. Çıplak Express yalnızca 5–10 uçlu tek amaçlı serviste |
| HTTP adaptörü | **Express** (Nest varsayılanı) | İstek süresinin ~%95'i veritabanında geçer; HTTP katmanını hızlandırmak toplamda ölçülemez. Emek index'lere harcanır. *(Fastify adaptörü tek satırla değişir — ama ölçmeden geçilmez)* · **Ani yük gerekçesi de yeterli değildir**, aşağıya bak |
| API biçimi | **REST** (varsayılan) | Karar kuralı aşağıda — "API biçimi" |
| Sürümleme | `/api/v1/...` baştan | Kural `03-api-guidelines.md` → "Sözleşme ömrü"nde. Mobil varsa zorunlu |
| Monorepo aracı | pnpm workspaces + **Turborepo** | Yapı `01-architecture.md`'de. Nx daha güçlü ama kendi eklenti dünyasını getirir — bu boyutta gereksiz |
| Tip paylaşımı | `packages/contracts` | Zod şeması tek yerde; API alanı değişince frontend **derlenmez**, hata çalışma anına kalmaz |
| İş kuyruğu | BullMQ + Redis | **Yalnızca sürekli açık worker varsa.** Sunucusuzda çalışmaz — aşağıya bak |
| Log | `nestjs-pino` | JSON üretir; kurumsal toplama sistemleri düz metin toplayamaz (`12-operations-and-scaling.md`) |
| İstek bağlamı | `nestjs-cls` | Aktif kullanıcı ve correlation ID'yi katmanlara parametre geçmeden taşır; statik erişim yasağının karşılığı |

## ⭐ DÖRT KURGU — hangisi neden, ve her birinde bir isteğin HATTI

Yukarıdaki dört soru **hangi kurguya** gireceğini söyler; bu bölüm her kurguda
**neyin neden kurulduğunu** ve bir isteğin baştan sona **hangi araçlardan
geçtiğini** anlatır. Katmanların tanımı ve "durak durak" örneği
`01-architecture.md` → *"BİR İSTEĞİN TAM YOLU"*'nda; burada tekrarlanmaz,
kurgular arası **fark** anlatılır.

Önce iki kavram, dört adımla:

**Kurgu / topology / mimari düzen** — *Gerçek hayat:* Bir işletmenin bina
planı: her şey tek dükkânda mı, dükkân + ayrı depo mu, yalnızca vitrin mi
(mal başkasının deposundan geliyor), yalnızca depo mu (vitrin başkasında).
*Yazılım:* Arayüz, API, iş kuralı, kuyruk ve veritabanının **kaç ayrı programa**
bölündüğü. *Bu projede:* `CLAUDE.md` §0'daki "Backend kurgusu" satırı.

**Hat / request path / istek yolu** — *Gerçek hayat:* Restoranda siparişin yolu:
garson → mutfak → depo → mutfak → garson → masa. Her durak tek iş yapar; depo
yemek pişirmez. *Yazılım:* Tarayıcıdan çıkan bir HTTP isteğinin veritabanına
gidip cevabın geri dönene kadar geçtiği duraklar. *Bu projede:* Aşağıdaki
şemalar; her durağın dosyası `01-architecture.md` → *"Klasör yapısı"*.

### Karar akışı — soruların sırası ve ağırlığı

```
Arayüz bizde mi?
├─ HAYIR → [D] YALNIZCA API — arayüzü başkası yazıyor
└─ EVET → Veri ve iş kuralı bizde mi?
          ├─ HAYIR → [A] YALNIZCA ARAYÜZ — mevcut API'lere bağlanır
          └─ EVET → API'yi başkası tüketecek mi?  VEYA  kendiliğinden çalışan iş var mı?
                    ├─ EVET (en az biri) → [C] NEXT + NESTJS (+ worker)
                    └─ HAYIR (ikisi de)  → [B] NEXT TEK BAŞINA
```

⛔ **"Kod kurumun sunucusunda çalışacak" tek başına [C]'ye götürmez.** Next.js
tek başına Docker'da kurum sunucusunda sorunsuz çalışır — kurumlarda bu
şekilde canlıda olan projeler var. O soru yalnızca şunu açar: **ayrı worker ve BullMQ mümkün**
— sunucusuz platformda mümkün değildi. Kararı **tüketici** ve **arka plan işi**
verir; DI/katman ihtiyacı da tek başına belirleyici değildir, Next içinde de
katman kurulur (`01-architecture.md`).

⭐ **İşyeri (belediye) projesinde varsayılan [C]'dir.** Gerekçe: kurum içi
sistemler birbirine bağlanır (EBYS, e-Belediye, diğer müdürlükler, mobil) ve
*"bugün tüketen yok"* yarın değişir; ayrık API'yi **sonradan** çıkarmak servis
katmanını yeniden yazmaktır. Tek istisna: saf içerik/tanıtım sitesi — hiçbir
sistem tüketmeyecek, arka plan işi yok — o zaman [B], **ADR ile**. Kendi
projede varsayılan [B] kalır (sunucusuz, düşük maliyet).

---

### [A] YALNIZCA ARAYÜZ — veri ve API kurumda, biz ekranı yazıyoruz

**Ne zaman:** Kurum *"API'miz hazır, siz ekranları yapın"* der; veritabanına
dokunma yetkimiz yok.

**Neden bu araçlar:**

| Araç | Neden var |
|---|---|
| Next.js (App Router) | Sunucu bileşenleri kurumun API'sini **sunucuda** çağırır; API anahtarı tarayıcıya hiç inmez |
| Route Handler — **BFF** rolünde | *backend-for-frontend / arayüz arka ucu*: tarayıcı kurumun API'sine doğrudan gitmez, önce bizim ince katmana gelir. *Gerçek hayat:* otel resepsiyonu — misafir mutfağı aramaz, resepsiyon arar |
| TanStack Query | Sunucu verisini önbellekler, yeniden dener, "yükleniyor / hata" durumunu yönetir |
| ⭐ **Zod — gelen CEVABI doğrular** | Dış API'nin döndüğüne güven yok: alan adı değişirse çalışma anında değil, `parse` anında yakalanır |
| `openapi-typescript` | Kurum OpenAPI belgesi verdiyse tipler **elle yazılmaz**, belgeden üretilir |
| MSW (Mock Service Worker) | Kurumun API'si erişilemezken (VPN yok, test ortamı kapalı) aynı sözleşmeyle **simüle** edilir (`00-stack.md` → *"SİMÜLE EDİLEN DIŞ SERVİS"*) |

**Hat:**

```
Tarayıcı ──fetch──▶ Route Handler (BFF)  ──HTTP──▶  KURUMUN API'Sİ ──▶ kurumun DB'si
   ▲                  │ kimlik/anahtar ekler                │
   │                  │ Zod.parse(cevap) ◀──────────────────┘
   └── TanStack Query ─┘ (önbellek, yeniden deneme)
```

**Bu kurguda OLMAYAN:** Prisma, migration, veri modeli, PostgreSQL. Bize lazım
olan **API sözleşmesi** (`03-api-guidelines.md`), veri modeli değil
(`04-database.md` → *"Bu proje bunlara ihtiyaç duyar mı"*).

---

### [B] NEXT TEK BAŞINA — arayüz + API + veri, tek program

**Ne zaman:** Tüketici yalnızca kendi arayüzümüz, kendiliğinden çalışan iş yok.
İçerik siteleri, yönetim panelleri, küçük iç araçlar.

**Neden bu araçlar:**

| Araç | Neden var |
|---|---|
| Next.js Route Handler | Dışa açılan HTTP ucu (webhook, dosya, açık API); ayrı sunucu, ayrı deploy, CORS yok |
| Server Action | Kendi formlarının yazma yolu — URL yok, `useActionState` ile durum; kimlik + Zod action içinde (`01-architecture.md` → *"Server Action mı, Route Handler mı"*) |
| React Hook Form + Zod | Form **tarayıcıda** aynı şemayla doğrulanır — kullanıcı hatayı göndermeden görür |
| Zod (sunucuda, aynı şema) | ⛔ Tarayıcı doğrulaması güvenlik değildir; sunucu **yeniden** doğrular. Aynı şema iki yerde, tek tanım |
| Servis · Repository | Katman Next içinde de kurulur; HTTP'yi bilmeyen iş kuralı yarın NestJS'e **taşınabilir** olsun |
| Prisma | ORM: nesne ↔ tablo çevirisi (`01-architecture.md` → *"ORM ne demek"*) |
| PostgreSQL | Tek veri kaynağı |
| Inngest / QStash (gerekirse) | Sunucusuz uyumlu "sonra yap" — e-posta, PDF. BullMQ **çalışmaz** (aşağıdaki *"İş kuyruğu"*) |

**Hat:**

```
Tarayıcı ─(form: RHF + Zod)─▶ Route Handler ─Zod.parse─▶ Servis ─▶ Repository ─▶ Prisma ─SQL─▶ PostgreSQL
                                   │ kimlik çöz (cookie)     │ iş kuralı          │ prisma.x.create()      │
                                   ◀──── 201 / 422 ◀────────┘◀──── nesne ◀───────┘◀──── satır ◀──────────┘
```

**Bu kurguda OLMAYAN:** sürekli açık worker, Redis, DI konteyneri, ikinci
konteyner. Ağır iş varsa Inngest/QStash ile HTTP üzerinden tetiklenir.

---

### [C] NEXT + NESTJS (+ WORKER) — arayüz ayrı, API ayrı program

**Ne zaman:** API'yi başkası da tüketecek (mobil, başka müdürlük, dış sistem)
**veya** kimse ekranı açmasa da çalışması gereken iş var (gece raporu, SMS
kuyruğu, webhook). ⭐ **İşyeri projesinde varsayılan.**

**Neden bu araçlar:**

| Araç | Neden var |
|---|---|
| Next.js | Yalnızca ekran: sunucu bileşenleri NestJS'i çağırır, istemci bileşenleri TanStack Query ile; form yazmaları Server Action üzerinden NestJS'e (ince BFF — token sunucuda kalır) |
| NestJS (Express adaptörü) | API **birinci sınıf ürün** olur: modül, DI, Guard, Pipe. Spring/.NET bilen kurum ekibi deseni tanır. Express, Nest'in altında zaten var; çıplak kurulmaz |
| **Guard** | *Gerçek hayat:* bina girişindeki kartlı kapı. İstek controller'a **ulaşmadan** kimlik (JWT) ve rol kontrolü |
| **Pipe** + `nestjs-zod` | Gövdeyi Zod şemasıyla doğrular, DTO'ya çevirir; geçemeyen 400 ile döner, controller'ı hiç görmez |
| Controller · Service · Repository | `01-architecture.md` katmanları; controller HTTP, service kural, repository Prisma |
| `packages/contracts` | Zod şemaları **tek yerde**; Next ve Nest aynı paketi içe alır — alan adı değişince arayüz **derlenmez** |
| OpenAPI (Swagger) — otomatik | `@nestjs/swagger` şemadan belge üretir; tüketen ekip `/api/docs`'u açar, bize sormaz. `/api/v1` sürümleme baştan |
| **BullMQ + Redis** | Kuyruk: *"sonra yap"* listesi Redis'te durur; worker sırayla alır. Sunucu 7/24 açık olduğu için mümkün |
| **Worker** (ayrı süreç/konteyner) | Kuyruktan iş alır, **aynı servis katmanını** çağırır — kural iki yerde yazılmaz |
| `nestjs-pino` · `nestjs-cls` | JSON log (kurum toplama sistemi için) · istek bağlamı (correlation ID) katmanlara parametre geçmeden |
| Turborepo + pnpm workspaces | Üç paket (web, api, contracts) tek repoda, tek komutla |

**Hat — eşzamanlı (senkron) istek:**

```
Tarayıcı ─▶ Next (RSC / TanStack Query) ─fetch─▶ NESTJS
                                                  │ Guard    : JWT doğru mu, rol yeter mi      ✗→ 401/403
                                                  │ Pipe     : Zod.parse(gövde) → DTO          ✗→ 400
                                                  │ Controller: servisi çağır, HTTP'ye çevir
                                                  │ Service  : iş kuralı
                                                  │ Repository ─▶ Prisma ─SQL─▶ PostgreSQL
                                                  ◀── 201 + nesne ◀──────────── satır ◀─┘
```

**Hat — arka plan işi (SMS gönderimi örneği):**

```
Service: "SMS gönder" ─▶ queue.add(job) ─▶ REDIS (kuyruk)      ← istek burada 202 ile DÖNER,
                                                │                  kullanıcı beklemez
   WORKER (ayrı süreç, 7/24) ◀── job al ────────┘
     │ aynı Service'i çağırır ─▶ kurumun SMS API'si
     │ başarısız → BullMQ yeniden dener (backoff), 3'te de olmazsa "dead letter"
     └─ sonuç: PostgreSQL'e durum yazar → arayüz polling / WebSocket ile görür
```

*Gerçek hayat:* Kargo şubesi — paketi bırakırsın, fiş alırsın (202), teslimatı
kurye sonra yapar; olmadıysa tekrar dener, üçte de olmazsa "teslim edilemedi"
rafına kaldırır.

**Bu kurguda OLMAYAN:** Route Handler içinde API (Next yalnızca BFF olarak,
gerekiyorsa). Inngest/QStash gereksiz — worker zaten var.

---

### [D] YALNIZCA API / SERVİS — arayüzü başkası yazıyor

**Ne zaman:** Mobil ekip, başka müdürlük ya da mevcut bir portal arayüzü
yapıyor; bizden yalnızca API isteniyor.

**Neden bu araçlar:** [C]'nin NestJS yarısı, Next'siz. Ek olarak **zorunlu**:

| Araç | Neden var |
|---|---|
| OpenAPI belgesi + Swagger UI | Teslim edilen **ürün** budur; ekran yok. Tüketen ekip belgeye bakar |
| `/api/v1` sürümleme | Tüketiciyi biz güncelleyemeyiz; kırıcı değişiklik yeni sürümde |
| Postman/Bruno koleksiyonu | Teslim paketine girer; DevOps ve tüketen ekip tek tıkla dener |
| Sözleşme testi (contract test) | Belge ile gerçek cevap ayrışmasın: CI'da OpenAPI'ye karşı doğrulama |

**Hat:** [C]'deki NestJS hattı; istemci bizim değil.

**Bu kurguda OLMAYAN:** Next.js, React, Tailwind, shadcn. Arayüz teslimi yok.

---

### Migration yan yolu — hattın ÜSTÜNDE değil, ÖNCESİNDE

Dört kurguda da (A hariç) aynı; isteğin hattında **hiç yer almaz**
(`01-architecture.md` → *"İKİ YAYGIN YANLIŞ ANLAMA"* → 2. madde):

```
Geliştirici schema.prisma'yı değiştirir
  └─ prisma migrate dev (LOCAL) ─▶ migration SQL dosyası üretilir ─▶ git'e girer
       └─ MR → CI (ci:verify) → merge → imaj
            └─ DEPLOY ANI: prisma migrate deploy (kendi proje) / scripts/migrate.mjs + V__ dosyaları (kurum) — DDL yetkili hesapla, advisory lock
                 └─ uygulama başlar → istekler artık yalnızca DML (svc_ hesabı)
```

⭐ İki hesap ayrımı ve kurum biçimi (`V__` dosyaları) `04-database.md` ve
`13-environments.md` → *"Yol C"*'de.

### Kurgular arası geçiş — neden katman baştan kurulur

[B]'den [C]'ye geçiş, servis ve repository katmanı Next içinde **HTTP'den
bağımsız** yazıldıysa dosya taşımaktır; Route Handler'ın içine `if` yığıldıysa
yeniden yazmaktır. Katman kuralı bu yüzden "küçük projede birleştirilebilir"
denerek gevşetilmez (`01-architecture.md` → *"DEĞERLENDİRİLDİ, REDDEDİLDİ"*).

## İş kuyruğu — mimariye göre DEĞİŞİR, tek doğru yok

⛔ **BullMQ sunucusuz ortamda çalışmaz.** BullMQ sürekli açık bir Redis'e ve
7/24 ayakta duran bir worker sürecine ihtiyaç duyar. Vercel/Lambda'da fonksiyon
yanıtı döndürdüğü an kapanır; worker yaşayamaz. Bu bir yapılandırma sorunu
değil, **mimari uyumsuzluktur.**

| Kurgu | Kuyruk | Neden |
|---|---|---|
| **Next tek başına** (Vercel) | **Inngest** veya **Upstash QStash** | Sunucusuz uyumlu: iş HTTP ile tetiklenir, tekrar deneme ve zamanlama servis tarafında |
| **Next + NestJS worker** (kendi sunucun / konteyner) | **BullMQ + Redis** | Worker zaten sürekli açık; Redis'i de sen çalıştırıyorsun |
| **Kurum sunucusu, kuyruk altyapısı zaten var** | Kurumunkini kullan | `kurumdan-ogrenilecekler.md`'de sorulur — RabbitMQ/Kafka varsa yenisi kurulmaz |

### Ne zaman kurulur — baştan mı, sonra mı

⭐ **Şu işlerden biri varsa BAŞTAN kurulur:** e-posta/SMS gönderimi · PDF veya
rapor üretimi · görsel boyutlandırma · dış servise toplu istek · zamanlanmış
hatırlatma.

Gerekçe: bu işler istek döngüsünün içinde yapılırsa kullanıcı beklerken sunucu
zaman aşımına düşer, ve **sonradan çıkarmak** servis katmanını yeniden yazmayı
gerektirir. Baştan kurmak yapımı yavaşlatmaz; sadece "işi kuyruğa at" satırı
yazılır.

⛔ **Hiçbiri yoksa kurulmaz.** Kullanılmayan kuyruk, bakımı ve maliyeti olan
ölü altyapıdır. Satır `➖ bu projede yok` olarak işaretlenir.

### Maliyet — sürekli açık sunucu bedeli

| Seçenek | Ödenen |
|---|---|
| Inngest / QStash | **Kullanım başına.** Ücretsiz katman küçük projeye yeter; iş yoksa ücret yok |
| BullMQ + Redis | **Sürekli açık iki şey**: Redis örneği + worker konteyneri. İş olmasa da fatura işler |

⛔ Bu yüzden **düşük hacimli projede BullMQ seçmek pahalıdır.** Zaten kendi
sunucun ayakta duruyorsa maliyet zaten ödenmiştir, o zaman BullMQ mantıklıdır.
Karar ADR'ye yazılır.

### ⭐ Kuyruğa ne zaman atılır — commit'ten sonra; kayıp kabul edilemezse outbox

Başvuru kaydedilecek **ve** "başvurunuz alındı" SMS'i gidecek. Kayıt
PostgreSQL'e, SMS işi Redis'teki kuyruğa yazılır — iki ayrı sistem.
Transaction ("ya hepsi ya hiçbiri") yalnızca **PostgreSQL'in içinde**
geçerlidir; Redis dışarıda. İkisini birden garanti edemezsin ve sıraya göre
iki farklı kaza olur:

| Sıra | Kaza | Sonuç |
|---|---|---|
| `queue.add` transaction **içinde**, sonra commit | Commit patlar — ama iş Redis'e çoktan girdi | "Başvurunuz alındı" gider, başvuru **yok** — **hayalet iş** |
| Commit, **sonra** `queue.add` | Commit oldu, tam o an süreç öldü / Redis'e ulaşılamadı | Başvuru **var**, SMS **yok** — **kayıp iş** |

*Gerçek hayat:* noterde sözleşme — imzalanmadan kargoyu çağırmak (hayalet)
ile imzaladıktan sonra telefonun çekmemesi (kayıp). İkincisi daha az kötüdür:
sözleşme var, kargoyu sonra çağırırsın.

⛔ **Varsayılan: `queue.add` commit'ten SONRA.** Kayıp iş hayalet işten iyidir
ve telafisi kolaydır: gece koşan bir tarama (`12-operations-and-scaling.md` →
*"Planlı görevler"*) "SMS'i gitmemiş kayıtları" bulup tamamlar. Çoğu iş için
yeter.

**Kayıp kabul edilemezse — outbox / transactional outbox / giden evrak
kutusu:** iş Redis'e değil, **aynı transaction içinde** bir `outbox` tablosuna
yazılır — kayıt satırı ile "SMS gönder" satırı aynı commit'te ya ikisi olur
ya hiçbiri. Ayrı küçük bir süreç (aktarıcı / relay — worker'ın yanında
çalışır) tabloyu tarar, satırı Redis'e atar, `sent_at` işaretler. *Gerçek
hayat:* kurumun **giden evrak defteri** — evrak deftere işlenmeden işlem
tamamlanmış sayılmaz; kurye postaneye değil deftere bakar.

Bedeli: bir tablo + bir süreç, ve işin **iki kez** gitme ihtimali (aktarıcı
Redis'e attı, `sent_at` yazamadan düştü). Bu yüzden worker **idempotent**
olmalıdır: iş verisinde mesaj kimliği taşınır, aynı kimlikle ikinci SMS
atılmaz (`03-api-guidelines.md` → *"İdempotency"*).

⭐ **Kararı veren soru:** *"Bu iş kaybolursa ne olur?"* Kullanıcı fark etmez /
gece taraması telafi eder → commit sonrası. Kullanıcı mağdur olur / bildirim
yasal zorunluluk → outbox, ADR ile.


## Anlık veri — yenile düğmesi mi, polling mi, SSE mi, WebSocket mi

**Anlık veri / realtime**: sunucuda bir şey değişince kullanıcının ekranının
**kendisi yenilemeden** güncellenmesi — kuyruk numarası, işlem durumu,
sohbet. *Gerçek hayat:* bankadaki sıra ekranı: sen bakmasan da numara döner.
Dört yol var, bedeli artan sırada:

| Yol | Nasıl | Gecikme | Bedel | Ne zaman |
|---|---|---|---|---|
| **Yenile / odak dönüşü** | TanStack Query sekmeye dönünce yeniden çeker | Kullanıcı bakınca | Sıfır | ⭐ Çoğu iş uygulaması — "randevum onaylandı mı" |
| **Polling** (düzenli sorma) | İstemci her N saniyede sorar (`refetchInterval`) | N saniye | Her istemci × N — sunucuya sabit yük | Sonuç 1–2 dk içinde yetiyor (arka plan işi durumu, rapor hazır mı) |
| **SSE** (Server-Sent Events) | Sunucu tek yönlü akış açar, olay olunca gönderir | Anında | Açık bağlantı başına bellek; **tek yön**; HTTP üstünde, vekil/CDN dostu | Bildirim, ilerleme çubuğu, canlı pano |
| **WebSocket** | Çift yönlü kalıcı bağlantı | Anında | Sunucusuzda **çalışmaz**; ölçeklemede yapışkan oturum veya Redis pub/sub gerekir | Sohbet, ortak düzenleme, oyun — **iki yön** şart |

⛔ **Sunucusuz (Vercel) kurguda WebSocket yok** — fonksiyon cevap dönünce
kapanır, bağlantı yaşayamaz; SSE de süre sınırına takılır. Kurgu [B]'de
anlık ihtiyaç varsa: polling, ya da yönetilen bir kanal (Pusher/Ably) — ADR
ile. Kurgu [C]'de NestJS **gateway** (`@WebSocketGateway`, socket.io) ya da
SSE (`@Sse()`); iki kopya varsa olaylar **Redis pub/sub** ile paylaşılır —
yoksa A sunucusundaki olay B'ye bağlı kullanıcıya ulaşmaz.

⭐ **Kararı veren soru:** *"Kullanıcı ekrana bakmıyorken değişen veriyi
görmemesi bir zarar mı?"* Hayır → odak dönüşü. Evet ama dakika toleransı
var → polling. Saniye toleransı, tek yön → SSE. İki yön → WebSocket.
Kanal seçimi ADR'ye, dayandığı PRD maddesiyle.

## E-posta — gönderim ve şablon

İşlem e-postaları (OTP kodu, "başvurunuz alındı", şifre sıfırlama) üç
parçadan oluşur ve üçü ayrı yerde yaşar:

| Parça | Ne | Kendi proje | Kurum |
|---|---|---|---|
| **Gönderici** (transport) | Postayı fiilen taşıyan servis | Resend (`00-stack` Yol A) | Kurumun mail geçidi / SMTP (`kurumdan-ogrenilecekler.md` → 5.2) |
| **Şablon** (template) | Postanın görünümü ve metni | **react-email** — şablon bir React bileşeni, `pnpm email dev` ile tarayıcıda önizlenir | Aynı |
| **Kuyruk** | Gönderim istek döngüsünün dışında | Inngest/QStash | BullMQ + Redis |

*Gerçek hayat:* matbaa (şablon) · postane (gönderici) · posta kutusu (kuyruk)
— mektubu yazarken postanenin kim olduğunu bilmezsin.

**Kurallar:**
- Uygulama bir `Mailer` **arayüzüne** konuşur; sürücü ortam değişkeniyle
  seçilir (`resend` · `smtp` · `fake`). `fake` sürücü postayı konsola/dosyaya
  yazar — local ve CI'da **her zaman** çalışan yol; OTP testi gerçek posta
  beklemez (`00-stack.md` → *"SİMÜLE EDİLEN DIŞ SERVİS"*).
- ⛔ Şablon metni koda gömülmez; `react-email` bileşeninde, kullanıcıya
  görünen metin kuralıyla (`02-coding-standards.md` → *"Kullanıcıya görünen
  metin"*). Düz metin (text) sürümü **her zaman** üretilir — HTML'i
  göstermeyen istemciler ve erişilebilirlik için.
- Gönderim **kuyruktan**: istek 202 ile döner, başarısızsa yeniden denenir;
  üçte de olmazsa "dead letter" ve uyarı (`00-stack.md` → *"İş kuyruğu"*).
- Kişisel veri e-postaya **yazılmaz** (TCKN, tam adres); bağlantı kısa ömürlü
  ve imzalı (`05-auth-security.md`).
- Gönderen alan adı için SPF/DKIM/DMARC kayıtları — kendi projede sen, kurumda
  DevOps; kayıtsız posta spam'e düşer (`altyapi-durumu.md`).
- **"Gönderdim" ≠ "ulaştı".** Gönderici teslim olaylarını (delivered · bounced ·
  complained) webhook'la bildirir; `email_deliveries(message_id, durum, neden,
  zaman)` tablosuna yazılır. **Sert bounce** (adres yok) → adres geçersiz
  işaretlenir, bir daha denenmez; **yumuşak bounce** (kutu dolu) → kuyruk yeniden
  dener. OTP gibi zaman kritik postada kullanıcıya "kod gelmedi → yeniden gönder"
  yolu ve soğuma süresi verilir; teslim durumu destek ekranında görünür
  ("gönderildi 14:02 · teslim edildi 14:02" / "adres geçersiz"). SMS için aynı
  kalıp (`kurumdan-ogrenilecekler.md` → 5.2).
  ⚠️ İddia: henüz hiçbir projede fiilen kullanılmadı — ilk kullanan ölçüp düzeltir.

## API biçimi — REST tek başına mı, yanına GraphQL de mi

⚠️ **Bu bir "birini seç" sorusu değil.** REST ile GraphQL aynı sistemde yan yana
çalışabilir; ikisi de yalnızca **giriş kapısıdır**, arkalarındaki iş kuralları
ortaktır. Bugün REST yazmak, yarın GraphQL eklemeyi engellemez — yeter ki iş
kuralları HTTP'den bağımsız tutulsun (`01-architecture.md`).

**Varsayılan REST'tir.** GraphQL, aşağıdaki sorular cevaplanmadan eklenmez.

### Kullanıcıya sorulacak dört soru

⛔ **Soruları sormadan önce NEDEN sorulduğunu söyle.** Kullanıcı, cevabının
hangi karara dönüşeceğini bilmeden cevap veremez. Şu cümleyle aç:

> *"Şimdi dört soru soracağım. Amacım şunu belirlemek: API'nin yalnızca REST
> olarak mı yazılacağı, yoksa yanına bir de GraphQL kapısı mı ekleneceği.
> Cevaplarına göre hangisinin daha mantıklı olduğunu birlikte göreceğiz."*

**Sorularda geçen terimler — sormadan önce açıkla:**

| Terim | Ne demek |
|---|---|
| **İstemci (client)** | API'ye istek atan program. Senin web arayüzün, mobil uygulaman, başka bir kurumun sistemi — hepsi birer istemci |
| **Tüketici (consumer)** | Aynı şey. "API'yi tüketmek" = o API'den veri almak |
| **İzleme (monitoring)** | Sistem canlıdayken neyin yavaşladığını, neyin hata verdiğini gösteren araçlar. Kurumlarda genelde DevOps ekibinin kurduğu ayrı bir sistem |
| **Önbellek (cache)** | Sık istenen verinin geçici olarak saklanması; aynı istek tekrar gelince veritabanına gitmeden cevaplanır |

**Sorular. Hepsine "hayır" ise REST tek başına yeterlidir** ve GraphQL gündeme
getirilmez:

1. **API'yi senin yazmadığın istemciler tüketecek mi?**
   Yani senin kontrol etmediğin programlar bu API'den veri çekecek mi —
   başka bir müdürlüğün sistemi, yüklenici firmanın portalı, merkezî bir devlet
   sistemi, açık veri portalı gibi.
   *(Kendi web'in ve kendi mobilin "hayır" sayılır — onları sen yazıyorsun.)*

2. **Tüketicilerin veri ihtiyaçları birbirinden belirgin farklı mı?**
   Biri kaydın 3 alanını isterken diğeri 25 alanını mı istiyor? Yoksa hepsi
   aşağı yukarı aynı bilgiyi mi kullanıyor?

3. **Tüketicileri sen güncelleyemiyor musun?**
   API'de kırıcı bir değişiklik yaptığında, o istemcilerin kodunu düzeltmek
   senin elinde mi, yoksa başka bir ekibi beklemek zorunda mısın?

4. **İzleme ve önbellek kurumun altyapısına mı bağlı?**
   Sistemi canlıda sen mi izleyeceksin, yoksa DevOps ekibinin kendi araçları mı?
   → ⚠️ Bu soruya **"evet"** cevabı GraphQL'in **aleyhinedir**, lehine değil.
   Sebebi aşağıda.

### Dördüncü sorunun ağırlığı

Kurum projelerinde sistemi canlıda **DevOps ekibi** izler. GraphQL'de tüm
istekler tek adrese (`/graphql`) gittiği için *"hangi uç yavaşladı, hangisi hata
veriyor"* sorusu izleme aracında **görünmez.** Aynı sebeple HTTP önbelleği de
devre dışı kalır.

⛔ Kurum projesinde bu iki kayıp, açık bir gerekçe olmadan kabul edilmez.

### GraphQL eklenirse

Mevcut REST kaldırılmaz; yanına ikinci bir kapı açılır ve **servis katmanına
dokunulmaz.** Karar ADR ile kayda geçer; ADR'de yukarıdaki dört sorudan
hangilerinin "evet" olduğu yazılır.

⚠️ Bedeli baştan yazılır: HTTP önbelleğinin kaybı, izlemenin körleşmesi,
yetkilendirmenin alan bazına inmesi, N+1 sorgu riski ve bunlar için gereken ek
çözümler.

### Terim notu

REST bir mimari **stildir**; onunla yazılmış sisteme **RESTful** denir.
GraphQL ise bir **sorgu dili ve şartnamedir** — "GraphQL-ful" gibi bir sıfat
yoktur, yalnızca *"GraphQL API"* denir. REST'e uyum **derecelidir**, GraphQL
şartnamesine uyum **ikilidir**.

## ⭐ SİMÜLE EDİLEN DIŞ SERVİS — bugün sahte, yarın gerçek

Bazı dış servisler projenin ilk gününde **bağlanamaz**: ödeme sağlayıcısı üye
iş yeri sözleşmesi ister, kimlik sorgulama servisi (KPS benzeri) kurum izni
ister, SMS sağlayıcısı fatura ister. Bunlar gelene kadar akış **taklit edilir.**

⛔ **Taklit bir eksiklik değil, bir KARARDIR** — ve karar olduğu için yazılır.
Yazılmazsa iki şey olur: sonraki oturum sahteyi gerçek sanır, ya da gerçeğe
geçme günü neyin değişeceğini kimse bilmez.

### Karar nereye yazılır

| Ne | Nereye |
|---|---|
| *"Bu servis şu an simüle ediliyor, sebebi şu"* | ⛔ **ADR** — yukarıdaki *"KARAR NEREYE YAZILIR"* tablosu |
| Gerçeğine geçiş **hangi roadmap adımında** | `roadmap.md` — teknik borç değil, **planlı adım** |
| Sağlayıcı seçildiğinde hesap ve anahtar durumu | `altyapi-durumu.md` |
| Kullanıcıya görünen uyarı | Ekranda **açıkça** yazar: *"Bu bir test ödemesidir"* |

### ⛔ NEYİN SAHTE OLDUĞU DEĞİŞİR, MÜHENDİSLİK DEĞİŞMEZ

Simüle edilen şey **veri ve dış çağrıdır**; kural değildir
(`11-agent-workflow.md` → *"GERÇEK PROJE VARSAYILANI"*). Aşağıdakiler sahte
akışta da **birebir aynı** uygulanır:

| Kural | Sahte akışta da geçerli mi |
|---|---|
| Kart verisi veritabanına yazılmaz, yalnızca son 4 hane + işlem kimliği | ✅ **Evet** |
| Tutar ve indirim **sunucuda** hesaplanır, istemciden alınmaz | ✅ Evet |
| İşlem idempotent — aynı anahtar iki kez ödeme üretmez | ✅ Evet |
| Kimlik sorgusunda ikinci doğrulama alanı + hız sınırı | ✅ Evet (`05-auth-security.md`) |
| Denetim kaydı yazılır | ✅ Evet |
| Sorgulanan kimlik numarası log'a yazılmaz | ✅ Evet |

⭐ **Sebep:** sahte akış, gerçeğin geldiği gün **yerine takılacak** olan iskelettir.
İskeleti gevşek kurarsan gerçeğe geçiş bir entegrasyon değil, yeniden yazım olur.

### Gerçeğine geçilirken — kontrol listesi

1. **Sözleşme ve hesap** hazır mı; anahtarlar hangi ortamda tanımlı (`altyapi-durumu.md`)
2. **Sağlayıcının sözleşmesi** okundu mu — alan adları, hata kodları, zaman aşımı
3. ⛔ **Taklit uçlar silinir** (`/api/mock-*`), belgeleri de onlarla gider
4. **Idempotency ve yeniden deneme** gerçek sağlayıcının davranışına göre ölçülür
5. **Test kartları / test kimlikleri** yalnızca `local` ve `preview`'da; production'da **asla**
6. ⛔ **Kişisel veri envanteri güncellenir** — gerçek servise gerçek veri gidiyor
   (`14-privacy-and-compliance.md`); aydınlatma metni ve işleyici listesi değişir
7. Geçiş **ADR'ye** yazılır: *"ADR-00X'i yerini aldı"*

⚠️ **Bu adım roadmap'te ayrı bir satırdır.** *"Sonra gerçeğine geçeriz"* bir plan
değildir; hangi adımda, neyin geldiğinde geçileceği yazılır.

## Kullanılmayacaklar

Her madde **neden** kullanılmadığını söyler. ⛔ Gerekçesiz yasak sonraki
oturumda delinir. Bir maddenin gerekçesi bu projede geçerli değilse **yasak da
geçerli değildir** — o zaman ADR yazılır ve karar gerekçesiyle değiştirilir;
madde sessizce çiğnenmez.

- **Supabase / Firebase (BaaS — Backend as a Service / hazır arka uç)** —
  *Ne:* veritabanı, kimlik doğrulama, dosya deposu ve anlık veri (realtime)
  tek pakette, bir şirket işletiyor; sen SDK'yı çağırıyorsun, sunucu yazmıyorsun.
  *Gerçek hayat:* hazır mutfaklı kiralık daire — hemen yaşamaya başlarsın ama
  mutfağı taşıyamazsın, sahibi kirayı ve kuralları değiştirir.
  *Neden kitte yok — üç sebep:*
  1. **Kuruma taşınmaz.** Kurum projesinde veri kurumun sunucusunda kalır; Supabase
     Auth, RLS (row level security — satır bazlı yetki, veritabanının içinde) ve
     Storage orada yoktur. Kendi projende Supabase'le öğrendiğin kimlik/yetki
     deseni kurumda **sıfırdan** öğrenilir. Kitin ilkesi tersini ister: öğrenilen
     şey gerçek üretim pratiği olsun (`11-agent-workflow.md`).
  2. **Yetki iki yere bölünür.** Supabase'in gücü RLS'tir — kural veritabanında
     yaşar. Kitin mimarisinde yetki **servis katmanında**dır (`05-auth-security.md`);
     ikisi birlikte olunca "bu kural nerede" sorusu iki cevaplı olur, biri unutulur.
  3. **Parçalar zaten var, ayrı ayrı ve taşınabilir:** veritabanı Neon (kurumda
     kurumun Postgres'i), kimlik argon2 + JWT (`tokenVersion`), dosya `FileStorage`
     adaptörü (R2 / MinIO). Her parça bağımsız değiştirilebilir; Supabase'de hepsi
     birlikte gider.
  ⭐ **Meşru istisna:** bir hafta sonu prototipi, portföy demosu, "arka uç hiç
  yazmayayım" denen tek kişilik deneme — o zaman ADR ile ve *"kuruma
  taşınmayacak"* notuyla. NestJS + Supabase birleşimi ise iki kez ödemektir:
  Nest'in getirdiği kimlik/yetki/depolama katmanını Supabase de getirir, biri
  boşta kalır.
- **MongoDB** — bu kitin hedeflediği işler (başvuru, kayıt, randevu, yetki,
  ödeme) **ilişkiseldir**: yabancı anahtar, bütünlük kuralı ve çok tablolu
  transaction ister. Postgres bunları veritabanı seviyesinde zorlar; Mongo'da
  yabancı anahtar ve bildirimsel bütünlük yoktur, aynı garantiler uygulama
  koduna taşınır ve ilk eşzamanlı istekte kaybedilir (`04-database.md` →
  *"Eşzamanlılık"*: benzersiz index + transaction).
  ⭐ **Kararı veren soru — modül modül:** *"Bu kayıtlar başka kayıtlara
  bağlanıyor mu ve aynı anda birlikte değişiyor mu?"* (başvuru ↔ kentli ↔ ödeme:
  evet → ilişkisel). *"Kayıtlar birbirinden bağımsız, şeması kayıttan kayda
  değişiyor ve hacmi büyük mü?"* (sensör ölçümü, tıklama olayı: evet →
  belge/NoSQL). Aynı projede ikisi de olabilir; ilişkisel olan Postgres'te,
  olay akışı ayrı bir depoda — ADR ile.
  ⭐ **Meşru istisna:** şeması gerçekten belirsiz, ilişkisiz ve yüksek hacimli
  veri (ham log, olay akışı, sensör kaydı). Böyle bir modül çıkarsa bu bir yasak
  değil **ADR konusudur** — Postgres `jsonb` ile karşılaştırılır, ölçülür, karar
  yazılır.
- **Redux / MobX** — durum ikiye ayrılır: sunucu durumu ve istemci durumu.
  Sunucu durumunu TanStack Query zaten önbellek, yeniden deneme ve geçersiz
  kılmayla yönetiyor; geriye kalan istemci durumu Zustand'ın birkaç satırıyla
  çözülüyor. Redux bu ikisinin üstüne yalnızca kalıp kod ekler.
- **Çıplak Express backend** — Nest zaten Express'in üstünde çalışıyor ve modül
  yapısını, bağımlılık enjeksiyonunu hazır getiriyor. Çıplak Express aynı yapıyı
  elle kurmayı gerektirir ve her projede farklı çıkar; ortak kural yazılamaz.
- **jQuery, Bootstrap, Material UI** — Tailwind + shadcn'in yanında **iki ayrı
  stil sistemi** oluşur: özgüllük (specificity) savaşları, çifte paket boyutu ve
  iki farklı token kaynağı. `07-ui-design-system.md` tek token ölçeği şart koşuyor.
- **`moment.js`** — geliştiricileri tarafından **bakım moduna alındı** ve yeni
  projeler için önerilmiyor. Ayrıca değişken (mutable) API'si var ve ağaç
  sarsmaya (tree-shaking) kapalı. Yerine `date-fns` + `tr` yerel ayarı.
- **TypeORM** — Prisma tercih edilir (4 kat yaygın, şema tek dosyada okunur,
  `synchronize` gibi veri kaybettiren bir kestirme yolu yok).

<!-- ⛔ SENKRON SINIRI — bu satır MAKİNE tarafından okunur, SİLİNMEZ.
     /kit-senkron bu satırı arar; bulamazsa bu bölümün TAMAMINI senkron dışı
     bırakır ve kite sonradan yazılan genel bir yasak bu projeye hiç ulaşmaz.
     2026-08-11'de tam olarak bu yaşandı. -->

### ⬆ Yukarısı KİTTEN gelir · ⬇ Aşağısı YALNIZCA bu proje

| | Yukarıdaki maddeler | Aşağıdaki maddeler |
|---|---|---|
| Kimin | Her projede aynı, kitten gelir | Yalnızca bu projeye ait |
| Kim değiştirir | `/kit-senkron` — **elle değiştirilmez** | Bu projede sen yazarsın |
| Kite geri gider mi | Zaten kitte | **Hayır**, projede kalır |

Aşağıya bu projede kullanılmayacak şeyleri **gerekçesiyle** yaz. Gerekçesiz
madde yazma: sonraki oturum anlamaz ve delmeye çalışır.

- Ödeme sağlayıcısı (Stripe/iyzico) — bu projede **fake ödeme** kullanılır

## Sürüm sütunu nasıl doldurulur

Yukarıdaki tablo bir **başlangıç noktasıdır**, kanıt değildir. Kurulum bitince
sürümler `package.json` ile **birebir eşitlenir**. En yenisi kullanılmıyorsa
**neden kullanılamadığı** yazılır — yoksa sonraki oturum "unutulmuş" sanıp
yükseltmeye çalışır ve aynı duvara toslar.

## Sürüm politikası
- Node.js LTS (>=20). Sürüm `.nvmrc` ile sabitlenir.
- **Paket yöneticisi `CLAUDE.md` §0'da yazar; kilit dosyası onunkidir.** Kendi
  projede varsayılan `pnpm` (`pnpm-lock.yaml`); kurum projesinde **kurumun CI
  hattı hangisini koşturuyorsa o** (`npm` → `package-lock.json`) — *"DAYATILAN
  SEÇİM"* kuralı; soru `kurumdan-ogrenilecekler.md` → *"BÖLÜM 5 — Ağ, dış servisler ve hat"* satır 5.4). Seçilen yöneticinin
  kilit dosyası **commit edilir**, diğerininki depoda bulunmaz; iki kilit
  dosyası = hangisi doğru belirsiz.

  ⭐ *Neden kendi projede `pnpm`:* monorepo `pnpm workspaces` üzerine kurulu
  (*"DÖRT KURGU"* → [C]), CI `pnpm install --frozen-lockfile` ile koşar
  (`09-ci-cd-deploy.md`); içerik-adresli depo disk ve süre kazandırır.
  ⛔ Bu bir **varsayılandır, dayatma değil** — 2026-09-20'de bir projede "npm
  yasak" gibi okunup kit sapması sanıldı; kural §0'a bağlandı.
  `package.json` içinde sürümler **tam** yazılır (`16.2.12`, `^16.2.12` değil).
  ⭐ Bunu **araç zorlar**, hafıza değil: `.npmrc` dosyasına `save-exact=true`
  (npm ve pnpm aynı anahtarı okur) — `npm install x` varsayılan olarak `^`
  yazar, bu ayar onu tam sürüme çevirir. *Gerçek hayat:* "unutma" notu
  yerine kapıya otomatik kilit. 2026-09-20'de bir projede yedi paket şapkalı
  bulundu; hepsi elle eklenmişti — ayar olsaydı hiçbiri olmazdı.
- Major sürüm yükseltmesi ayrı PR olur, feature PR'ına karıştırılmaz.
- Bir bağımlılıkta yamalanmış sürüm varsa ama bağımlılık ağacı eskisini çekiyorsa,
  `package.json` → `overrides` ile yükseltilir ve gerekçesi PR'da yazılır.

## ⛔ STACK KURULURKEN HER TEKNOLOJİNİN GÜNCEL ALTERNATİFİ TARANIR

Yazılım sürekli değişiyor. Bu dosyadaki tercihler **yazıldıkları gündeki**
ölçümlere dayanıyor; bugün hâlâ doğru oldukları **varsayılamaz.**

⛔ **Kurulumda (Adım 1) stack listesi hafızadan aktarılmaz.** Her satır için
ajan şunu fiilen çalıştırır:

```bash
npm view <paket> version time.modified          # hâlâ bakımda mı
curl -s https://api.npmjs.org/downloads/point/last-week/<paket>   # ne kadar yaygın
```

### Ne zaman kullanıcıya sorulur

| Bulgu | Ajan ne yapar |
|---|---|
| Seçili paket hâlâ yaygın ve bakımda | Sessizce devam eder — soru sorulmaz |
| Seçili paketin **son yayını 18 aydan eski** | ⚠️ Bildirir, alternatifi ölçer, **sorar** |
| Ölçülebilir biçimde **daha yaygın** bir alternatif çıkmış | ⚠️ İki rakamı yan yana koyar, **sorar** |
| Alternatif niş ama teknik olarak üstün | Bildirir ama **önermez** — yaygınlık kriteri kazanır |

⛔ **Ajan tek başına stack değiştirmez.** Bulgu sunulur, karar geliştiricinin.
Sebebi: projeyi o sürdürecek ve o teknolojiyi o öğrenecek.

### Karar verildikten sonra

| Karar | Nereye yazılır |
|---|---|
| Değişiklik **kabul edildi** | Projede ADR + `docs/project/teknoloji-ve-plan.md` |
| Değişiklik **her projede geçerli** | ⭐ `/kit-senkron` ile **bu dosyaya** — ölçüm tarihiyle birlikte |
| Değişiklik **reddedildi** | ADR'ye *"değerlendirildi, seçilmedi"* olarak — aynı soru bir daha araştırılmasın |

⭐ **Ölçüm tarihi olmadan rakam yazılmaz.** *"BullMQ 7.9M/hafta"* değil,
**"BullMQ 7.9M/hafta (2026-08 ölçümü)"**. Tarihsiz rakam, bir sonraki okuyucuya
güncel olduğunu **yanlış** söyler.

### ⭐ TARAMA NE ZAMAN TEKRARLANIR — katmanlı sıklık

Ölçüm tarihi yazmanın asıl işlevi budur: **eskiyeni görebilmek.**

⛔ Kurulumdaki tarama tek seferlik değildir. Ama **sabit ve sık bir takvim de
yanlıştır** — sebebi aşağıda. Üç katman var:

| Katman | Sıklık | Ne yakalar | Kim |
|---|---|---|---|
| Güvenlik ve sürüm | **Haftalık** | Yama, minor, major sürüm | 🤖 **Renovate** (otomatik PR/MR) |
| Ölçüm tazeleme | **6 ay** | Yaygınlık kayması, ölen paket | Ajan |
| **Olay tetikli** | **Anında** | Aşağıdaki dört an | Ajan |

#### ⭐ Tarihten bağımsız — HER ZAMAN taranacak dört an

Bunlar takvim beklemez; asıl değer buradadır:

| # | An | Neden |
|---|---|---|
| 1 | **`/yeni-proje` kurulumunda** | Zaten stack seçiliyor — en doğru an |
| 2 | ⭐ **Teslim / sunum / teknik inceleme öncesi** | Savunulacak her rakam güncel olmalı. Bayat bir ölçüm, incelemede tüm gerekçeyi çürütür |
| 3 | **Bir paket fiilen sorun çıkardığında** | Sorun, alternatife bakmak için yeterli sebeptir |
| 4 | **Major sürüm çıktığında** | Kırıcı değişiklik var mı, göç maliyeti ne |

#### ⛔ Neden 3 ay değil de 6 ay — gerekçe

**Renovate zaten haftalık çalışıyor** ve sürüm tarafını kapatıyor. Manuel
taramanın yakaladığı tek şey botun göremediğidir: *"paket ölüyor mu, yerine
daha yaygını çıkmış mı?"* Bu **yıllarla ölçülen** bir değişimdir — ekosistem
geçişleri (Jest→Vitest, Moment→date-fns) yıllar aldı.

⚠️ **Sık tarama kuralı öldürür.** Üç ayda bir bakılırsa cevap neredeyse her
seferinde *"değişmedi"* olur; sürekli "bir şey yok" diyen uyarı **kapatılan**
uyarıdır. Kuralın değeri yazılı olmasında değil, **uygulanmasında**.

#### Tarama nasıl yapılır

Bu dosyadaki **herhangi bir ölçüm tarihi 6 aydan eskiyse** — ya da yukarıdaki
dört andan biri geldiyse — ajan işe başlamadan önce tarar ve bulguyu bildirir:

> *"`00-stack.md`'deki ölçümler <tarih> tarihli, 6 aydan eski. Taradım:
> `<paket>` için durum değişmiş — <eski rakam> → <yeni rakam>. Diğerleri aynı.
> Değiştirelim mi?"*

**Ne aranır:**

| Kontrol | Eşik | Sonuç |
|---|---|---|
| Seçili paketin son yayını | 18 aydan eski | ⚠️ Bildir, alternatif ölç |
| Seçili paketin indirme sayısı | Belirgin düşüş | ⚠️ Bildir |
| Alternatifin indirme sayısı | Seçiliyi geçmiş | ⚠️ İkisini yan yana koy, sor |
| Ana sürüm atlamış mı | Yeni major | ⚠️ Kırıcı değişiklik var mı bak |

⛔ **Tarama sonucu otomatik uygulanmaz.** Bulgu sunulur, karar geliştiricinindir
(yukarıdaki kural). Değişmeyen satırların **tarihi yine de güncellenir** —
"baktım, aynı" bilgisi de bilgidir.

⚠️ **Tarama işi geciktirmez.** Oturumun asıl işi yapılır; tarama bulgusu
**ayrı bir başlıkta** sunulur ve kullanıcı isterse o zaman ele alınır.

---

## Yeni bağımlılık ekleme kuralı
Eklemeden önce sor ve şunu göster: ne işe yarıyor, alternatifi ne, paket boyutu,
son güncelleme tarihi, açık güvenlik uyarısı var mı. Tek fonksiyon için paket eklenmez.
