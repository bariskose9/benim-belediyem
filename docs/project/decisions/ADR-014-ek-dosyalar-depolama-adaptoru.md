# ADR-014 — Yüklenen dosyalar bir depolama adaptörünün arkasında; ilk sürücü veritabanı

**Tarih:** 2026-08-09
**Durum:** Kabul edildi

## Bağlam

PRD §5.7 destek talebine **birden fazla ekran görüntüsü** eklenmesini istiyor
(yalnızca resim, en fazla 5 adet, dosya başına boyut sınırı). Bu, projenin
**ilk kullanıcı dosyası yükleme** yüzeyi.

`docs/standards/00-stack.md` dosya depolama için **Vercel Blob** diyor,
`05-auth-security.md` ise "yüklenen dosya uygulama sunucusundan değil ayrı
depolamadan servis edilir" diyor. `integrations.md` içinde `BLOB_READ_WRITE_TOKEN`
değişkeni de yer tutuyor. Yani hedef bellidir.

Buna karşılık adımın başladığı gün üç somut kısıt var:

1. **Dış dünyada henüz bir Blob store YOK** (`altyapi-durumu.md`). Store'u
   panelden yalnızca proje sahibi açabilir; ajan açamaz. Store açılmadan
   `BLOB_READ_WRITE_TOKEN` de yok.
2. **Canlı anahtar local'de kullanılamaz** (`13-environments.md`). Yani store
   açılsa bile local geliştirme, `tests/db` ve CI için ikinci bir yola ihtiyaç
   var — tek sürücülü bir çözüm zaten yetmiyor.
3. **`main` her an deploy edilebilir kalmalı** (CLAUDE.md §6.1). Kod, açılmamış
   bir store'un anahtarını zorunlu tutarsa deploy patlar.

Aynı gerilim projede daha önce iki kez yaşandı ve iki kez aynı biçimde çözüldü:
sahte KPS (ADR-003) ve OTP kanalı (`OTP_EMAIL_CHANNEL=mock|email`). İkisinde de
**uygulama bir arayüze konuşuyor**, hangi uygulamanın devrede olduğunu ortam
belirliyor.

## Karar

**Ek dosyalar `FileStorage` adaptörünün arkasına konur. Bu adımda tek bir sürücü
uygulanır: `db` (içerik `ticket_attachments.data` kolonunda).**

- Uygulama kodu `putAttachment` / `getAttachment` dışında bir şey bilmez;
  dosyanın nerede durduğu **yalnızca** sürücünün içindedir.
- `ticket_attachments.file_url` bir **depolama referansıdır**, ekrana verilen
  adres değildir. `db` sürücüsünde `db:<ek kimliği>` biçiminde; nesne
  deposunda `https://…` olacak. Ayrıştırıcı bu önekte.
- **Ek her iki durumda da kendi yetkili ucumuzdan servis edilir**
  (`GET /api/support-tickets/<id>/attachments/<ekId>`). Bu, sürücü değişse bile
  ekran kodunun değişmemesini sağlar ve daha önemlisi **yetki kapısını korur**:
  ekran görüntüleri başkasının göremeyeceği kişisel içeriktir, tahmin edilemez
  bir genel adrese konulamaz (PRD §5.7 kabul kriteri).
- Nesne deposuna geçildiğinde eski satırlar **taşınmak zorunda değil**: `data`
  kolonu nullable ve referans önekine bakan okuma yolu ikisini birden okur.

Sınırlar tek yerde (`constants.ts`): en fazla **5 dosya**, dosya başına
**2 MB**, izinli türler **PNG · JPEG · WebP**. Tür istemcinin beyanından değil
**baytların imzasından** (magic bytes) doğrulanır; dosya adı sanitize edilir.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Adaptör + `db` sürücüsü (bu karar)** | Panel işi gerektirmez; `main` deploy edilebilir kalır; local, CI ve `tests/db` aynı yoldan koşar; yedek zaten veritabanı yedeğinin içinde; nesne deposuna geçiş tek dosyalık | Görsel baytları ilişkisel veritabanında; Neon ücretsiz katmanı 0,5 GB ve dosyalar bu bütçeyi hızlı yer; her okuma uygulama sunucusundan geçer (CDN yok) | **Seçildi** — bedeli ölçülü ve geri dönüşü ucuz |
| Doğrudan Vercel Blob | Standartların hedefi; CDN; veritabanı şişmez | Proje sahibinin panelde store açmasını **bekletir**; local/CI için yine ikinci sürücü gerekir; anahtar yokken deploy patlar | Bugün yapılamıyor; adaptör bunu ertelenebilir kılıyor |
| Dosya sistemine yazmak | En basit görünen | Vercel sunucusuz: disk **kalıcı değil** ve dağıtımlar arasında paylaşılmaz; yüklenen dosya bir sonraki deploy'da yok olur | Teknik olarak yanlış |
| Base64 olarak `description` içine gömmek | Şema değişmez | Metin kolonu şişer, sorgu yavaşlar, boyut sınırı denetlenemez, tür doğrulanamaz | Ciddi bir seçenek değil |

## Sonuçlar

- **Olumlu:** dosya yükleme dış bir hesaba, anahtara ve panel işine bağlı
  olmadan bugün çalışıyor; testler gerçek yoldan koşuyor; yetki kapısı ekin
  önünde duruyor; sürücü değişimi ekran ve servis katmanını hiç değiştirmiyor.
- **Bedel 1 — depolama bütçesi:** Neon ücretsiz katmanı 0,5 GB. En kötü durumda
  bir talep 5 × 2 MB = 10 MB yer kaplar; ~50 dolu talep bütçeyi bitirir. Gerçek
  kullanıcı sayısı 0 olduğu için bugün risk düşük, ama **açık bir teknik borç**
  olarak roadmap'e yazıldı.
- **Bedel 2 — CDN yok:** her ek görüntüleme uygulama fonksiyonundan geçiyor.
  Zaten yetkili servis etmek istediğimiz için özel (private) bir nesne
  deposunda da fonksiyondan geçecekti; fark, baytların nereden okunduğu.
- **Bedel 3 — standarttan sapma:** `00-stack.md` "Vercel Blob" diyor ve bugün
  Blob kullanılmıyor. Sapma bilinçli, süreli ve tek dosyaya hapsedilmiş
  durumda; kalıcı hâle gelmemesi için roadmap'te borç satırı var.
- **Ne zaman gözden geçirilmeli:** proje sahibi Blob store'u açtığında (Hobby
  planında ücretsiz; limit aşılırsa ücret çıkmıyor, servis duruyor), veya
  veritabanı boyutu 0,5 GB'ın yarısını geçtiğinde, ya da ek dosyaların
  görüntülenme sıklığı ölçülebilir bir yük ürettiğinde.
