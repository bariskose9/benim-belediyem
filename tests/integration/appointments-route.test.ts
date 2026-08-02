/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `POST /api/appointments` ve `DELETE /api/appointments/{id}` — UCUN KENDİ İŞİ.
 *
 * BU DOSYA İŞ KURALLARINI TEST ETMEZ ve bu bilinçli bir ayrım. "Dolu saat",
 * "geçmiş tarih", "aynı gün ikinci randevu" ve "2 saat kuralı" gerçek
 * PostgreSQL'e karşı sınanıyor (`tests/db/appointment-booking.test.ts`),
 * çünkü o kuralların üçü koşullu güncelleme ve iç içe ilişki sorgusu üzerine
 * kurulu ve taklit bir istemci onları ancak yeniden yazarak taklit edebilirdi
 * — yanlış yazılırsa test YANLIŞ YEŞİL gösterirdi.
 *
 * Burada sınanan şey ucun devraldığı dört sorumluluk:
 *  1. Yetki kapısı (401 / 403) — servis HİÇ çağrılmamalı
 *  2. Girdi doğrulama (422)
 *  3. `userId`'nin OTURUMDAN alınması, gövdeden değil
 *  4. Hata zarfının tek tip olması ve iç detay sızdırmaması
 *
 * Servis taklit ediliyor çünkü test edilen şey servis değil, ona giden yol.
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

const bookAppointment = vi.hoisted(() => vi.fn());
const cancelAppointment = vi.hoisted(() => vi.fn());

vi.mock("@/features/appointments/services/appointment.service", () => ({
  bookAppointment,
  cancelAppointment,
}));

const { POST } = await import("@/app/api/appointments/route");
const { DELETE } = await import("@/app/api/appointments/[id]/route");
const { messages } = await import("@/config/messages");

/**
 * Hata sınıfları BURADA, uç modülleriyle AYNI AŞAMADA içe aktarılıyor.
 *
 * Test gövdesinin içinde `await import()` ile alındığında Vitest bunları ayrı
 * bir modül örneği olarak veriyordu; `toAppError`'daki `instanceof AppError`
 * kontrolü tutmuyor ve her iş kuralı hatası 500'e düşüyordu. Testler bu yüzden
 * kırmızıydı — UYGULAMADA BÖYLE BİR SORUN YOK, Next.js çalışma anında tek bir
 * modül grafiği var. Yine de not düşülüyor: aynı tuzağa bir sonraki test
 * dosyası da düşebilir.
 */
const { AppointmentNotFoundError, AppointmentRateLimitedError, SlotTakenError } =
  await import("@/features/appointments/errors");

const STAFF: SessionShape = {
  sessionId: "session-1",
  userId: "user-staff",
  fullName: "Test Personel",
  role: "user",
  isStaff: true,
  identityStatus: "kps_verified",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

beforeEach(() => {
  state.session = STAFF;
  bookAppointment.mockReset();
  cancelAppointment.mockReset();
  bookAppointment.mockResolvedValue({
    appointmentId: "appointment-1",
    startsAt: new Date("2026-09-01T08:00:00.000Z"),
  });
  cancelAppointment.mockResolvedValue(undefined);
});

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/appointments", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
    body: JSON.stringify(body),
  });
}

function deleteRequest(): Request {
  return new Request("http://localhost:3000/api/appointments/appointment-1", {
    method: "DELETE",
    headers: { "x-forwarded-for": "203.0.113.5" },
  });
}

