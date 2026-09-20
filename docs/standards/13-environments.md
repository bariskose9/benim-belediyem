# 13 — Ortamlar: Test ve Canlı

> ⚠️ İlk bölümler (`preview`, Vercel, Neon) **kendi projem** modu içindir.
> İşyeri projesinde (kurumun test + canlı sunucusu) aşağıdaki **"YOL C"**
> bölümü geçerlidir; oradaki tablo bu haritanın yerine geçer.

## Temel kural: Ayrı proje değil, ayrı ORTAM

Tek repo, tek Vercel projesi, tek kod tabanı. Değişen şey **hangi ortam değişkenleriyle
hangi veritabanına bağlandığı**. İki ayrı proje açmak (benim-belediyem-test /
benim-belediyem-canli) yaygın bir yeni başlayan hatasıdır: kod iki yerde ayrışır,
"testte çalışıyordu canlıda çalışmıyor" sorunu kalıcı hale gelir.

| Ortam | Nerede çalışır | Veritabanı | Ne zaman oluşur | Kim görür |
|---|---|---|---|---|
| **local** | Kendi bilgisayarın (Docker) | Docker Postgres | `pnpm dev` | Sadece sen |
| **preview** | Vercel Preview | Neon `preview` dalı | Her PR'da OTOMATİK | Link'i olan |
| **production** | Vercel Production | Neon `main` dalı | `main`'e merge'de | Herkes |

Her ortamın **kendi veritabanı, kendi ortam değişkenleri, kendi API anahtarları** vardır.
Ortamlar veri paylaşmaz. Canlı veriyle test yapılmaz.

## Docker nerede duruyor?

Docker **sadece local** içindir — bilgisayarında Postgres kurmadan veritabanı çalıştırmak için.
Vercel'e Docker imajı gönderilmez; Vercel `next build` çıktısını kendi çalıştırır.
Dockerfile yine de repoda durur: başka bir sunucuya taşıma ihtiyacı doğarsa hazır olsun
ve konteynerleştirmeyi öğrenmiş ol diye.

```
local:      docker compose up -d  →  Postgres :5432  →  pnpm dev     →  localhost:3000
preview:    git push  →  PR  →  Vercel build  →  xxx-git-feature.vercel.app  →  Neon preview
production: merge main  →  Vercel build  →  benimbelediyem.vercel.app  →  Neon main
```

## Tam süreç — bir değişikliğin yolculuğu

```
1. git checkout -b feature/hastane-randevu
2. docker compose up -d            → local Postgres ayağa kalkar
3. pnpm prisma migrate dev         → şema değişikliği LOCAL'de uygulanır
4. pnpm dev                        → localhost:3000'de geliştir
5. pnpm lint && pnpm test          → local kapı
6. git push -u origin feature/...  → PR aç
7. GitHub Actions çalışır          → lint, typecheck, test, build, e2e
8. Vercel otomatik PREVIEW üretir  → preview DB'ye migrate eder
9. SEN preview URL'i açıp elle test edersin          ← EN ÖNEMLİ ADIM
10. Onay → squash merge → main
11. Vercel PRODUCTION build         → prisma migrate deploy → yayın
12. Duman testi: /api/health + giriş + ana akış
```

**"Test projesinde yapıp canlıya aktarmak" diye ayrı bir kopyalama adımı yoktur.**
Aynı kod merge edildiğinde kendisi canlıya gider. Aktarım = merge.

## Veritabanı ortamları (Neon dallanması)
- Neon'da veritabanı da git gibi dallanır. `main` dalı canlı, `preview` dalı test.
- Preview dalı canlının **şemasını** alır, verisini değil. Test verisi seed ile oluşur.
- Canlıdan test ortamına veri kopyalanmaz. Gerekirse kişisel veriler maskelenerek kopyalanır.

## Migration ortam farkı
- **local:** `prisma migrate dev` — migration dosyası ÜRETİR
- **preview / production:** `prisma migrate deploy` — sadece mevcut migration'ları UYGULAR
- Üretimde `migrate dev` veya `db push` **asla** çalıştırılmaz.
- Yıkıcı migration (kolon/tablo silme) ayrı PR'da, öncesinde yedek alınarak.

