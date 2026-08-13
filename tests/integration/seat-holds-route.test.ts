/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `POST /api/v1/events/{eventId}/seat-holds` ve
 * `DELETE /api/v1/events/{eventId}/seat-holds/{reservationId}` — UCUN KENDİ İŞİ.
 *
 * BU DOSYA İŞ KURALLARINI TEST ETMEZ ve bu bilinçli bir ayrım. "10 dakikalık
 * kilit", "süresi dolmuş kilidi devralma" ve "iki kullanıcı aynı anda talip
 * olursa biri 409" gerçek PostgreSQL'e karşı sınanıyor
 * (`tests/db/seat-hold.test.ts`), çünkü o kuralların hepsi koşullu yazma ve
 * benzersizlik kısıtı üzerine kurulu — taklit bir istemci onları ancak
 * yeniden yazarak taklit edebilirdi ve yanlış yazılırsa test YANLIŞ YEŞİL
 * gösterirdi.
 *
 * Burada sınanan şey ucun devraldığı dört sorumluluk:
 *  1. Yetki kapısı (401) — servis HİÇ çağrılmamalı
 *  2. Girdi doğrulama (422)
 *  3. `userId`'nin OTURUMDAN alınması, gövdeden değil
 *  4. Hata zarfının tek tip olması ve iç detay sızdırmaması
 */

type SessionShape = {
  sessionId: string;
  userId: string;
  fullName: string;
  role: "user" | "admin";
  isStaff: boolean;
  identityStatus: "unverified" | "kps_verified";
  expiresAt: Date;
};

const state = vi.hoisted(() => ({ session: null as SessionShape | null }));

vi.mock("@/features/auth/services/session-context", () => ({
  getCurrentSession: async () => state.session,
}));

const holdSeat = vi.hoisted(() => vi.fn());
const releaseSeat = vi.hoisted(() => vi.fn());

vi.mock("@/features/events/services/seat-hold.service", () => ({ holdSeat, releaseSeat }));

const { POST } = await import("@/app/api/v1/events/[eventId]/seat-holds/route");
const { DELETE } = await import("@/app/api/v1/events/[eventId]/seat-holds/[reservationId]/route");

/**
 * Hata sınıfları BURADA, uç modülleriyle AYNI AŞAMADA içe aktarılıyor.
 *
 * Test gövdesinin içinde `await import()` ile alındığında Vitest bunları ayrı
 * bir modül örneği olarak veriyor; `toAppError`'daki `instanceof AppError`
 * kontrolü tutmuyor ve her iş kuralı hatası 500'e düşüyor (randevu testinde
 * yaşandı ve orada da not düşüldü).
 */
const { SeatHoldNotFoundError, SeatTakenError, TooManySeatHoldsError } =
  await import("@/features/events/errors");

const EVENT_ID = "event-1";
const SEAT_ID = "seat-1";
const RESERVATION_ID = "reservation-1";

const HOLD_EXPIRES_AT = new Date("2026-09-01T09:10:00.000Z");

/**
 * DOĞRULANMAMIŞ hesap bilerek kullanılıyor: PRD §5.0 erişim tablosunda bilet
 * alma doğrulanmamış kullanıcıya da açık (hastane ve spor salonu gibi personele
 * özel DEĞİL). Kapı yalnızca "giriş yapılmış mı" diye soruyor.
 */
const MEMBER: SessionShape = {
  sessionId: "session-1",
  userId: "user-member",
  fullName: "Test Üye",
  role: "user",
  isStaff: false,
  identityStatus: "unverified",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  state.session = MEMBER;
  holdSeat.mockReset();
  releaseSeat.mockReset();
  holdSeat.mockResolvedValue({
    reservationId: RESERVATION_ID,
    eventName: "Test Konseri",
    block: "A",
    rowLabel: "3",
    seatNumber: 5,
    holdExpiresAt: HOLD_EXPIRES_AT,
  });
  releaseSeat.mockResolvedValue(undefined);
});

function postRequest(body: unknown): Request {
  return new Request(`http://localhost:3000/api/v1/events/${EVENT_ID}/seat-holds`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: JSON.stringify(body),
  });
}

function eventParams() {
  return { params: Promise.resolve({ eventId: EVENT_ID }) };
}

function deleteRequest(): Request {
  return new Request(
    `http://localhost:3000/api/v1/events/${EVENT_ID}/seat-holds/${RESERVATION_ID}`,
    {
      method: "DELETE",
    },
  );
}

function reservationParams(reservationId = RESERVATION_ID) {
  return { params: Promise.resolve({ reservationId }) };
}

