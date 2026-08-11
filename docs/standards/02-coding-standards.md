# 02 — Kod Standartları

## TypeScript
- `strict: true`. `any` yasak. Kaçınılmazsa `unknown` + daraltma kullan,
  gerçekten mecbursan üstüne `// gerekçe:` yorumu yaz.
- Fonksiyon dönüş tipleri açıkça yazılır (public/export edilenlerde zorunlu).
- `enum` yerine union tip veya `as const` nesne.
- `null` ve `undefined` ayrımı bilinçli yapılır.

## Yazım
- Prettier ayarları tartışılmaz; format kavgası yapılmaz.
- ESLint hatası olan kod commit edilmez. Kural devre dışı bırakılacaksa
  satır bazlı ve gerekçeli: `// eslint-disable-next-line <kural> -- <neden>`
- Import sırası: dış paketler → iç modüller (`@/`) → göreli → tipler.

## Fonksiyonlar
- Tek iş yapar. Adı ne yaptığını söyler.
- 3'ten fazla parametre → nesne parametresi.
- Boolean parametre ile davranış değiştirme; ayrı fonksiyon yaz.
- Yan etkisi olan fonksiyon adında belli olsun (`sendMail`, `createOrder`).

## Hata yönetimi
- `catch` bloğu **asla boş bırakılmaz** ve hatayı sessizce yutmaz.
- Beklenen hatalar tiplenmiş hata sınıfıyla fırlatılır (`NotFoundError`, `ForbiddenError`).
- Beklenmeyen hata: logla + kullanıcıya genel mesaj göster + iç detay sızdırma.
- Kullanıcıya gösterilen mesajlar **Türkçe ve eyleme dönük**:
  "Bir hata oluştu" değil → "Seçtiğiniz saat dolmuş. Lütfen başka bir saat seçin."

## Yorumlar
- "Ne" değil **"neden"** yazılır. Kodun kendisi "ne"yi anlatmalı.
- Ölü kod yorum satırına alınmaz, silinir (git'te duruyor zaten).
- `TODO` bırakılacaksa: `// TODO(#issue-no): <ne yapılacak>` — issue'suz TODO yasak.
- ⛔ **BİR "NEDEN" YAZMADAN ÖNCE İDDİAYI ÖLÇ.** Yorum bir davranış iddiası
  içeriyorsa ("bu sıra önemli", "bu kontrol şunu engelliyor"), iddiayı geçici
  olarak BOZ ve testin kırmızıya döndüğünü gör. Dönmüyorsa iddian yanlıştır.

  Bir projede yaşandı: "desenlerin sırası önemli, yoksa kartın ilk 11 hanesi
  kimlik sanılır" yazılmıştı; sıra ters çevrildi ve testler yeşil kaldı. Gerçek
  koruma sıra değil, düzenli ifadedeki lookaround'lardı. Yorum düzeltildi.

  **Yanlış bir gerekçe, yorumsuz bırakmaktan kötüdür:** sonraki geliştirici onu
  doğru sanıp üzerine karar kurar ve gerçek korumayı fark etmeden kaldırabilir.

## Sihirli değerler
Sayı ve metin sabitleri koda gömülmez; `src/config/` altında adlandırılır.

## Yerelleştirme, para ve tarih
- Kullanıcıya görünen metinler koda gömülmez; `src/config/` altında tek yerden gelir.
  (Şu an tek dil Türkçe, ama ileride dil eklenecekse yapı hazır olur.)
- Para birimi `Intl.NumberFormat("tr-TR", { currency: "TRY" })` ile biçimlendirilir.
  Hesaplama **kuruş cinsinden tam sayı** veya `Decimal` ile yapılır, float ile asla.
- Tarih `date-fns` + `tr` yerel ayarıyla biçimlendirilir. Veritabanında **UTC**,
  ekranda `Europe/Istanbul`. Sunucu saat dilimine güvenilmez.
- Sıralama ve arama Türkçe karakter duyarlıdır (`localeCompare("tr")`);
  "İ/ı" dönüşümü için `toLocaleLowerCase("tr")`.

## Kullanıcıya görünen metin (copy) kuralları
- Sade, kısa, teknik terimsiz Türkçe. "Hata: 500" değil → "Şu an bağlanamıyoruz, biraz sonra tekrar deneyin."
- Suçlayıcı dil yok: "Yanlış girdiniz" değil → "Bu alan e-posta biçiminde olmalı."
- Her hata mesajı **ne yapılacağını** söyler.
- Buton metni eylem bildirir: "Tamam" değil → "Randevuyu onayla".
