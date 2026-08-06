import type { Prisma } from "@/generated/prisma/client";
import type {
  CardBrand,
  CartItemType,
  FulfillmentType,
  PaymentStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toDecimalInput, toKurus } from "@/lib/money";

/**
 * `payments`, `orders`, `order_items`, `saved_cards` ve stok düşümüne erişen katman.
 *
 * ⛔ BU DOSYADA KART NUMARASI İÇİN PARAMETRE YOKTUR. `createPayment` yalnızca
 * marka ve son 4 haneyi alır; tam numara buraya kadar gelemez, dolayısıyla
 * yanlışlıkla yazılamaz (`lib/audit.ts` ile aynı disiplin —
 * data-model.md: "tam kart numarası ASLA saklanmaz").
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type CreatePaymentInput = {
  userId: string;
  savedCardId: string | null;
  brand: CardBrand;
  cardLast4: string;
  status: PaymentStatus;
  amountKurus: number;
  transactionId: string;
  idempotencyKey: string;
  attemptedAt: Date;
};

/**
 * Ödeme kaydı açar — BAŞARILI VE BAŞARISIZ DENEMELERİN İKİSİ İÇİN DE.
 *
 * Başarısız deneme neden yazılıyor: `payments` append-only bir denetim
 * kaydıdır (data-model.md). "Kartım neden çekilmedi" sorusunun cevabı ancak
 * denemenin kendisi kayıtlıysa verilebilir. Sipariş üretmediği için kullanıcı
 * açısından bir bedeli yok.
 */
export async function createPayment(
  input: CreatePaymentInput,
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.payment.create({
    data: {
      userId: input.userId,
      savedCardId: input.savedCardId,
      brand: input.brand,
      cardLast4: input.cardLast4,
      fakeTransactionId: input.transactionId,
      status: input.status,
      amount: toDecimalInput(input.amountKurus),
      idempotencyKey: input.idempotencyKey,
      attemptedAt: input.attemptedAt,
    },
    select: { id: true },
  });
}

export type CreateOrderInput = {
  userId: string;
  paymentId: string;
  fulfillmentType: FulfillmentType;
  subtotalKurus: number;
  deliveryFeeKurus: number;
  totalKurus: number;
  deliveryAddressId: string | null;
  deliverySlot: string | null;
  /** Bilet teslim edilmez; durumu doğrudan `delivered` olur (PRD §6.1). */
  status: "received" | "delivered";
  items: readonly {
    itemType: CartItemType;
    refId: string;
    quantity: number;
    unitPriceKurus: number;
  }[];
};

/**
 * Sipariş ve kalemlerini yazar.
 *
 * FİYAT BURADA DONAR (`order_items.unit_price`): ürünün fiyatı yarın değişse
 * bile geçmiş sipariş bozulmaz (data-model.md).
 */
export async function createOrderWithItems(
  input: CreateOrderInput,
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.order.create({
    data: {
      userId: input.userId,
      paymentId: input.paymentId,
      fulfillmentType: input.fulfillmentType,
      subtotalAmount: toDecimalInput(input.subtotalKurus),
      deliveryFee: toDecimalInput(input.deliveryFeeKurus),
      discountAmount: toDecimalInput(0),
      totalAmount: toDecimalInput(input.totalKurus),
      status: input.status,
      deliveryAddressId: input.deliveryAddressId,
      deliverySlot: input.deliverySlot,
      items: {
        create: input.items.map((item) => ({
          itemType: item.itemType,
          refId: item.refId,
          quantity: item.quantity,
          unitPrice: toDecimalInput(item.unitPriceKurus),
        })),
      },
    },
    select: { id: true },
  });
}

/**
 * Stoğu KOŞULLU olarak düşer. Yetmiyorsa `false` döner.
 *
 * ═══ RANDEVU MODÜLÜNDEKİ (adım 6) DESENİN AYNISI ═══
 *
 * Koşul (`stock >= quantity`) `WHERE`'in içinde, uygulamada değil. "Önce
 * stoğa bak, yetiyorsa düş" iki adımdır ve arasına başka bir sipariş
 * girebilir — iki kullanıcı da yeterli görür, ikisi de düşer, stok eksiye
 * iner. Tek koşullu UPDATE'te bu boşluk yok: PostgreSQL ikinci güncelleyiciyi
 * bekletir, birinci commit edince WHERE'i yeniden değerlendirir ve satır
 * artık koşulu sağlamıyorsa atlar → etkilenen satır 0 → sipariş iptal.
 */
