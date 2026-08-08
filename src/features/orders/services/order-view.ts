import { messages } from "@/config/messages";
import { findCatalogItems } from "@/features/cart/repositories/catalog.repository";
import { shortOrderCode } from "@/features/notifications/services/order-notification.service";
import type { OrderRow } from "@/features/orders/repositories/order.repository";
import { deriveOrderState } from "@/features/orders/services/order-timeline";
import type { CartItemType, FulfillmentType, OrderStatus } from "@/generated/prisma/enums";
import { lineTotalKurus } from "@/lib/money";

/**
 * Veritabanı satırını EKRANIN GÖRDÜĞÜ şekle çeviren katman.
 *
 * Neden `order.service.ts`'ten ayrı: o dosya iş kurallarını (iptal edilebilir
 * mi, hangi koşullar tutuyor) yürütüyor; burası yalnızca sunum. İkisi aynı
 * dosyadayken 300 satırı geçmişti (02-coding-standards.md) ve iki farklı
 * sorumluluk yan yana duruyordu.
 *
 * ⛔ BURADA KARAR VERİLMEZ. Durum ve iptal edilebilirlik `deriveOrderState`'ten
 * geliyor; bu dosya onu yalnızca taşıyor.
 */

export type OrderLineView = {
  refId: string;
  itemType: CartItemType;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPriceKurus: number;
  lineTotalKurus: number;
};

export type OrderView = {
  id: string;
  /** Ekranda gösterilen kısa kod — tam kimlik kullanıcıya yazdırılmaz. */
  code: string;
  fulfillmentType: FulfillmentType;
  status: OrderStatus;
  canCancel: boolean;
  nextStageAt: Date | null;
  createdAt: Date;
  cancelledAt: Date | null;
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  deliverySlot: string | null;
  refundKurus: number | null;
  cardLast4: string;
  lines: OrderLineView[];
};

type CatalogNames = Map<string, { name: string; imageUrl: string | null }>;

/**
 * Sipariş kalemlerinin ADINI ve görselini katalogdan çözer.
 *
 * FİYAT KATALOGDAN OKUNMAZ — sipariş kalemine donmuş fiyat kullanılır
 * (`order_items.unit_price`). Ürünün fiyatı sonradan değişse bile geçmiş
 * sipariş bozulmamalı (data-model.md).
 *
 * Modül başına TEK sorgu: her kalem için ayrı sorgu açmak 20 kalemlik bir
 * siparişte 20 gidiş-dönüş ederdi (N+1).
 */
export async function resolveLineNames(
  rows: readonly OrderRow[],
  now: Date,
): Promise<CatalogNames> {
  const idsByType = new Map<CartItemType, Set<string>>();

  for (const row of rows) {
    for (const item of row.items) {
      const bucket = idsByType.get(item.itemType) ?? new Set<string>();

      bucket.add(item.refId);
      idsByType.set(item.itemType, bucket);
    }
  }

  const resolved: CatalogNames = new Map();

  for (const [itemType, ids] of idsByType) {
    const items = await findCatalogItems(itemType, [...ids], now);

    for (const [refId, item] of items) {
      resolved.set(catalogKey(itemType, refId), { name: item.name, imageUrl: item.imageUrl });
    }
  }

  return resolved;
}

export function toOrderView(row: OrderRow, names: CatalogNames, now: Date): OrderView {
  const state = deriveOrderState({
    fulfillmentType: row.fulfillmentType,
    storedStatus: row.storedStatus,
    createdAt: row.createdAt,
    now,
  });

  return {
    id: row.id,
    code: shortOrderCode(row.id),
    fulfillmentType: row.fulfillmentType,
    status: state.status,
    canCancel: state.canCancel,
    nextStageAt: state.nextStageAt,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
    subtotalKurus: row.subtotalKurus,
    deliveryFeeKurus: row.deliveryFeeKurus,
    totalKurus: row.totalKurus,
    deliverySlot: row.deliverySlot,
    refundKurus: row.refundKurus,
    cardLast4: row.cardLast4,
    lines: row.items.map((item) => toLineView(item, names)),
  };
}

function toLineView(row: OrderRow["items"][number], names: CatalogNames): OrderLineView {
  const catalog = names.get(catalogKey(row.itemType, row.refId));

  return {
    refId: row.refId,
    itemType: row.itemType,
    // Katalogdan silinmiş ürün: satır YİNE DE gösteriliyor. Geçmiş sipariş
    // eksik görünmemeli — kullanıcı ne ödediğini görebilmeli.
    name: catalog?.name ?? messages.orders.unknownItem,
    imageUrl: catalog?.imageUrl ?? null,
    quantity: row.quantity,
    unitPriceKurus: row.unitPriceKurus,
    lineTotalKurus: lineTotalKurus(row.unitPriceKurus, row.quantity),
  };
}

/** Üç tabloda aynı kimlik olabilir; anahtar tür + kimlik. */
function catalogKey(itemType: CartItemType, refId: string): string {
  return `${itemType}:${refId}`;
}
