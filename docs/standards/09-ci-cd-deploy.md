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
e2e test (+ axe) → lighthouse → npm audit
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
`npm run setup` komutu: bağımlılık kurar, Docker'ı ayağa kaldırır, migrate eder, seed eder.

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
- Kritik güvenlik açığı olan paket sürümü ile deploy yapılmaz.
- **Bir CLI veya jeneratör paket/bileşen eklediyse, bağımlılık dosyasının farkı
  OKUNUR.** Bu araçlar kendi varsayımlarına göre ek paket kurar; kurdukları paket
  projenin **yazılı bir kararını ihlal edebilir** ve kimse fark etmezse o karar
  sessizce geri alınmış olur. Kurulum sonrası refleks: farkı oku, istenmeyeni
  kaldır, kaldırdıktan sonra üretilen kodu o pakete bağlı kalmayacak şekilde
  düzelt.
- **Her paket ekleme/çıkarmadan sonra güvenlik denetimi (`npm audit`) koşulur.**
  Sonuç, eklenen paketle ilgisiz olsa bile o an temiz olmalıdır: denetimi
  kırmızı bırakıp "benim eklediğim değil" demek, bir sonraki kişiye kırmızı
  bir kapı devretmektir.
- Doğrudan düzeltilemeyen geçişli (transitive) bir açık, sürüm sabitleme
  (`overrides`/`resolutions`) ile kapatılır ve **neden** kapatıldığı yazılır.

## Özellik bayrakları (feature flag)
Yarım kalan büyük özellikler uzun ömürlü dalda bekletilmez; kapalı bayrak arkasında
`main`'e girer. Bayraklar `src/config/` altında merkezi tanımlanır ve
özellik kararlı hale gelince **bayrak ve ölü kod temizlenir**.
