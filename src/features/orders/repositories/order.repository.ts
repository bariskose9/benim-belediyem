import type { Prisma } from "@/generated/prisma/client";
import type { CartItemType, FulfillmentType, OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toDecimalInput, toKurus } from "@/lib/money";

/**
 * `orders`, `order_items` ve `refunds` tablolarına erişen katman (PRD §5.5).
 *
 * ⛔ BU DOSYADA İŞ KURALI YOKTUR. "İptal edilebilir mi", "hangi durumdadır"
 * sorularının cevabı servis katmanında (`order-timeline.ts` + `order.service.ts`);
 * burada yalnızca sorgular var. Karar veren yerin tek olması, ekranın ve
 * sunucunun aynı cevabı vermesini garanti ediyor.
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type OrderItemRow = {
  itemType: CartItemType;
  refId: string;
  quantity: number;
  unitPriceKurus: number;
};

export type OrderRow = {
  id: string;
  fulfillmentType: FulfillmentType;
  /** Veritabanındaki HAM durum — kullanıcıya gösterilecek olan bu değil. */
  storedStatus: OrderStatus;
  notifiedStatus: OrderStatus | null;
  createdAt: Date;
  cancelledAt: Date | null;
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  deliverySlot: string | null;
  items: OrderItemRow[];
  refundKurus: number | null;
  cardLast4: string;
  transactionId: string;
};

const ORDER_SELECT = {
  id: true,
  userId: true,
  fulfillmentType: true,
  status: true,
  notifiedStatus: true,
  createdAt: true,
  cancelledAt: true,
  subtotalAmount: true,
  deliveryFee: true,
  totalAmount: true,
  deliverySlot: true,
  paymentId: true,
  items: {
    select: { itemType: true, refId: true, quantity: true, unitPrice: true },
    orderBy: { createdAt: "asc" },
  },
  refund: { select: { amount: true } },
  payment: { select: { cardLast4: true, fakeTransactionId: true } },
} satisfies Prisma.OrderSelect;

type SelectedOrder = Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>;

/**
 * Kullanıcının siparişleri, yenisi üstte.
 *
 * SAHİPLİK SORGUNUN İÇİNDE (`userId`), sonradan yapılan bir `if` değil:
 * listeyi filtrelemeyi unutmak, herkesin siparişini herkese göstermek
 * demektir (05-auth-security.md → IDOR).
 *
 * Üst sınır var: sipariş geçmişi yıllar içinde büyüyebilir ve sayfalama
 * gelene kadar tek sayfa boğulmamalı (teknik borç #43 ile aynı gerekçe).
 */
