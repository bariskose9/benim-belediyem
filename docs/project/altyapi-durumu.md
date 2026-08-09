# Altyapı Durumu

> **Bu dosya "dış dünyada ne var" sorusunun tek cevabıdır** — hangi hesap açık,
> panelde ne yapılandırılmış, hangi ortam değişkeni nerede tanımlı.
>
> Depo yalnızca kodu görür; üçüncü parti panelleri göremez. Buraya yazılmayan
> hiçbir şeyi sonraki oturum bilemez (`docs/standards/15-oturum-devri.md`).
>
> ⛔ **Gizli anahtar DEĞERİ buraya yazılmaz.** Yalnızca adı, yeri ve ne işe
> yaradığı. Değerler `.env` (commit edilmez) ve sağlayıcı panelindedir.

**Son güncelleme:** 2026-08-09 · roadmap adım 14 sonrası

> ✅ **Adım 14 CANLIDA** (2026-08-09, commit `383a1df`). Sağlık ucu `db: ok`,
> anasayfada üç kart da gerçek veriyle çiziliyor. `feature/bilgi-widgetlari`
> dalı merge edilip **silindi** — Turnstile ve Google panellerine hiç
> eklenmemişti, çünkü bilgi panosu giriş gerektirmiyor.
>
> ## Adım 14 — DIŞ DÜNYADA HİÇBİR HESAP AÇILMADI ve AÇILMASI GEREKMİYOR
>
> Adım 14 projenin **ilk gerçek dış API çağrılarını** getirdi, ama **dört
> sağlayıcının dördü de anahtarsız**. Yeni hesap, yeni anahtar, yeni panel işi
> ve yeni ortam değişkeni **YOK**:
>
> | Ne için | Sağlayıcı | Anahtar | Kimin panelinde bir işi var |
> |---|---|---|---|
> | Hava durumu | Open-Meteo | **gerekmiyor** | hiç kimsenin |
> | Döviz kuru | Frankfurter (ECB) | **gerekmiyor** | hiç kimsenin |
> | Kripto | CoinGecko public | **gerekmiyor** | hiç kimsenin |
> | Haber | TRT Haber RSS | **gerekmiyor** | hiç kimsenin |
>
> Dördü de 2026-08-09'da canlı uçlarından **fiilen çağrılarak** doğrulandı.
> Gerekçe ADR-016: proje sahibine yeni hesap açtırmamak, açtırmaktan iyidir.
>
> ⛔ **`NEWS_API_KEY` ve `NEWS_API_PROVIDER` KALDIRILDI.** Bu değişkenler
> hiçbir ortamda tanımlı değildi ve artık şemada da yoklar. Bir sonraki oturum
> "haber için anahtar girilmesi gerekiyor" sanmasın.
>
> **Yeni bir migration VAR** (`20260809150000_add_external_data_cache`) ama
> elle çalıştırılacak bir şey değil: Vercel derleme komutu `prisma migrate
> deploy` ile başlıyor. Migration geriye uyumlu — tek bir yeni tablo ekliyor,
> hiçbir veriyi değiştirmiyor, eski sürüm kod bu tabloyu hiç bilmeden
> çalışmaya devam ediyor.
>
> ⚠️ **CoinGecko'nun anahtarsız ucu Vercel'de `429` verebilir** (çıkış IP'leri
> paylaşımlı). Bu bir arıza değil beklenen bir durum: 5 dakikalık önbellek
> istek sayısını saatte ~12'ye indiriyor ve takılırsa kullanıcı boş kart değil
> bayat fiyat görüyor. Teknik borç #65 — canlıda trafik oluşunca ölçülecek.
>
> **Adım 13'te dış dünyada DEĞİŞEN TEK ŞEY yeni dalın preview adresi.** Yeni
> hesap, yeni servis, yeni ortam değişkeni ve yeni bağımlılık YOK.
> **Yeni bir migration VAR**
> (`20260809120000_add_support_ticket_lifecycle_and_attachments`) ama elle
> çalıştırılacak bir şey değil: Vercel derleme komutu `prisma migrate deploy`
> ile başlıyor. Migration geriye uyumlu — dört kolon ekliyor, hiçbir veri
> silmiyor, eski sürüm kod bu kolonları hiç bilmeden çalışmaya devam ediyor.
>
> ⛔ **DOSYA DEPOLAMA İÇİN VERCEL BLOB STORE AÇILMADI — ve bu bir KARAR.**
> `00-stack.md` Vercel Blob diyor, `integrations.md` `BLOB_READ_WRITE_TOKEN`
> için yer tutuyor; ikisi de **bugün kullanılmıyor**. Destek talebi ekleri
> `ticket_attachments.data` kolonunda duruyor (ADR-014). Proje sahibi
> 2026-08-09'da "şimdilik veritabanı kalsın" dedi. Teknik borç #60.
> **Blob store açılacaksa:** Vercel panelinde **private** erişimli bir store
> oluşturulur ve projeye bağlanır; `BLOB_READ_WRITE_TOKEN` panel tarafından
> kendiliğinden eklenir. Hobby planında ücretsiz — limit aşılırsa ücret
> çıkmıyor, servis duruyor (resmî fiyat sayfasından 2026-08-09'da doğrulandı).
> Local ve CI için `db` sürücüsü yine gerekir (canlı anahtar local'de
> kullanılmaz — `13-environments.md`).
>
> **Adım 12'de dış dünyada HİÇBİR ŞEY değişmedi.** Yeni hesap, yeni servis,
> yeni ortam değişkeni ve yeni bağımlılık yok. **Yeni bir migration VAR**
> (`20260808190500_membership_lifecycle_guards`) ama elle çalıştırılacak bir
> şey değil: Vercel derleme komutu `prisma migrate deploy` ile başlıyor, yani
> her deploy migration'ları kendisi uyguluyor. Migration geriye uyumlu —
> `memberships` tablosuna iki NULL kabul eden kolon ekliyor, hiçbir veri
> silmiyor ve eski sürüm kod bu kolonları hiç bilmeden çalışmaya devam ediyor.
>
> ⚠️ **UZAK ORTAMLARDA TOHUMLAMA GÜNCEL DEĞİL.** Adım 12'de tohuma iki yeni
> demo personel hesabı eklendi (#11 Zehra Kılıç, #12 Esra Arslan). Preview ve
> production 2026-08-01'de tohumlandığı için **o iki hesap orada YOK**.
> Uygulama bundan etkilenmiyor (mevcut personel hesapları üye olabiliyor);
> yalnızca E2E testleri local'de koşuyor ve orada seed güncel. Uzak ortamlarda
> seed yeniden koşturulursa iki hesap da gelir.
>
> **Adım 11'de dış dünyada HİÇBİR ŞEY değişmedi.** Yeni hesap, yeni servis,
> yeni ortam değişkeni, yeni bağımlılık ve **yeni migration yok**; `venues`,
> `venue_seats`, `events` ve `seat_reservations` adım 3'ten beri hazırdı ve
> tohumluydu (3 salon × 192 koltuk, 12 etkinlik, koltukların %20-40'ı satılmış).
> Tek dış dünya işi her adımda olduğu gibi aynı: **yeni dalın preview adresi
> iki panele eklenmeli** (aşağıda).
>
> **Adım 9 ve 10'da da dış dünyada hiçbir şey değişmemişti.** Adım 7'de de
> öyle — sepet, sipariş, ödeme ve kayıtlı kart tabloları adım 3'ten beri hazırdı.
>
> **ÖDEME GERÇEK DEĞİL.** Hiçbir ödeme kuruluşuyla entegrasyon yok, hiçbir
> yere API anahtarı girilmedi. Tahsilat `mock-payment-provider.ts` içinde
> taklit ediliyor (sahte KPS ile aynı adaptör deseni, ADR-003). Ekranda
> kalıcı bir uyarı var: "Gerçek kart bilgisi girmeyin."
>
> ⚠️ **Yeni dal açtığında** o dalın **dal adresini** iki panele ekle:
> Cloudflare Turnstile → Hostname Management **ve** Google Cloud → Auth
> Platform → Clients → Authorized redirect URIs (sonuna
> `/api/auth/google/callback` ekleyerek). Teknik borç #31.
>
> ⚠️ **Uzak ortamlarda tohumlanmış doktor saatleri ~2026-08-15'te tükeniyor**
> (teknik borç #38). Ekran çökmez, "boş saat kalmamış" der. **Bu tarih geldi
> sayılır** (bugün 2026-08-08) — uzak ortamlarda seed'i yeniden koşturmak
> gerekiyor. Adım 11'de yapılmadı: hastane modülüne dokunulmadı ve seed'i
> yeniden koşturmak bu adımın kapsamı dışındaydı.
>
> ⚠️ **Etkinlikler de tohumlama gününden itibaren 60 güne yayılıyor**
> (`EVENT_WINDOW_DAYS`). Preview ve production 2026-08-01'de tohumlandığı için
> etkinlikler ~2026-09-30'a kadar var; sonrasında etkinlik listesi boşalır.
>
> ⛔ **DÜZELTME (2026-08-09):** önceki sürüm "aynı seed koşusu ikisini birden
> çözer" diyordu; **bu YANLIŞ.** Seed kodu okunarak doğrulandı:
> - **Doktor saatleri düzelir** — slot kimliği tarihten üretiliyor
>   (`seedId("slot", doktor, <saat>)`), yani yeni koşu bugünden itibaren 14
>   günlük YENİ satırlar yazar
> - **Etkinlikler DÜZELMEZ** — etkinlik kimliği sabit (`seed-event-0001…12`)
>   ve `createMany({ skipDuplicates: true })` mevcut satırları atlar; tarihleri
>   2026-08-01'e göre kalmaya devam eder. Tazelemek için ya etkinlikler
>   silinip yeniden üretilmeli ya da seed'e tarih güncelleyen bir kol eklenmeli

---

## Hesaplar

| Servis | Hesap | Ücretsiz katman | Ne için |
|---|---|---|---|
| **GitHub** | `bariskose9` · depo **public** | — | Kod + CI (Actions) |
| **Vercel** | `barisss/benim-belediyem` | Hobby | Barındırma. Deployment protection **kapalı** — preview linkleri herkese açık |
| **Neon** | proje `lively-night-99128871`, org `org-still-water-86075112` | Free | PostgreSQL 18. İki dal: `production` (varsayılan) ve `preview` |
| **Cloudflare** | Turnstile widget `benim-belediyem` | 1M çözüm/ay | Bot koruması (ADR-004) |
| **Resend** | — | 3.000 e-posta/ay | Doğrulama kodu e-postası |
| **Google Cloud** | proje `benim-belediyem` · OAuth istemcisi `benim-belediyem-web` | ücretsiz | Google ile giriş (adım 4c) |

### PostgreSQL eklentileri

- **`unaccent`** — aksan körü arama için (adım 8). Migration
  `20260806200000_enable_unaccent_for_search` içinde `CREATE EXTENSION IF NOT
  EXISTS` ile açılıyor, yani **elle bir şey yapılmıyor**: `migrate deploy`
  koşan her ortam kendi kendine kuruyor
- Neon'un desteklediği eklentiler arasında olduğu resmî dokümandan doğrulandı
  (2026-08-06). CI'daki `postgres:18.4-alpine` kapsayıcısında da çalışıyor —
  oradaki `belediye` kullanıcısı kapsayıcının süper kullanıcısı
- Panele girip elle eklenti kurulmuş DEĞİL; yeni bir ortam açılırsa da gerekmez

## Panelde yapılandırılanlar

### Cloudflare Turnstile
- Widget adı: **`benim-belediyem`**
- Mod: **Managed** (çoğu kullanıcı bulmaca görmez, onay kutusu yeter)
- Pre-clearance: yok
- **Hostname listesi — 2026-08-08'de panelden GÖRÜLEREK yazıldı** (7/10 dolu).
  Önceki sürümde liste ezberden tutuluyordu ve kaymıştı: `feature/restoran`
  "eklenmedi" yazıyordu ama ekliydi, `feature/google-ile-giris` ise hiç
  kaydedilmemişti. **Bu tablo panelin kendisinden okundu:**

  | Hostname | Durum |
  |---|---|
  | `benim-belediyem.vercel.app` | ✅ production — **silinmez** |
  | `benim-belediyem-git-feature-etkinlik-bilet-barisss.vercel.app` | ✅ adım 11 — dal merge edildi |
  | `benim-belediyem-git-feature-spor-salonu-uyeligi-barisss.vercel.app` | ❓ adım 12'de "eklenecek" diye yazılmıştı; **eklenip eklenmediği panelden görülmedi**. Dal merge edildi, artık gerekmiyor |
  | `benim-belediyem-git-feature-destek-talebi-barisss.vercel.app` | ⛔ **adım 13 — HENÜZ EKLENMEDİ, ZORUNLU** |
  | `localhost` | ⚠️ muhtemelen gereksiz (aşağıda) |
  | `benim-belediyem-git-feature-google-ile-giris-barisss.vercel.app` | 🗑️ adım 4c — dal merge edildi, silinebilir |
  | `benim-belediyem-git-feature-sifre-sifirlama-barisss.vercel.app` | 🗑️ adım 4b-3 — merge edildi, silinebilir |
  | `benim-belediyem-git-feature-market-barisss.vercel.app` | 🗑️ adım 8 — merge edildi, silinebilir |
  | `benim-belediyem-git-feature-restoran-barisss.vercel.app` | 🗑️ adım 9 — merge edildi, silinebilir |

  `feature/siparis-takibi` (adım 10) listeye **hiç eklenmedi** ve gerek de
  kalmadı — dal merge edildi.

  ⚠️ **SINIR 10 HOSTNAME.** Her adım bir satır eklediği için merge edilmiş
  dalların satırları temizlenmezse adım 14 civarında sınıra çarpılır.
  Temizlemenin tek bedeli: eski bir dalın preview'una geri dönülürse orada
  bot kutusu çizilmez.

  ⚠️ **SINIRA GELİNDİ SAYILIR (2026-08-09):** destek dalı eklenince liste 8
  veya 9 satıra çıkıyor — spor salonu satırının eklenip eklenmediği panelden
  görülmediği için kesin sayı bilinmiyor. Proje sahibinin koyduğu tetik
  (9/10 görülünce tek seferde temizlik) **bu adımda hatırlatılıyor**: panele
  girildiğinde 🗑️ işaretli satırlar (merge edilmiş dallar) toplu silinebilir.

  ✋ **PROJE SAHİBİNİN KARARI (2026-08-08): SINIR DOLANA KADAR TEMİZLİK YOK.**
  Gerekçesi yerinde — silmek hiçbir şeyi çalıştırmıyor, yalnızca her adımda
  panele girmek demek. **Ajan bunu her adımda tekrar önermeyecek.** Sınıra
  yaklaşıldığında (9/10 görülünce) tek seferde hatırlatılacak ve merge edilmiş
  dalların satırları toplu silinecek.

  ⚠️ **`localhost` neden şüpheli:** local ortamda Cloudflare'ın **test
  anahtarları** kullanılıyor (bkz. "Bilinçli olarak YAPILMAYANLAR"), yani
  gerçek widget'ın hostname listesinde `localhost` gereksiz. Üstelik gerçek
  site anahtarının alan adına kilitli olmasının anlamı, birinin kendi
  makinesindeki bir sayfaya widget'ı gömüp geçerli jeton üretememesi —
  `localhost` açıkken bu mümkün. **Silmeden önce `.env` içindeki
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` test anahtarı mı diye bakılmalı;**
  gerçek anahtarsa satır kalmalı
- ⚠️ **Her yeni dalın preview adresi listeye ELLE eklenir.** Eksikse widget hiç
  çizilmez ve tarayıcı konsolunda `[Cloudflare Turnstile] Error: 110200`
  (*domain not authorized*) görünür — **kodda hata arama, panele bak.**
  `*.vercel.app` joker olarak kabul edilmiyor: `vercel.app` bize ait değil.
  Adresi yazdıktan sonra panelde **Update/Save'e basmak şart** — 2026-08-02'de
  bu atlandığı için hata ikinci kez araştırıldı, ~1 saat gitti.
  Kalıcı çözüm kendi alan adı → teknik borç #31
- Anahtar çifti üretildi: site key (tarayıcıya gider, gizli değil) + secret key

### Resend
- API anahtarı üretildi, izni **yalnızca gönderim** (`Sending access`).
  Bu yüzden anahtarla alan adı listelenemiyor — doğru güvenlik ayarı
- **Doğrulanmış alan adı YOK.** Gönderen adres `onboarding@resend.dev`
- ⚠️ **Bunun sonucu:** Resend yalnızca **hesabın kayıtlı e-posta adresine**
  gönderim yapar. Canlıda kayıt olurken başka bir adres girilirse kod gelmez.
  Gerçek kullanıma açılacaksa alan adı satın alınıp doğrulanmalı

### Google Cloud — OAuth (adım 4c)

- Konsolun **"OAuth consent screen" sayfası ARTIK YOK.** Ayarlar
  **Google Auth Platform** altında beşe bölündü: **Overview · Branding ·
  Audience · Clients · Data Access**. Eski tariflere göre arama — 2026-08-02'de
  bu yüzden vakit kaybedildi (`11-agent-workflow.md` → "ezberden değil güncelden")
- İstemci: **Web application**, adı `benim-belediyem-web`
- **Authorized redirect URIs** (Clients sayfası) — tam olarak bunlar kayıtlı:
  - `http://localhost:3000/api/auth/google/callback`
  - `https://benim-belediyem.vercel.app/api/auth/google/callback`
  - `https://benim-belediyem-git-feature-market-barisss.vercel.app/api/auth/google/callback`
    *(2026-08-06, adım 8 dalı — proje sahibi ekledi)*
  - ⚠️ `feature/restoran` dalınınki **henüz eklenmedi** (adım 9). Eksikse o
    preview'da yalnızca "Google ile devam et" düğmesi `redirect_uri_mismatch`
    verir; şifreyle giriş ve restoran ekranı etkilenmez
  - ⚠️ `feature/siparis-takibi` dalınınki **hiç eklenmedi** (adım 10) ve gerek
    kalmadı — dal merge edildi
  - ⚠️ `feature/etkinlik-bilet` dalınınki (adım 11) — eklenecek tam değer:
    `https://benim-belediyem-git-feature-etkinlik-bilet-barisss.vercel.app/api/auth/google/callback`
    **Bu adım ŞART DEĞİL:** yalnızca "Google ile devam et" düğmesini etkiler.
    Preview'da koltuk seçimini denemek için ŞİFREYLE giriş yeterli ve o
    Turnstile'a bağlı (Turnstile tarafı 2026-08-08'de eklendi)
- ⚠️ **"Authorized JavaScript origins" BOŞ ve öyle kalmalı.** Akış tamamen
  sunucu tarafında; oraya yol içeren bir adres yazılırsa Google
  *"URIs must not contain a path"* der. İlk denemede bu hataya düşüldü
- ⚠️ **Her yeni dalın preview adresi buraya da ELLE eklenir** — Turnstile'daki
  aynı tuzak (teknik borç #31). Google joker kabul etmiyor; adres birebir
  eşleşmezse `redirect_uri_mismatch` alınır. Yani her yeni dalda **iki panel**:
  Cloudflare hostname listesi + Google redirect URI listesi
- ⚠️ **Panele DAL adresi yazılır, dağıtım adresi DEĞİL.** Vercel iki farklı
  preview adresi üretir ve ikisi de çalışır:
  - `benim-belediyem-git-<dal>-barisss.vercel.app` → **dal boyunca sabit**, panele yazılacak olan bu
  - `benim-belediyem-<rastgele>-barisss.vercel.app` → **her commit'te değişir**, panele yazılamaz
  Uygulama 2026-08-02'ye kadar Google'a ikincisini gönderiyordu; düzeltildi
  (`env.ts` → `resolveVercelAppUrl`, artık `NEXT_PUBLIC_VERCEL_BRANCH_URL`
  tercih ediliyor). Dal adresini `npx vercel inspect <dagitim-url> --scope barisss`
  çıktısındaki **Aliases** satırından okuyabilirsin — tahmin etme, oradan bak
- **Uygulama "Testing" modunda** — yalnızca *Audience* sayfasındaki **Test
  users** listesindeki e-postalar giriş yapabilir. Proje sahibinin Gmail'i
  eklendi (2026-08-02). Herkese açılması için *Publish app* gerekiyor;
  `openid`/`email`/`profile` hassas olmayan kapsamlar olduğu için Google
  incelemesi gerekmediğini **doğrulamadım** — açmadan önce kontrol edilmeli
- **Data Access sayfasına hiç girilmedi ve gerekmiyor**: kapsamlar çalışma
  anında isteniyor, panele önceden yazılması zorunlu değil
- İstemci parolası **yenilenmedi**. Kurulum sırasında ekran görüntüsüyle
  sohbete girdi; risk düşük (depoya girmedi) ama canlıya açılmadan önce
  *Clients → Add secret* ile yenilenmesi temiz olur

### Neon
- `preview` ve `production` dalları **ayrı veritabanı** — veri paylaşmazlar
- İkisi de tohumlandı (2026-08-01): 200 sahte KPS vatandaşı · 100 personel ·
  90 üye (10'unun şifresi var). Gerçek kullanıcı: 0
- **Şema adım 4b-2'de DEĞİŞMEDİ** — `sessions` tablosu adım 3'ten beri hazırdı,
  yeni migration yok
- **Şema adım 4b-3'te de DEĞİŞMEDİ** — şifre sıfırlama, `otp_challenges`
  tablosunun adım 3'ten beri var olan `user_id` alanını ilk kez kullanıyor.
  Yeni tablo ve yeni migration yok

### Vercel
- Derleme komutu: `prisma migrate deploy && next build` — yani **her deploy
  migration'ları kendisi uygular**, elle çalıştırmaya gerek yok
- ⚠️ **Neon uykudayken deploy PATLIYOR** (2026-08-01'de yaşandı, PR #15 merge'ünde):
  ücretsiz katmanda veritabanı boşta kalınca duruyor ve `prisma migrate deploy`
  `P1001: Can't reach database server` ile ~5 saniyede vazgeçiyor. Derleme
  başarısız olur ama **canlı site eski sürümle ayakta kalır** — kesinti olmaz.
  Çözüm: veritabanını uyandır (`curl .../api/health` yeter, `db: ok` görene kadar)
  sonra `npx vercel redeploy <basarisiz-deploy-url> --scope barisss`.
  Merge sonrası sağlık ucundaki `commit` alanının değiştiğini **doğrula**;
  değişmediyse dağıtım başarısız olmuştur
- Ortam değişkeni değişikliği **kendiliğinden yayına girmez**; yeni bir dağıtım
  gerekir (`npx vercel redeploy <url>`)

## Ortam değişkeni matrisi

Değerler Vercel panelinde ve local `.env` içinde. Buraya **yalnızca adlar**.

| Değişken | local | preview | production | Eksikse ne olur |
|---|:---:|:---:|:---:|---|
| `DATABASE_URL` · `DIRECT_URL` | ✔ | ✔ | ✔ | Uygulama **açılmaz** |
| `NEXT_PUBLIC_APP_URL` | ✔ | otomatik | ✔ | Uygulama **açılmaz** |
| `NEXT_PUBLIC_ENV_LABEL` | `local` | `preview` | `production` | Uygulama **açılmaz** |
| `NATIONAL_ID_HASH_SALT` | ✔ | ✔ | ✔ | Uygulama **açılmaz** |
| `NATIONAL_ID_ENCRYPTION_KEY` | ✔ | ✔ | ✔ | Uygulama **açılmaz** (32 bayt kontrolü var) |
| `MOCK_KPS_API_KEY` | ✔ | ✔ | ✔ | Uygulama **açılmaz** (min 32 karakter) |
| `OTP_EMAIL_CHANNEL` | `mock` | `mock` | **`email`** | Production'da `mock` kalırsa uygulama **açılmaz** |
| `OTP_PHONE_CHANNEL` | `mock` | `mock` | **`email_sim`** | Aynı — production'da `mock` yasak |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | test anahtarı | ✔ gerçek | ✔ gerçek | Kutu hiç görünmez |
| `TURNSTILE_SECRET_KEY` | test anahtarı | ✔ gerçek | ✔ gerçek | local'de atlanır · preview/production'da kayıt **durur** (503) |
| `EMAIL_API_KEY` · `EMAIL_FROM` | ✘ | ✘ | ✔ | Production'da kayıt **ve şifre sıfırlama** ekranları "geçici olarak kapalı" der. Uygulama **açılır** |
| `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` | ✔ | ✔ | ✔ | Giriş ekranındaki **"Google ile devam et" düğmesi hiç çizilmez**. Kayıt ve şifreyle giriş etkilenmez — uygulama açılır (adım 4c, 2026-08-02) |
| `AUTH_SECRET` · `AUTH_URL` | ✘ | ✘ | ✘ | **Hiç kullanılmıyor ve gerekmiyor.** Auth.js kurulmadı (ADR-005 güncelleme notu); OAuth işlem çerezi `httpOnly` olduğu için imzalanmıyor. `.env.example`'da duruyor ama boş kalabilir |
| `OWNER_*` | ✘ | ✘ | ✘ | Tohumlama proje sahibi hesabını **atlar** (kasıtlı: gerçek kişisel veri uzak ortama gitmiyor) |

**Anahtarlar ortama özeldir** (`13-environments.md`): `NATIONAL_ID_*` değerleri
preview ve production'da **farklıdır** ve local'inkiyle de aynı değildir.
Canlı anahtar local'de kullanılmaz.

## Bilinçli olarak YAPILMAYANLAR

Bunlar eksik değil, **karar**. Yeniden "yapılması gerekiyor" sanılmasın:

- **Preview'da gerçek e-posta gönderilmiyor.** Kod ekranda gösteriliyor
  (PRD §5.0 · `05-auth-security.md` local ve preview'a izin veriyor). Preview
  test ortamıdır; gerçek posta beklemek testi yavaşlatır
- **Local'de Cloudflare'ın test anahtarları duruyor.** `13-environments.md`
  "canlı anahtar local'de kullanılmaz" diyor
- **`OWNER_*` hiçbir uzak ortamda tanımlı değil.** Depo public; proje sahibinin
  gerçek kimlik ve iletişim bilgisi hiçbir yere yazılmıyor
- **Resend preview'a bağlanmadı.** Preview zaten kodu ekranda gösteriyor
- **E2E testlerinde bot koruması kapalı** — gerekçesi `playwright.config.ts`
  içinde yazılı

## Ajanın erişebildikleri

| Araç | Durum | Not |
|---|---|---|
| `gh` | PATH'te, giriş yapılmış | PR açabilir, merge edebilir, CI okuyabilir |
| `vercel` | **PATH'te DEĞİL** → `npx vercel` | Ortam değişkeni girebilir, yeniden dağıtabilir |
| `neonctl` | **PATH'te DEĞİL** → `npx neonctl` | `--org-id org-still-water-86075112` gerekiyor, yoksa interaktif soruyor |
| `psql` | **KURULU DEĞİL** | Uzak veritabanı sorgusu için `npx tsx` + Prisma ile küçük betik yazılır |
| `docker` | Kurulu | İmaj derleme ve local Postgres |

**Vercel gizli değerleri geri VERMEZ** (`env pull` → `[SENSITIVE]`). Bir anahtarın
değeri gerekiyorsa ya kullanıcıdan istenir ya da yenilenir. Yenilemeden önce
"o anahtarla şifrelenmiş veri var mı" sorusu cevaplanmalı.

## Canlı adresler

- **Production:** https://benim-belediyem.vercel.app
- **Sağlık ucu:** https://benim-belediyem.vercel.app/api/health
- **Preview:** her PR'da otomatik; dal adresi
  `benim-belediyem-git-<dal-adi>-barisss.vercel.app` biçiminde ve dal boyunca sabit
- **Depo:** https://github.com/bariskose9/benim-belediyem