describe("POST seat-holds — yetki kapısı", () => {
  it("giriş yapılmamışsa 401 döner ve servis HİÇ çağrılmaz", async () => {
    state.session = null;

    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    // Kapı gerçekten kapı: iş katmanına hiç ulaşılmamalı.
    expect(holdSeat).not.toHaveBeenCalled();
  });

  it("KİMLİĞİ DOĞRULANMAMIŞ kullanıcı da koltuk seçebilir (PRD §5.0)", async () => {
    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());

    expect(response.status).toBe(201);
    expect(holdSeat).toHaveBeenCalled();
  });
});

describe("POST seat-holds — girdi", () => {
  it("geçerli istekte 201, kilit kimliği ve BİTİŞ ANI döner", async () => {
    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe(RESERVATION_ID);
    // Geri sayımı istemci bu alandan kuruyor.
    expect(body.data.holdExpiresAt).toBe(HOLD_EXPIRES_AT.toISOString());
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  /**
   * İSTEMCİYE GÜVENİLMEZ (03-api-guidelines.md · data-model.md).
   * Gövdeye `userId` konsa bile oturumdaki kimlik kullanılmalı; aksi hâlde
   * herkes başkası adına koltuk tutabilirdi.
   */
  it("gövdedeki userId YOK SAYILIR, oturumdaki kimlik kullanılır", async () => {
    await POST(postRequest({ seatId: SEAT_ID, userId: "baskasinin-kimligi" }), eventParams());

    expect(holdSeat).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-member", eventId: EVENT_ID, seatId: SEAT_ID }),
    );
    expect(holdSeat).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "baskasinin-kimligi" }),
    );
  });

  it("seatId eksikse 422 döner", async () => {
    const response = await POST(postRequest({}), eventParams());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(holdSeat).not.toHaveBeenCalled();
  });

  it("gövde bozuk JSON ise 422 döner, ayrıştırma hatası sızmaz", async () => {
    const request = new Request(`http://localhost:3000/api/v1/events/${EVENT_ID}/seat-holds`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bozuk",
    });

    const response = await POST(request, eventParams());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(JSON.stringify(body)).not.toContain("JSON");
  });

  it("IP başlığı okunup servise verilir — denetim kaydı için", async () => {
    await POST(postRequest({ seatId: SEAT_ID }), eventParams());

    expect(holdSeat).toHaveBeenCalledWith(expect.objectContaining({ actorIp: "203.0.113.9" }));
  });
});

describe("POST seat-holds — hata zarfı", () => {
  it("koltuk kapılmışsa 409 ve SEAT_TAKEN döner", async () => {
    holdSeat.mockRejectedValue(new SeatTakenError());

    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("SEAT_TAKEN");
  });

  it("kilit sınırı aşılmışsa 409 ve TOO_MANY_SEAT_HOLDS döner", async () => {
    holdSeat.mockRejectedValue(new TooManySeatHoldsError());

    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("TOO_MANY_SEAT_HOLDS");
  });

  it("beklenmeyen hata 500'e düşer ve İÇ DETAY SIZDIRMAZ", async () => {
    holdSeat.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));

    const response = await POST(postRequest({ seatId: SEAT_ID }), eventParams());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(body)).not.toContain("5432");
  });
});

describe("DELETE seat-holds", () => {
  it("giriş yapılmamışsa 401 döner ve servis HİÇ çağrılmaz", async () => {
    state.session = null;

    const response = await DELETE(deleteRequest(), reservationParams());

    expect(response.status).toBe(401);
    expect(releaseSeat).not.toHaveBeenCalled();
  });

  it("başarılı bırakmada 204 döner ve gövde boştur", async () => {
    const response = await DELETE(deleteRequest(), reservationParams());

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("kimlik OTURUMDAN alınır — adresteki kilit başkasınınsa servis reddeder", async () => {
    await DELETE(deleteRequest(), reservationParams());

    expect(releaseSeat).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-member", reservationId: RESERVATION_ID }),
    );
  });

  /**
   * BAŞKASININ KİLİDİ 404 ALIR, 403 DEĞİL: "böyle bir kilit var ama senin
   * değil" demek kaydın varlığını sızdırırdı (05-auth-security.md → IDOR).
   */
  it("başkasının kilidi 404 döner", async () => {
    releaseSeat.mockRejectedValue(new SeatHoldNotFoundError());

    const response = await DELETE(deleteRequest(), reservationParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("SEAT_HOLD_NOT_FOUND");
  });

  it("boş kilit kimliği 422 döner", async () => {
    const response = await DELETE(deleteRequest(), reservationParams("   "));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(releaseSeat).not.toHaveBeenCalled();
  });
});