export async function decrementStock(
  input: { productId: string; quantity: number },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.product.updateMany({
    where: { id: input.productId, stock: { gte: input.quantity }, deletedAt: null },
    data: { stock: { decrement: input.quantity } },
  });

  return result.count === 1;
}

/** Kullanıcının kayıtlı kartları — silinenler hariç. */
export async function listSavedCards(
  userId: string,
  client: Client = prisma,
): Promise<{ id: string; brand: CardBrand; last4: string; expMonth: number; expYear: number }[]> {
  return client.savedCard.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, brand: true, last4: true, expMonth: true, expYear: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Kayıtlı kartı getirir — YALNIZCA sahibine.
 *
 * Sahiplik sorgunun içinde (`userId`), sonradan kontrol edilen bir `if`
 * değil: başkasının kartıyla ödeme yapılması IDOR açığı olurdu.
 */
export async function findOwnedSavedCard(
  input: { savedCardId: string; userId: string },
  client: Client = prisma,
): Promise<{
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
} | null> {
  return client.savedCard.findFirst({
    where: { id: input.savedCardId, userId: input.userId, deletedAt: null },
    select: { id: true, brand: true, last4: true, expMonth: true, expYear: true },
  });
}

/** Yeni kartı kaydeder. Numara DEĞİL, yalnızca marka + son 4 hane + son kullanma. */
export async function saveCard(
  input: {
    userId: string;
    brand: CardBrand;
    last4: string;
    expMonth: number;
    expYear: number;
    holderName: string;
  },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.savedCard.create({ data: input, select: { id: true } });
}

/** Kullanıcının teslimat adresleri. */
export async function listAddresses(
  userId: string,
  client: Client = prisma,
): Promise<{ id: string; title: string; fullAddress: string; district: string }[]> {
  return client.address.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, title: true, fullAddress: true, district: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Adresin sahibi bu kullanıcı mı — IDOR kontrolü sorgunun içinde. */
export async function findOwnedAddress(
  input: { addressId: string; userId: string },
  client: Client = prisma,
): Promise<{ id: string } | null> {
  return client.address.findFirst({
    where: { id: input.addressId, userId: input.userId, deletedAt: null },
    select: { id: true },
  });
}

export async function createAddress(
  input: { userId: string; title: string; fullAddress: string; district: string },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.address.create({ data: input, select: { id: true } });
}

export type PaymentReceipt = {
  transactionId: string;
  amountKurus: number;
  brand: CardBrand;
  cardLast4: string;
  attemptedAt: Date;
  orders: {
    id: string;
    fulfillmentType: FulfillmentType;
    totalKurus: number;
    status: string;
    itemCount: number;
  }[];
};

/**
 * Ödeme fişini getirir — YALNIZCA sahibine.
 *
 * Sahiplik sorgunun içinde (`userId`): işlem kodu tahmin edilse bile
 * başkasının fişi okunamaz. Kod ekranda ve adres çubuğunda geçiyor,
 * dolayısıyla gizli bir sır değil — koruma sahiplik kontrolünde.
 */
export async function findPaymentReceipt(
  input: { userId: string; transactionId: string },
  client: Client = prisma,
): Promise<PaymentReceipt | null> {
  const payment = await client.payment.findFirst({
    where: {
      fakeTransactionId: input.transactionId,
      userId: input.userId,
      status: "success",
    },
    select: {
      fakeTransactionId: true,
      amount: true,
      brand: true,
      cardLast4: true,
      attemptedAt: true,
      orders: {
        select: {
          id: true,
          fulfillmentType: true,
          totalAmount: true,
          status: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!payment) return null;

  return {
    transactionId: payment.fakeTransactionId,
    amountKurus: toKurus(payment.amount),
    brand: payment.brand,
    cardLast4: payment.cardLast4,
    attemptedAt: payment.attemptedAt,
    orders: payment.orders.map((order) => ({
      id: order.id,
      fulfillmentType: order.fulfillmentType,
      totalKurus: toKurus(order.totalAmount),
      status: order.status,
      itemCount: order._count.items,
    })),
  };
}
