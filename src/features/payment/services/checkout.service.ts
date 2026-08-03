import { PAYMENT_RATE_LIMIT_MAX, PAYMENT_RATE_LIMIT_WINDOW_MS } from "@/config/constants";
import { CartEmptyError, ItemUnavailableError, OutOfStockError } from "@/features/cart/errors";
import { markCartConverted } from "@/features/cart/repositories/cart.repository";
import { getCartSummary } from "@/features/cart/services/cart.service";
import type { CartSection, CartSummary } from "@/features/cart/types";
import {
  CartChangedError,
  DeliveryAddressRequiredError,
  DeliverySlotRequiredError,
  DuplicatePaymentError,
  InsufficientFundsError,
  PaymentDeclinedError,
  PaymentRateLimitedError,
} from "@/features/payment/errors";
import { attemptPayment } from "@/features/payment/providers/mock-payment-provider";
import {
  createOrderWithItems,
  createPayment,
  decrementStock,
  findOwnedAddress,
  saveCard,
} from "@/features/payment/repositories/payment.repository";
import type { CheckoutPayload } from "@/features/payment/schemas/checkout.schema";
import { resolveCard, type ResolvedCard } from "@/features/payment/services/card-resolver";
import type { CartItemType, FulfillmentType } from "@/generated/prisma/enums";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { hashActorIp, rateLimitKey, consumeRateLimit } from "@/lib/rate-limit";

/**
 * Ödeme akışı (PRD §6.1 · §6.2) — adım 7'nin kalbi.
 *
 * ═══ İKİ KABUL KRİTERİ BU DOSYADA KARŞILANIYOR ═══
 *  1. "Üç modülden ürün içeren sepet tek ödemeyle ÜÇ SİPARİŞ üretir"
 *  2. "Ödeme başarısız olursa HİÇBİR sipariş oluşmaz, sepet korunur"
 *
 * İkincisi sıralamayla sağlanıyor: sağlayıcıya ÖNCE soruluyor, sipariş
 * SONRA yazılıyor. Ters sırada olsaydı reddedilen bir kart için sipariş
 * oluşur ve geri alınması gerekirdi.
 *
 * ⛔ TUTAR SUNUCUDA HESAPLANIR. İstemcinin gönderdiği `expectedTotalKurus`
 * tahsil edilmez; yalnızca "kullanıcının gördüğü ekran güncel miydi" diye
 * karşılaştırılır.
 */

export type CheckoutInput = {
  userId: string;
  payload: CheckoutPayload;
  actorIp: string;
  now: Date;
};

export type CheckoutResult = {
  paymentId: string;
  transactionId: string;
  orderIds: string[];
  totalKurus: number;
};

const FULFILLMENT_BY_TYPE: Readonly<Record<CartItemType, FulfillmentType>> = {
  market: "market_delivery",
  restaurant: "restaurant_delivery",
  event: "ticket",
};

/** Teslimat gerektiren modüller — bilet teslim edilmez (PRD §6.1). */
const NEEDS_DELIVERY: readonly CartItemType[] = ["market", "restaurant"];

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  await enforceBudget(input.userId, input.now);

  const summary = await getCartSummary({ userId: input.userId }, input.now);

  assertCartIsPayable(summary, input.payload.expectedTotalKurus);

  const card = await resolveCard({
    userId: input.userId,
    card: input.payload.card,
    now: input.now,
  });

  const addressId = await resolveDelivery({
    userId: input.userId,
    summary,
    delivery: input.payload.delivery,
  });

  /**
   * SAĞLAYICIYA SİPARİŞ YAZILMADAN ÖNCE SORULUYOR (kabul kriteri 2).
   * Kart numarası buradan sonra hiçbir yere geçmiyor.
   */
  const result = await attemptPayment({
    cardNumber: card.cardNumber ?? "",
    amountKurus: summary.totalKurus,
  });

  if (result.status !== "success") {
    await recordFailedAttempt({ input, summary, card, result });

    throw result.status === "insufficient_funds"
      ? new InsufficientFundsError()
      : new PaymentDeclinedError();
  }

  return persistSuccessfulPayment({ input, summary, card, result, addressId });
}

