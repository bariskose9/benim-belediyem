import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";
import { normalizeSearchQuery, toLikePattern } from "@/lib/search-text";

import type { MarketCategory, MarketProduct } from "../types";

/**
 * Market kataloğunun okuma tarafı (PRD §5.3).
 *
 * BU DOSYA YALNIZCA OKUR. Sepete ekleme, stok düşümü ve fiyat hesabı sepet ve
 * ödeme katmanlarında (adım 7) ve oralarda kalıyor — ekran kendi stok kuralını
 * yazsaydı iki ayrı doğruluk kaynağı olurdu.
 *
 * TUTARLAR SINIRDA KURUŞA ÇEVRİLİYOR (`toKurus`). Yukarı katmanlar `Decimal`
 * görmüyor; para her yerde tam sayı kuruş (`src/lib/money.ts`).
 */

/**
 * Kategoriler — süzgeç şeridi için.
 *
 * Ürünü olmayan kategori GÖSTERİLMİYOR: tıklandığında boş liste veren bir
 * süzgeç kullanıcıya "arıza var" hissi verir.
 */
export async function listCategories(): Promise<MarketCategory[]> {
  const rows = await prisma.productCategory.findMany({
    where: { products: { some: { deletedAt: null } } },
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    productCount: row._count.products,
  }));
}

/**
 * Süzgeçli ürün listesi.
 *
 * STOĞU 0 OLAN ÜRÜN LİSTEDEN GİZLENMİYOR, "tükendi" olarak işaretleniyor.
 * Gizlemek kullanıcıya ürünün hiç var olmadığını düşündürürdü; oysa doğru
 * bilgi "var ama şu an yok". Satın alınamaması ekranda değil, sepet
 * servisinde güvence altında (PRD §5.3).
 *
 * SAYFALAMA YOK ve bu bilinçli: katalog 45 ürün, kategoriye süzülünce ~10.
 * Sayfalama bugün çözdüğünden fazla karmaşıklık getirirdi (YAGNI). Üst sınır
 * yine de var — `take` olmadan büyüyen bir tablo bir gün sayfayı boğardı.
 */
export async function listProducts(filters: {
  categoryId?: string;
  query?: string;
}): Promise<MarketProduct[]> {
  const query = normalizeSearchQuery(filters.query);
  const matchingIds = query ? await findIdsMatchingQuery(query) : null;

  // Arama yapıldı ama hiçbir ürün eşleşmediyse veritabanına ikinci kez gitmeye
  // gerek yok: `IN ()` boş listesi zaten hiçbir satır döndürmez.
  if (matchingIds?.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      deletedAt: null,
      categoryId: filters.categoryId,
      ...(matchingIds ? { id: { in: matchingIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      price: true,
      stock: true,
      category: { select: { id: true, name: true } },
    },
    // Önce satın alınabilir ürünler: tükenmiş ürünler listenin başını tutmasın.
    orderBy: [{ stock: "desc" }, { name: "asc" }],
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    priceKurus: toKurus(row.price),
    stock: row.stock,
    categoryId: row.category.id,
    categoryName: row.category.name,
  }));
}

/**
 * Arama metniyle eşleşen ürün kimliklerini bulur.
 *
 * NEDEN HAM SQL: eşleştirme `unaccent()` fonksiyonundan geçiyor ve Prisma'nın
 * sorgu kurucusu bir SQL fonksiyonunu `where` içinde ifade edemiyor. Ham SQL
 * YALNIZCA bu eşleştirmeyle sınırlı; ürünün kendisi yine Prisma ile,
 * tip güvenli biçimde okunuyor. Böylece kolon adlarını elle yazma ve birleşim
 * kurma işi kodun geneline yayılmıyor.
 *
 * DEĞER PARAMETRE OLARAK BAĞLANIYOR (`${pattern}`), metne yapıştırılmıyor —
 * Prisma'nın etiketli şablonu bunu garanti ediyor, yani SQL enjeksiyonu yok
 * (04-database.md: "parametreli sorgu zorunlu").
 *
 * `ESCAPE '\'`: kullanıcının yazdığı `%` ve `_` joker sayılmasın diye
 * (`toLikePattern` onları kaçırıyor).
 *
 * Ad VEYA açıklama taranıyor: kullanıcı "deterjan" yazdığında adında geçmeyen
 * ama açıklamasında geçen ürünü de bulabilmeli.
 */
async function findIdsMatchingQuery(query: string): Promise<string[]> {
  const pattern = toLikePattern(query);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM products
    WHERE deleted_at IS NULL
      AND (
        lower(unaccent(name)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
        OR lower(unaccent(description)) LIKE lower(unaccent(${pattern})) ESCAPE '\'
      )
    LIMIT 200
  `;

  return rows.map((row) => row.id);
}

/** Süzgeç şeridinde seçili kategorinin adını göstermek için. */
export async function findCategoryById(id: string): Promise<MarketCategory | null> {
  const row = await prisma.productCategory.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { products: { where: { deletedAt: null } } } },
    },
  });

  return row ? { id: row.id, name: row.name, productCount: row._count.products } : null;
}