## Ortam değişkenleri
- `.env.example` tüm anahtar adlarını içerir, değer içermez ve **her zaman günceldir**.
- `.env` sadece local'de, commit edilmez.
- preview ve production değerleri Vercel panelinden ortam seçilerek girilir.
- Aynı anahtarın üç ortamda **farklı değeri** olur. Canlı anahtar local'de kullanılmaz.
- `src/config/env.ts` içinde Zod ile doğrulanır: eksik değişken varsa uygulama
  açılışta net hata verir, çalışma anında gizemli hata vermez.

## Ortam ayrımı için görsel işaret
Local ve preview ortamlarında ekranın üstünde renkli bir şerit görünür
(`LOCAL` / `PREVIEW`). Böylece yanlışlıkla canlı sanılıp test verisi girilmez.

## Kontrol listesi — yeni ortam kurarken
- [ ] Veritabanı ayrı mı?
- [ ] Ortam değişkenleri ayrı mı, canlı anahtar sızmış mı?
- [ ] Migration otomatik çalışıyor mu?
- [ ] Arama motorlarına kapalı mı (`noindex` — preview için zorunlu)?
- [ ] Ortam etiketi ekranda görünüyor mu?


## ⭐ YOL C — Kurum sunucusu: TEST + CANLI (işyeri projesi)

Yukarıdaki `local → preview → production` haritası **kendi projem** modu
içindir (Vercel + Neon). İşyeri projesinde ortamlar kurumundur ve genelde
**iki sunucu** vardır: bir **test**, bir **canlı**. Bu bölümde yukarıdaki
kurallardan neyin aynı kaldığı, neyin değiştiği yazılıdır.

⛔ **Değişmeyen temel kural:** yine tek repo, tek Dockerfile, tek Compose.
Test ve canlı **aynı imajı** çalıştırır; fark yalnızca ortam değişkenleridir.
"Test için ayrı repo" veya "canlı için ayrı dal üstünde düzeltme" yoktur.

### Ortam haritası

| Ortam | Nerede çalışır | Veritabanı | Kim kurar / alır | Ne zaman güncellenir |
|---|---|---|---|---|
| **local** | Kendi bilgisayarın (Docker) | Docker Postgres | Sen | `pnpm dev` |
| **test** | Kurumun test sunucusu | Kurumun test DB'si | **DevOps** alır, **veritabanı birimi** DB'yi verir | `main`'e her merge'de (DevOps tetikler) |
| **canlı** | Kurumun canlı sunucusu | Kurumun canlı DB'si | DevOps + veritabanı birimi | Yalnızca **etiketli sürüm** (`v1.2.0`) — testte onaylandıktan sonra |

⭐ Bu yolun çıktısı **teslim paketi**dir — içeriği ve doğrulaması `SKILL.md` →
*"Adım 6b — Kurum projesi: teslim paketini hazırla ve DOĞRULA"*.

**Preview ortamı yoktur.** Her MR'da otomatik açılan bir adres beklenmez;
MR'ın kapısı CI'dır (`pnpm ci:verify`), gerçek ortamda deneme **test
sunucusunda** yapılır.

### Bir değişikliğin yolculuğu (Yol C)

```
1. git checkout -b feature/...        → local'de geliştir, docker compose up -d
2. pnpm ci:verify                     → local kapı (lint, typecheck, test, build)
3. git push  →  Merge Request         → GitLab CI aynı kapıyı koşturur
4. Squash merge → main
5. DevOps main'i TEST sunucusuna alır → migration test DB'de uygulanır
6. SEN test adresinde elle denersin   ← EN ÖNEMLİ ADIM (mutlu yol + ana akışlar)
7. Sorun yoksa: CHANGELOG + git tag v1.2.0
8. DevOps'a "v1.2.0 canlıya alınabilir" dersin (hazır cümle: 09-ci-cd-deploy.md)
9. DevOps canlıya alır → duman testi: /api/health + giriş + ana akış
```

⛔ **Testten geçmeyen sürüm canlıya çıkmaz.** Canlıya giden şey `main`'in
son hâli değil, **testte onaylanmış etikettir.** Böylece test sunucusunda
3 özellik denenirken canlıya yalnızca onaylanan gider.

### Dal stratejisi — tek dal + etiket

| Ne | Nereye gider |
|---|---|
| `main` (her merge) | **test** sunucusu |
| `vX.Y.Z` etiketi | **canlı** sunucu |

⛔ `develop` / `release` gibi ikinci bir uzun ömürlü dal **açılmaz.** İki dal,
"testte var canlıda yok" farkını dalda saklar ve sonunda birleştirme
çatışmasına döner. Etiket aynı işi dalsız yapar: canlıda ne olduğu `git tag`
ile bellidir, geri alma = önceki etiket.