export async function listOrdersForUser(
  userId: string,
  client: Client = prisma,
): Promise<OrderRow[]> {
  const rows = await client.order.findMany({
    where: { userId },
    select: ORDER_SELECT,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map(toOrderRow);
}

/**
 * Tek siparişi getirir — SAHİBİNİ DE DÖNER.
 *
 * `userId` sorguya KONULMUYOR ve bu bilinçli bir farklılık: PRD §5.5 kabul
 * kriteri "başkasının siparişini iptal etme isteği 403 döner" diyor. 403
 * verebilmek için önce kaydın var olduğunu, sonra sahibinin başkası olduğunu
 * bilmek gerekiyor. (Randevu modülünde tersi seçilmişti — orada 404 dönülüyor
 * çünkü PRD öyle istiyordu; burada kararı yine PRD veriyor.)
 */
export async function findOrderById(
  orderId: string,
  client: Client = prisma,
): Promise<(OrderRow & { userId: string; paymentId: string }) | null> {
  const row = await client.order.findUnique({ where: { id: orderId }, select: ORDER_SELECT });

  return row ? { ...toOrderRow(row), userId: row.userId, paymentId: row.paymentId } : null;
}

/**
 * Siparişi KOŞULLU olarak iptal eder; koşul tutmazsa `false` döner.
 *
 * ═══ İKİ KOŞUL DA `WHERE`'İN İÇİNDE ═══
 *
 *  1. `status = 'received'`  → zaten iptal edilmiş sipariş ikinci kez iptal edilemez
 *  2. `created_at > cancellableAfter` → iptal penceresi (ADR-013) hâlâ açık
 *
 * İkincisi neden burada da tekrarlanıyor: servis zaten `deriveOrderState` ile
 * kontrol ediyor, ama okuma ile yazma arasında geçen sürede pencere kapanmış
 * olabilir. "Önce oku, sonra yaz" iki adımdır ve arasına zaman girer (adım 7
 * ve 8'in dersi). Tek koşullu UPDATE'te böyle bir boşluk yok: etkilenen satır
 * sayısı 0 ise iptal olmamıştır ve çağıran 409 fırlatır.
 */
export async function cancelOrderIfCancellable(
  input: {
    orderId: string;
    userId: string;
    cancellableAfter: Date;
    cancelledAt: Date;
    reason: string;
  },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.order.updateMany({
    where: {
      id: input.orderId,
      userId: input.userId,
      status: "received",
      createdAt: { gt: input.cancellableAfter },
    },
    data: {
      status: "cancelled",
      cancelledAt: input.cancelledAt,
      cancelReason: input.reason,
    },
  });

  return result.count === 1;
}

/**
 * İptal edilen market siparişinin stoğunu geri yükler (PRD §5.5 kabul kriteri:
 * "iptal sonrası ürün stoğu sipariş öncesi değerine döner").
 *
 * Artırmada `decrementStock`'taki gibi bir yeterlilik koşulu YOK — stok
 * eklemek hiçbir sınırı zorlamaz. Buradaki koruma iptalin BİR KEZ olmasıdır
 * ve onu `cancelOrderIfCancellable` sağlıyor: iptal geçmediyse bu fonksiyona
 * hiç gelinmez, dolayısıyla stok iki kez geri yüklenemez.
 *
 * Ürün yumuşak silinmişse (`deletedAt`) satır etkilenmez ve `false` döner;
 * çağıran bunu hata saymaz — silinmiş bir ürünün stoğu kimseyi ilgilendirmez.
 */
export async function restoreStock(
  input: { productId: string; quantity: number },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.product.updateMany({
    where: { id: input.productId, deletedAt: null },
    data: { stock: { increment: input.quantity } },
  });

  return result.count === 1;
}

/**
 * Sahte iade kaydını yazar.
 *
 * `order_id` benzersiz olduğu için ikinci bir iade yazılamaz; çift istek
 * gelirse kararı veritabanı verir (`P2002`). Bu, iptal koşulunun yanında
 * İKİNCİ bir emniyet kemeri: biri yanlış yazılsa bile diğeri tutar.
 */
export async function createRefund(
  input: {
    orderId: string;
    paymentId: string;
    amountKurus: number;
    fakeRefundId: string;
    reason: string;
  },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.refund.create({
    data: {
      orderId: input.orderId,
      paymentId: input.paymentId,
      amount: toDecimalInput(input.amountKurus),
      fakeRefundId: input.fakeRefundId,
      reason: input.reason,
    },
    select: { id: true },
  });
}

/**
 * "Bu durum kullanıcıya bildirildi" işaretini KOŞULLU olarak ilerletir.
 *
 * `WHERE notified_status = <önceki>` sayesinde iki eşzamanlı okuma aynı
 * bildirimi iki kez yazamaz: ikincisi 0 satır etkiler ve bildirimi atlar.
 * Değeri okuyup karşılaştırıp yazmak üç adım olurdu ve arasına diğer istek
 * girerdi (ADR-013).
 */
export async function advanceNotifiedStatus(
  input: { orderId: string; from: OrderStatus | null; to: OrderStatus },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.order.updateMany({
    where: { id: input.orderId, notifiedStatus: input.from },
    data: { notifiedStatus: input.to },
  });

  return result.count === 1;
}

/**
 * Bildirim işaretini `cancelled` yapar.
 *
 * Burada koşul YOK ve olmasına gerek de yok: bu fonksiyona yalnızca
 * `cancelOrderIfCancellable` TUTTUKTAN sonra, aynı transaction içinde
 * geliniyor. Yani "iptal bir kez olur" güvencesi zaten alınmış durumda;
 * ikinci bir koşul eklemek aynı kuralı iki yerde yazmak olurdu.
 */
export async function markNotifiedCancelled(
  orderId: string,
  client: Client = prisma,
): Promise<void> {
  await client.order.update({
    where: { id: orderId },
    data: { notifiedStatus: "cancelled" },
    select: { id: true },
  });
}

function toOrderRow(row: SelectedOrder): OrderRow {
  return {
    id: row.id,
    fulfillmentType: row.fulfillmentType,
    storedStatus: row.status,
    notifiedStatus: row.notifiedStatus,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
    subtotalKurus: toKurus(row.subtotalAmount),
    deliveryFeeKurus: toKurus(row.deliveryFee),
    totalKurus: toKurus(row.totalAmount),
    deliverySlot: row.deliverySlot,
    items: row.items.map((item) => ({
      itemType: item.itemType,
      refId: item.refId,
      quantity: item.quantity,
      unitPriceKurus: toKurus(item.unitPrice),
    })),
    refundKurus: row.refund ? toKurus(row.refund.amount) : null,
    cardLast4: row.payment.cardLast4,
    transactionId: row.payment.fakeTransactionId,
  };
}
