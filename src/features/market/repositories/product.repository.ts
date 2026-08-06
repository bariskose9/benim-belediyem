import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";
import { normalizeSearchQuery } from "@/lib/search-text";

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

  const rows = await prisma.product.findMany({
    where: {
      deletedAt: null,
      categoryId: filters.categoryId,
      // Ad VEYA açıklama: kullanıcı "deterjan" yazdığında adında geçmeyen ama
      // açıklamasında geçen ürünü de bulabilmeli.
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { description: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
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
