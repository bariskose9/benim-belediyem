import { SUPPORT_TICKET_LIST_LIMIT } from "@/config/constants";
import type { Prisma } from "@/generated/prisma/client";
import type { SupportTicketStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `support_tickets` ve `ticket_attachments` tablolarına erişen katman (PRD §5.7).
 *
 * ⛔ BU DOSYADA İŞ KURALI YOKTUR. "Hangi durumdadır", "kapatılabilir mi",
 * "bu dosya kabul edilir mi" sorularının cevabı servis katmanında
 * (`support-ticket-timeline.ts` + `support-ticket.service.ts`); burada yalnızca
 * sorgular var.
 *
 * ═══ SAHİPLİK HER SORGUNUN İÇİNDE ═══
 *
 * PRD §5.7 kabul kriteri: "kullanıcı başkasının talebini göremez". Bu yüzden
 * `userId` sorgunun `where` bloğunda duruyor, sonradan yapılan bir `if`
 * değil — filtrelemeyi unutmak, herkesin talebini herkese göstermek demektir
 * (05-auth-security.md → IDOR).
 *
 * BAŞKASININ TALEBİ 404 DÖNER, 403 DEĞİL: sipariş modülünde 403 seçilmişti
 * çünkü PRD orada açıkça 403 istiyordu. Burada böyle bir cümle yok ve destek
 * talebinin BAŞLIĞI kişisel içerik; 403 dönmek "bu kimlikte bir talep var"
 * bilgisini sızdırırdı (randevu modülündeki karar).
 */

type Client = Prisma.TransactionClient | typeof prisma;

export type TicketAttachmentRow = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

export type SupportTicketRow = {
  id: string;
  subject: string;
  description: string;
  /** Veritabanındaki HAM durum — kullanıcıya gösterilecek olan bu değil. */
  storedStatus: SupportTicketStatus;
  notifiedStatus: SupportTicketStatus | null;
  createdAt: Date;
  closedAt: Date | null;
  attachments: TicketAttachmentRow[];
};

const TICKET_SELECT = {
  id: true,
  subject: true,
  description: true,
  status: true,
  notifiedStatus: true,
  createdAt: true,
  closedAt: true,
  attachments: {
    select: { id: true, fileName: true, contentType: true, sizeBytes: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.SupportTicketSelect;

type SelectedTicket = Prisma.SupportTicketGetPayload<{ select: typeof TICKET_SELECT }>;

/**
 * Kullanıcının talepleri, yenisi üstte.
 *
 * Üst sınır var: sayfalama gelene kadar tek sayfa boğulmamalı (sipariş
 * listesindeki gerekçenin aynısı).
 */
export async function listTicketsForUser(
  userId: string,
  client: Client = prisma,
): Promise<SupportTicketRow[]> {
  const rows = await client.supportTicket.findMany({
    where: { userId, deletedAt: null },
    select: TICKET_SELECT,
    orderBy: { createdAt: "desc" },
    take: SUPPORT_TICKET_LIST_LIMIT,
  });

  return rows.map(toTicketRow);
}

/**
 * Tek talep — YALNIZCA SAHİBİNE.
 *
 * `userId` sorgunun içinde olduğu için başkasının kimliğiyle çağrıldığında
 * `null` döner ve çağıran 404'e çevirir. "Önce getir, sonra sahibini
 * karşılaştır" iki adımdır ve ikinci adımı unutmak mümkündür; tek sorgu bunu
 * yapısal olarak imkânsız kılıyor.
 */
export async function findTicketForUser(
  input: { ticketId: string; userId: string },
  client: Client = prisma,
): Promise<SupportTicketRow | null> {
  const row = await client.supportTicket.findFirst({
    where: { id: input.ticketId, userId: input.userId, deletedAt: null },
    select: TICKET_SELECT,
  });

  return row ? toTicketRow(row) : null;
}

export type NewAttachment = {
  /** Depolama referansı (ADR-014) — `file_url` kolonuna yazılır. */
  reference: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Yalnızca `db` sürücüsünde dolu. */
  inlineData: Uint8Array | null;
};

/**
 * Talebi ve eklerini TEK TRANSACTION'da yazar.
 *
 * İkisi ayrı yazılsaydı araya düşen bir hata "eki olmayan talep" ya da daha
 * kötüsü "talebi olmayan ek" bırakabilirdi. `create` içinde iç içe yazmak
 * Prisma'ya tek bir transaction ürettiriyor.
 */
export async function createTicketWithAttachments(
  input: {
    userId: string;
    subject: string;
    description: string;
    attachments: readonly NewAttachment[];
  },
  client: Client = prisma,
): Promise<{ id: string }> {
  return client.supportTicket.create({
    data: {
      userId: input.userId,
      subject: input.subject,
      description: input.description,
      attachments: {
        create: input.attachments.map((attachment) => ({
          fileUrl: attachment.reference,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          sizeBytes: attachment.sizeBytes,
          data: attachment.inlineData ? Buffer.from(attachment.inlineData) : null,
        })),
      },
    },
    select: { id: true },
  });
}

/**
 * Talebi KOŞULLU olarak kapatır; koşul tutmazsa `false` döner.
 *
 * ═══ KOŞULLARIN HEPSİ `WHERE`'İN İÇİNDE ═══
 *
 *  1. `userId`        → başkasının talebi kapatılamaz
 *  2. `status <> 'closed'` → kapalı talep ikinci kez kapatılamaz
 *  3. `deletedAt: null`    → silinmiş talep diriltilemez
 *
 * "Önce oku, kapalı değilse yaz" iki adımdır ve arasına ikinci bir istek
 * girebilir (adım 7 ve 8'in dersi). Tek koşullu UPDATE'te böyle bir boşluk
 * yok: etkilenen satır sayısı 0 ise kapatma olmamıştır ve çağıran 409 fırlatır.
 */
export async function closeTicketIfOpen(
  input: { ticketId: string; userId: string; closedAt: Date },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.supportTicket.updateMany({
    where: {
      id: input.ticketId,
      userId: input.userId,
      deletedAt: null,
      status: { not: "closed" },
    },
    data: { status: "closed", closedAt: input.closedAt, notifiedStatus: "closed" },
  });

  return result.count === 1;
}

/**
 * "Bu durum kullanıcıya bildirildi" işaretini KOŞULLU olarak ilerletir.
 *
 * `WHERE notified_status = <önceki>` sayesinde iki eşzamanlı okuma aynı
 * bildirimi iki kez yazamaz: ikincisi 0 satır etkiler ve bildirim atlanır
 * (siparişteki `advanceNotifiedStatus` ile aynı desen).
 */
export async function advanceTicketNotifiedStatus(
  input: { ticketId: string; from: SupportTicketStatus | null; to: SupportTicketStatus },
  client: Client = prisma,
): Promise<boolean> {
  const result = await client.supportTicket.updateMany({
    where: { id: input.ticketId, notifiedStatus: input.from },
    data: { notifiedStatus: input.to },
  });

  return result.count === 1;
}

export type AttachmentContentRow = {
  fileName: string;
  contentType: string;
  reference: string;
  inlineData: Uint8Array | null;
};

/**
 * Ekin İÇERİĞİ — yalnızca talebin sahibine.
 *
 * Sahiplik kontrolü ekin kendisinde değil BAĞLI OLDUĞU TALEPTE: `ticket`
 * ilişkisi üzerinden `userId` sorgulanıyor. Ek kimliği tahmin edilse bile
 * başkasının dosyası dönmez (PRD §5.7 kabul kriteri).
 */
export async function findAttachmentContentForUser(
  input: { ticketId: string; attachmentId: string; userId: string },
  client: Client = prisma,
): Promise<AttachmentContentRow | null> {
  const row = await client.ticketAttachment.findFirst({
    where: {
      id: input.attachmentId,
      ticketId: input.ticketId,
      ticket: { userId: input.userId, deletedAt: null },
    },
    select: { fileName: true, contentType: true, fileUrl: true, data: true },
  });

  if (!row) return null;

  return {
    fileName: row.fileName,
    contentType: row.contentType,
    reference: row.fileUrl,
    inlineData: row.data ? new Uint8Array(row.data) : null,
  };
}

function toTicketRow(row: SelectedTicket): SupportTicketRow {
  return {
    id: row.id,
    subject: row.subject,
    description: row.description,
    storedStatus: row.status,
    notifiedStatus: row.notifiedStatus,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    attachments: row.attachments,
  };
}
