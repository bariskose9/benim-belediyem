import {
  countUnreadNotifications,
  listNotificationsForUser,
  type NotificationRow,
} from "@/features/notifications/repositories/notification.repository";
import { syncOrderNotifications } from "@/features/notifications/services/order-notification.service";
import { listOrdersForUser } from "@/features/orders/repositories/order.repository";

/**
 * Bildirim listesinin okuma yolu (PRD §5.5).
 *
 * ═══ NEDEN ÖNCE SİPARİŞLER OKUNUYOR ═══
 *
 * Bildirimler tembel yazılıyor (ADR-013): geçilmiş ama kaydedilmemiş aşamalar
 * ancak biri bakınca yazılıyor. Kullanıcı doğrudan bildirim ekranına gelirse
 * sipariş listesi hiç okunmamış olur ve yeni aşamalar görünmezdi. Bu yüzden
 * senkronizasyon burada da çağrılıyor — SIRA ÖNEMLİ: önce yaz, sonra oku.
 * Ters sırada, bu isteğin yazdığı bildirimler bir sonraki açılışa kalırdı.
 */

export async function listNotifications(input: {
  userId: string;
  now: Date;
}): Promise<NotificationRow[]> {
  const orders = await listOrdersForUser(input.userId);

  await syncOrderNotifications({ userId: input.userId, orders, now: input.now });

  return listNotificationsForUser(input.userId);
}

export async function countUnread(userId: string): Promise<number> {
  return countUnreadNotifications(userId);
}

export type { NotificationRow };
