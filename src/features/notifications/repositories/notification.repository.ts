import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType, RelatedEntityType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `notifications` tablosuna erişen katman (PRD §5.5 · data-model.md).
 *
 * Bildirim UYGULAMA İÇİDİR: e-posta veya SMS göndermez. Kullanıcı bildirimi
 * ekranda görür; dışarıya çıkan bir kanal olmadığı için kişisel veri de
 * dışarı çıkmaz (14-privacy-and-compliance.md).
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  relatedType: RelatedEntityType | null;
  relatedId: string | null;
  createdAt: Date;
};

export async function createNotification(
  input: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    relatedType: RelatedEntityType;
    relatedId: string;
  },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.notification.create({ data: input, select: { id: true } });
}

/**
 * Kullanıcının bildirimleri, yenisi üstte.
 *
 * SAHİPLİK SORGUNUN İÇİNDE. Üst sınır var: bildirim en çok biriken kayıt
 * türü ve tek sayfada yüzlercesini çizmek ekranı da sorguyu da boğardı.
 */
export async function listNotificationsForUser(
  userId: string,
  client: Client = prisma,
): Promise<NotificationRow[]> {
  return client.notification.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      isRead: true,
      relatedType: true,
      relatedId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Okunmamış bildirim sayısı — üst menüdeki rozet bunu gösteriyor. */
export async function countUnreadNotifications(
  userId: string,
  client: Client = prisma,
): Promise<number> {
  return client.notification.count({ where: { userId, isRead: false } });
}

/**
 * Kullanıcının TÜM okunmamış bildirimlerini okundu işaretler.
 *
 * `userId` koşulu zorunlu: kimlik listesi almadan çalışması, başkasının
 * bildirimlerine dokunma ihtimalini baştan kapatıyor. Etkilenen satır sayısı
 * dönüyor ki çağıran "zaten hepsi okunmuştu" durumunu ayırt edebilsin.
 */
export async function markAllNotificationsRead(
  userId: string,
  client: Client = prisma,
): Promise<number> {
  const result = await client.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return result.count;
}
