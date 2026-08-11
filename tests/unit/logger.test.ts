import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { REDACTED } from "@/lib/log-redact";
import { type LogSink, logger, readRequestId, setLogSink } from "@/lib/logger";

/**
 * Log katmanının iki sözü var ve ikisi de test ediliyor:
 *  1. Satır JSON ve makine tarafından süzülebilir
 *  2. Kişisel veri satıra HİÇ girmiyor (CLAUDE.md §5.11)
 */

function lastLine(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const call = spy.mock.calls.at(-1);

  expect(call, "log satırı hiç yazılmadı").toBeDefined();

  return JSON.parse(String(call?.[0])) as Record<string, unknown>;
}

describe("logger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setLogSink(undefined);
  });

  it("tek satır JSON yazar ve zorunlu alanları içerir", () => {
    logger.info("order_created", { orderId: "ord_1" });

    const entry = lastLine(infoSpy);

    expect(entry.level).toBe("info");
    expect(entry.event).toBe("order_created");
    expect(entry.orderId).toBe("ord_1");
    expect(typeof entry.ts).toBe("string");
    expect(entry.env).toBe("local");
  });

  it("kişisel veriyi satıra yazmaz", () => {
    logger.error("register_failed", {
      email: "ayse@ornek.test",
      password: "Test1234!",
      note: "vatandaş 91234567832 bulunamadı",
      userId: "usr_1",
    });

    const entry = lastLine(errorSpy);
    const raw = JSON.stringify(entry);

    expect(entry.email).toBe(REDACTED);
    expect(entry.password).toBe(REDACTED);
    expect(entry.note).toBe(`vatandaş ${REDACTED} bulunamadı`);
    // Teşhis için gereken kimlik durmalı.
    expect(entry.userId).toBe("usr_1");
    expect(raw).not.toContain("91234567832");
    expect(raw).not.toContain("Test1234!");
  });

  it("bağlamdaki `level` alanı satırın kendi seviyesini ezemez", () => {
    logger.error("suspicious", { level: "info", event: "sahte" });

    const entry = lastLine(errorSpy);

    expect(entry.level).toBe("error");
    expect(entry.event).toBe("suspicious");
  });

  it("hata nesnesini süzerek yazar", () => {
    logger.error("cron_task_failed", {
      task: "membership_renewal",
      error: new Error("kayıt bulunamadı: ayse@ornek.test"),
    });

    const entry = lastLine(errorSpy);
    const error = entry.error as { message: string; name: string };

    expect(error.name).toBe("Error");
    expect(error.message).toBe(`kayıt bulunamadı: ${REDACTED}`);
    expect(entry.task).toBe("membership_renewal");
  });

  it("serileştirilemeyen bağlamda satırı kaybetmez", () => {
    // BigInt JSON'a çevrilemez; `redact` onu metne çevirdiği için satır yine
    // yazılmalı. Bu test, log katmanının kendi hatasıyla susmasını engelliyor.
    expect(() => logger.error("weird", { amount: BigInt(10) })).not.toThrow();
    expect(lastLine(errorSpy).event).toBe("weird");
  });
});

describe("logger — hata takibi kanalı (Sentry)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setLogSink(undefined);
  });

  it("error ve warn seviyesini sink'e iletir, info'yu iletmez", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});

    const seen: string[] = [];
    const sink: LogSink = ({ event }) => void seen.push(event);
    setLogSink(sink);

    logger.info("bilgi");
    logger.warn("uyari");
    logger.error("hata");

    expect(seen).toEqual(["uyari", "hata"]);
  });

  it("sink'e giden bağlam da süzülmüş olur", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    let received: Record<string, unknown> = {};
    setLogSink(({ context }) => void (received = context));

    logger.error("payment_failed", { cardNumber: "4111111111111111" });

    expect(received.cardNumber).toBe(REDACTED);
  });

  it("sink patlarsa uygulama etkilenmez", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    setLogSink(() => {
      throw new Error("Sentry çöktü");
    });

    expect(() => logger.error("hata")).not.toThrow();
  });
});

describe("readRequestId", () => {
  it("Vercel'in istek kimliğini okur", () => {
    expect(readRequestId(new Headers({ "x-vercel-id": "fra1::abc123" }))).toBe("fra1::abc123");
  });

  it("başlık yoksa kimlik uydurmaz", () => {
    expect(readRequestId(new Headers())).toBeUndefined();
  });
});
