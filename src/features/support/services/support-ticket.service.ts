import {
  SUPPORT_WRITE_RATE_LIMIT_MAX,
  SUPPORT_WRITE_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import {
  notifyTicketClosed,
  syncTicketNotifications,
} from "@/features/notifications/services/support-notification.service";
import {
  AttachmentNotFoundError,
  SupportBotCheckFailedError,
  SupportBotCheckUnavailableError,
  SupportRateLimitedError,
  SupportTicketAlreadyClosedError,
  SupportTicketNotFoundError,
} from "@/features/support/errors";
import {
  closeTicketIfOpen,
  createTicketWithAttachments,
  findAttachmentContentForUser,
  findTicketForUser,
  listTicketsForUser,
} from "@/features/support/repositories/support-ticket.repository";
import { intakeAttachments } from "@/features/support/services/attachment-intake";
import {
  toTicketView,
  type SupportTicketView,
} from "@/features/support/services/support-ticket-view";
import type { CreateSupportTicketInput } from "@/features/support/schemas/support-ticket.schema";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getFileStorage } from "@/lib/file-storage";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * Destek talebi — PRD §5.7'nin İŞ KURALLARININ UYGULANDIĞI TEK YER.
 *
 * Kurallar buraya toplandı çünkü hem HTTP ucu hem sayfa aynı yoldan geçmeli.
 * Kural route dosyasına yazılsaydı ikinci bir çağıran eklendiğinde sessizce
 * atlanırdı (01-architecture.md).
 *
 * "ŞİMDİ" DIŞARIDAN GELİR: bir istekteki tüm kararlar aynı ana göre verilir ve
 * testler sahte saatle çalışabilir (06-testing.md). Durum talebin yaşından
 * hesaplandığı için bu, isteğe bağlı bir kolaylık değil ZORUNLULUK.
 */

/**
 * Kullanıcının talepleri + O ANKİ durumları.
 *
 * BİLDİRİMLER DE BURADA YAZILIYOR: liste okunurken geçilmiş ama yazılmamış
 * aşamalar tespit edilip kaydediliyor (ADR-013). Yan etkinin okuma yolunda
 * olması bilinçli — durumu ilerleten bir zamanlayıcı yok, dolayısıyla
 * bildirimi yazacak başka bir an da yok.
 */
export async function listSupportTickets(input: {
  userId: string;
  now: Date;
}): Promise<SupportTicketView[]> {
  const rows = await listTicketsForUser(input.userId);

  await syncTicketNotifications({ userId: input.userId, tickets: rows, now: input.now });

  return rows.map((row) => toTicketView(row, input.now));
}

/**
 * Tek talep — YALNIZCA SAHİBİNE (PRD §5.7 kabul kriteri).
 *
 * Başkasının talebinde 404 fırlatılıyor: "var ama senin değil" demek, talebin
 * varlığını sızdırmak olurdu (`errors.ts` içinde gerekçesi yazılı).
 */
export async function getSupportTicket(input: {
  userId: string;
  ticketId: string;
  now: Date;
}): Promise<SupportTicketView> {
  const row = await findTicketForUser({ ticketId: input.ticketId, userId: input.userId });

  if (!row) throw new SupportTicketNotFoundError();

  await syncTicketNotifications({ userId: input.userId, tickets: [row], now: input.now });

  return toTicketView(row, input.now);
}

export type CreateTicketInput = {
  /** Oturumdan gelir. İstemcinin gönderdiği bir değer ASLA buraya ulaşmaz. */
  userId: string;
  payload: CreateSupportTicketInput;
  files: readonly File[];
  actorIp: string;
  now: Date;
};

/**
 * Talep oluşturur (PRD §5.7).
 *
 * ═══ KONTROL SIRASI TESADÜF DEĞİL ═══
 *  1. Hız sınırı  → en ucuz kapı; dosyalar belleğe alınmadan önce
 *  2. Bot kutusu  → PRD §5.7 açıkça istiyor (ADR-004)
 *  3. Dosyalar    → adet, boyut, sonra İÇERİK imzası
 *  4. Yazma       → talep + ekler tek transaction'da
 *  5. Denetim     → transaction'ın dışında
 *
 * 1. ADIM NEDEN EN ÖNDE: her istek 5 × 2 MB dosya taşıyabiliyor. Hız sınırını
 * dosyalardan sonra uygulamak, reddedilecek bir isteğin 10 MB'ı belleğe
 * almasına izin vermek olurdu (ADR-014 depolama bütçesi).
 */
