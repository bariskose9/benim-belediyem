import { messages } from "@/config/messages";
import {
  createNotification,
  type NotificationRow,
} from "@/features/notifications/repositories/notification.repository";
import {
  advanceNotifiedStatus,
  markNotifiedCancelled,
  type OrderRow,
} from "@/features/orders/repositories/order.repository";
import {
  deriveOrderState,
  pendingNotificationStages,
} from "@/features/orders/services/order-timeline";
import type { Prisma } from "@/generated/prisma/client";
import type { FulfillmentType, OrderStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Sipariş bildirimlerini yazan katman (PRD §5.5).
 *
 * ═══ BİLDİRİM NEDEN "TEMBEL" YAZILIYOR ═══
 *
 * Durum bir zamanlayıcıyla değil, siparişin yaşıyla ilerliyor (ADR-013).
 * Ama bildirim KALICI olmak zorunda: kullanıcı üç gün sonra girip "siparişim
 * ne zaman yola çıktı" diye bakabilmeli. İkisi şöyle birleşiyor: sipariş veya
 * bildirim listesi okunduğunda, o ana kadar geçilmiş ama henüz yazılmamış
 * aşamaların bildirimleri O ANDA yazılıyor.
 *
 * Sonuç ADR-007'nin vaadiyle aynı: cron hiç çalışmasa da kullanıcı doğru
 * bildirimleri görür. Bedeli, bildirimin ancak kullanıcı uygulamaya girdiğinde
 * oluşmasıdır — uygulama içi bildirimde bunun pratik bir karşılığı yok, çünkü
 * zaten görülmesi için girilmesi gerekiyor.
 */

type Client = Prisma.TransactionClient | typeof prisma;

const copy = messages.notifications.order;

/** Ekranda ve bildirimde geçen kısa sipariş kodu — tam kimlik gösterilmez. */
export function shortOrderCode(orderId: string): string {
  return `#${orderId.slice(-6).toUpperCase()}`;
}

function moduleLabel(fulfillmentType: FulfillmentType): string {
  return messages.orders.fulfillment[fulfillmentType];
}

/**
 * "Siparişiniz alındı" bildirimi — ödeme tamamlandığı anda (PRD §5.5:
 * "ödeme tamamlandığında kullanıcıya uygulama içi bildirim düşer").
 *
 * `notifiedStatus` da burada işaretleniyor ki tembel senkron aynı bildirimi
 * ikinci kez yazmasın. İkisi ÖDEMENİN TRANSACTION'I İÇİNDE çağrılıyor:
 * sipariş yazılıp bildirim yazılmadan çökme olursa ikisi birden geri alınır.
 */
export async function notifyOrderPlaced(
  input: {
    userId: string;
    orderId: string;
    fulfillmentType: FulfillmentType;
    /** Siparişin doğuş durumu: `received`, bilet ise `delivered`. */
    initialStatus: OrderStatus;
  },
  client: Client,
): Promise<void> {
  await createNotification(
    {
      userId: input.userId,
      type: "order_status",
      title: copy.createdTitle,
      body: copy.createdBody(moduleLabel(input.fulfillmentType), shortOrderCode(input.orderId)),
      relatedType: "order",
      relatedId: input.orderId,
    },
    client,
  );

  await advanceNotifiedStatus(
    { orderId: input.orderId, from: null, to: input.initialStatus },
    client,
  );
}

/** "Siparişiniz iptal edildi" — iptalin transaction'ı içinde yazılır. */
export async function notifyOrderCancelled(
  input: { userId: string; orderId: string; fulfillmentType: FulfillmentType },
  client: Client,
): Promise<void> {
  await createNotification(
    {
      userId: input.userId,
      type: "order_status",
      title: copy.cancelledTitle,
      body: copy.cancelledBody(moduleLabel(input.fulfillmentType), shortOrderCode(input.orderId)),
      relatedType: "order",
      relatedId: input.orderId,
    },
    client,
  );

  await markNotifiedCancelled(input.orderId, client);
}

/**
 * Geçilmiş ama yazılmamış aşamaların bildirimlerini yazar.
 *
 * ═══ AYNI BİLDİRİM İKİ KEZ YAZILAMAZ ═══
 *
 * Her aşama için önce `notified_status` KOŞULLU olarak ilerletiliyor
 * (`WHERE notified_status = <önceki>`), bildirim ancak güncelleme tuttuysa
 * yazılıyor. İki sekme aynı anda listeyi açarsa ikincisinin güncellemesi 0
 * satır etkiler ve döngü kırılır. "Önce bildirim var mı diye bak, yoksa yaz"
 * iki adım olurdu ve tam da bu yarışı açık bırakırdı.
 *
 * İkisi tek transaction içinde: işaret ilerleyip bildirim yazılmadan çökme
 * olursa aşama sessizce kaybolurdu.
 */
export async function syncOrderNotifications(input: {
  userId: string;
  orders: readonly OrderRow[];
  now: Date;
}): Promise<number> {
  let written = 0;

  for (const order of input.orders) {
    const state = deriveOrderState({
      fulfillmentType: order.fulfillmentType,
      storedStatus: order.storedStatus,
      createdAt: order.createdAt,
      now: input.now,
    });

    const stages = pendingNotificationStages({
      fulfillmentType: order.fulfillmentType,
      notifiedStatus: order.notifiedStatus,
      currentStatus: state.status,
    });

    let from = order.notifiedStatus;

    for (const stage of stages) {
      const advanced = await prisma.$transaction(async (tx) => {
        const ok = await advanceNotifiedStatus({ orderId: order.id, from, to: stage }, tx);

        if (!ok) return false;

        const label = messages.orders.statuses[stage];

        await createNotification(
          {
            userId: input.userId,
            type: "order_status",
            title: from === null ? copy.createdTitle : copy.statusTitle(label),
            body:
              from === null
                ? copy.createdBody(moduleLabel(order.fulfillmentType), shortOrderCode(order.id))
                : copy.statusBody(
                    moduleLabel(order.fulfillmentType),
                    shortOrderCode(order.id),
                    label,
                  ),
            relatedType: "order",
            relatedId: order.id,
          },
          tx,
        );

        return true;
      });

      // Başkası ilerletmiş: kalan aşamaları da o yazacak, döngü burada biter.
      if (!advanced) break;

      from = stage;
      written += 1;
    }
  }

  return written;
}

export type { NotificationRow };
