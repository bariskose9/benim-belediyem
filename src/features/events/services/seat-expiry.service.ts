import { messages } from "@/config/messages";
import { listCartItems, removeItemByRef } from "@/features/cart/repositories/cart.repository";
import {
  deleteExpiredSeatHold,
  findSeatReservationDetails,
} from "@/features/events/repositories/seat-reservation.repository";
import { createNotification } from "@/features/notifications/repositories/notification.repository";
import { prisma } from "@/lib/db";

/**
 * Süresi dolan koltukları SEPETTEN DÜŞÜREN süpürme (PRD §5.2).
 *
 * PRD şunu istiyor: "süre dolarsa koltuk sepetten OTOMATİK DÜŞER ve kullanıcıya
 * 'koltuk süresi doldu, yeniden seçin' bildirimi gösterilir."
 *
 * ═══ NEDEN OKUMA SIRASINDA ═══
 * Bunu yapacak bir zamanlayıcı YOK (ADR-007: ücretsiz planda cron günde bir
 * çalışıyor). Sipariş bildirimlerindeki desenin aynısı kullanılıyor: sepet
 * okunduğunda, o ana kadar süresi dolmuş satırlar O ANDA düşürülüyor. Sonuç
 * ADR-007'nin vaadiyle aynı — cron hiç çalışmasa da kullanıcı doğru sepeti
 * görür.
 *
 * ═══ AYNI BİLDİRİM İKİ KEZ YAZILAMAZ ═══
 * Önce sepet satırı KOŞULLU olarak siliniyor; bildirim ancak silme tuttuysa
 * yazılıyor. İki sekme sepeti aynı anda açarsa ikincisinin silmesi 0 satır
 * etkiler ve bildirim yazılmaz. "Önce bildirim var mı diye bak" iki adım
 * olurdu ve tam da bu yarışı açık bırakırdı.
 */

export type SeatSweepResult = {
  /** Sepetten düşürülen satır sayısı — ekran bunu kullanıcıya söylüyor. */
  droppedCount: number;
};

export async function dropExpiredSeatLines(input: {
  cartId: string;
  userId: string;
  now: Date;
}): Promise<SeatSweepResult> {
  const items = await listCartItems(input.cartId);
  const seatLines = items.filter((item) => item.itemType === "event");

  if (seatLines.length === 0) return { droppedCount: 0 };

  const reservations = await findSeatReservationDetails(
    seatLines.map((line) => line.refId),
    prisma,
  );

  let droppedCount = 0;

  for (const line of seatLines) {
    const reservation = reservations.get(line.refId);

    /**
     * Kayıt hiç yoksa satır ARTIK GEÇERSİZ ama bildirim YAZILMIYOR: bu durum
     * kullanıcının koltuğu kendi bıraktığı (ve bırakma isteğinin sepet satırını
     * silemediği) nadir hâlden geliyor. "Süreniz doldu" demek yanlış olurdu.
     */
    if (!reservation) {
      await removeItemByRef({ cartId: input.cartId, itemType: "event", refId: line.refId });
      droppedCount += 1;
      continue;
    }

    const isExpiredHold =
      reservation.status === "held" &&
      reservation.holdExpiresAt !== null &&
      reservation.holdExpiresAt.getTime() <= input.now.getTime();

    if (!isExpiredHold) continue;

    const removed = await removeItemByRef({
      cartId: input.cartId,
      itemType: "event",
      refId: line.refId,
    });

    // Başka bir sekme önce davrandı: bildirimi o yazacak.
    if (!removed) continue;

    droppedCount += 1;

    /**
     * Bildirim ve kilit silme TEK TRANSACTION'da: kilit silinip bildirim
     * yazılmadan çökme olursa kullanıcı koltuğunu sessizce kaybederdi.
     */
    await prisma.$transaction(async (tx) => {
      await deleteExpiredSeatHold({ reservationId: reservation.id, now: input.now }, tx);

      await createNotification(
        {
          userId: input.userId,
          type: "seat_hold_expired",
          title: messages.notifications.seatHold.expiredTitle,
          body: messages.notifications.seatHold.expiredBody(
            reservation.eventName,
            messages.events.detail.seatLabel(
              reservation.block,
              reservation.rowLabel,
              reservation.seatNumber,
            ),
          ),
          relatedType: "seat_reservation",
          relatedId: reservation.id,
        },
        tx,
      );
    });
  }

  return { droppedCount };
}
