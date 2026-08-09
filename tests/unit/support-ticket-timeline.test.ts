/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import {
  SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES,
  SUPPORT_TICKET_RESOLVED_AFTER_MINUTES,
} from "@/config/constants";
import {
  deriveTicketState,
  pendingTicketNotificationStages,
  supportTimelineIndex,
} from "@/features/support/services/support-ticket-timeline";

/**
 * Destek talebi durum kuralının birim testi (PRD §5.7 · ADR-013).
 *
 * Bu fonksiyon SAF olduğu için veritabanı gerekmiyor: zaman dışarıdan
 * veriliyor ve "3 saat sonra ne olur" sorusu beklemeden cevaplanıyor. Aynı
 * kural `tests/db/support-ticket.test.ts` içinde gerçek kayıtlarla da
 * doğrulanıyor — burası kuralın kendisini, orası kuralın uygulanışını ölçüyor.
 */

const CREATED_AT = new Date("2026-09-01T09:00:00.000Z");

function minutesAfter(minutes: number): Date {
  return new Date(CREATED_AT.getTime() + minutes * 60_000);
}

describe("deriveTicketState", () => {
  it("yeni talep 'Açık' başlar ve kapatılabilir", () => {
    const state = deriveTicketState({
      storedStatus: "open",
      createdAt: CREATED_AT,
      now: CREATED_AT,
    });

    expect(state.status).toBe("open");
    expect(state.canClose).toBe(true);
    expect(state.nextStageAt).toEqual(minutesAfter(SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES));
  });

  it("eşiğe BİR DAKİKA KALA hâlâ 'Açık'", () => {
    const state = deriveTicketState({
      storedStatus: "open",
      createdAt: CREATED_AT,
      now: minutesAfter(SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES - 1),
    });

    expect(state.status).toBe("open");
  });

  it("eşik geçilince 'İnceleniyor'a döner", () => {
    const state = deriveTicketState({
      storedStatus: "open",
      createdAt: CREATED_AT,
      now: minutesAfter(SUPPORT_TICKET_IN_REVIEW_AFTER_MINUTES),
    });

    expect(state.status).toBe("in_review");
    expect(state.nextStageAt).toEqual(minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES));
  });

  it("ikinci eşik geçilince 'Çözüldü' olur ve bir sonraki aşama kalmaz", () => {
    const state = deriveTicketState({
      storedStatus: "open",
      createdAt: CREATED_AT,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES),
    });

    expect(state.status).toBe("resolved");
    expect(state.nextStageAt).toBeNull();
    // Çözülmüş talep hâlâ kapatılabilir: kapatma kullanıcının hakkı (PRD §5.7).
    expect(state.canClose).toBe(true);
  });

  it("KAPATILMIŞ TALEP ZAMANLA İLERLEMEZ — çizginin dışındadır", () => {
    const state = deriveTicketState({
      storedStatus: "closed",
      createdAt: CREATED_AT,
      now: minutesAfter(SUPPORT_TICKET_RESOLVED_AFTER_MINUTES * 10),
    });

    expect(state.status).toBe("closed");
    expect(state.canClose).toBe(false);
    expect(state.nextStageAt).toBeNull();
  });
});

describe("supportTimelineIndex", () => {
  it("kapanmış talep çizgide yer almaz", () => {
    expect(supportTimelineIndex("closed")).toBe(-1);
  });

  it("aşamalar sırayla numaralanır", () => {
    expect(supportTimelineIndex("open")).toBe(0);
    expect(supportTimelineIndex("in_review")).toBe(1);
    expect(supportTimelineIndex("resolved")).toBe(2);
  });
});

describe("pendingTicketNotificationStages", () => {
  it("hiç bildirim yazılmamışsa güncel duruma kadar HEPSİ yazılır", () => {
    const stages = pendingTicketNotificationStages({
      notifiedStatus: null,
      currentStatus: "resolved",
    });

    expect(stages).toEqual(["open", "in_review", "resolved"]);
  });

  it("ATLANAN AŞAMA KAYBOLMAZ: geç bakan kullanıcı aradakini de görür", () => {
    const stages = pendingTicketNotificationStages({
      notifiedStatus: "open",
      currentStatus: "resolved",
    });

    expect(stages).toEqual(["in_review", "resolved"]);
  });

  it("durum ilerlemediyse yazılacak bildirim yok", () => {
    const stages = pendingTicketNotificationStages({
      notifiedStatus: "in_review",
      currentStatus: "in_review",
    });

    expect(stages).toEqual([]);
  });

  it("kapanmış talebe aşama bildirimi yazılmaz", () => {
    const stages = pendingTicketNotificationStages({
      notifiedStatus: "in_review",
      currentStatus: "closed",
    });

    expect(stages).toEqual([]);
  });
});
