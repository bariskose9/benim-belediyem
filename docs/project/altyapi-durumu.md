# Altyapı Durumu

> **Bu dosya "dış dünyada ne var" sorusunun tek cevabıdır** — hangi hesap açık,
> panelde ne yapılandırılmış, hangi ortam değişkeni nerede tanımlı.
>
> Depo yalnızca kodu görür; üçüncü parti panelleri göremez. Buraya yazılmayan
> hiçbir şeyi sonraki oturum bilemez (`docs/standards/15-oturum-devri.md`).
>
> ⛔ **Gizli anahtar DEĞERİ buraya yazılmaz.** Yalnızca adı, yeri ve ne işe
> yaradığı. Değerler `.env` (commit edilmez) ve sağlayıcı panelindedir.

**Son güncelleme:** 2026-08-01 · roadmap adım 4b-1 sonrası

---

## Hesaplar

| Servis | Hesap | Ücretsiz katman | Ne için |
|---|---|---|---|
| **GitHub** | `bariskose9` · depo **public** | — | Kod + CI (Actions) |
| **Vercel** | `barisss/benim-belediyem` | Hobby | Barındırma. Deployment protection **kapalı** — preview linkleri herkese açık |
| **Neon** | proje `lively-night-99128871`, org `org-still-water-86075112` | Free | PostgreSQL 18. İki dal: `production` (varsayılan) ve `preview` |
| **Cloudflare** | Turnstile widget `benim-belediyem` | 1M çözüm/ay | Bot koruması (ADR-004) |
| **Resend** | — | 3.000 e-posta/ay | Doğrulama kodu e-postası |

## Panelde yapılandırılanlar

### Cloudflare Turnstile
- Widget adı: **`benim-belediyem`**
- Mod: **Managed** (çoğu kullanıcı bulmaca görmez, onay kutusu yeter)
- Pre-clearance: yok
- **2 hostname tanımlı** — `benim-belediyem.vercel.app` çalıştığı fiilen
  doğrulandı (canlıda gerçek onay kutusu çıkıyor)
- Anahtar çifti üretildi: site key (tarayıcıya gider, gizli değil) + secret key

### Resend
- API anahtarı üretildi, izni **yalnızca gönderim** (`Sending access`).
  Bu yüzden anahtarla alan adı listelenemiyor — doğru güvenlik ayarı
- **Doğrulanmış alan adı YOK.** Gönderen adres `onboarding@resend.dev`
- ⚠️ **Bunun sonucu:** Resend yalnızca **hesabın kayıtlı e-posta adresine**
  gönderim yapar. Canlıda kayıt olurken başka bir adres girilirse kod gelmez.
  Gerçek kullanıma açılacaksa alan adı satın alınıp doğrulanmalı

### Neon
- `preview` ve `production` dalları **ayrı veritabanı** — veri paylaşmazlar
- İkisi de tohumlandı (2026-08-01): 200 sahte KPS vatandaşı · 100 personel ·
  90 üye (10'unun şifresi var). Gerçek kullanıcı: 0

### Vercel
- Derleme komutu: `prisma migrate deploy && next build` — yani **her deploy
  migration'ları kendisi uygular**, elle çalıştırmaya gerek yok
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
| `EMAIL_API_KEY` · `EMAIL_FROM` | ✘ | ✘ | ✔ | Production'da kayıt ekranı "geçici olarak kapalı" der. Uygulama **açılır** |
| `AUTH_SECRET` · `GOOGLE_*` | ✘ | ✘ | ✘ | Henüz kullanılmıyor — adım 4b-2 / 4c |
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
