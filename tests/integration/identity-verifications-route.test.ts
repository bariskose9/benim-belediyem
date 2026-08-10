/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `POST /api/identity-verifications` — UCUN KENDİ İŞİ (adım 15c-2).
 *
 * BU DOSYA İŞ KURALLARINI TEST ETMEZ ve bu bilinçli bir ayrım. "Numara başka
 * hesapta", "18 yaş", "personel eşleşmesi" ve "koşullu yazma" gerçek
 * PostgreSQL'e karşı sınanıyor (`tests/db/identity-verification.test.ts`),
 * çünkü o kuralların kanıtı benzersizlik kısıtına ve etkilenen satır sayısına
 * bağlı — taklit bir istemci onları ancak yeniden yazarak taklit edebilirdi ve
 * yanlış yazılırsa test YANLIŞ YEŞİL gösterirdi.
 *
 * Burada sınanan dört sorumluluk:
 *  1. Yetki kapısı (401) — servis HİÇ çağrılmamalı
 *  2. Girdi doğrulama (400) ve tek tip hata zarfı
 *  3. `userId`'nin OTURUMDAN alınması, gövdeden DEĞİL
 *  4. Deneme bütçesi (429) — servis çağrılmadan önce
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

const state = vi.hoisted(() => ({
  session: null as SessionShape | null,
  rateLimitAllowed: true,
}));

vi.mock("@/features/auth/services/session-context", () => ({
  getCurrentSession: async () => state.session,
}));

const verifyIdentity = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/services/identity-verification.service", () => ({ verifyIdentity }));

const consumeRateLimit = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();

  return { ...actual, consumeRateLimit };
});

const { POST } = await import("@/app/api/identity-verifications/route");
const { messages } = await import("@/config/messages");

const SESSION: SessionShape = {
  sessionId: "session-1",
  userId: "user-google",
  fullName: "gecici.ad",
  role: "user",
  isStaff: false,
  identityStatus: "unverified",
  expiresAt: new Date(Date.now() + 60_000),
};

const VALID_NATIONAL_ID = "10000000146";

function request(body: unknown): Request {
  return new Request("http://localhost:3000/api/identity-verifications", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.5" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  state.session = SESSION;
  state.rateLimitAllowed = true;
  verifyIdentity.mockReset();
  verifyIdentity.mockResolvedValue({ isStaff: false, fullName: "Zeynep Özkan" });
  consumeRateLimit.mockReset();
  consumeRateLimit.mockImplementation(async () => ({
    allowed: state.rateLimitAllowed,
    remaining: 0,
    resetAt: new Date(),
  }));
});

describe("POST /api/identity-verifications — yetki kapısı", () => {
  it("girişsiz istek 401 döner ve servis hiç çağrılmaz", async () => {
    state.session = null;

    const response = await POST(request({ nationalId: VALID_NATIONAL_ID, birthYear: 1992 }));

    expect(response.status).toBe(401);
    expect(verifyIdentity).not.toHaveBeenCalled();
  });

  /**
   * ⭐ KADEME `authenticated`: doğrulanmamış kullanıcı bu ucu KULLANABİLMELİ.
   * `identity_verified` istenseydi uç kendi hedef kitlesini 403 ile geri
   * çevirir ve teknik borç #32 kapanmazdı.
   */
  it("kimliği doğrulanmamış kullanıcı ucu kullanabilir", async () => {
    const response = await POST(request({ nationalId: VALID_NATIONAL_ID, birthYear: 1992 }));

    expect(response.status).toBe(201);
    expect(verifyIdentity).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/identity-verifications — girdi doğrulama", () => {
  /**
   * Kontrol basamağı hatalı numara 400 `IDENTITY_CHECK_FAILED` döner, 422
   * DEĞİL: 422 dönseydi durum kodunun kendisi "numaran bozuk" ile "numara
   * kayıtlı değil" farkını sızdırırdı (05-auth-security.md).
   */
  it("geçersiz kimlik numarası 400 ve tek tip mesaj döner", async () => {
    const response = await POST(request({ nationalId: "11111111111", birthYear: 1992 }));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("IDENTITY_CHECK_FAILED");
    expect(body.error.message).toBe(messages.identity.lookupFailed);
    expect(verifyIdentity).not.toHaveBeenCalled();
  });

  it("doğum yılı eksikse servis çağrılmaz", async () => {
    const response = await POST(request({ nationalId: VALID_NATIONAL_ID }));

    expect(response.status).toBe(400);
    expect(verifyIdentity).not.toHaveBeenCalled();
  });

  it("gövdesi bozuk istek iç hata sızdırmadan 400 döner", async () => {
    const broken = new Request("http://localhost:3000/api/identity-verifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bozuk",
    });

    const response = await POST(broken);
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.message).not.toContain("JSON");
  });
});

describe("POST /api/identity-verifications — kimlik oturumdan gelir", () => {
  /**
   * ⭐ IDOR KORUMASI TASARIM GEREĞİ: gövdeye `userId` yazılsa bile servise
   * OTURUMDAKİ kullanıcı gidiyor. Uç, başkasının hesabına kimlik bağlamanın
   * söylenebileceği bir alan tanımıyor.
   */
  it("gövdedeki userId yok sayılır, oturumdaki kullanıcı kullanılır", async () => {
    await POST(
      request({
        nationalId: VALID_NATIONAL_ID,
        birthYear: 1992,
        userId: "baskasinin-hesabi",
        isStaff: true,
      }),
    );

    expect(verifyIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ userId: SESSION.userId, sessionId: SESSION.sessionId }),
    );

    const passed = verifyIdentity.mock.calls[0]?.[0] as { payload: Record<string, unknown> };

    // ⭐ `isStaff` şemadan geçmiyor: servise yalnızca üç alan gidiyor.
    expect(Object.keys(passed.payload).sort()).toEqual([
      "birthYear",
      "nationalId",
      "turnstileToken",
    ]);
  });

  it("başarılı yanıt yalnızca ekranın ihtiyacı olan iki alanı döner", async () => {
    verifyIdentity.mockResolvedValue({ isStaff: true, fullName: "Zeynep Özkan" });

    const response = await POST(request({ nationalId: VALID_NATIONAL_ID, birthYear: 1992 }));
    const body = (await response.json()) as { data: Record<string, unknown> };

    expect(response.status).toBe(201);
    expect(body.data).toEqual({ isStaff: true, fullName: "Zeynep Özkan" });
  });
});

describe("POST /api/identity-verifications — deneme bütçesi", () => {
  /**
   * ⭐ BÜTÇE SERVİSTEN ÖNCE: sayaç dolduğunda KPS'e hiç gidilmiyor. Bütçe
   * KULLANICI bazlı, çünkü oturum kimliği yeniden girişle, IP ise şebeke
   * değişimiyle yenilenebiliyor.
   */
  it("bütçe dolduğunda 429 döner ve servis çağrılmaz", async () => {
    state.rateLimitAllowed = false;

    const response = await POST(request({ nationalId: VALID_NATIONAL_ID, birthYear: 1992 }));
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(429);
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(verifyIdentity).not.toHaveBeenCalled();
  });

  it("sayaç kullanıcı bazlı anahtarla tüketilir", async () => {
    await POST(request({ nationalId: VALID_NATIONAL_ID, birthYear: 1992 }));

    const key = (consumeRateLimit.mock.calls[0]?.[0] as { key: string }).key;

    expect(key.startsWith("identity_verification:user:")).toBe(true);
    // Kullanıcı kimliği anahtarda DÜZ HALİYLE geçmez (özetlenir, ADR-006).
    expect(key).not.toContain(SESSION.userId);
  });
});
