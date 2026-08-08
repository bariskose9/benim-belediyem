import { randomBytes } from "node:crypto";

import { ORDER_CANCEL_RATE_LIMIT_MAX, ORDER_CANCEL_RATE_LIMIT_WINDOW_MS } from "@/config/constants";
import {
  notifyOrderCancelled,
  syncOrderNotifications,
} from "@/features/notifications/services/order-notification.service";
import {
  OrderAlreadyCancelledError,
  OrderCancelRateLimitedError,
  OrderForbiddenError,
  OrderNotCancellableError,
  OrderNotFoundError,
  TicketNotCancellableError,
} from "@/features/orders/errors";
import {
  cancelOrderIfCancellable,
  createRefund,
  listOrdersForUser,
  restoreStock,
  findOrderById,
  type OrderRow,
} from "@/features/orders/repositories/order.repository";
import { deriveOrderState, ORDER_TIMELINE_RULES } from "@/features/orders/services/order-timeline";
import {
  resolveLineNames,
  toOrderView,
  type OrderLineView,
  type OrderView,
} from "@/features/orders/services/order-view";
import type { FulfillmentType } from "@/generated/prisma/enums";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * Sipariş takibi ve iptali — PRD §5.5'in İŞ KURALLARININ UYGULANDIĞI TEK YER.
 *
 * Kurallar buraya toplandı çünkü hem HTTP ucu hem sayfa hem de ileride bir
 * planlı görev (adım 16) aynı yoldan geçmeli. Kural route dosyasına
 * yazılsaydı ikinci bir çağıran eklendiğinde sessizce atlanırdı.
 *
 * "ŞİMDİ" DIŞARIDAN GELİR: bir istekteki tüm kararlar aynı ana göre verilir ve
 * testler sahte saatle çalışabilir (06-testing.md). Durum siparişin yaşından
 * hesaplandığı için burada bu, isteğe bağlı bir kolaylık değil ZORUNLULUK.
 */

/**
 * Kullanıcının siparişleri + O ANKİ durumları (PRD §5.5: "profilde sipariş
 * geçmişi ve anlık durum görünür").
 *
 * BİLDİRİMLER DE BURADA YAZILIYOR: liste okunurken geçilmiş ama yazılmamış
 * aşamalar tespit edilip kaydediliyor (ADR-013). Yan etkinin okuma yolunda
 * olması bilinçli — durumu ilerleten bir zamanlayıcı yok, dolayısıyla
 * bildirimi yazacak başka bir an da yok.
 */
export async function listOrders(input: { userId: string; now: Date }): Promise<OrderView[]> {
  const rows = await listOrdersForUser(input.userId);

  await syncOrderNotifications({ userId: input.userId, orders: rows, now: input.now });

  const names = await resolveLineNames(rows, input.now);

  return rows.map((row) => toOrderView(row, names, input.now));
}

export type CancelOrderInput = {
  /** Oturumdan gelir. İstemcinin gönderdiği bir değer ASLA buraya ulaşmaz. */
  userId: string;
  orderId: string;
  actorIp: string;
  now: Date;
};

/**
 * Siparişi iptal eder (PRD §5.5).
 *
 * ═══ KONTROL SIRASI TESADÜF DEĞİL ═══
 *  1. Hız sınırı        → en ucuz kapı, veritabanı işlemi açılmadan önce
 *  2. Kayıt var mı      → 404
 *  3. Sahibi bu mu      → 403 (kabul kriteri)
 *  4. Zaten iptal mi    → 409
 *  5. Bilet mi          → 409, bilet hiç iptal edilemez
 *  6. Pencere açık mı   → 409, `Hazırlanıyor` ve sonrası (kabul kriteri)
 *  7. Transaction       → koşullu iptal + stok iadesi + iade kaydı + bildirim
 *
 * 6. ADIM TEK BAŞINA YETMEZ: okuma ile yazma arasında pencere kapanabilir.
 * Bu yüzden transaction içindeki güncelleme koşulu da aynı kuralı taşıyor ve
 * asıl kararı O veriyor (adım 7 ve 8'in dersi: "önce oku, sonra yaz" iki
 * adımdır ve yarışı çözmez).
 */
