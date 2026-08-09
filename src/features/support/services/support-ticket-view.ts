import type {
  SupportTicketRow,
  TicketAttachmentRow,
} from "@/features/support/repositories/support-ticket.repository";
import { deriveTicketState } from "@/features/support/services/support-ticket-timeline";
import type { SupportTicketStatus } from "@/generated/prisma/enums";

/**
 * Veritabanı satırını EKRANIN GÖRDÜĞÜ şekle çeviren katman.
 *
 * ⛔ BURADA KARAR VERİLMEZ. Durum ve kapatılabilirlik `deriveTicketState`'ten
 * geliyor; bu dosya onu yalnızca taşıyor. Ekranın kendi başına durum
 * hesaplaması, sunucunun uyguladığı kuralın ikinci bir kopyası olurdu.
 *
 * `data` kolonu ve depolama referansı BU TİPTE YOKTUR: ek baytları hiçbir
 * zaman sayfaya gömülmez, yetkili uçtan servis edilir (ADR-014).
 */

export type AttachmentView = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Ekin yetkili adresi — depolama referansı DEĞİL. */
  url: string;
};

export type SupportTicketView = {
  id: string;
  /** Ekranda gösterilen kısa kod — tam kimlik kullanıcıya yazdırılmaz. */
  code: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  canClose: boolean;
  nextStageAt: Date | null;
  createdAt: Date;
  closedAt: Date | null;
  attachments: AttachmentView[];
};

/**
 * Ekranda ve bildirimde geçen kısa talep kodu — tam kimlik gösterilmez.
 *
 * Siparişteki `shortOrderCode` ile aynı biçim: kullanıcı 25 karakterlik bir
 * cuid'i telefonda okuyamaz, ama son altı karakter listeyi ayırt etmeye yeter.
 */
export function shortTicketCode(ticketId: string): string {
  return `#${ticketId.slice(-6).toUpperCase()}`;
}

/** Ekin yetkili adresi. Sürücü değişse bile bu adres değişmez (ADR-014). */
export function attachmentUrl(ticketId: string, attachmentId: string): string {
  return `/api/support-tickets/${ticketId}/attachments/${attachmentId}`;
}

export function toTicketView(row: SupportTicketRow, now: Date): SupportTicketView {
  const state = deriveTicketState({
    storedStatus: row.storedStatus,
    createdAt: row.createdAt,
    now,
  });

  return {
    id: row.id,
    code: shortTicketCode(row.id),
    subject: row.subject,
    description: row.description,
    status: state.status,
    canClose: state.canClose,
    nextStageAt: state.nextStageAt,
    createdAt: row.createdAt,
    closedAt: row.closedAt,
    attachments: row.attachments.map((attachment) => toAttachmentView(row.id, attachment)),
  };
}

function toAttachmentView(ticketId: string, row: TicketAttachmentRow): AttachmentView {
  return {
    id: row.id,
    fileName: row.fileName,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    url: attachmentUrl(ticketId, row.id),
  };
}
