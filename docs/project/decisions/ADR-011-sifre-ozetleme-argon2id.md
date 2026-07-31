# ADR-011 — Şifre özetleme için `argon2` paketi (argon2id)

**Tarih:** 2026-07-31
**Durum:** Kabul edildi
**İlgili:** `05-auth-security.md` (şifre kuralları), roadmap teknik borç #15

## Bağlam

Adım 4b-1 kayıt akışını getiriyor; kullanıcı ilk kez şifre belirliyor.
`05-auth-security.md` iki kural koyuyor:

- "Şifreler `argon2` veya `bcrypt` (cost >= 12) ile hash'lenir. Düz metin veya
  MD5/SHA1 asla."
- "Şifre kuralı: en az 8 karakter + sızmış şifre listesi kontrolü."

Adım 3'te sahte üye hesapları oluşturulurken `password_hash` bilerek **boş**
bırakılmıştı: o aşamada rastgele bir algoritma seçmek, bu adımda tüm kayıtları
geçersiz kılardı (teknik borç #15).

`00-stack.md` tabloda olmayan her paket için onay ve ADR şartı koyuyor.
Şifre özetleme kütüphanesi tabloda yok.

Bu projenin üç çalışma ortamı var ve seçilen paket **üçünde de** çalışmak zorunda:
geliştirme makinesi (macOS arm64), Vercel (linux x64, glibc) ve Docker imajı
(`node:24-alpine`, linux x64, **musl**). Alpine'ın musl kullanması, yerel (native)
modüllerde en sık kırılan noktadır.

## Karar

Şifreler **`argon2` paketiyle (npm `argon2`, sürüm 0.45.1), argon2id modunda**
özetlenir.

Parametreler `src/config/constants.ts` içinde adlandırılmış sabit olarak tutulur,
koda dağıtılmaz: bellek maliyeti 64 MiB, tur sayısı 3, paralellik 1.
Bunlar OWASP'ın "Password Storage Cheat Sheet" belgesindeki asgari argon2id
yapılandırmasının üzerindedir ve Vercel'in fonksiyon bellek sınırına rahat sığar.

Şifre özetleme `src/features/auth/services/password.service.ts` içinde sade bir
fonksiyonun arkasında durur. Hiçbir kimlik doğrulama kütüphanesine bağlanmaz —
adım 4b-2'nin oturum kararı bu seçimden bağımsız kalsın diye.

## Doğrulanan teknik gerçekler (tahmin değil)

| Soru | Bulgu |
|---|---|
| Bakımı sürüyor mu? | Son sürüm **21 Temmuz 2026** — bu ADR'den 10 gün önce |
| Boyut | 387 KB (paketlenmiş) |
| Derleme gerekiyor mu? | **Hayır.** Paketin içinde hazır derlenmiş ikili dosyalar var: `darwin-arm64`, `linux-x64` (hem `glibc` hem **`musl`**), `linux-arm64`, `win32-x64`. Üç ortamımızın üçü de kapsanıyor; `node-gyp` çalışmıyor |
| Güvenlik uyarısı | `npm audit --omit=dev` → **0 açık** (kurulum sonrası fiilen çalıştırıldı) |
| Next.js yapılandırması gerekiyor mu? | **Hayır.** `argon2`, Next.js 16'nın kendi "sunucuda paketlenmeden bırakılacaklar" (`serverExternalPackages`) varsayılan listesinde zaten yer alıyor. `next.config.ts`'e satır eklemek gereksiz olurdu |
| Fiilen çalışıyor mu? | Evet — kurulum sonrası geliştirme makinesinde özet üretildi, doğru şifre `true`, yanlış şifre `false` döndü |

**Alpine/standalone doğrulaması — YAPILDI (2026-08-01).** `output: standalone`
modunda Next.js'in dosya izleyicisinin yerel ikiliyi imaja kopyalayıp
kopyalamadığı tek açık soruydu. İmaj derlendi (268 MB) ve kapta fiilen sınandı:

- `argon2.musl.node` imajda mevcut ve `ldd` çıktısı `libc.musl` bağımlılığını
  gösteriyor — yani glibc değil, doğru ikili yüklenmiş
- kapta üretilen özet `$argon2id$v=19$m=65536,p=1,t=3$...` ile başlıyor
- doğru şifre `true`, yanlış şifre `false` döndü

Artık "çalışıyor" demek için bir varsayıma dayanmıyoruz.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **`argon2` 0.45.1 (argon2id)** | OWASP'ın birinci tavsiyesi · `05-auth-security.md`'nin ilk seçeneği · aktif bakım (10 gün önce) · üç ortamın üçü için de hazır ikili | Yerel (native) modül; Alpine izlemesi kanıtlanmalı | **Seçildi** |
| `@node-rs/argon2` | Aynı algoritma, Rust ile yazılmış, hazır ikili, hızlı | **Son sürümü 4 Mayıs 2025 — 15 aydır güncellenmemiş** | Şifre saklayan bir pakette 15 aylık sessizlik kabul edilebilir bir risk değil |
| `bcrypt` 6.0.0 | Standart izin veriyor (cost >= 12) · çok yaygın · olgun | bcrypt 72 baytta girdiyi kesiyor; GPU'ya karşı argon2id'den zayıf; OWASP artık yeni projelerde argon2id öneriyor | Standart izin verse de daha zayıf olanı seçmek için sebep yok |
| `bcryptjs` 3.0.3 | Saf JavaScript, sıfır ikili dosya, kurulum riski yok | bcrypt'in JavaScript taklidi; aynı maliyet ayarında birkaç kat yavaş, olay döngüsünü bloke ediyor | Sunucusuz ortamda her girişte fazladan gecikme; kazancı (ikili dosya yok) argon2'nin hazır ikilileri sayesinde zaten gereksiz |
| `node:crypto` → `scrypt` | **Sıfır bağımlılık.** Node'un içinde geliyor, denetlenecek yeni kod yok | `05-auth-security.md` yalnızca `argon2` ve `bcrypt` diyor — scrypt standardın dışında kalır · parametre ayarı ve tuz/format yönetimi elle yazılır, yani kendi kriptografik iskeletimizi yazmış oluruz | Sıfır bağımlılık cazip ama bağlayıcı standarda aykırı; ayrıca "şifre formatını kendin kurgula" en kolay yanlış yapılan işlerden biri |

## Sonuçlar

- **Olumlu:** teknik borç #15 kapanıyor — tohumlanan demo hesaplarına gerçek şifre
  yazılabiliyor ve adım 4b-2 (giriş) hemen test edilebilir hale geliyor.
- **Olumlu:** parametreler tek dosyada sabit olduğu için ileride donanım hızlanınca
  maliyeti yükseltmek tek satırlık iş.
- **Bedel:** projeye ilk yerel (native) bağımlılık giriyor. Alpine imajı ve Vercel
  derlemesi bu paket yüzünden kırılırsa sebebi burada aranmalı.
- **Bedel:** özetleme başına ~50-100 ms CPU. Kasıtlıdır — şifre özetlemenin yavaş
  olması özelliktir. Yalnızca kayıt, giriş ve şifre değişiminde çalışır.
- **Gözden geçirme:** OWASP tavsiye ettiği parametreleri değiştirirse, paket
  bakımsız kalırsa, veya `argon2` Next.js'in varsayılan listesinden çıkarılırsa.
