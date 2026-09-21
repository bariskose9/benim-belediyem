/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Üyelik uçlarının yanıt sözleşmesi — `POST /api/v1/memberships`,
 * `PATCH` ve `DELETE /api/v1/memberships/{membershipId}` (borç #107 · 107c).
 *
 * NEREDEN : src/features/gym/services/membership-purchase.service.ts ve membership-change.service.ts (TAKLİT)
 *           → `Date` ve `null` taşıyan servis sonuçları
 * NE      : Üç route gerçek çalışıyor; gövde belgedeki şemadan telden geçmiş hâliyle geçiriliyor
 * NEREYE  : — (test; üretim çıktısı yok)
 * SONUÇ   : Üç kanıt — tarihler ISO metin, olmayan tarih `null` · çalışma anı kapısı BU UÇLARA bağlı
 *           (sözleşme dışı gövde 500) · erişim kapısı ve girdi doğrulama bozulmadı
 * KAYNAK  : ADR-021 · docs/project/PRD.md → "5.6 Spor Salonu Üyeliği" · docs/standards/06-testing.md → "Kurallar"
 * NEDEN   : Paket değişimi ucunun (PATCH) E2E'de karşılığı yok; iş kuralları `tests/db/membership-*.test.ts`
 *           içinde gerçek PostgreSQL'e karşı kanıtlı. Burada yalnızca ucun kendi işi ölçülüyor
 * DİKKAT  : Route'lardan `schema:` kaldırılırsa "kapı bağlı" testleri kırmızıya döner — bilerek
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

const startMembership = vi.hoisted(() => vi.fn());
const changeMembershipPlan = vi.hoisted(() => vi.fn());
const cancelUserMembership = vi.hoisted(() => vi.fn());

vi.mock("@/features/gym/services/membership-purchase.service", () => ({ startMembership }));
vi.mock("@/features/gym/services/membership-change.service", () => ({
  changeMembershipPlan,
  cancelUserMembership,
}));

const { POST } = await import("@/app/api/v1/memberships/route");
const { PATCH, DELETE } = await import("@/app/api/v1/memberships/[membershipId]/route");

/** Hata sınıfı uç modülüyle AYNI aşamada içe aktarılıyor — `instanceof` tutsun diye. */
const { MembershipNotFoundError } = await import("@/features/gym/errors");

const STAFF: SessionShape = {
  sessionId: "session-1",
  userId: "user-1",
  fullName: "Personel Kullanıcı",
  role: "user",
  isStaff: true,
  identityStatus: "kps_verified",
  expiresAt: new Date("2030-01-01T00:00:00.000Z"),
};

const NEXT_BILLING_AT = new Date("2026-10-21T00:00:00.000Z");
const COMMITMENT_ENDS_AT = new Date("2027-09-21T00:00:00.000Z");
const MEMBERSHIP_ID = "membership-1";

const membershipContext = { params: Promise.resolve({ membershipId: MEMBERSHIP_ID }) };

/** `fake-data-guide.md`'deki sahte test kartı. */
function newCard() {
  return {
    kind: "new",
    number: "4111111111111111",
    holderName: "Personel Kullanici",
    expMonth: 12,
    expYear: 2030,
    cvv: "123",
    save: false,
  };
}

function request(method: string, body?: unknown): Request {
  return new Request("http://localhost:3000/api/v1/memberships", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  state.session = STAFF;

  startMembership.mockReset().mockResolvedValue({
    membershipId: MEMBERSHIP_ID,
    chargedKurus: 89900,
    nextBillingAt: NEXT_BILLING_AT,
    commitmentEndsAt: COMMITMENT_ENDS_AT,
  });
  changeMembershipPlan.mockReset().mockResolvedValue({
    pendingPlanId: "plan-2",
    effectiveAt: NEXT_BILLING_AT,
    feeKurus: 0,
  });
  cancelUserMembership.mockReset().mockResolvedValue({
    feeKurus: 45000,
    feeCharged: true,
    accessEndsAt: NEXT_BILLING_AT,
  });
});

describe("yanıt gövdesi tel biçiminde", () => {
  it("üyelik başlatma 201 döner; tarihler ISO METİN", async () => {
    const response = await POST(
      request("POST", {
        planId: "plan-1",
        idempotencyKey: "idem-0123456789",
        acceptedTerms: true,
        card: newCard(),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toEqual({
      id: MEMBERSHIP_ID,
      chargedKurus: 89900,
      nextBillingAt: NEXT_BILLING_AT.toISOString(),
      commitmentEndsAt: COMMITMENT_ENDS_AT.toISOString(),
    });
  });

  it("taahhütsüz pakette taahhüt bitişi null — alan YOK değil, null", async () => {
    startMembership.mockResolvedValue({
      membershipId: MEMBERSHIP_ID,
      chargedKurus: 59900,
      nextBillingAt: NEXT_BILLING_AT,
      commitmentEndsAt: null,
    });

    const response = await POST(
      request("POST", {
        planId: "plan-0",
        idempotencyKey: "idem-0123456789",
        acceptedTerms: true,
        card: newCard(),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toHaveProperty("commitmentEndsAt", null);
  });

  it("paket değişimi 200 döner; sıradaki paket, yürürlük tarihi ve fark", async () => {
    const response = await PATCH(
      request("PATCH", { pendingPlanId: "plan-2", idempotencyKey: "idem-0123456789" }),
      membershipContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.data).toEqual({
      pendingPlanId: "plan-2",
      effectiveAt: NEXT_BILLING_AT.toISOString(),
      feeKurus: 0,
    });
  });

  it("sıradaki değişimi iptal etmek pendingPlanId ve effectiveAt için null döner", async () => {
    changeMembershipPlan.mockResolvedValue({ pendingPlanId: null, effectiveAt: null, feeKurus: 0 });

    const response = await PATCH(
      request("PATCH", { pendingPlanId: null, idempotencyKey: "idem-0123456789" }),
      membershipContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ pendingPlanId: null, effectiveAt: null, feeKurus: 0 });
  });

  it("sonlandırma DELETE ile 200 döner ve tahsilat bilgisini taşır (204 değil)", async () => {
    const response = await DELETE(
      request("DELETE", { acknowledgedFeeKurus: 45000, idempotencyKey: "idem-0123456789" }),
      membershipContext,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      feeKurus: 45000,
      feeCharged: true,
      accessEndsAt: NEXT_BILLING_AT.toISOString(),
    });
  });
});

describe("çalışma anı kapısı bu uçlara bağlı", () => {
  it.each([
    {
      name: "POST /memberships",
      arrange: () =>
        startMembership.mockResolvedValue({
          membershipId: MEMBERSHIP_ID,
          chargedKurus: "899,00 TL",
          nextBillingAt: NEXT_BILLING_AT,
          commitmentEndsAt: null,
        }),
      act: () =>
        POST(
          request("POST", {
            planId: "plan-1",
            idempotencyKey: "idem-0123456789",
            acceptedTerms: true,
            card: newCard(),
          }),
        ),
      field: "chargedKurus",
    },
    {
      name: "PATCH /memberships/{membershipId}",
      arrange: () =>
        changeMembershipPlan.mockResolvedValue({
          pendingPlanId: "plan-2",
          effectiveAt: NEXT_BILLING_AT,
          feeKurus: 12.5,
        }),
      act: () =>
        PATCH(
          request("PATCH", { pendingPlanId: "plan-2", idempotencyKey: "idem-0123456789" }),
          membershipContext,
        ),
      field: "feeKurus",
    },
    {
      name: "DELETE /memberships/{membershipId}",
      arrange: () =>
        cancelUserMembership.mockResolvedValue({
          feeKurus: 45000,
          feeCharged: "evet",
          accessEndsAt: NEXT_BILLING_AT,
        }),
      act: () =>
        DELETE(
          request("DELETE", { acknowledgedFeeKurus: 45000, idempotencyKey: "idem-0123456789" }),
          membershipContext,
        ),
      field: "feeCharged",
    },
  ])(
    "$name: sözleşme dışı gövde sessizce geçmiyor, 500'e düşüyor",
    async ({ arrange, act, field }) => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

      arrange();

      const response = await act();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe("INTERNAL_ERROR");

      const logged = consoleError.mock.calls.map((call) => JSON.stringify(call)).join(" ");

      expect(logged).toContain("Yanıt sözleşmesi ihlali");
      expect(logged).toContain(field);

      // Sözleşme hatası istek gövdesini taşımaz: kart numarası ne yanıta ne log'a
      // düşer (ödeme testiyle aynı güvence — güvenlik denetiminde eksik bulundu).
      expect(JSON.stringify(body)).not.toContain("4111");
      expect(logged).not.toContain("4111");

      consoleError.mockRestore();
    },
  );
});

describe("erişim kapısı ve girdi", () => {
  it("personel olmayan üye 403 alır ve servis HİÇ çağrılmaz", async () => {
    state.session = { ...STAFF, isStaff: false };

    const response = await POST(
      request("POST", {
        planId: "plan-1",
        idempotencyKey: "idem-0123456789",
        acceptedTerms: true,
        card: newCard(),
      }),
    );

    expect(response.status).toBe(403);
    expect(startMembership).not.toHaveBeenCalled();
  });

  it("taahhüt onayı olmadan 422 döner ve kart numarası yanıta sızmaz", async () => {
    const response = await POST(
      request("POST", {
        planId: "plan-1",
        idempotencyKey: "idem-0123456789",
        acceptedTerms: false,
        card: newCard(),
      }),
    );

    expect(response.status).toBe(422);
    expect(JSON.stringify(await response.json())).not.toContain("4111");
    expect(startMembership).not.toHaveBeenCalled();
  });

  it("başkasının üyeliği 'bulunamadı' alır — 404, 403 değil", async () => {
    cancelUserMembership.mockRejectedValue(new MembershipNotFoundError());

    const response = await DELETE(
      request("DELETE", { acknowledgedFeeKurus: 0, idempotencyKey: "idem-0123456789" }),
      membershipContext,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("MEMBERSHIP_NOT_FOUND");
  });
});
