# ADR-012 — Yarım kalmış kayıt (KPS önbelleği) sunucuda şifreli satırda tutulur

**Tarih:** 2026-07-31
**Durum:** Kabul edildi
**İlgili:** ADR-006 (sayaç Postgres'te) · ADR-007 (süresi dolan kayıtlar, tembel temizlik) ·
ADR-009 (sahte KPS ucu) · PRD §5.0 · `14-privacy-and-compliance.md`

## Bağlam

Kayıt akışı tek istekte bitmiyor. Üç adım var ve arada kullanıcı e-postasına
bakmaya gidiyor:

1. TCKN + doğum yılı → KPS sorgulanır, kimlik bilgileri ekranda gösterilir
2. Kullanıcı e-posta, telefon ve şifre girer → iki doğrulama kodu gönderilir
3. İki kod da doğrulanır → hesap açılır

Adım 1 ile adım 3 arasında KPS yanıtının bir yerde durması gerekiyor.
PRD §5.0 bunun kurallarını koyuyor:

> Tam KPS yanıtı en fazla 15 dakika önbellekte tutulur (kayıt akışı yarıda
> kalırsa tekrar sorgu atılmasın diye). Önbellek anahtarı kimlik numarası
> **değil**, oturuma bağlı rastgele bir kimliktir.

Ayrıca aynı bölüm veri minimizasyonu istiyor: baba adı, anne adı, doğum yeri,
medeni hâl ve nüfus adresi **kalıcı olarak** saklanmayacak.

**Kısıt:** uygulama Vercel'de sunucusuz çalışıyor. `12-operations-and-scaling.md`
"süreç durumsuzdur" diyor; her istek ayrı bir örneğe düşebilir. Bu yüzden
bellekte tutulan bir önbellek **hiçbir şey önbelleklemez** — ADR-006'da hız
sınırı için verilen gerekçenin aynısı.

## Karar

Yarım kalmış kayıt, **`registration_drafts` tablosunda kısa ömürlü bir satır**
olarak tutulur.

- Tarayıcıya `httpOnly + secure + sameSite=lax` bir çerezle **rastgele 32 baytlık
  jeton** verilir. Veritabanında jetonun kendisi değil **SHA-256 özeti** durur;
  veritabanı dökümü tek başına kullanılabilir bir çerez vermez.
- Tam KPS yanıtı satırda **AES-256-GCM ile şifreli** durur (mevcut
  `src/lib/crypto.ts` zarfı). İletişim bilgisi de şifreli, şifre argon2id özeti.
- Kimlik numarası, e-posta ve telefon ayrıca **tuzlanmış özet** olarak tutulur —
  arama ve hız sınırı anahtarı için. **Düz metin hiçbir kolonda yok.**
- Satırın ömrü 15 dakikadır. Süresi dolan satır **okuma anında** yok sayılır ve
  silinir (ADR-007 deseni) — temizlik görevi hiç çalışmasa bile davranış doğrudur.
- Hesap oluştuğu anda satır silinir.
- "İki kanal da doğrulandı mı" bilgisi bu satırda **tutulmaz**; zaten var olan
  `otp_challenges` tablosundan okunur. Tek doğruluk kaynağı, çift yazım yok.

Kimlik numarası, çerezde de URL'de de önbellek anahtarında da geçmez —
önbellek anahtarı jetonun özetidir.

## Değerlendirilen alternatifler

| Alternatif | Artı | Eksi | Neden seçilmedi |
|---|---|---|---|
| **Sunucuda şifreli satır** | Sunucu tarafında iptal edilebilir · eşzamanlı iki doğrulama çakışmaz · deneme sayaçları tutulabilir · PRD'nin "önbellek" ifadesine uyar | Yeni tablo · temizlik görevi gerekir (ADR-007 zaten öngörüyor) | **Seçildi** |
| Şifreli/mühürlü çerez yükü | Yeni tablo yok, temizlik işi yok | **1.** İki OTP bağımsız doğrulandığı için iki sekmede iki ayrı çerez yazımı çakışır ve bir doğrulama sessizce kaybolur — PRD "biri geçerken diğeri geçersizleşmez" diyor, bu tam tersini üretir · **2.** Sunucu iptal edemez: "hesap açılınca silinir" ancak tarayıcıdan rica edilebilir; kopyalanan çerez 15 dakika boyunca KPS yükünü tekrar oynatır · **3.** KPS yükü + argon2 özeti ~1 KB, her istekte taşınır · **4.** Deneme sayaçları çerezde tutulamaz | Tek avantajı (tablo yok) ADR-007 sayesinde zaten bedelsiz; bedelleri güvenlik ve doğruluk tarafında |
| Bellek içi önbellek (Map) | Sıfır altyapı, en hızlısı | **Sunucusuzda çalışmaz** — her istek ayrı örneğe düşer, kullanıcı adım 2'de "kayıt bulunamadı" alır | ADR-006'daki aynı hata; koruma sağladığı sanılır, sağlamaz |
| Önbelleksiz — her adımda KPS'i yeniden sorgula | Saklanacak veri yok | Her adımda dış servis maliyeti · hız sınırı (5/15 dk) kullanıcının kendi kaydını bitirmesini engeller · PRD açıkça önbellek istiyor | PRD'ye ve hız sınırına aykırı |

## Bilinçli standart sapmaları

**1. Yabancı anahtar yok.** `otp_challenges.registration_id` bu tabloya
bağlanmıyor. `04-database.md` "yabancı anahtarlar baştan tanımlanır" diyor;
burada esnetildi çünkü taslak hesap açılınca siliniyor, kod kayıtları ise
24 saat yaşamaya devam etmeli (gönderim hız sınırı ve denetim izi için).
`onDelete: Cascade` onları silerdi, `SetNull` bağı koparırdı. Sapma bu kısa
ömürlü ebeveyn ile sınırlıdır, genele yayılmaz.

**2. `deletedAt` yok.** `data-model.md` kısa ömürlü satırları (`OtpChallenge`,
`Session`, `RateLimitCounter`) "gerçekten silinir" sınıfına koyuyor; taslak da
oraya ait.

**3. Tablo, kalıcı tutulmayacak KPS alanlarını 15 dakika boyunca tutuyor.**
Veri minimizasyonu kuralı **kalıcı** saklama içindir; PRD'nin kendisi 15 dakikalık
önbelleği açıkça istiyor. Ayrım şurada: bu alanlar `users` tablosuna **hiç**
yazılmaz ve taslak satırı hesap açılınca silinir. Bunu `tests/db/registration-privacy.test.ts`
kanıtlıyor.

## Sonuçlar

- **Olumlu:** kullanıcı e-postasına bakmaya gidip döndüğünde KPS yeniden
  sorgulanmıyor; dış servis maliyeti ve hız sınırı bütçesi korunuyor.
- **Olumlu:** yarım kalmış her kayıt 15 dakika sonra kendiliğinden yok oluyor.
  Terk edilmiş kayıtlardan kişisel veri birikmiyor.
- **Bedel:** süresi geçmiş satırları silen planlı görev gerekiyor. Tembel silme
  doğruluğu zaten sağlıyor, görev yalnızca tabloyu küçük tutuyor
  (ADR-007 · roadmap teknik borç #18 ile aynı temizlik işi).
- **Bedel:** kayıt akışında iki ek veritabanı yazımı.
- **Gözden geçirme:** gerçek KPS entegrasyonuna geçilirse önbellek süresi
  kurumun sözleşmesine göre yeniden değerlendirilir.