export async function createSupportTicket(input: CreateTicketInput): Promise<{ id: string }> {
  await enforceWriteBudget(input.userId, input.now);
  await enforceBotCheck(input.payload.turnstileToken, input.actorIp);

  const attachments = await intakeAttachments(input.files);

  const ticket = await createTicketWithAttachments({
    userId: input.userId,
    subject: input.payload.subject,
    description: input.payload.description,
    attachments,
  });

  /**
   * BİLDİRİM BURADA YAZILMIYOR. Talep `open` doğduğu ve `notified_status`
   * `null` kaldığı için ilk bildirimi tembel senkronizasyon yazacak — kullanıcı
   * listeye veya detaya bakar bakmaz. Burada da yazmak, aynı bildirimin iki
   * kez oluşmasına karşı ikinci bir koruma yazmayı gerektirirdi.
   */

  // Denetim kaydı yazmanın DIŞINDA: talep yazılamazsa kayıt da olmamalı,
  // yazıldıysa denetim kaydının başarısızlığı talebi geri almamalı (§5.11).
  await recordAuditLog({
    userId: input.userId,
    action: "support_ticket_create",
    entityType: "support_ticket",
    entityId: ticket.id,
    ipHash: hashActorIp(input.actorIp),
  });

  return ticket;
}

/**
 * Talebi kapatır — YALNIZCA TALEBİ AÇAN ÜYE (PRD §5.7).
 *
 * Kararı koşullu UPDATE veriyor: "önce oku, açıksa kapat" iki adımdır ve
 * arasına ikinci bir istek girebilir. Etkilenen satır 0 ise ya talep başkasına
 * ait, ya yok, ya da zaten kapalı — ilk ikisi için önce bir okuma yapılıp 404
 * ayrıştırılıyor, çünkü kullanıcıya "zaten kapalı" demek ile "böyle bir talep
 * yok" demek farklı bilgilerdir.
 */
export async function closeSupportTicket(input: {
  userId: string;
  ticketId: string;
  actorIp: string;
  now: Date;
}): Promise<void> {
  await enforceWriteBudget(input.userId, input.now);

  const ticket = await findTicketForUser({ ticketId: input.ticketId, userId: input.userId });

  if (!ticket) throw new SupportTicketNotFoundError();

  await prisma.$transaction(async (tx) => {
    const closed = await closeTicketIfOpen(
      { ticketId: ticket.id, userId: input.userId, closedAt: input.now },
      tx,
    );

    // 0 satır etkilendi: bu arada başka bir istek kapatmış. İstisna
    // transaction'ı geri alır — bildirim de yazılmaz.
    if (!closed) throw new SupportTicketAlreadyClosedError();

    await notifyTicketClosed(
      { userId: input.userId, ticketId: ticket.id, subject: ticket.subject },
      tx,
    );
  });

  await recordAuditLog({
    userId: input.userId,
    action: "support_ticket_close",
    entityType: "support_ticket",
    entityId: ticket.id,
    ipHash: hashActorIp(input.actorIp),
  });
}

export type AttachmentContent = {
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
};

/**
 * Ekin içeriğini SAHİBİNE servis eder.
 *
 * Sahiplik sorgunun içinde (`ticket.userId`), sonradan yapılan bir `if` değil.
 * Baytların nereden geldiğini depolama sürücüsü biliyor (ADR-014); bu fonksiyon
 * yalnızca yetkiyi ve "böyle bir ek var mı" sorusunu cevaplıyor.
 */
export async function readAttachment(input: {
  userId: string;
  ticketId: string;
  attachmentId: string;
}): Promise<AttachmentContent> {
  const row = await findAttachmentContentForUser(input);

  if (!row) throw new AttachmentNotFoundError();

  try {
    const bytes = await getFileStorage().read({
      reference: row.reference,
      inlineData: row.inlineData,
    });

    return { fileName: row.fileName, contentType: row.contentType, bytes };
  } catch (error) {
    /**
     * İçeriği okunamayan ek, kullanıcı için var olmayan ektir — ama SESSİZ
     * KALINMAZ (CLAUDE.md §7: hata try/catch içine gömülüp susturulmaz).
     * İstemci 404 görür, sunucu log'u gerçek sebebi görür. `fail()` bunu
     * kendiliğinden yazmaz çünkü 404 bir sunucu hatası değildir.
     */
    console.error("[SUPPORT_ATTACHMENT_READ]", error);

    throw new AttachmentNotFoundError({ cause: error });
  }
}

async function enforceWriteBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("support_write", "user", userId),
    limit: SUPPORT_WRITE_RATE_LIMIT_MAX,
    windowMs: SUPPORT_WRITE_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new SupportRateLimitedError();
}

/**
 * Bot kutusu (PRD §5.7 · ADR-004).
 *
 * `unavailable` ASLA "geçmiş" sayılmaz: Cloudflare'a ulaşılamıyorsa akış
 * durur. ADR-004 bedel 2 bunu açıkça yazıyor ve destek talebi de spam'e açık
 * bir yazma ucu — üstelik dosya taşıyor.
 */
async function enforceBotCheck(token: string, actorIp: string): Promise<void> {
  const outcome = await verifyTurnstileToken({ token, actorIp });

  if (outcome === "success") return;
  if (outcome === "unavailable") throw new SupportBotCheckUnavailableError();

  throw new SupportBotCheckFailedError();
}

export type { SupportTicketView };