describe("POST /api/appointments — yetki kapısı", () => {
  it("giriş yapılmamışsa 401 döner ve servis HİÇ çağrılmaz", async () => {
    state.session = null;

    const response = await POST(postRequest({ slotId: "slot-1" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    // Kapı gerçekten kapı: iş katmanına hiç ulaşılmamalı.
    expect(bookAppointment).not.toHaveBeenCalled();
  });

  it("personel olmayan kullanıcı 403 alır", async () => {
    state.session = { ...STAFF, isStaff: false };

    const response = await POST(postRequest({ slotId: "slot-1" }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(bookAppointment).not.toHaveBeenCalled();
  });

  it("kimliği doğrulanmamış kullanıcı 403 alır", async () => {
    state.session = { ...STAFF, identityStatus: "unverified", isStaff: false };

    const response = await POST(postRequest({ slotId: "slot-1" }));

    expect(response.status).toBe(403);
    expect(bookAppointment).not.toHaveBeenCalled();
  });
});

describe("POST /api/appointments — girdi", () => {
  it("geçerli istekte 201 ve randevu kimliği döner", async () => {
    const response = await POST(postRequest({ slotId: "slot-1" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toBe("appointment-1");
    // 201 yanıtları her zaman `no-store` (lib/http.ts).
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  /**
   * İSTEMCİYE GÜVENİLMEZ (03-api-guidelines.md · data-model.md).
   * Gövdeye `userId` konsa bile oturumdaki kimlik kullanılmalı; aksi hâlde
   * herkes başkası adına randevu alabilirdi.
   */
  it("gövdedeki userId YOK SAYILIR, oturumdaki kimlik kullanılır", async () => {
    await POST(postRequest({ slotId: "slot-1", userId: "baskasinin-kimligi" }));

    expect(bookAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-staff", slotId: "slot-1" }),
    );
    expect(bookAppointment).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: "baskasinin-kimligi" }),
    );
  });

  it("slotId eksikse 422 döner", async () => {
    const response = await POST(postRequest({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(bookAppointment).not.toHaveBeenCalled();
  });

  it("gövde bozuk JSON ise 422 döner, ayrıştırma hatası sızmaz", async () => {
    const request = new Request("http://localhost:3000/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bozuk",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(JSON.stringify(body)).not.toContain("JSON");
  });

  it("IP başlığı okunup servise verilir — denetim kaydı için", async () => {
    await POST(postRequest({ slotId: "slot-1" }));

    expect(bookAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ actorIp: "203.0.113.5" }),
    );
  });
});

describe("POST /api/appointments — hata zarfı", () => {
  it("iş kuralı hatası durum kodunu ve kodunu KORUYARAK döner", async () => {
    bookAppointment.mockRejectedValue(new SlotTakenError());

    const response = await POST(postRequest({ slotId: "slot-1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("SLOT_TAKEN");
    expect(body.error.message).toBe(messages.hospital.errors.slotTaken);
  });

  it("hız sınırı hatası 429 olarak geçer", async () => {
    bookAppointment.mockRejectedValue(new AppointmentRateLimitedError());

    const response = await POST(postRequest({ slotId: "slot-1" }));

    expect(response.status).toBe(429);
  });

  /**
   * BEKLENMEYEN HATA İÇ DETAY SIZDIRMAZ (03-api-guidelines.md).
   * Stack trace, SQL veya dosya yolu yanıta konmaz; ayrıntı sunucu log'una gider.
   */
  it("beklenmeyen hata 500'e çevrilir ve iç detay sızdırmaz", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    bookAppointment.mockRejectedValue(
      new Error("connect ECONNREFUSED 10.0.0.1:5432 — /srv/app/db.ts:42"),
    );

    const response = await POST(postRequest({ slotId: "slot-1" }));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe(messages.errors.unexpected);
    expect(serialized).not.toContain("ECONNREFUSED");
    expect(serialized).not.toContain("5432");
    expect(serialized).not.toContain("/srv/app");

    consoleError.mockRestore();
  });
});

describe("DELETE /api/appointments/{id}", () => {
  const params = { params: Promise.resolve({ id: "appointment-1" }) };

  it("giriş yapılmamışsa 401 döner ve servis çağrılmaz", async () => {
    state.session = null;

    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(401);
    expect(cancelAppointment).not.toHaveBeenCalled();
  });

  it("personel olmayan kullanıcı 403 alır", async () => {
    state.session = { ...STAFF, isStaff: false };

    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(403);
    expect(cancelAppointment).not.toHaveBeenCalled();
  });

  it("başarılı iptalde 204 döner ve gövde boştur", async () => {
    const response = await DELETE(deleteRequest(), params);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("randevu kimliği oturumdaki kullanıcıyla birlikte servise geçer", async () => {
    await DELETE(deleteRequest(), params);

    expect(cancelAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-staff", appointmentId: "appointment-1" }),
    );
  });

  /** IDOR: başkasının randevusunda 404 — 403 kaydın varlığını sızdırırdı. */
  it("başkasının randevusunda 404 döner", async () => {
    cancelAppointment.mockRejectedValue(new AppointmentNotFoundError());

    const response = await DELETE(deleteRequest(), params);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("APPOINTMENT_NOT_FOUND");
  });

  it("boş kimlik parametresi 422 döner", async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: "  " }) });

    expect(response.status).toBe(422);
    expect(cancelAppointment).not.toHaveBeenCalled();
  });
});
