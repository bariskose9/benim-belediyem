/**
 * Arama metninin sorguya hazırlanması — tek kaynak.
 *
 * TÜRKÇE HARF KATLAMASI ARTIK BURADA DEĞİL, VERİTABANINDA. `unaccent`
 * eklentisi hem sorguyu hem ürün adını sadeleştiriyor
 * (kağıt → kagit · sıvı → sivi · çamaşır → camasir), böylece hem büyük harf
 * hem aksan sorunu TEK yerde kapanıyor. Aynı katlamayı burada bir kez daha
 * yapmak, sapabilecek ikinci bir doğruluk kaynağı üretmek olurdu.
 *
 * Bu dosyaya kalan iki iş var ve ikisi de veritabanının yapamayacağı işler:
 * metni sınırlamak ve `LIKE` joker karakterlerini etkisizleştirmek.
 */

/** `LIKE` desenlerinde kaçış karakteri; sorguda `ESCAPE '\'` ile eşleşir. */
const LIKE_ESCAPE = "\\";

/**
 * Kullanıcının yazdığını süzgeç değerine çevirir.
 *
 * Sonuç boşsa `undefined` döner: "boş metni içerenler" diye bir süzgeç
 * kurmanın anlamı yok, süzgeç hiç uygulanmamalı.
 */
export function normalizeSearchQuery(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;

  const trimmed = raw.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Arama metnini `LIKE` desenine çevirir.
 *
 * NEDEN KAÇIŞ ŞART: `%` ve `_` `LIKE` içinde joker karakterdir. Kaçırılmasaydı
 * tek bir `%` yazan kullanıcı TÜM kataloğu eşleştirir, `_` yazan ise herhangi
 * bir tek karakteri. Bu bir SQL enjeksiyonu değil (değer parametre olarak
 * bağlanıyor), ama sorgunun anlamını kullanıcının değiştirebilmesi demek —
 * ve büyüyen bir katalogda gereksiz yere her satırı taratmanın yolu.
 *
 * Ters eğik çizgi ÖNCE kaçırılıyor: sonra kaçırılsaydı kendi eklediğimiz
 * kaçış karakterlerini de ikinci kez kaçırırdık.
 */
export function toLikePattern(query: string): string {
  const escaped = query
    .replaceAll(LIKE_ESCAPE, LIKE_ESCAPE + LIKE_ESCAPE)
    .replaceAll("%", LIKE_ESCAPE + "%")
    .replaceAll("_", LIKE_ESCAPE + "_");

  return `%${escaped}%`;
}
