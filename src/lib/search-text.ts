/**
 * Arama metninin Türkçe'ye göre hazırlanması — tek kaynak.
 *
 * NEDEN GEREKLİ (ölçülmüş bir sorun, tahmin değil): veritabanının
 * büyük/küçük harf duyarsız araması Türkçe harf kurallarını bilmiyor.
 * Yerel veritabanında denendi:
 *
 *   "SIVI"  → 0 sonuç, ama "sıvı"  → "Sıvı El Sabunu" bulunuyor
 *   "KAĞIT" → 0 sonuç, ama "kağıt" → "Kağıt Havlu"    bulunuyor
 *
 * Sebebi `I` harfi: veritabanı onu `i`'ye çeviriyor, oysa Türkçe'de karşılığı
 * `ı`. Yani BÜYÜK HARFLE yazan kullanıcı ürünü hiç bulamıyordu.
 *
 * ÇÖZÜM SORGUYU GÖNDERMEDEN ÖNCE: metni JavaScript'in Türkçe yerel kurallarıyla
 * küçük harfe çeviriyoruz (`I` → `ı`, `İ` → `i`). Veritabanına zaten küçük
 * harfli bir metin gidiyor, o da geri kalanını doğru eşliyor.
 *
 * ALTERNATİFİ NEDEN SEÇMEDİK: aynı işi veritabanı tarafında yapmak Türkçe
 * bir harmanlama (collation) veya `unaccent` eklentisi kurmak, yani yeni bir
 * migration ve her ortamda ek yapılandırma demekti. Buradaki tek satır aynı
 * sorunu ücretsiz çözüyor.
 *
 * ÇÖZMEDİĞİ ŞEY: Türkçe klavyesi olmayan kullanıcının "sivi" yazması.
 * Aksan körü arama ayrı bir iş (teknik borç) — bunun için gerçekten
 * veritabanı eklentisi gerekiyor.
 */

const TURKISH_LOCALE = "tr-TR";

/**
 * Kullanıcının yazdığı arama metnini veritabanına gönderilecek hâle getirir.
 *
 * Sonuç boşsa `undefined` döner: "boş metni içerenler" diye bir süzgeç
 * kurmanın anlamı yok, süzgeç hiç uygulanmamalı.
 */
export function normalizeSearchQuery(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;

  const normalized = raw.trim().toLocaleLowerCase(TURKISH_LOCALE);

  return normalized.length === 0 ? undefined : normalized;
}