/** Sepet ödenebilir durumda mı — üç ayrı gerekçe, üç ayrı hata. */
function assertCartIsPayable(summary: CartSummary, expectedTotalKurus: number): void {
  if (summary.lineCount === 0) throw new CartEmptyError();
  if (summary.hasBlockedLines) throw new ItemUnavailableError();
  if (summary.totalKurus !== expectedTotalKurus) throw new CartChangedError();
}

/**
 * Teslimat bilgisini doğrular ve adres kimliğini döner.
 *
 * Sepette market veya restoran varsa adres ZORUNLU; adresin sahibi de bu
 * kullanıcı olmalı (IDOR). Yalnızca bilet varsa teslimat hiç istenmez.
 */
async function resolveDelivery(input: {
  userId: string;
  summary: CartSummary;
  delivery: CheckoutPayload["delivery"];
}): Promise<string | null> {
  const needsDelivery = input.summary.sections.some((section) =>
    NEEDS_DELIVERY.includes(section.itemType),
  );

  if (!needsDelivery) return null;

  if (!input.delivery.addressId) throw new DeliveryAddressRequiredError();
  if (!input.delivery.deliverySlot) throw new DeliverySlotRequiredError();

  const address = await findOwnedAddress({
    addressId: input.delivery.addressId,
    userId: input.userId,
  });

  // Başkasının adresi "bulunamadı" ile aynı yanıtı alır: kaydın varlığını
  // sızdırmamak için (05-auth-security.md → IDOR).
  if (!address) throw new DeliveryAddressRequiredError();

  return address.id;
}

/**
 * Başarısız denemeyi kaydeder (sipariş ÜRETMEDEN).
 *
 * `payments` append-only bir denetim kaydı: "kartım neden çekilmedi"
 * sorusunun cevabı ancak deneme kayıtlıysa verilebilir. Sepet olduğu gibi
 * duruyor, kullanıcı başka kartla tekrar deneyebilir.
 */
async function recordFailedAttempt(context: {
  input: CheckoutInput;
  summary: CartSummary;
  card: ResolvedCard;
  result: { status: "declined" | "insufficient_funds" | "success"; transactionId: string };
}): Promise<void> {
  const { input, summary, card, result } = context;

  await guardDuplicate(() =>
    createPayment({
      userId: input.userId,
      savedCardId: card.savedCardId,
      brand: card.brand,
      cardLast4: card.last4,
      status: result.status,
      amountKurus: summary.totalKurus,
      transactionId: result.transactionId,
      idempotencyKey: input.payload.idempotencyKey,
      attemptedAt: input.now,
    }),
  );

  await recordAuditLog({
    userId: input.userId,
    action: "payment_attempt",
    entityType: "payment",
    ipHash: hashActorIp(input.actorIp),
  });
}

/**
 * Başarılı ödemeyi ve siparişleri TEK TRANSACTION'da yazar (PRD §6.1:
 * "Siparişler tek transaction içinde oluşturulur: biri yazılamazsa hiçbiri
 * yazılmaz ve ödeme yapılmaz").
 *
 * Stok düşümü de içeride: yetmezse istisna fırlıyor, transaction geri
 * alınıyor ve ödeme kaydı da silinmiş oluyor.
 */
