import { findCatalogItems } from "@/features/cart/repositories/catalog.repository";
import type { CartLine } from "@/features/cart/types";
import type { Prisma } from "@/generated/prisma/client";
import type { CartItemType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toDecimalInput, toKurus } from "@/lib/money";

/**
 * `carts` ve `cart_items` tablolarına erişen tek katman.
 *
 * SEPETİN SAHİBİ İKİ TÜRLÜ OLABİLİR (PRD §4 "Ziyaretçi sepeti"):
 *  · `userId`      → giriş yapmış kullanıcı
 *  · `anonymousId` → `bb_anon` çerezindeki rastgele kimlik
 * Her okuma bu ikisinden biriyle filtrelenir; "sepeti kimliğiyle getir" diye
 * bir fonksiyon YOKTUR — olsaydı başkasının sepetini istemek mümkün olurdu
 * (IDOR). Sahiplik, randevu modülünde olduğu gibi sorgunun içinde.
 */

export type CartOwner = { userId: string } | { anonymousId: string };

type Client = Prisma.TransactionClient | typeof prisma;

/** Sahibi `where` koşuluna çevirir — tek yerde, kopyalanmadan. */
function ownerWhere(owner: CartOwner): { userId: string } | { anonymousId: string } {
  return "userId" in owner ? { userId: owner.userId } : { anonymousId: owner.anonymousId };
}

/** Sahibin AKTİF sepetini bulur; yoksa `null`. */
export async function findActiveCart(
  owner: CartOwner,
  client: Client = prisma,
): Promise<{ id: string } | null> {
  return client.cart.findFirst({
    where: { ...ownerWhere(owner), status: "active" },
    select: { id: true },
    // Veri bozulup iki aktif sepet oluşursa en yenisi kazanır; sessizce
    // eskisine yazmak kullanıcının sepetini "kaybolmuş" gösterirdi.
    orderBy: { createdAt: "desc" },
  });
}

/** Aktif sepeti getirir, yoksa açar. */
export async function findOrCreateActiveCart(
  owner: CartOwner,
  client: Client = prisma,
): Promise<{ id: string }> {
  const existing = await findActiveCart(owner, client);

  if (existing) return existing;

  return client.cart.create({
    data: { ...ownerWhere(owner), status: "active" },
    select: { id: true },
  });
}

/** Ham sepet satırları — katalogla zenginleştirilmemiş hâli. */
export type RawCartItem = {
  id: string;
  itemType: CartItemType;
  refId: string;
  quantity: number;
  unitPriceKurus: number;
  note: string | null;
};

export async function listCartItems(
  cartId: string,
  client: Client = prisma,
): Promise<RawCartItem[]> {
  const rows = await client.cartItem.findMany({
    where: { cartId },
    select: {
      id: true,
      itemType: true,
      refId: true,
      quantity: true,
      unitPrice: true,
      note: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    itemType: row.itemType,
    refId: row.refId,
    quantity: row.quantity,
    unitPriceKurus: toKurus(row.unitPrice),
    note: row.note,
  }));
}

/**
 * Sepet satırlarını katalogla zenginleştirir.
 *
 * FİYAT KATALOGDAN TAZELENİYOR, sepete eklendiği andaki fiyattan değil.
 * Sebebi dürüstlük: kullanıcı ödeme ekranında güncel fiyatı görmeli. Fiyatın
 * DONDUĞU tek an sipariş anıdır (`order_items.unit_price`), o da ödeme
 * servisinde kopyalanıyor.
 *
 * Sorgu sayısı modül sayısı kadar (en fazla 3), satır sayısı kadar değil.
 */
export async function toCartLines(
  items: readonly RawCartItem[],
  now: Date,
  client: Client = prisma,
): Promise<CartLine[]> {
  const byType = new Map<CartItemType, string[]>();

  for (const item of items) {
    byType.set(item.itemType, [...(byType.get(item.itemType) ?? []), item.refId]);
  }

  const catalog = new Map<string, Awaited<ReturnType<typeof findCatalogItems>>>();

  for (const [itemType, refIds] of byType) {
    catalog.set(itemType, await findCatalogItems(itemType, refIds, now, client));
  }

  return items.map((item) => {
    const entry = catalog.get(item.itemType)?.get(item.refId);

    // Katalogdan düşmüş ürün SATIRDAN SİLİNMEZ, satın alınamaz işaretlenir.
    // Sessizce kaybolan bir satır kullanıcıya "sepetim değişti" demez.
    if (!entry) {
      return {
        ...item,
        name: item.refId,
        imageUrl: null,
        isPurchasable: false,
        availableStock: 0,
      };
    }

    return {
      ...item,
      unitPriceKurus: entry.unitPriceKurus,
      name: entry.name,
      imageUrl: entry.imageUrl,
      isPurchasable:
        entry.isPurchasable &&
        (entry.availableStock === null || entry.availableStock >= item.quantity),
      availableStock: entry.availableStock,
    };
  });
}

/**
 * Satırı ekler veya adedini ARTIRIR.
 *
 * `upsert` + `increment` tek atomik işlem: "önce var mı diye bak, sonra ekle"
 * iki eşzamanlı istekte `unique(cartId, itemType, refId)` kısıtına takılıp
 * hata verirdi. Aynı ürün sepete iki satır olarak asla giremez — kısıtı
 * zorlayan veritabanı.
 */
export async function addOrIncrementItem(
  input: {
    cartId: string;
    itemType: CartItemType;
    refId: string;
    quantity: number;
    unitPriceKurus: number;
    note?: string | null;
  },
  client: Client = prisma,
): Promise<{ id: string; quantity: number }> {
  return client.cartItem.upsert({
    where: {
      cartId_itemType_refId: {
        cartId: input.cartId,
        itemType: input.itemType,
        refId: input.refId,
      },
    },
    create: {
      cartId: input.cartId,
      itemType: input.itemType,
      refId: input.refId,
      quantity: input.quantity,
      unitPrice: toDecimalInput(input.unitPriceKurus),
      note: input.note ?? null,
    },
    update: {
      quantity: { increment: input.quantity },
      // Fiyat her eklemede tazeleniyor: katalog fiyatı değiştiyse sepet de
      // güncel kalsın.
      unitPrice: toDecimalInput(input.unitPriceKurus),
    },
    select: { id: true, quantity: true },
  });
}

/**
 * Satırın adedini belirli bir değere ÇEKER.
 *
 * Sahiplik `cartId` üzerinden: satır kimliği tahmin edilse bile başka bir
 * sepetin satırı güncellenemez.
 */
export async function setItemQuantity(
  input: { cartId: string; itemId: string; quantity: number },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.cartItem.updateMany({
    where: { id: input.itemId, cartId: input.cartId },
    data: { quantity: input.quantity },
  });

  return result.count === 1;
}

export async function removeItem(
  input: { cartId: string; itemId: string },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.cartItem.deleteMany({
    where: { id: input.itemId, cartId: input.cartId },
  });

  return result.count === 1;
}

/** Ödeme başarılı olunca sepet kapanır; satırları sipariş kalemlerine kopyalanmıştır. */
export async function markCartConverted(cartId: string, client: Client = prisma): Promise<void> {
  await client.cart.updateMany({
    where: { id: cartId, status: "active" },
    data: { status: "converted" },
  });
}

export async function countCartLines(cartId: string, client: Client = prisma): Promise<number> {
  return client.cartItem.count({ where: { cartId } });
}
