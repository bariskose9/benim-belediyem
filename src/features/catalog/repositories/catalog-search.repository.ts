import { prisma } from "@/lib/db";
import { toLikePattern } from "@/lib/search-text";

/**
 * Katalog tablolarında AKSAN VE BÜYÜK/KÜÇÜK HARF KÖRÜ arama.
 *
 * ═══ BU DOSYA ÖLÇÜLMÜŞ BİR HATANIN ÇÖZÜMÜ ═══
 * Veritabanının kendi büyük/küçük harf araması Türkçe bilmiyor: `I` harfini
 * `i`'ye çeviriyor (Türkçe karşılığı `ı`) ve aksanları eşlemiyor. Ölçüldü:
 * `KAĞIT` → 0 sonuç, `kagit` → 0 sonuç, yalnızca `kağıt` → 1 sonuç.
 * Bu yüzden Prisma'nın `contains` + `mode: "insensitive"` kombinasyonu
 * BU PROJEDE KULLANILMIYOR; eşleştirme `unaccent()` üzerinden yapılıyor
 * (migration `20260806200000_enable_unaccent_for_search`).
 *
 * NEDEN HAM SQL: Prisma'nın sorgu kurucusu bir SQL fonksiyonunu `where`
 * içinde ifade edemiyor. Ham SQL YALNIZCA bu eşleştirmeyle sınırlı; kayıtların
 * kendisi yine Prisma ile, tip güvenli biçimde okunuyor.
 *
 * DEĞER PARAMETRE OLARAK BAĞLANIYOR (`${pattern}`), metne yapıştırılmıyor —
 * Prisma'nın etiketli şablonu bunu garanti ediyor, yani SQL enjeksiyonu yok
 * (04-database.md: "parametreli sorgu zorunlu").
 */

/**
 * Aranabilen tablolar.
 *
 * TABLO ADI PARAMETRE DEĞİL, SABİT LİSTEDEN SEÇİLEN BİR DAL. Tablo adı
 * dışarıdan gelen bir metin olsaydı sorguya yapıştırılmak zorunda kalırdı
 * (tanımlayıcılar parametre olarak bağlanamaz) ve bu bir enjeksiyon kapısı
 * açardı. Her tablo için ayrı, sabit sorgu yazmak bu kapıyı hiç açmıyor.
 */
export type SearchableCatalog = "products" | "menu_items" | "events";

/** Tek bir aramanın döndürebileceği en fazla kayıt. */
const SEARCH_RESULT_LIMIT = 200;

/**
 * Arama metniyle eşleşen kayıt kimliklerini bulur.
 *
 * Ad VEYA açıklama taranıyor: kullanıcı "deterjan" yazdığında adında geçmeyen
 * ama açıklamasında geçen ürünü de bulabilmeli.
 *
 * `ESCAPE '\'`: kullanıcının yazdığı `%` ve `_` joker sayılmasın diye —
 * `toLikePattern` onları kaçırıyor. Kaçırılmasaydı tek bir `%` karakteri tüm
 * katalogla eşleşirdi; çökme olmayan, sessiz bir hata.
 */
export async function findIdsMatchingQuery(
  catalog: SearchableCatalog,
  query: string,
): Promise<string[]> {
  const pattern = toLikePattern(query);
  const rows = await runSearch(catalog, pattern);

  return rows.map((row) => row.id);
}

/**
 * Her tablo için AYRI VE SABİT bir sorgu.
 *
 * Ortak bir sorgu kurup tablo adını değişken yapmak mümkün değil: tanımlayıcı
 * parametre olarak bağlanamaz, metne yapıştırılmak zorunda kalırdı. Tekrar
 * eden üç sorgu, açılmış bir enjeksiyon kapısından iyidir.
 *
 * ETKİNLİKTE `description` YOK, `performer` VAR: kullanıcı "kent oyuncuları"
 * yazdığında etkinliğin adını bilmeden topluluğa göre de bulabilmeli.
 * Etkinlikte `deleted_at` de yok — etkinlik yumuşak silinen 8 tablodan biri
 * değil (data-model.md).
 */
function runSearch(catalog: SearchableCatalog, pattern: string): Promise<{ id: string }[]> {
  switch (catalog) {
    case "products":
      return prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM products
        WHERE deleted_at IS NULL
          AND (
            lower(unaccent(name)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
            OR lower(unaccent(description)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
          )
        LIMIT ${SEARCH_RESULT_LIMIT}
      `;
    case "menu_items":
      return prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM menu_items
        WHERE deleted_at IS NULL
          AND (
            lower(unaccent(name)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
            OR lower(unaccent(description)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
          )
        LIMIT ${SEARCH_RESULT_LIMIT}
      `;
    case "events":
      return prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM events
        WHERE lower(unaccent(name)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
           OR lower(unaccent(performer)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
        LIMIT ${SEARCH_RESULT_LIMIT}
      `;
  }
}
