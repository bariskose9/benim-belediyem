# Altyapı Durumu

> **Bu dosya "dış dünyada ne var" sorusunun tek cevabıdır** — hangi hesap açık,
> panelde ne yapılandırılmış, hangi ortam değişkeni nerede tanımlı.
>
> Depo yalnızca kodu görür; üçüncü parti panelleri göremez. Buraya yazılmayan
> hiçbir şeyi sonraki oturum bilemez (`docs/standards/15-oturum-devri.md`).
>
> ⛔ **Gizli anahtar DEĞERİ buraya yazılmaz.** Yalnızca adı, yeri ve ne işe
> yaradığı. Değerler `.env` (commit edilmez) ve sağlayıcı panelindedir.

**Son güncelleme:** 2026-08-03 · roadmap adım 7 sonrası

> **Adım 7'de dış dünyada HİÇBİR ŞEY değişmedi.** Yeni hesap, yeni servis, yeni
> ortam değişkeni, yeni bağımlılık ve yeni migration yok; sepet, sipariş, ödeme
> ve kayıtlı kart tabloları adım 3'ten beri hazırdı.
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
> (teknik borç #38). Ekran çökmez, "boş saat kalmamış" der.

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
- **3 hostname tanımlı** — production (`benim-belediyem.vercel.app`) çalıştığı
  fiilen doğrulandı; 2026-08-02'de `feature/sifre-sifirlama` dalının preview
  adresi eklendi
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
