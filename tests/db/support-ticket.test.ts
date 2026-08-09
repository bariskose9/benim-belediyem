/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_COUNT,
  SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES,
  SUPPORT_TICKET_RESOLVED_AFTER_MINUTES,
  SUPPORT_WRITE_RATE_LIMIT_MAX,
} from "@/config/constants";
import { listNotifications } from "@/features/notifications/services/notification.service";
import {
  AttachmentNotFoundError,
  AttachmentRejectedError,
  SupportRateLimitedError,
  SupportTicketAlreadyClosedError,
  SupportTicketNotFoundError,
} from "@/features/support/errors";
import {
  closeSupportTicket,
  createSupportTicket,
  getSupportTicket,
  listSupportTickets,
  readAttachment,
} from "@/features/support/services/support-ticket.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.7'NİN KABUL KRİTERLERİ ═══
 *  1. Üye başlık + açıklama yazar, birden fazla ekran görüntüsü yükler
 *  2. Durum `Açık → İnceleniyor → Çözüldü` zamanla ilerler
 *  3. `Kapandı` durumunu YALNIZCA talebi açan üye verir
 *  4. Yalnızca resim, en fazla 5 adet, dosya başına boyut sınırı
 *  5. **KULLANICI BAŞKASININ TALEBİNİ GÖREMEZ** ve göremediği doğrulanmıştır
 *
 * GERÇEK PostgreSQL'e karşı yazıldı. Taklit bir istemci ne koşullu UPDATE'in
 * 0 satır etkilemesini, ne `Cascade` silmeyi, ne de `bytea` kolonuna yazılan
 * baytların aynen geri okunduğunu kanıtlayabilirdi.
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: "3 saat sonra ne olur" sorusu testin gerçekten
 * beklemesiyle değil, `now` ileri sarılarak cevaplanıyor (ADR-013).
 *
 * BOT KUTUSU KAPALI: `TURNSTILE_SECRET_KEY` local'de test anahtarı ve
 * `verifyTurnstileToken` local'de anahtarsızsa doğrulamayı atlıyor. Kutunun
 * kendi davranışı `tests/unit/turnstile.test.ts` içinde ölçülüyor.
 */

const ACTOR_IP = "203.0.113.77";
const NOW = new Date("2026-09-01T09:00:00.000Z");

const USER = testId("user", "support-owner");
const OTHER_USER = testId("user", "support-other");

/** Geçerli bir PNG'nin ilk baytları — imza doğrulaması bunu tanımalı. */
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);

function minutesAfter(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

function pngFile(name: string, bytes: Uint8Array = PNG_BYTES): File {
  return new File([bytes as BlobPart], name, { type: "image/png" });
}

function payload(overrides: Partial<{ subject: string; description: string }> = {}) {
  return {
    subject: overrides.subject ?? "Market siparişim eksik geldi",
    description:
      overrides.description ?? "Siparişimde iki ürün eksikti, ekran görüntüsünü ekliyorum.",
    turnstileToken: "test-token",
  };
}

/**
 * Talebi uygulamanın kendi akışıyla oluşturur ve oluşturma anını sahte saate
 * sabitler.
 *
 * NEDEN SABİTLENİYOR: `support_tickets.created_at` veritabanının
 * varsayılanından, yani GERÇEK şimdiden geliyor. Durum ise talebin yaşından
 * hesaplanıyor (ADR-013). İkisi sabitlenmezse test "ileri sarılmış" bir talep
 * görür. Uygulamada böyle bir uyumsuzluk YOK: orada `now` da `created_at` de
 * aynı gerçek saatten geliyor.
 */
async function openTicket(userId: string, files: File[] = []): Promise<string> {
  const ticket = await createSupportTicket({
    userId,
    payload: payload(),
    files,
    actorIp: ACTOR_IP,
    now: NOW,
  });

  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { createdAt: NOW } });

  return ticket.id;
}

async function resetBudgets(): Promise<void> {
  await resetRateLimit(rateLimitKey("support_write", "user", USER));
  await resetRateLimit(rateLimitKey("support_write", "user", OTHER_USER));
}