### ⛔ Veritabanını UYGULAMA OLUŞTURMAZ — veritabanı birimi verir

Kendi projede Neon'da tek tıkla DB açılır. Kurumda **veritabanı birimi ayrı bir
ekiptir** ve DB'yi, kullanıcıyı ve izinleri **onlar** verir. Buradan üç sonuç
çıkar:

| Konu | Kendi projem | İşyeri projesi (Yol C) |
|---|---|---|
| DB kim açar | Sen (Neon paneli) | ⛔ **Veritabanı birimi** — talep edilir, beklenir |
| `DATABASE_URL` | Panelden kopyalarsın | DB birimi → DevOps'a verir; **sen görmezsin** |
| Uygulama kullanıcısının izni | Her şey | ⚠️ Genelde **sadece DML** (okuma/yazma). `CREATE`/`ALTER` verilmeyebilir |
| Migration'ı kim uygular | Uygulama, deploy'da | ⭐ **Sorulur** — DevOps sınırı #1 (`CALISMA-KILAVUZU.md`) |

**Migration dosyaları kurum biçimindedir** (`04-database.md` → *"MIGRATION
ARACI"*): `database/migrations/V__`, `R__`, `U__`; koşucu `scripts/migrate.mjs`
`mig_` gibi DDL yetkili hesapla çalışır, `svc_` uygulama hesabı yalnızca DML.
İki senaryo:

| Senaryo | Ne yapılır |
|---|---|
| **Uygulama açılışta kendisi koşturuyor** (DDL hesabı DevOps'ta env olarak var) | `docker-entrypoint.sh` → `node scripts/migrate.mjs` → advisory lock → uygula → hata varsa **kap düşer** (sessiz bozuk yerine görünür hata) → sonra `next start` |
| **DB birimi elle koşturuyor** (uygulamaya DDL hesabı verilmiyor) | Açılışta migration **çalışmaz** (`DB_MIGRATE_ON_START=false`); her sürümde `V__` + `U__` dosyaları teslim paketine girer, DB birimi koşturur; yol `altyapi-durumu.md`'de sabit |

⛔ **Test sunucusunda aynı senaryo** kullanılır — test, canlının provasıdır;
testte uygulama kendisi migrate edip canlıda DB birimi koşturuyorsa test
hiçbir şeyi kanıtlamaz.

### İlk gün sorulacak — cevaplar `altyapi-durumu.md`'ye

`CALISMA-KILAVUZU.md` → *"DevOps sınırı"* üç sorusuna ek olarak, iki sunuculu
kurumda şunlar sorulur:

| # | Soru | Cevap gelmezse varsayılan |
|---|---|---|
| 1 | Test sunucusuna **hangi dal**, **kim**, **ne zaman** alınıyor? (her merge'de otomatik mi, sen istedikçe mi) | `main`, DevOps, sen istedikçe |
| 2 | Canlıya çıkış **nasıl tetikleniyor** — etiket mi, yazılı talep mi, toplantı mı? | Etiket + DevOps'a yazılı talep |
| 3 | Test DB'si **canlının kopyası mı, boş mu?** Kopyaysa kişisel veriler maskeleniyor mu? | Boş + seed; canlı veri **maskelenmeden** teste kopyalanmaz (`14-privacy-and-compliance.md`) |
| 4 | Uygulama DB kullanıcısının **DDL izni var mı?** DDL hesabı uygulamaya env olarak veriliyor mu, yoksa `V__` dosyalarını DB birimi mi koşturuyor? | Yok varsayılır → dosyalar teslim edilir |
| 5 | Test sunucusu **dışarıdan erişilebilir mi?** (VPN arkası mı, internete açık mı) | VPN arkası; yine de `noindex` + `TEST` şeridi |
| 6 | Test ve canlı **aynı ağda mı**, dış servislere (SMS, e-posta, e-Devlet) test ortamından çıkış var mı? | Çıkış yok → dış servisler testte **simüle** edilir (`00-stack.md` → "SİMÜLE EDİLEN DIŞ SERVİS") |

### Ortam değişkenleri (Yol C)

- `.env.example` **tek dosyadır**, üç ortam için de aynı adlar. Değerleri
  test ve canlıda **DevOps girer**; sen hiçbirini görmezsin.
- Her satırda **ne işe yaradığı ve kimden alınacağı** yazar — DB birimi
  `DATABASE_URL` satırını okuyup kullanıcıyı ona göre açar:
  `DATABASE_URL= # Postgres bağlantısı. Uygulama kullanıcısı; yalnızca <şema> üzerinde okuma/yazma yeter — veritabanı biriminden`
- ⛔ Ortam ayrımı `NODE_ENV` ile **yapılmaz** (`06-testing.md`); test ve canlı
  ikisi de `NODE_ENV=production` ile koşar. Ayrım için kendi değişkeni vardır:
  `APP_ENV=local | test | production` — ekrandaki şerit ve `noindex` bununla
  açılır.

### Görsel işaret (Yol C)

Şerit `LOCAL` / `TEST` yazar; canlıda şerit yoktur. Test sunucusu kurum içinde
bile olsa şerit **kalır** — "testte mi canlıda mıyım" karışıklığı en çok
kurum içi uygulamada olur, ikisi de aynı VPN'in arkasındadır.

### Kontrol listesi — Yol C teslimden önce

- [ ] Test ve canlı **aynı Docker imajını** çalıştırıyor mu (yalnızca env farklı)?
- [ ] `main` → test, etiket → canlı eşlemesi `altyapi-durumu.md`'de yazılı mı?
- [ ] Migration'ı kimin uyguladığı yazılı mı; `V__`/`U__` dosyaları kurum biçiminde mi, teslim yolu kurulu mu?
- [ ] Test DB'si canlıdan ayrı mı; canlı veri maskesiz kopyalanmadı mı?
- [ ] `.env.example` eksiksiz mi — DevOps tek değişken bile **tahmin etmiyor** mu?
- [ ] `APP_ENV=test` ile şerit ve `noindex` çalışıyor mu?
- [ ] Testte simüle edilen dış servisler `altyapi-durumu.md`'de listeli mi?
- [ ] `/api/health` test sunucusunda yeşil mi — DevOps duman testinde buna bakacak?

## ⛔ PORT BOŞ MU — VARSAYILMAZ, ÖLÇÜLÜR

Ajan *"bu makinede başka proje yok, portlar serbesttir"* **diyemez** — o
makineyi görmedi.

**Kurulumda fiilen bakılır:**

```bash
# macOS / Linux
lsof -nP -iTCP:3000 -sTCP:LISTEN
# Windows (PowerShell)
netstat -ano | findstr :3000
```

| Sonuç | Ne yapılır |
|---|---|
| Boş | Varsayılan kullanılır (3000/4000/5432/6379) |
| Dolu | ⭐ Kaydırılır (3100/4100/…), `.env`'e yazılır, kullanıcıya **söylenir** |

⚠️ Docker konteynerleri de port tutar: `docker ps` ile bakılır — durmuş bir
proje bile portu bırakmamış olabilir.

⛔ Konteyner **içi** portlar hiç değişmez; yalnızca **host eşlemesi** kaydırılır.

## ⛔ DOSYA ADI BÜYÜK/KÜÇÜK HARF — sessiz kırılma

| Platform | Duyarlı mı |
|---|---|
| macOS · Windows | ⛔ **Hayır** — `WorkOrder.ts` ile `workorder.ts` **aynı** sayılır |
| ⭐ Linux konteyneri · CI | ✅ **Evet** — **farklı** dosya |

**Sonucu:** `import './workOrder'` yazıp dosya adı `WorkOrder.ts` ise kod
geliştiricinin makinesinde **çalışır**, Docker'da ve CI'da **patlar.**

⚠️ Kullanıcı Mac'te veya Windows'ta çalıştığı için bu hata **yerelde asla
görünmez** — ancak CI kırmızı yanınca fark edilir.

**Kural — ajan uygular, kullanıcıya sorulmaz:**

| Konu | Kural |
|---|---|
| Dosya adı | ⭐ Tek biçim: `kebab-case` (`work-order.service.ts`) |
| Klasör adı | `kebab-case` |
| `import` yolu | Dosya adıyla **birebir** aynı |
| React bileşen **dosyası** | `kebab-case`; bileşenin **kendisi** `PascalCase` |

⛔ **Aynı klasörde yalnızca büyük/küçük harfle ayrışan iki dosya olamaz.**
Git bunları macOS/Windows'ta **tek dosya** sanar ve biri sessizce kaybolur.
