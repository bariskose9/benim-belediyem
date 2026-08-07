import { findIdsMatchingQuery } from "@/features/catalog/repositories/catalog-search.repository";
import type { CatalogFilterOption } from "@/features/catalog/types";
import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";
import { normalizeSearchQuery } from "@/lib/search-text";

import type { MenuItemView } from "../types";

/**
 * Restoran menüsünün okuma tarafı (PRD §5.4).
 *
 * BU DOSYA YALNIZCA OKUR. Adisyon kalemleri sepet servisine yazılıyor
 * (`addItemToCart`) ve kurallar orada kalıyor — menü ekranı kendi adet veya
 * satın alınabilirlik kuralını yazsaydı iki ayrı doğruluk kaynağı olurdu.
 *
 * TÜRKÇE ARAMA ORTAK KATMANDAN (`features/catalog`): `unaccent` deseni market
 * ile birebir aynı ve iki kopya zamanla ayrışırdı.
 */

/**
 * Menü kategorileri — süzgeç şeridi için.
 *
 * TÜKENMİŞ KALEMLER DE SAYILIYOR: kategori "Tatlı (5 kalem)" derken listede 5
 * kart görünüyor, ikisi "Bugün yok" işaretli. Sayı yalnızca satılabilirleri
 * saysaydı rozetle liste birbirini tutmazdı.
 *
 * Kalemi hiç olmayan kategori GÖSTERİLMİYOR: tıklandığında boş liste veren
 * bir süzgeç kullanıcıya "arıza var" hissi verir.
 */
export async function listMenuCategories(): Promise<CatalogFilterOption[]> {
  const rows = await prisma.menuCategory.findMany({
    where: { items: { some: { deletedAt: null } } },
    select: {
      id: true,
      name: true,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({ id: row.id, name: row.name, itemCount: row._count.items }));
}

/**
 * Süzgeçli menü listesi.
 *
 * TÜKENMİŞ KALEM LİSTEDEN GİZLENMİYOR, "Bugün yok" olarak işaretleniyor —
 * marketteki kararın aynısı: gizlemek kullanıcıya kalemin hiç var olmadığını
 * düşündürürdü. Adisyona eklenememesi ekranda değil, sepet servisinde
 * güvence altında.
 *
 * SAYFALAMA YOK ve bu bilinçli: menü 31 kalem, kategoriye süzülünce ~6.
 * Üst sınır yine de var — `take` olmadan büyüyen bir tablo bir gün sayfayı
 * boğardı.
 */
export async function listMenuItems(filters: {
  categoryId?: string;
  query?: string;
}): Promise<MenuItemView[]> {
  const query = normalizeSearchQuery(filters.query);
  const matchingIds = query ? await findIdsMatchingQuery("menu_items", query) : null;

  // Arama hiçbir kalemle eşleşmediyse veritabanına ikinci kez gitmeye gerek yok.
  if (matchingIds?.length === 0) return [];

  const rows = await prisma.menuItem.findMany({
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
      isAvailable: true,
      category: { select: { id: true, name: true } },
    },
    // Önce sipariş edilebilenler: "Bugün yok" kalemleri listenin başını tutmasın.
    orderBy: [{ isAvailable: "desc" }, { name: "asc" }],
    take: 200,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    priceKurus: toKurus(row.price),
    isAvailable: row.isAvailable,
    categoryId: row.category.id,
    categoryName: row.category.name,
  }));
}

/** Süzgeç şeridinde seçili kategoriyi doğrulamak için. */
export async function findMenuCategoryById(id: string): Promise<CatalogFilterOption | null> {
  const row = await prisma.menuCategory.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
  });

  return row ? { id: row.id, name: row.name, itemCount: row._count.items } : null;
}