export async function cancelOrder(input: CancelOrderInput): Promise<{ refundKurus: number }> {
  await enforceCancelBudget(input.userId, input.now);

  const order = await findOrderById(input.orderId);

  if (!order) throw new OrderNotFoundError();
  if (order.userId !== input.userId) throw new OrderForbiddenError();
  if (order.storedStatus === "cancelled") throw new OrderAlreadyCancelledError();
  if (order.fulfillmentType === "ticket") throw new TicketNotCancellableError();

  const state = deriveOrderState({
    fulfillmentType: order.fulfillmentType,
    storedStatus: order.storedStatus,
    createdAt: order.createdAt,
    now: input.now,
  });

  if (!state.canCancel) throw new OrderNotCancellableError();

  await prisma.$transaction(async (tx) => {
    const cancelled = await cancelOrderIfCancellable(
      {
        orderId: order.id,
        userId: input.userId,
        cancellableAfter: cancellableAfter(order.fulfillmentType, input.now),
        cancelledAt: input.now,
        reason: CANCEL_REASON,
      },
      tx,
    );

    // 0 satır etkilendi: bu arada pencere kapandı veya başka bir istek iptal
    // etti. İstisna transaction'ı geri alır — stok da iade de yazılmaz.
    if (!cancelled) throw new OrderNotCancellableError();

    await restoreOrderStock(order, tx);

    await createRefund(
      {
        orderId: order.id,
        paymentId: order.paymentId,
        amountKurus: order.totalKurus,
        fakeRefundId: buildRefundId(),
        reason: CANCEL_REASON,
      },
      tx,
    );

    await notifyOrderCancelled(
      {
        userId: input.userId,
        orderId: order.id,
        fulfillmentType: order.fulfillmentType,
      },
      tx,
    );
  });

  // Denetim kaydı transaction'ın DIŞINDA: iptal başarısız olursa yazılmamalı,
  // başarılıysa da kaydın yazılamaması iptali geri almamalı (CLAUDE.md §5.11).
  await recordAuditLog({
    userId: input.userId,
    action: "order_cancel",
    entityType: "order",
    entityId: order.id,
    ipHash: hashActorIp(input.actorIp),
  });

  return { refundKurus: order.totalKurus };
}

/**
 * İptal gerekçesi — bu fazda tek bir değer.
 *
 * Kullanıcıya sebep sorulmuyor: PRD §5.5 istemiyor ve serbest metin bir
 * girdi noktası (dolayısıyla doğrulama, uzunluk sınırı ve XSS yüzeyi)
 * eklerdi. Kolon yine de dolduruluyor ki iptal kayıtları boş görünmesin.
 */
const CANCEL_REASON = "user_requested";

/**
 * İptal penceresinin başladığı an: bundan SONRA oluşturulan siparişler hâlâ
 * `Alındı` durumundadır.
 *
 * Kural tablosundan okunuyor (`ORDER_TIMELINE_RULES`), koda gömülmüyor —
 * ekranın gösterdiği durumla sunucunun uyguladığı kural aynı kaynaktan gelmek
 * zorunda, aksi hâlde düğme dururken 409 alınırdı.
 */
function cancellableAfter(fulfillmentType: FulfillmentType, now: Date): Date {
  const rule = ORDER_TIMELINE_RULES[fulfillmentType];

  // Bilet buraya hiç gelmez (yukarıda 409 ile eleniyor); yine de savunmacı
  // davranıp pencereyi KAPALI kabul ediyoruz — açık bırakmak riskli tarafta olurdu.
  if (!rule) return now;

  return new Date(now.getTime() - rule.preparing * 60_000);
}

/**
 * İptal edilen MARKET siparişinin stoğunu geri yükler (PRD §5.5 kabul
 * kriteri). Restoran kaleminin ve biletin stoğu yok, dolayısıyla iade
 * edilecek bir sayı da yok.
 */
async function restoreOrderStock(
  order: OrderRow,
  tx: Parameters<typeof restoreStock>[1],
): Promise<void> {
  if (order.fulfillmentType !== "market_delivery") return;

  for (const item of order.items) {
    if (item.itemType !== "market") continue;

    await restoreStock({ productId: item.refId, quantity: item.quantity }, tx);
  }
}

/**
 * `RFN-<zaman>-<rastgele>` biçiminde sahte iade kodu.
 *
 * Rastgele parça şart: `refunds.fake_refund_id` benzersiz ve aynı milisaniyede
 * iki iptal olabilir (ödeme kodundaki desenin aynısı).
 */
function buildRefundId(): string {
  return `RFN-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function enforceCancelBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("order_cancel", "user", userId),
    limit: ORDER_CANCEL_RATE_LIMIT_MAX,
    windowMs: ORDER_CANCEL_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new OrderCancelRateLimitedError();
}

/**
 * Görünüm tipleri buradan da dışa aktarılıyor: çağıranların sipariş listesini
 * alıp tipini başka bir dosyadan içe aktarması gerekmesin.
 */
export type { OrderLineView, OrderView };
