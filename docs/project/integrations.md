# Dış Servisler (Entegrasyonlar)

Tüm çağrılar **sunucu tarafında** yapılır ve önbelleklenir. Anahtarlar `.env` içindedir,
tarayıcıya gönderilmez. Her servis için hata durumunda widget kendi başına bozulur,
sayfayı çökertmez.

| Amaç | Servis | Anahtar | Ücretsiz limit | Önbellek |
|---|---|---|---|---|
| Hava durumu | **Open-Meteo** (`api.open-meteo.com`) | Gerekmiyor | Ticari olmayan kullanım serbest | 30 dk |
| Döviz kuru | **Frankfurter** (`api.frankfurter.dev`) | Gerekmiyor | Sınırsız (günlük ECB verisi) | 60 dk |
| Kripto | **CoinGecko** public API | Gerekmiyor (demo) | Dakikada sınırlı | 5 dk |
| Haber | **GNews.io** veya **NewsData.io** | Gerekiyor | Günde ~100 istek | 15 dk |
| Bot koruması | **Cloudflare Turnstile** (`challenges.cloudflare.com`) | Gerekiyor (site + gizli anahtar) | Ayda 1M çözüme kadar ücretsiz | Önbelleklenmez — jeton tek kullanımlık |
| Doğrulama kodu e-postası | **Resend** (`api.resend.com`) | Gerekiyor (API anahtarı + doğrulanmış gönderen) | Ayda 3.000 e-posta | Önbelleklenmez |

## Kurallar
- Limitler değişebilir; entegrasyondan önce güncel dokümantasyon **kontrol edilir**
  (`source-driven-development`). Tahminle kodlanmaz.
- Anahtar gerektiren servislerde limit aşımı beklenir ve `429` durumu ele alınır.
- Önbellek süresi dolmadan tekrar istek atılmaz.
- Cevap şeması Zod ile doğrulanır — dış servis bozuk veri gönderirse uygulama patlamaz.
- Yerel geliştirmede ağ yoksa sahte veriye düşülür (fallback), boş ekran gösterilmez.
- Testlerde gerçek istek atılmaz, yanıtlar mock'lanır.

## Bot koruması (Cloudflare Turnstile)

Karar gerekçesi: `decisions/ADR-004-bot-korumasi-turnstile.md`. Kullanıldığı yerler
ve akış kuralları `PRD.md §5.0 → Bot ve otomasyon koruması` altındadır.

- Jeton **sunucuda** doğrulanır (`/siteverify`); istemcinin sözüne güvenilmez.
- Jeton tek kullanımlıktır ve önbelleklenmez.
- **Bu servis çökerse akış durur** — yukarıdaki "widget bozulur, sayfa ayakta kalır"
  kuralının tek istisnasıdır. Güvenlik kapısı açık bırakılarak atlanmaz.
- Local'de Cloudflare'ın resmî test anahtarları kullanılır; preview ve production
  kendi anahtarlarını kullanır (ortamlar anahtar paylaşmaz).
- Cloudflare ABD merkezli işleyicidir → KVKK aydınlatma metninde yurt dışına
  aktarım olarak belirtilir.

## Doğrulama kodu (OTP) kanalı

Kayıtta **iki kod birden** üretilir: biri e-posta adresi için, biri telefon için.
İkisi de doğrulanmadan hesap açılmaz (`PRD.md §5.0`).

| Uygulama | Nerede | Davranış |
|---|---|---|
| `MockChannel` | local, preview | Kod ekranda gösterilir, gönderim yapılmaz. **Production'da SEÇİLEMEZ** — `src/config/env.ts` açılışta reddeder |
| `EmailChannel` | production — e-posta kodu | Resend HTTP API'si ile gerçek gönderim (SDK yok, düz `fetch`) |
| `EmailSmsSimulationChannel` | production — telefon kodu | Kod, "SMS simülasyonu" başlığıyla kullanıcının **e-postasına** gönderilir |
| ~~`SmsChannel`~~ | **yazılmadı** | Hiçbir şey göndermeyen boş bir sınıf ölü koddur. Yer tutucu olan şey `OtpChannelAdapter` arayüzünün kendisidir; gerçek sağlayıcı eklenirse tek yeni dosya yeter |

Türkiye'de gerçek SMS ücretsiz değildir ve marka/İYS onayı gerektirir. Bu yüzden
telefon kodu da e-posta ile taşınır; **kod hiçbir ortamda ekranda gösterilmez**
(local ve preview hariç). Bunun bedeli: telefon **sahipliği kanıtlanmaz**.

## Env değişkenleri
Tam liste `.env.example` ile birebir aynı tutulur. `src/config/env.ts` bunları
Zod ile doğrular: eksik değişken varsa uygulama **açılışta** net hata verir.

```
# Veritabanı
DATABASE_URL=
DIRECT_URL=                        # Prisma migration için havuzsuz bağlantı

# Uygulama
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ENV_LABEL=local        # local | preview | production → ekrandaki ortam şeridi

# Kimlik
AUTH_SECRET=                       # en az 32 bayt, her ortamda farklı
AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Kimlik numarası şifreleme (data-model → User.nationalIdEncrypted)
NATIONAL_ID_ENCRYPTION_KEY=        # 32 bayt, ortamlar arası paylaşılmaz
NATIONAL_ID_HASH_SALT=             # arama için tuzlanmış özet

# Dış bilgi servisleri
NEWS_API_KEY=
NEWS_API_PROVIDER=gnews
WEATHER_DEFAULT_LAT=38.4237
WEATHER_DEFAULT_LON=27.1428

# Dosya depolama
BLOB_READ_WRITE_TOKEN=

# İzleme
SENTRY_DSN=

# Planlı görevler
CRON_SECRET=                       # /api/cron/* uçlarını korur; eşleşmezse 401

OTP_EMAIL_CHANNEL=mock    # mock | email          → e-posta kodu
OTP_PHONE_CHANNEL=mock    # mock | email_sim | sms → telefon kodu
# EMAIL_API_KEY boşsa uygulama AÇILIR ama kayıt ucu 503 döner ve kayıt ekranı
# "kayıt geçici olarak kapalı" der. Böylece anahtar girilmeden de `main`
# deploy edilebilir kalır (CLAUDE.md §6.1). Teknik borç #22.
EMAIL_API_KEY=
EMAIL_FROM=
SMS_PROVIDER_KEY=         # şu an kullanılmıyor, ileride gerçek SMS için

# Bot koruması — Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Proje sahibi hesabı — DEĞERLER ASLA COMMIT EDİLMEZ
OWNER_TCKN=
OWNER_FULL_NAME=
OWNER_EMAIL=
OWNER_PHONE=
```

**Ortam farkı:** `13-environments.md` uyarınca aynı anahtarın üç ortamda **farklı
değeri** olur. Canlı anahtar local'de kullanılmaz. `NATIONAL_ID_ENCRYPTION_KEY`
ortamlar arasında paylaşılırsa bir ortamdaki veri diğerinde çözülebilir hale gelir —
bu yüzden her ortam kendi anahtarını üretir.
