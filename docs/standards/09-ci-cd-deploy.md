# 09 — Paketleme, CI/CD ve Yayına Alma

## Ortamlar
| Ortam | Nerede | Veritabanı | Ne zaman |
|---|---|---|---|
| local | Docker Compose | local Postgres | geliştirme |
| preview | Vercel Preview | ayrı preview DB | her PR otomatik |
| production | Vercel Production | Neon production | `main`'e merge |

Ortamlar **veri paylaşmaz**. Production verisiyle test yapılmaz.

## Ürün nasıl paketlenir
- Next.js `next build` ile derlenir; Vercel bunu otomatik yapar.
- Build çıktısı repoya konmaz. Repo = kaynak kod + şema + migration + doküman.
- Docker imajı geliştirme ve öğrenme amaçlı tutulur:
  çok aşamalı build (deps → build → runner), root olmayan kullanıcı, `.dockerignore` zorunlu.
- Uygulama **12-factor** ilkesine uyar: yapılandırma ortam değişkeninden gelir,
  aynı imaj her ortamda çalışır, süreç durumsuzdur (state DB ve blob'da).

## CI pipeline (GitHub Actions — her PR'da)
```
install → lint → typecheck → unit test → build → bundle-size →
e2e test (+ axe) → lighthouse → pnpm audit
```
Herhangi biri kırmızıysa merge kapalıdır. Kural devre dışı bırakılmaz.

**Ölçülen kapılar** — `07-ui-design-system.md` bütçesi yalnızca yazılı bir hedef
değil, CI'da fiilen ölçülür:

| Adım | Neyi ölçer | Kırmızı olur |
|---|---|---|
| `bundle-size` | İlk yüklemedeki JS (gzip) | > 200KB |
| `lighthouse` | LCP, INP, CLS | LCP > 2.5s · CLS > 0.1 |
| `axe` (e2e içinde) | Erişilebilirlik ihlalleri | Kritik ihlal varsa |

Bu adımlar olmadan "performans bütçesi aşılırsa merge edilmez" kuralı
uygulanamaz — ölçüm yoksa kapı da yoktur.

### Bütçe zaten aşılmışken kapı nasıl kurulur — "cırcır" (ratchet)

Bir kapı çoğu zaman, ihlal **çoktan olmuşken** kurulur. O anda üç seçenek var
ve ikisi yanlıştır:

| Seçenek | Neden yanlış |
|---|---|
| Kapıyı hiç kurmamak | Bütçe yazılı bir dilek olarak kalır, durum sessizce kötüleşir |
| Kapıyı kurup "şimdilik" devre dışı bırakmak | Devre dışı bırakılabilen kapı, kapı değildir |
| **Kapıyı BUGÜNKÜ ÖLÇÜLEN değere kilitlemek** | ✅ doğrusu |

**Cırcır kuralı:**

1. Kapı, hedefe değil **bugün ölçülen değere** kurulur (küçük bir ölçüm payıyla).
   Bugünden kötüye gidiş merge edilemez.
2. Ölçülen değer ile hedef arasındaki fark **teknik borç olarak yazılır**:
   ne kadar, neden, hangi adımda ödenecek. Yazılmayan fark ödenmez.
3. Eşik yalnızca **SIKILIR**. Bir iyileştirme ölçüldüğünde eşik düşürülür;
   yeni değer sığmadığı için eşiği yükseltmek **yasaktır** — o, kapıyı
   kaldırmanın kibar hâlidir.
4. Hedef ve bugünkü değer **yan yana** durur (`current` / `target`), ki kapının
   geçmesi "bütçeyi tutuyoruz" sanılmasın.

⛔ Cırcır bir gevşetme değildir: öncesinde kapı **yoktur**. Ama "sıkılaştırma
sözü" olmadan cırcır, ihlali kalıcılaştırmanın adıdır — 2. madde şart.

### Kapı neyi ölçtüğünü söylemek zorundadır

Ölçüm ortamı hedef ortam değilse, kapının **ne söylemediği** dosyanın içine
yazılır. CI genelde localhost'ta ölçer; oradaki bir zaman değeri gerçek
kullanıcının gördüğü değer değildir. Böyle bir kapı bir **regresyon teli**
olarak değerlidir ama "bütçeyi tutuyoruz" kanıtı değildir ve öyle sunulmaz.

## Yayına alma akışı
1. PR açılır → preview URL otomatik oluşur
2. Preview üzerinde manuel doğrulama yapılır
3. Merge → production build → migration çalışır → yayın
4. Yayın sonrası duman testi (smoke test): giriş, ana akış, sağlık ucu

## Migration ve deploy sırası
Şema değişikliği ile kod değişikliği **geriye uyumlu** olacak şekilde ayrılır:
önce kolon eklenir → kod yeni kolonu kullanır → eski kolon sonraki sürümde düşürülür.
Tek adımda kolon silen deploy yapılmaz.

## Geri alma (rollback)
- Kod: Vercel'de önceki dağıtıma tek tıkla dönülür.
- Veritabanı: her production migration öncesi yedek alınır.
- Her deploy öncesi "bozulursa nasıl geri dönerim" sorusunun cevabı hazır olur.

### ⛔ BİR DAĞITIMI YENİDEN DAĞITMADAN ÖNCE ORTAMINI DOĞRULA

Başarısız bir **preview** derlemesini kurtarmak için kullanılan "yeniden dağıt"
komutu, hedef yanlış seçilirse **canlıyı geri alır.** Bir production dağıtımını
yeniden dağıtmak yeni bir production dağıtımı üretir ve onu canlı alan adına
**alias'lar** — yani site sessizce eski sürüme döner. Komut hata vermez; çıktıda
yalnızca alias satırı görünür.

Ölçülmüş olay (2026-08-13): preview derlemesi veritabanı uykuda olduğu için
`P1001` ile düştü. Kurtarmak için listedeki bir dağıtım yeniden dağıtıldı, ama
o dağıtım **preview değil production**'dı ve canlı ~80 saniye boyunca üç sürüm
eski bir yapıyı servis etti.

**Kural:**

1. Hedefin ortamını **komuttan önce** doğrula (`vercel ls` çıktısındaki
   `Preview` / `Production` sütunu). Kimlik veya URL'e bakarak tahmin etme
2. Listeyi kırparken (`head`/`tail`) hangi ucunu gördüğüne dikkat et — yanlış
   uç, **en eski** dağıtımı en yenisi sanmana yol açar
3. Yeniden dağıtımdan **sonra** canlının sürümünü ayrıca ölç
   (`/api/health` → `commit`), "başarılı" çıktısına güvenme
4. Geri alma yolu hazır olsun: doğru dağıtımı bul ve **terfi ettir** (`promote`)

⚠️ Asıl arızanın kendisi de yazılı bir tuzaktır: **uyuyan bir veritabanı deploy'u
düşürür** (`P1001`). Doğru ilk hamle yeniden dağıtmak değil, **önce veritabanını
uyandırmaktır** — o ortamın çalışan bir dağıtımındaki sağlık ucuna istek atmak
yeterli.

## Ortam değişkenleri

`.env.example` her zaman güncel tutulur ve **kurulum talimatı gibi** yazılır
(ayrıntı: `05-auth-security.md` → "Sırlar depoda DEĞİL — o hâlde nerede?").
Yeni değişken eklendiğinde PR açıklamasında **hangi ortama** eklenmesi gerektiği
yazılır.

⛔ **Bir ortam değişkeni üç yerde birden var olmak zorundadır:** `.env.example`
(adı ve tarifi) · ortam şemasında (doğrulaması) · ilgili ortamın panelinde
(değeri). Üçünden biri eksikse arıza **çalışma anında ve kullanıcının önünde**
çıkar. Bu yüzden şema, eksik değişkeni açılışta yakalar.

## README ve devreye alma kolaylığı
`README.md` şunları içerir: proje bir cümlede · gereksinimler (Node sürümü, Docker) ·
**tek komutla kurulum** · ortam değişkenleri listesi · sık kullanılan komutlar ·
klasör yapısı özeti · canlı ve preview bağlantıları.
Hedef: projeyi ilk kez klonlayan biri 10 dakikada çalıştırabilmeli.
`pnpm run setup` komutu: bağımlılık kurar, Docker'ı ayağa kaldırır, migrate eder, seed eder.

## Tedarik zinciri güvenliği (CI'nın kendisi bir saldırı yüzeyidir)

CI iş akışı, deponun **bütün sırlarına** erişen ve depoya yazabilen bir ortamdır.
Uygulamayı sıkılaştırıp CI'ı açık bırakmak, kapıyı kilitleyip anahtarı kapının
üstüne bırakmaktır.

### ⛔ Üçüncü taraf action'lar etiketle DEĞİL, tam commit SHA'sıyla sabitlenir

`uses: bir-org/bir-action@v4` yazmak, "o organizasyonun bugün ve **yarın** o
etikete koyacağı her şeye peşinen güveniyorum" demektir. Etiket **taşınabilir
bir işaretçidir**: sahibi (veya deposunu ele geçiren kişi) onu başka bir commit'e
çevirebilir ve senin yapın bir sonraki koşuda farklı kod çalıştırır. Bu teorik
bir risk değil, yaşanmış bir saldırı sınıfıdır.

GitHub'ın kendi kılavuzu bunu net söylüyor: bir action'ı tam uzunlukta commit
SHA'sına sabitlemek, onu **değişmez (immutable) bir sürüm** olarak kullanmanın
tek yoludur; ele geçirilen tek bir action deponun tüm sırlarına ve
`GITHUB_TOKEN` ile yazma yetkisine erişir
([GitHub Docs — Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)).

**Kural:**
- Üçüncü taraf action'lar **tam uzunlukta commit SHA** ile sabitlenir; yanına
  okunabilirlik için `# v4.2.1` yorumu yazılır
- SHA'nın action'ın **kendi deposundan** geldiği doğrulanır (fork'tan değil)
- Yükseltme, bağımlılık güncellemesi gibi ayrı bir PR'da ve değişiklik notu
  okunarak yapılır
- ⚠️ Bu, `actions/*` (GitHub'ın kendi action'ları) için de geçerlidir —
  GitHub'ın sabitleme zorunluluğu politikası onları da kapsıyor
- İş akışlarına **en az yetki** verilir: `permissions:` açıkça yazılır,
  varsayılan geniş jetona güvenilmez

### Sır taraması otomatiktir — "commit etmeyiz" bir mekanizma değildir

`.env` commit etmemek bir **niyettir**; niyeti kural yapan şey onu uygulayan
otomasyondur. Bu yüzden:
- Depoda sır taraması (GitHub secret scanning + push protection, ya da CI'da
  `gitleaks` benzeri bir adım) **açık** olur
- Bir sır sızdıysa sıra **değişmez**: önce iptal et/yenile, sonra geçmişi temizle.
  Ters sıra işe yaramaz — geçmiş temizlenene kadar sır çoktan kopyalanmıştır
- Yapı log'una sır basılmaz; ortam değişkeni `echo`'lanmaz

## Bağımlılık ve lisans politikası
- Yeni paket eklerken lisans kontrol edilir; GPL/AGPL paketler onay ister.
- Dependabot/Renovate ile güvenlik güncellemeleri otomatik PR olarak gelir.

### ⛔ CI PLATFORMA BAĞIMLI YAZILMAZ — adımlar betikte, dosya ince sarmalayıcı

Kurum bugün GitHub, yarın GitLab kullanabilir. ⛔ CI adımlarını platform
dosyasının içine yazmak, taşınmayı **projeyi yeniden kurmaya** çevirir.

**Kural:** gerçek adımlar `package.json` içinde **tek bir betikte** toplanır:

```json
{ "scripts": {
  "ci:verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:arch && pnpm build"
}}
```

Platform dosyaları yalnızca **onu çağırır**:

```yaml
# .github/workflows/ci.yml          # .gitlab-ci.yml
- run: pnpm install --frozen-lockfile
- run: pnpm ci:verify               #   script: pnpm ci:verify
```

**Üç yönlü kazanç:**

| # | Kazanç |
|---|---|
| 1 | ⭐ Aynı kapıyı **kendi makinende** tek komutla koşturursun — CI'ı beklemezsin |
| 2 | Hangi platforma gidilirse gidilsin CI çalışır; mantık iki yerde kopyalanmaz |
| 3 | Kural değişince **tek yer** güncellenir (`package.json`), iki dosya değil |

⭐ **İki dosya da baştan yazılır**, kurum hangisini kullanırsa kullansın.
Kullanılmayan dosya zararsızdır; taşınma günü **ek iş çıkmaz.**

⚠️ **Yalnızca isimler farklıdır** (`08-git-workflow.md` → *"Pull Request"*):

| | GitHub | GitLab |
|---|---|---|
| Dosya | `.github/workflows/ci.yml` | `.gitlab-ci.yml` |
| Değişiklik önerisi | Pull Request | Merge Request |
| Komut satırı | `gh` | `glab` |

⛔ **Teslim linki**, kurumun fiilen kullandığı platformdan verilir — ikisinden
birini seçmek bu kurulumu değiştirmez.

### ⭐ HAT KURUMUN MERKEZÎ DEPOSUNDAN GELİYORSA — `include` senaryosu

Kurumlarda `.gitlab-ci.yml` çoğu zaman hattı **tanımlamaz**, başka bir
depodan **alır**:

```yaml
# .gitlab-ci.yml — deponun dosyasının tamamı bu olabilir
include:
  - project: devops/ci-cd-yaml-dosyalar     # DevOps'un kendi deposu
    file: NXT-<proje-adi>.yml               # bu proje için oradaki tanım
```

**Hat / pipeline**: kod her gönderildiğinde (push) otomatik koşan kontrol
zinciri; adımları **iş** (job), gruplar **aşama** (stage) — biri kırmızıysa
sonraki çalışmaz. *Gerçek hayat:* fabrikadaki kalite kontrol bandı. `include`
ile hat **franchise** olur: mağaza kendi kuralını yazmaz, merkezin el kitabını
uygular. Kurum bunu tek kalıp, güvenlik (geliştirici gizli değeri dışarı
gönderen iş ekleyemez) ve tek bakım için ister — "tek DBA, çok ekip"
mantığının CI'daki hâli.

**Sonucu: hattın içeriği bizim kontrolümüzde değil.** Beş şey değişir:

| # | Ne değişir | Ne yapılır |
|---|---|---|
| 1 | Merkezî kalıp büyük ihtimalle "imajı derle → registry'ye gönder → test sunucusuna al"dır; **lint/typecheck/test aşaması olmayabilir** — "CI kırmızıysa merge yok" kapısı yok olur | **Sorulur** (`kurumdan-ogrenilecekler.md` → *"BÖLÜM 5"* satır 5.5). İzin varsa `include`'un altına **yerel iş** eklenir — GitLab buna izin verir: `verify: { stage: test, script: pnpm ci:verify }`. ⭐ *"Adımlar betikte"* kuralı tam burada işe yarar: DevOps'a **tek satır** istenir |
| 2 | Yerel iş eklenemiyorsa hat bizim testi hiç koşturmaz | Kapı **makineye** taşınır: `pre-push` kancası tam `ci:verify` koşturur (aşağıda *"Git kancaları"*). Kırmızıysa push olmaz |
| 3 | Kalıp `npm ci` koşturuyorsa `pnpm-lock.yaml` ilk adımda kırar | Kurum hangisini koşturuyorsa o (`00-stack.md` → *"DAYATILAN SEÇİM"*); sorulur (5.4), `package.json` → `packageManager` ona göre |
| 4 | DevOps yalnızca `docker build` koşturur; "önce şunu çalıştır" diyemeyiz | **Dockerfile kendi kendine yeter:** çok aşamalı; içinde sır yok; kurum ağının yavaş/kopan bağlantısı için `npm config set fetch-retries 5` / `fetch-retry-maxtimeout` ayarları; migration klasörü veya koşucu imaja girmemişse **derleme bilinçli olarak başarısız** — şemasız imaj üretilmesin |
| 5 | Dal → ortam eşlemesi (`main` → test, etiket → canlı) kalıbın içinde | Varsayılmaz, **kalıptan doğrulanır** (5.5). Kalıp "her etiket canlıya" diyorsa deneme etiketi canlıya çıkmaktır |

⛔ Merkezî hat, iki platform dosyasını da yazma kuralını **kaldırmaz**:
`.gitlab-ci.yml` = `include` (+ izin varsa `verify` işi); `.github/workflows/ci.yml`
yine yazılır, zararsızdır.

### ⭐ Git kancaları — kapı makinede de vardır, her modda

**Git hook / kanca**: git'in belirli anlarda (commit öncesi, push öncesi)
otomatik çalıştırdığı betik. *Gerçek hayat:* fabrika bandı kurumda değilse
kontrolü sevkiyattan önce kendi deponda yaparsın; kurumda olsa bile ürünü
kırık göndermezsin. Araç **husky** (en yaygın; `"prepare": "husky"` ile
`pnpm install`'da herkeste kurulur) + **lint-staged** (yalnızca değişen
dosyalara lint/format).

| Kanca | Ne koşar | Neden bu kadar |
|---|---|---|
| `pre-commit` | `lint-staged` — değişen dosyalarda Prettier + ESLint | Saniyeler; her commit'te tam test beklenmez |
| `pre-push` | Kendi proje: `typecheck` + birim testleri · **Kurum modu, hat bizim testi koşturmuyorsa: tam `ci:verify`** | Push, kodun makineden çıktığı an; kırmızı kod dışarı çıkmaz |
| CI | Tam `ci:verify` (+ e2e) | Kancalar atlatılabilir (`--no-verify`); CI atlatılamaz — o yüzden kanca CI'ın **yerine** değil, **önüne** |

⭐ **Kararı veren soru:** *"Kodum GitLab'a gitmeden önce kırmızıyı gören biri
var mı — o biri ben miyim, hat mı?"* Hat değilse kanca; hatsa da kanca (hız
için) — cevap her durumda "ikisi de".

### ⭐ Bağımlılık botu — proje tipine göre KARAR TABLOSU

⛔ **Bot her projede kendiliğinden kurulmaz.** Kurulum maliyeti proje tipine
göre kökten değişir:

| | **Kendi projem** | **İşyeri projesi** |
|---|---|---|
| Varsayılan | ✅ **Kurulur** — sorulmaz | ⛔ **Kurulmaz** — önce SORULUR |
| Kurulum | GitHub uygulaması, iki tık, altyapı yok | Bot hesabı + zamanlanmış hat + runner + registry erişimi |
| Kim kurar | Kullanıcı | **DevOps** — kullanıcının yetkisi yok |
| ⚠️ Gizli engel | Yok | **Kapalı kurum ağı** `registry.npmjs.org`'a çıkamayabilir → bot hiç çalışamaz |

**İşyeri projesinde ne yapılır:** Bot kurulmaz ama **hazırlığı teslim edilir** —
maliyeti sıfıra yakın:

| # | Ne | Nereye |
|---|---|---|
| 1 | `renovate.json` yapılandırması | Depoya |
| 2 | *"Bot çalıştırılırsa şunlar gerekli"* notu | `altyapi-durumu.md` |
| 3 | Bağımlılık politikası: ne otomatik geçer, ne incelenir | `00-stack.md` |

⭐ Doğru devir biçimi budur: geliştirici **politikayı** yazar, DevOps
**çalıştırmaya** karar verir. Çalıştırmasa da dosya zararsızdır.

⛔ **Ajan işyeri projesinde bot kurmadan önce sorar:**

> *"Bağımlılık güncelleme botu (Renovate) kurulsun mu? İşyeri projesinde bu
> DevOps işidir — bot hesabı, zamanlanmış hat ve npm registry erişimi gerekir.
> Şimdilik yalnızca yapılandırmayı teslim paketine koyabilirim."*

### ⛔ YENİ ALTYAPI ARACI ÖNCE KENDİ PROJENDE DENENİR

Bu yalnızca Renovate için değil — **her yeni bot, servis veya altyapı aracı**
için geçerli genel kural.

| Sıra | Nerede | Ne kazanılır |
|---|---|---|
| 1 | **Kendi projende kur ve kullan** | Haftada kaç PR geliyor, gürültü ne kadar, nasıl ayarlanır — **ölçülür** |
| 2 | Ayarları oturtup ölçüyü topla | Somut rakam elde edilir |
| 3 | Kuruma **ölçüyle** git | *"Şunu istiyorum"* değil, *"şu işi şöyle yapıyor, maliyeti şu"* |

⭐ **Sebebi öğrenme değil, pazarlık gücü.** Kurumda bir altyapı isteği, ne
istediğini net bilmeyen birinden geldiğinde reddedilir. Ölçüyle gelen istek
tartışılır.

⚠️ Ajan, kullanıcı kendi projesinde bir aracı bir süre kullandıysa **kuruma
taşımayı teklif eder** — kullanıcının hatırlaması beklenmez
(`11-agent-workflow.md` → *"ÖĞRETME YÜKÜMLÜLÜĞÜ"*).

> **ℹ️ Renovate'in maliyeti — sık sorulan**
>
> | Soru | Cevap |
> |---|---|
> | Ücretli mi | ⛔ Hayır. **AGPL-3.0 açık kaynak** (2026-08 ölçümü: v44, 370K indirme/hafta, aktif) |
> | Yapay zekâ mı | ⛔ **Hayır.** Deterministik bir program: `package.json`'ı okur, registry'ye sürüm sorar, PR açar |
> | AI abonelik jetonu (token) harcar mı | ⛔ **Hayır, sıfır.** Claude/LLM ile hiçbir ilgisi yok |
> | Nerede çalışır | Barındırılan uygulama (GitHub) **veya** kendin, kendi CI hattında |
> | Gerçek maliyeti ne | Aşağıdaki tablo |
>
> **Maliyet iki kalemde ve ikisi de küçük:**
>
> | Kalem | Ne kadar |
> |---|---|
> | **CI dakikası** | Her PR bir CI koşusu tetikler (~5–10 dk makine zamanı). Açık depoda GitHub Actions **ücretsiz**; özel depoda aylık ücretsiz kotanın çok altında kalır |
> | **İnsan zamanı** | ⭐ Yalnızca **major (ana) sürümlerde.** Yama ve minor sürümler otomatik birleşebilir |
>
> ⭐ **Otomatik birleştirme (automerge) kilit özellik:** Renovate, CI yeşilse
> PR'ı **kendisi birleştirir**. Testlerin güçlüyse yama ve minor güncellemeler
> hiç kimseye uğramadan geçer — insan maliyeti **sıfır**.
>
> ```json
> // renovate.json — kademeli güven
> {
>   "packageRules": [
>     { "matchUpdateTypes": ["patch", "minor"], "automerge": true },
>     { "matchUpdateTypes": ["major"], "automerge": false }
>   ]
> }
> ```
>
> ⛔ **Major sürüm neden otomatik geçmez:** *Major* demek, üreticinin
> **kırıcı değişiklik** yaptığını ilan etmesi demektir. Testler yeşil yansa
> bile davranış değişmiş olabilir; göç notunu (migration guide) **birinin
> okuması** gerekir.
>
> ⚠️ **Automerge'in ön şartı testlerdir.** Test kapsamı zayıfsa "CI yeşil"
> hiçbir şey kanıtlamaz ve automerge bozuk kodu sessizce ana dala sokar.
> Automerge açılmadan önce `06-testing.md` kapıları gerçekten kuruludur.

### ⛔ PR BİRLEŞTİRİLMEDEN ÖNCE AJAN DA DENETLER

CI kapıları **makinenin ölçebildiğini** ölçer: derleniyor mu, testler geçiyor
mu, katman kuralı bozulmuş mu. ⛔ **Ölçemediği şeyler var** — ve gerçek hatalar
çoğu zaman oralarda olur:

| CI yakalar | ⛔ CI yakalayamaz |
|---|---|
| Test kırmızı | **Test yanlış şeyi doğruluyor** |
| Tip hatası | Tip doğru ama **iş kuralı yanlış** |
| Katman ihlali | Katman temiz ama **sorumluluk yanlış yerde** |
| Lint uyarısı | Kod çalışıyor ama **okunmuyor** |
| — | **Yorumlar eksik veya yanlış** (`02-coding-standards.md`) |
| — | Yeni bir **güvenlik açığı** veya sızıntı |
| — | Belge güncellenmemiş (ADR, `teknoloji-ve-plan.md`) |

⭐ **Bu yüzden PR birleştirilmeden önce ajan da inceler.** Sıra şudur:

```
Kod yazıldı
  └─► CI kapıları  (lint · tip · test · mimari · derleme)
       └─► ⭐ AJAN İNCELEMESİ  (code-reviewer + security-auditor)
            └─► Bulgular düzeltildi
                 └─► Kullanıcıya SUNULDU ve onaylandı
                      └─► PR birleştirilir
```

⛔ **CI yeşil olması PR'ı birleştirmek için YETMEZ.** İki kapı birden geçilir:
makine kapısı **ve** inceleme kapısı.

**Ajan neyi inceler:**

| Denetim | Araç | Ne arar |
|---|---|---|
| Kod incelemesi | `code-reviewer` | Doğruluk, okunabilirlik, mimari, sorumluluk dağılımı |
| Güvenlik | `security-auditor` | Yetki aşımı, sızıntı, IDOR, gizli değer |
| Test kalitesi | `test-engineer` | Test **gerçekten** bir şey doğruluyor mu |
| Yorumlar | `02-coding-standards.md` | Junior ve **kodu okumayan denetçi** anlar mı |

⚠️ **Bulgu çıkarsa PR açılmaz/birleştirilmez** — önce düzeltilir. Düzeltilmeyecek
bir bulgu varsa gerekçesi PR açıklamasına yazılır, sessizce geçilmez.

⛔ **Bu, Renovate'in automerge'ü için de geçerli mi — HAYIR, ayrım var:**

| PR türü | Ajan incelemesi |
|---|---|
| **İnsan/ajan yazdığı kod** | ⛔ **Zorunlu** — yukarıdaki akış |
| Renovate **yama/minor** güncellemesi | Gerekmez — kod değişmiyor, yalnızca sürüm numarası. CI kapısı yeterli |
| Renovate **major** güncellemesi | ⭐ **Zorunlu** — kırıcı değişiklik ilan edilmiş; göç notu okunur, etkilenen kod taranır |
- Kritik güvenlik açığı olan paket sürümü ile deploy yapılmaz.
- **Bir CLI veya jeneratör paket/bileşen eklediyse, bağımlılık dosyasının farkı
  OKUNUR.** Bu araçlar kendi varsayımlarına göre ek paket kurar; kurdukları paket
  projenin **yazılı bir kararını ihlal edebilir** ve kimse fark etmezse o karar
  sessizce geri alınmış olur. Kurulum sonrası refleks: farkı oku, istenmeyeni
  kaldır, kaldırdıktan sonra üretilen kodu o pakete bağlı kalmayacak şekilde
  düzelt.
- **Her paket ekleme/çıkarmadan sonra güvenlik denetimi (`pnpm audit`) koşulur.**
  Sonuç, eklenen paketle ilgisiz olsa bile o an temiz olmalıdır: denetimi
  kırmızı bırakıp "benim eklediğim değil" demek, bir sonraki kişiye kırmızı
  bir kapı devretmektir.
- Doğrudan düzeltilemeyen geçişli (transitive) bir açık, sürüm sabitleme
  (`overrides`/`resolutions`) ile kapatılır ve **neden** kapatıldığı yazılır.

## Özellik bayrakları (feature flag)
Yarım kalan büyük özellikler uzun ömürlü dalda bekletilmez; kapalı bayrak arkasında
`main`'e girer. Bayraklar `src/config/` altında merkezi tanımlanır ve
özellik kararlı hale gelince **bayrak ve ölü kod temizlenir**.