beforeEach(async () => {
  await cleanupTestData();
  await prisma.user.createMany({
    data: [USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Destek ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });
  await resetBudgets();
});

afterEach(async () => {
  await cleanupTestData();
  await resetBudgets();
});

describe("kabul kriteri 1: talep oluşturma ve ekler", () => {
  it("başlık, açıklama ve BİRDEN FAZLA ek ile talep oluşturulur", async () => {
    const ticketId = await openTicket(USER, [pngFile("ekran1.png"), pngFile("ekran2.png")]);

    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });

    expect(ticket.subject).toBe(payload().subject);
    expect(ticket.attachments).toHaveLength(2);
    expect(ticket.status).toBe("open");
  });

  it("EK BAYTLARI AYNEN GERİ OKUNUR — depolama sürücüsü içeriği bozmuyor", async () => {
    const ticketId = await openTicket(USER, [pngFile("ekran.png")]);
    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });
    const attachmentId = ticket.attachments[0]?.id;

    if (!attachmentId) throw new Error("ek bekleniyordu");

    const content = await readAttachment({ userId: USER, ticketId, attachmentId });

    expect(content.contentType).toBe("image/png");
    expect([...content.bytes]).toEqual([...PNG_BYTES]);
  });

  it("DOSYA ADI SANİTİZE EDİLİR: dizin dışına çıkma denemesi ada dönüşmez", async () => {
    const ticketId = await openTicket(USER, [pngFile("../../etc/passwd")]);
    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });

    expect(ticket.attachments[0]?.fileName).toBe("passwd.png");
  });

  it("eksiz talep de oluşturulabilir — ek isteğe bağlı", async () => {
    const ticketId = await openTicket(USER);
    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });

    expect(ticket.attachments).toHaveLength(0);
  });

  it("talep oluşturma DENETİM KAYDINA yazılır", async () => {
    const ticketId = await openTicket(USER);

    const log = await prisma.auditLog.findFirst({
      where: { userId: USER, action: "support_ticket_create", entityId: ticketId },
    });

    expect(log).not.toBeNull();
    expect(log?.entityType).toBe("support_ticket");
  });
});

describe("kabul kriteri 2: durum zamanla ilerler", () => {
  it("Açık → İnceleniyor → Çözüldü sırasıyla geçilir", async () => {
    const ticketId = await openTicket(USER);

    const atStart = await getSupportTicket({ userId: USER, ticketId, now: NOW });
    const inReview = await getSupportTicket({
      userId: USER,
      ticketId,
      now: minutesAfter(SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES),
    });
    const resolved = await getSupportTicket({
      userId: USER,
      ticketId,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES),
    });

    expect(atStart.status).toBe("open");
    expect(inReview.status).toBe("in_review");
    expect(resolved.status).toBe("resolved");
  });

  it("DURUM KOLONU DEĞİŞMİYOR — ilerleme hiçbir yere yazılmıyor (ADR-013)", async () => {
    const ticketId = await openTicket(USER);

    await getSupportTicket({
      userId: USER,
      ticketId,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES),
    });

    const row = await prisma.supportTicket.findUnique({ where: { id: ticketId } });

    expect(row?.status).toBe("open");
  });

  it("her aşama için bildirim yazılır ve ATLANAN AŞAMA KAYBOLMAZ", async () => {
    await openTicket(USER);

    // Kullanıcı ilk kez 3 saat sonra bakıyor: üç aşama da yazılmalı.
    await listSupportTickets({
      userId: USER,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES),
    });

    const notifications = await listNotifications({
      userId: USER,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES),
    });

    const titles = notifications.map((notification) => notification.title);

    expect(titles).toContain("Destek talebiniz alındı");
    expect(titles).toContain("Destek talebiniz: İnceleniyor");
    expect(titles).toContain("Destek talebiniz: Çözüldü");
  });

  it("AYNI BİLDİRİM İKİ KEZ YAZILMAZ — liste tekrar tekrar okunsa bile", async () => {
    await openTicket(USER);

    const readAt = minutesAfter(SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES);

    await listSupportTickets({ userId: USER, now: readAt });
    await listSupportTickets({ userId: USER, now: readAt });
    await listSupportTickets({ userId: USER, now: readAt });

    const notifications = await listNotifications({ userId: USER, now: readAt });

    // "alındı" + "inceleniyor" — üç okuma fazladan bildirim üretmemeli.
    expect(notifications).toHaveLength(2);
  });
});