async function persistSuccessfulPayment(context: {
  input: CheckoutInput;
  summary: CartSummary;
  card: ResolvedCard;
  result: { transactionId: string };
  addressId: string | null;
}): Promise<CheckoutResult> {
  const { input, summary, card, result, addressId } = context;

  const written = await guardDuplicate(() =>
    prisma.$transaction(async (tx) => {
      const payment = await createPayment(
        {
          userId: input.userId,
          savedCardId: card.savedCardId,
          brand: card.brand,
          cardLast4: card.last4,
          status: "success",
          amountKurus: summary.totalKurus,
          transactionId: result.transactionId,
          idempotencyKey: input.payload.idempotencyKey,
          attemptedAt: input.now,
        },
        tx,
      );

      const orderIds: string[] = [];

      for (const section of summary.sections) {
        await consumeStock(section, tx);

        const order = await createOrderWithItems(
          {
            userId: input.userId,
            paymentId: payment.id,
            fulfillmentType: FULFILLMENT_BY_TYPE[section.itemType],
            subtotalKurus: section.subtotalKurus,
            deliveryFeeKurus: section.deliveryFeeKurus,
            totalKurus: section.subtotalKurus + section.deliveryFeeKurus,
            deliveryAddressId: NEEDS_DELIVERY.includes(section.itemType) ? addressId : null,
            deliverySlot: NEEDS_DELIVERY.includes(section.itemType)
              ? (input.payload.delivery.deliverySlot ?? null)
              : null,
            // Bilet teslim edilmez; durumu doğrudan `delivered` (PRD §6.1).
            status: section.itemType === "event" ? "delivered" : "received",
            items: section.lines.map((line) => ({
              itemType: line.itemType,
              refId: line.refId,
              quantity: line.quantity,
              unitPriceKurus: line.unitPriceKurus,
            })),
          },
          tx,
        );

        orderIds.push(order.id);
      }

      await markCartConverted(summary.cartId, tx);

      if (card.shouldSave) {
        await saveCard(
          {
            userId: input.userId,
            brand: card.brand,
            last4: card.last4,
            expMonth: card.expMonth,
            expYear: card.expYear,
            holderName: card.holderName,
          },
          tx,
        );
      }

      return { paymentId: payment.id, orderIds };
    }),
  );

  const ipHash = hashActorIp(input.actorIp);

  await recordAuditLog({
    userId: input.userId,
    action: "payment_attempt",
    entityType: "payment",
    entityId: written.paymentId,
    ipHash,
  });

  for (const orderId of written.orderIds) {
    await recordAuditLog({
      userId: input.userId,
      action: "order_create",
      entityType: "order",
      entityId: orderId,
      ipHash,
    });
  }

  return {
    paymentId: written.paymentId,
    transactionId: result.transactionId,
    orderIds: written.orderIds,
    totalKurus: summary.totalKurus,
  };
}

/** Market satırlarının stoğunu koşullu olarak düşer; yetmezse işlemi bozar. */
async function consumeStock(
  section: CartSection,
  tx: Parameters<typeof decrementStock>[1],
): Promise<void> {
  if (section.itemType !== "market") return;

  for (const line of section.lines) {
    const ok = await decrementStock({ productId: line.refId, quantity: line.quantity }, tx);

    // İstisna transaction'ı geri alır: ödeme kaydı ve önceki siparişler de
    // yazılmamış olur (PRD §6.1 "biri yazılamazsa hiçbiri yazılmaz").
    if (!ok) throw new OutOfStockError(line.availableStock ?? 0);
  }
}

/**
 * `idempotency_key` benzersizlik ihlalini 409'a çevirir.
 *
 * Çift tıklama veya ağ kopması sonrası tekrarlanan istek İKİNCİ KEZ TAHSİLAT
 * YAPAMAZ. Kararı veren uygulama değil veritabanı: "önce var mı diye bak,
 * sonra yaz" iki eşzamanlı istekte yetersizdir (data-model.md).
 */
async function guardDuplicate<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") throw new DuplicatePaymentError();

    throw error;
  }
}

async function enforceBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("payment_attempt", "user", userId),
    limit: PAYMENT_RATE_LIMIT_MAX,
    windowMs: PAYMENT_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new PaymentRateLimitedError();
}
