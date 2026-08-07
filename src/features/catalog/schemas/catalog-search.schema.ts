import { z } from "zod";

/**
 * Katalog ekranlarının (`/market`, `/restoran`) adres çubuğu parametreleri.
 *
 * ADRES ÇUBUĞU DA BİR GİRDİ NOKTASIDIR ve doğrulanır — buradan gelen değerler
 * doğrudan veritabanı sorgusuna gidiyor (03-api-guidelines.md). Prisma
 * sorguları parametreli olduğu için SQL enjeksiyonu riski yok; doğrulamanın
 * asıl işi sınırsız uzunlukta bir değerin sorguya taşınmasını engellemek.
 *
 * Parametre adları TÜRKÇE çünkü kullanıcıya görünen adresin parçası; alan
 * adları İngilizce çünkü kod (CLAUDE.md §0 dil kuralı).
 */

/** Kategori kimliği — hastane şemasındaki `recordId` ile aynı sınırlar. */
const recordId = z.string().trim().min(1).max(128);

/**
 * Arama metni.
 *
 * ÜST SINIR 80 KARAKTER: bir ürün adından uzun bir arama anlamlı sonuç
 * üretmez, ama sınır konmazsa megabaytlık bir metin her tuş vuruşunda
 * veritabanına taşınırdı — ucuz bir hizmet dışı bırakma yolu.
 *
 * Boş metin `undefined` sayılıyor: kullanıcı arama kutusunu temizlediğinde
 * "boş metni içeren ürünler" diye anlamsız bir süzgeç kurmuyoruz.
 */
const searchQuery = z
  .string()
  .trim()
  .max(80)
  .transform((value) => (value.length === 0 ? undefined : value));

export const catalogSearchParamsSchema = z.object({
  categoryId: recordId.optional().catch(undefined),
  query: searchQuery.optional().catch(undefined),
});

export type CatalogSearchParams = z.infer<typeof catalogSearchParamsSchema>;

/**
 * Ham `searchParams` nesnesini güvenli bir süzgece çevirir.
 *
 * BOZUK PARAMETRE HATA DEĞİL, YOK SAYILIR (`.catch(undefined)`): kullanıcı
 * adresi elle kurcaladığında ekranı 500'e düşürmek yerine süzgeçsiz listeye
 * dönmek doğru davranış — hastane ekranındaki desenin aynısı.
 */
export function parseCatalogSearchParams(
  raw: Record<string, string | string[] | undefined>,
): CatalogSearchParams {
  return catalogSearchParamsSchema.parse({
    categoryId: firstValue(raw.kategori),
    query: firstValue(raw.arama),
  });
}

/** `?kategori=a&kategori=b` gibi tekrarlı parametrede ilk değeri alır. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Süzgeç adresini kurar; boş parametreler adrese hiç yazılmaz.
 *
 * Hem kategori şeridi hem arama kutusu buradan geçiyor: iki yerde ayrı ayrı
 * kurulsaydı biri "aramayı koru" kuralını unuttuğunda kullanıcı süzgeç
 * değiştirince aramasını kaybederdi.
 */
export function buildCatalogHref(
  basePath: string,
  filters: { categoryId?: string; query?: string },
): string {
  const params = new URLSearchParams();

  if (filters.categoryId) params.set("kategori", filters.categoryId);
  if (filters.query) params.set("arama", filters.query);

  const search = params.toString();

  return search ? `${basePath}?${search}` : basePath;
}
