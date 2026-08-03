import type { Prisma } from "@/generated/prisma/client";
import type { CartItemType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";

/**
 * Sepetin KATALOG tarafı: üç ayrı tablodaki ürünleri tek bir şekle çevirir.
 *
 * NEDEN GEREKLİ: `cart_items.ref_id` üç farklı tabloya işaret ediyor
 * (`products`, `menu_items`, `events`) ve aralarında yabancı anahtar YOK —
 * tek bir kolon üç tabloya birden bağlanamaz. Bu dosya o çok biçimliliği
 * tek yerde çözüyor; sepet servisi "market mi restoran mı" diye dallanmıyor.
 *
 * FİYAT HER ZAMAN BURADAN OKUNUR, İSTEMCİDEN DEĞİL. Sepete eklerken de,
 * ödeme anında da katalog fiyatı esas alınır; istemcinin gönderdiği bir
 * fiyat olsaydı yok sayılırdı (data-model.md).
 */

export type CatalogItem = {
  refId: string;
  name: string;
  imageUrl: string | null;
  unitPriceKurus: number;
  /** Satın alınabilir mi (stok, satışta olma, tarihi geçmemiş olma). */
  isPurchasable: boolean;
  /** `null` = stok takibi yok (restoran kalemi, etkinlik bileti). */
  availableStock: number | null;
};

/** Transaction içinde de çalışabilsin diye istemci dışarıdan verilebilir. */
type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Tek bir katalog kaydını getirir; yoksa `null`.
 *
 * Silinmiş kayıtlar (`deletedAt`) bulunmuş SAYILMAZ: yumuşak silinen bir ürün
 * kullanıcı için artık yok demektir.
 */
export async function findCatalogItem(
  itemType: CartItemType,
  refId: string,
  now: Date,
  client: Client = prisma,
): Promise<CatalogItem | null> {
  const items = await findCatalogItems(itemType, [refId], now, client);

  return items.get(refId) ?? null;
}

/**
 * Birden çok kaydı TEK SORGUDA getirir.
 *
 * Sepet ekranı her satır için ayrı sorgu açsaydı 20 kalemlik bir sepet 20
 * gidiş-dönüş ederdi (N+1). Modül başına tek `IN` sorgusu yeterli.
 */
export async function findCatalogItems(
  itemType: CartItemType,
  refIds: readonly string[],
  now: Date,
  client: Client = prisma,
): Promise<Map<string, CatalogItem>> {
  if (refIds.length === 0) return new Map();

  switch (itemType) {
    case "market":
      return findMarketProducts(refIds, client);
    case "restaurant":
      return findMenuItems(refIds, client);
    case "event":
      return findEvents(refIds, now, client);
  }
}

async function findMarketProducts(
  refIds: readonly string[],
  client: Client,
): Promise<Map<string, CatalogItem>> {
  const rows = await client.product.findMany({
    where: { id: { in: [...refIds] }, deletedAt: null },
    select: { id: true, name: true, imageUrl: true, price: true, stock: true },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        refId: row.id,
        name: row.name,
        imageUrl: row.imageUrl,
        unitPriceKurus: toKurus(row.price),
        // Stok 0 ise satın alınamaz (PRD §5.3: "Stok yetersizse sepete eklenemez").
        isPurchasable: row.stock > 0,
        availableStock: row.stock,
      },
    ]),
  );
}

async function findMenuItems(
  refIds: readonly string[],
  client: Client,
): Promise<Map<string, CatalogItem>> {
  const rows = await client.menuItem.findMany({
    where: { id: { in: [...refIds] }, deletedAt: null },
    select: { id: true, name: true, imageUrl: true, price: true, isAvailable: true },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        refId: row.id,
        name: row.name,
        imageUrl: row.imageUrl,
        unitPriceKurus: toKurus(row.price),
        isPurchasable: row.isAvailable,
        // Restoran kalemi sayılmaz: "var" ya da "yok" (PRD §5.4 "tükendi").
        availableStock: null,
      },
    ]),
  );
}

/**
 * Etkinlik bileti.
 *
 * BU FAZDA BİLET ETKİNLİĞİN KENDİSİNE BAĞLI, koltuğa değil. Koltuk seçimi ve
 * 10 dakikalık kilit adım 11'in işi (PRD §5.2); o adımda sepet satırı
 * `SeatReservation` kaydına bağlanacak. Bugün taban fiyattan bir bilet
 * satılıyor ve bu, ödeme altyapısını kurmak için yeterli.
 *
 * Başlamış etkinliğe bilet satılmaz — zaman koşulu indeksli (ADR-007).
 */
async function findEvents(
  refIds: readonly string[],
  now: Date,
  client: Client,
): Promise<Map<string, CatalogItem>> {
  const rows = await client.event.findMany({
    where: { id: { in: [...refIds] } },
    select: { id: true, name: true, basePrice: true, startsAt: true },
  });

  return new Map(
    rows.map((row) => [
      row.id,
      {
        refId: row.id,
        name: row.name,
        imageUrl: null,
        unitPriceKurus: toKurus(row.basePrice),
        isPurchasable: row.startsAt.getTime() > now.getTime(),
        availableStock: null,
      },
    ]),
  );
}