describe("kabul kriteri 3: kapatmayı yalnızca talebi açan üye yapar", () => {
  it("sahibi kapatınca durum 'Kapandı' olur ve kayda YAZILIR", async () => {
    const ticketId = await openTicket(USER);

    await closeSupportTicket({ userId: USER, ticketId, actorIp: ACTOR_IP, now: NOW });

    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });
    const row = await prisma.supportTicket.findUnique({ where: { id: ticketId } });

    expect(ticket.status).toBe("closed");
    expect(ticket.canClose).toBe(false);
    expect(row?.status).toBe("closed");
    expect(row?.closedAt).not.toBeNull();
  });

  it("BAŞKASI KAPATAMAZ — 404, çünkü talebin varlığı bile sızdırılmaz", async () => {
    const ticketId = await openTicket(USER);

    await expect(
      closeSupportTicket({ userId: OTHER_USER, ticketId, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(SupportTicketNotFoundError);

    const row = await prisma.supportTicket.findUnique({ where: { id: ticketId } });

    expect(row?.status).toBe("open");
  });

  it("İKİNCİ KAPATMA 409 döner", async () => {
    const ticketId = await openTicket(USER);

    await closeSupportTicket({ userId: USER, ticketId, actorIp: ACTOR_IP, now: NOW });

    await expect(
      closeSupportTicket({ userId: USER, ticketId, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(SupportTicketAlreadyClosedError);
  });

  it("kapatılmış talep ZAMANLA 'Çözüldü'ye dönmez", async () => {
    const ticketId = await openTicket(USER);

    await closeSupportTicket({ userId: USER, ticketId, actorIp: ACTOR_IP, now: NOW });

    const later = await getSupportTicket({
      userId: USER,
      ticketId,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES * 10),
    });

    expect(later.status).toBe("closed");
  });

  it("kapatma bildirimi ve denetim kaydı yazılır", async () => {
    const ticketId = await openTicket(USER);

    await closeSupportTicket({ userId: USER, ticketId, actorIp: ACTOR_IP, now: NOW });

    const notifications = await listNotifications({ userId: USER, now: NOW });
    const log = await prisma.auditLog.findFirst({
      where: { userId: USER, action: "support_ticket_close", entityId: ticketId },
    });

    expect(notifications.map((n) => n.title)).toContain("Destek talebiniz kapatıldı");
    expect(log).not.toBeNull();
  });
});

describe("kabul kriteri 4: dosya kuralları", () => {
  it("SINIRDAN FAZLA dosya reddedilir", async () => {
    const files = Array.from({ length: SUPPORT_ATTACHMENT_MAX_COUNT + 1 }, (_, index) =>
      pngFile(`ekran${index}.png`),
    );

    await expect(
      createSupportTicket({ userId: USER, payload: payload(), files, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toBeInstanceOf(AttachmentRejectedError);

    expect(await prisma.supportTicket.count({ where: { userId: USER } })).toBe(0);
  });

  it("SINIRA KADAR dosya kabul edilir", async () => {
    const files = Array.from({ length: SUPPORT_ATTACHMENT_MAX_COUNT }, (_, index) =>
      pngFile(`ekran${index}.png`),
    );

    const ticketId = await openTicket(USER, files);
    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });

    expect(ticket.attachments).toHaveLength(SUPPORT_ATTACHMENT_MAX_COUNT);
  });

  it("BOYUT SINIRINI AŞAN dosya reddedilir", async () => {
    const tooBig = new Uint8Array(SUPPORT_ATTACHMENT_MAX_BYTES + 1);
    tooBig.set(PNG_BYTES, 0);

    await expect(
      createSupportTicket({
        userId: USER,
        payload: payload(),
        files: [pngFile("kocaman.png", tooBig)],
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(AttachmentRejectedError);
  });

  it("RESİM OLMAYAN dosya reddedilir — uzantısı .png olsa bile", async () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>");
    const disguised = new File([html as BlobPart], "zararsiz.png", { type: "image/png" });

    await expect(
      createSupportTicket({
        userId: USER,
        payload: payload(),
        files: [disguised],
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(AttachmentRejectedError);
  });
});

describe("kabul kriteri 5: kullanıcı BAŞKASININ talebini göremez", () => {
  it("başkasının talebi listede ÇIKMAZ", async () => {
    await openTicket(USER);

    const otherList = await listSupportTickets({ userId: OTHER_USER, now: NOW });

    expect(otherList).toHaveLength(0);
  });

  it("başkasının talebi kimliğiyle bile AÇILAMAZ (404)", async () => {
    const ticketId = await openTicket(USER);

    await expect(
      getSupportTicket({ userId: OTHER_USER, ticketId, now: NOW }),
    ).rejects.toBeInstanceOf(SupportTicketNotFoundError);
  });

  it("BAŞKASININ EKİ İNDİRİLEMEZ — ek kimliği bilinse bile (404)", async () => {
    const ticketId = await openTicket(USER, [pngFile("gizli.png")]);
    const ticket = await getSupportTicket({ userId: USER, ticketId, now: NOW });
    const attachmentId = ticket.attachments[0]?.id;

    if (!attachmentId) throw new Error("ek bekleniyordu");

    await expect(
      readAttachment({ userId: OTHER_USER, ticketId, attachmentId }),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);
  });

  it("BAŞKA BİR TALEBİN eki, kendi talep adresinden istenemez", async () => {
    const ownerTicket = await openTicket(USER, [pngFile("gizli.png")]);
    const otherTicket = await openTicket(OTHER_USER);

    const ticket = await getSupportTicket({ userId: USER, ticketId: ownerTicket, now: NOW });
    const attachmentId = ticket.attachments[0]?.id;

    if (!attachmentId) throw new Error("ek bekleniyordu");

    // Saldırgan kendi talebinin adresini kullanıp başkasının ek kimliğini
    // deniyor: ek `ticketId` ile de eşleşmek zorunda.
    await expect(
      readAttachment({ userId: OTHER_USER, ticketId: otherTicket, attachmentId }),
    ).rejects.toBeInstanceOf(AttachmentNotFoundError);
  });
});

describe("hız sınırı", () => {
  it("bütçe dolunca yeni talep 429 döner", async () => {
    for (let index = 0; index < SUPPORT_WRITE_RATE_LIMIT_MAX; index += 1) {
      await createSupportTicket({
        userId: USER,
        payload: payload(),
        files: [],
        actorIp: ACTOR_IP,
        now: NOW,
      });
    }

    await expect(
      createSupportTicket({
        userId: USER,
        payload: payload(),
        files: [],
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toBeInstanceOf(SupportRateLimitedError);
  });
});
