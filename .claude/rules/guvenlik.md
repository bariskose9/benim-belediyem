---
paths:
  - "**/auth/**"
  - "**/*guard*.ts"
  - "**/proxy.ts"
  - "**/middleware*.ts"
  - "**/upload*/**"
  - "**/*crypto*.ts"
---
# Kimlik, yetki, dosya, gizlilik dosyalarında

`docs/standards/05-auth-security.md` ve `14-privacy-and-compliance.md`
bağlayıcıdır; kural adları aşağıda.

- Şifre: argon2id; kullanıcı yoksa da sahte doğrulama (zamanlama).
- Oturum: JWT `httpOnly + Secure + SameSite` çerezde (mobil: Bearer);
  `tokenVersion` ile anında iptal; `AUTH_SECRET` ≥ 32 bayt, ortam başına farklı
  (`05-auth-security.md` → *"Oturum"*). Kurum panelinde 2FA (OTP: 6 hane, 5 dk, 3 deneme).
- Kilit: 5 deneme / 15 dk; giriş olayları `login_events`'e (audit değil).
- Yetki **sunucuda**; UI'da buton gizlemek yetki değildir; her kayıt erişiminde
  sahiplik kontrolü.
- `proxy.ts` (Next 16) Edge'de: yalnızca çerez/JWT okur, veritabanı yok.
- Dosya yükleme sekiz kural: boyut önce, tür baytlardan, ad yeniden üretilir,
  klasör beyaz listesi, yetkili uçtan servis, EXIF temizliği, `public/` asla;
  depo `FileStorage` adaptörüyle (`05-auth-security.md` → *"Dosya yükleme ve depolama"*).
- Kişisel veri: uygulama katmanında AES-256-GCM, `BYTEA`, anahtar `.env`'de
  sürüm önekiyle; ekranda maskeli; log'a asla (`14-privacy-and-compliance.md`).
- Ödeme: kart verisi saklanmaz; tutar sunucuda; idempotency anahtarı.
- Güvenlik başlıkları (CSP, HSTS…); hız sınırı Postgres sayaç tablosu;
  bot koruması Turnstile (kurum: sorulur, fail-closed bilinerek).
