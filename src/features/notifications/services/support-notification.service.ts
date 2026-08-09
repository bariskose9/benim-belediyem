import { messages } from "@/config/messages";
import { createNotification } from "@/features/notifications/repositories/notification.repository";
import {
  advanceTicketNotifiedStatus,
  type SupportTicketRow,
} from "@/features/support/repositories/support-ticket.repository";
import {
  deriveTicketState,
  pendingTicketNotificationStages,
} from "@/features/support/services/support-ticket-timeline";
import { shortTicketCode } from "@/features/support/services/support-ticket-view";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Destek talebi bildirimlerini yazan katman (PRD §5.7).
 *
 * ═══ NEDEN "TEMBEL" ═══
 *
 * Durum bir zamanlayıcıyla değil, talebin yaşıyla ilerliyor (ADR-013). Ama
 * bildirim KALICI olmak zorunda: kullanıcı üç gün sonra girip "talebim ne
 * zaman incelemeye alındı" diye bakabilmeli. İkisi şöyle birleşiyor: talep
 * listesi veya detayı okunduğunda, o ana kadar geçilmiş ama henüz yazılmamış
 * aşamaların bildirimleri O ANDA yazılıyor.
 *
 * Bu dosya `order-notification.service.ts`'in birebir eşi. İkisi tek bir genel
 * fonksiyonda BİRLEŞTİRİLMEDİ: sipariş çizgisi teslimat türüne göre dallanıyor
 * (bilet ilerlemiyor), destekte böyle bir dal yok. Ortaklaştırmak, iki modülün
 * farklı kurallarını tek bir koşullar yumağına çevirirdi.
 */

type Client = Prisma.TransactionClient | typeof prisma;

const copy = messages.notifications.supportTicket;

/**
 * "Talebiniz kapatıldı" — kapatmanın transaction'ı içinde yazılır.
 *
 * `notified_status` işaretini burada ayrıca ilerletmeye gerek yok:
 * `closeTicketIfOpen` aynı UPDATE'te `notified_status = 'closed'` yazıyor,
 * yani işaret ve durum tek ifadede tutarlı hâle geliyor.
 */
export async function notifyTicketClosed(
  input: { userId: string; ticketId: string; subject: string },
  client: Client,
): Promise<void> {
  await createNotification(
    {
      userId: input.userId,
      type: "support_ticket_update",
      title: copy.closedTitle,
      body: copy.closedBody(shortTicketCode(input.ticketId), input.subject),
      relatedType: "support_ticket",
      relatedId: input.ticketId,
    },
    client,
  );
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
export async function syncTicketNotifications(input: {
  userId: string;
  tickets: readonly SupportTicketRow[];
  now: Date;
}): Promise<number> {
  let written = 0;

  for (const ticket of input.tickets) {
    const state = deriveTicketState({
      storedStatus: ticket.storedStatus,
      createdAt: ticket.createdAt,
      now: input.now,
    });

    const stages = pendingTicketNotificationStages({
      notifiedStatus: ticket.notifiedStatus,
      currentStatus: state.status,
    });

    let from = ticket.notifiedStatus;

    for (const stage of stages) {
      const advanced = await prisma.$transaction(async (tx) => {
        const ok = await advanceTicketNotifiedStatus({ ticketId: ticket.id, from, to: stage }, tx);

        if (!ok) return false;

        const code = shortTicketCode(ticket.id);
        const label = messages.support.statuses[stage];

        await createNotification(
          {
            userId: input.userId,
            type: "support_ticket_update",
            title: from === null ? copy.createdTitle : copy.statusTitle(label),
            body:
              from === null
                ? copy.createdBody(code, ticket.subject)
                : copy.statusBody(code, ticket.subject, label),
            relatedType: "support_ticket",
            relatedId: ticket.id,
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
