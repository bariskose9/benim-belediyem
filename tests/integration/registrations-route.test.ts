/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Kayıt akışının uçtan uca davranışı (PRD §5.0 kabul kriterleri).
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ DEĞİL: `users`, `registration_drafts`,
 * `otp_challenges`, `staff_members` ve `audit_logs` tablolarının davranışı
 * bellekte uygulanıyor. Gerçek Postgres'e karşı yapılan kanıtlar
 * `tests/db/registration-privacy.test.ts` içinde.
 */

const SEEDED_CITIZEN = {
  nationalId: "10000000146",
  firstName: "Ayşe",
  lastName: "Yılmaz",
  birthDate: "1990-05-15",
  // Nüfus ilinden FARKLI bir şehir: ikisi aynı olsaydı "doğum yeri yazılmadı"
  // iddiası, kalıcı tutulan `registeredProvince` yüzünden ayırt edilemezdi.
  birthPlace: "Manisa",
  fatherName: "Mehmet",
  motherName: "Fatma",
  registeredProvince: "İzmir",
  registeredDistrict: "Konak",
  gender: "female",
  maritalStatus: "single",
  registeredAddress: "Konak Mahallesi 1234 Sokak No 5",
};

const db = vi.hoisted(() => ({
  drafts: [] as Record<string, unknown>[],
  users: [] as Record<string, unknown>[],
  challenges: [] as Record<string, unknown>[],
  auditLogs: [] as Record<string, unknown>[],
  staffMembers: [] as Record<string, unknown>[],
  counters: new Map<string, number>(),
  cookieStore: new Map<string, string>(),
  nextId: 1,
}));

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  envLabel: "local" as string,
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
  serverEnv: {
    NATIONAL_ID_HASH_SALT: "test-only-salt",
    NATIONAL_ID_ENCRYPTION_KEY: "bG9jYWwtZGV2LW9ubHkta2V5LTMyLWJ5dGVzLXh4eHg=",
    TURNSTILE_SECRET_KEY: undefined as string | undefined,
    OTP_EMAIL_CHANNEL: "mock" as string,
    OTP_PHONE_CHANNEL: "mock" as string,
    EMAIL_API_KEY: undefined as string | undefined,
    EMAIL_FROM: undefined as string | undefined,
    MOCK_KPS_API_KEY: "test-only-mock-kps-key-at-least-32-chars",
  },
}));

vi.mock("@/config/env", () => envMock);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      db.cookieStore.has(name) ? { name, value: db.cookieStore.get(name) } : undefined,
    set: (name: string, value: string) => db.cookieStore.set(name, value),
    delete: (name: string) => db.cookieStore.delete(name),
  }),
}));

/** Kimlik sorgusu adım 4a'da uçtan uca doğrulandı; burada sonucu taklit ediliyor. */
const lookupIdentity = vi.hoisted(() => vi.fn());
vi.mock("@/features/identity/services/identity-lookup.service", () => ({ lookupIdentity }));

function match(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === "object" && "not" in value) {
      return row[key] !== (value as { not: unknown }).not;
    }

    return row[key] === value;
  });
}

vi.mock("@/lib/db", () => ({
  prisma: {
    registrationDraft: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { ...data, id: `draft-${db.nextId++}` };
        db.drafts.push(row);

        return { id: row.id };
      }),
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return db.drafts.find((row) => match(row, where)) ?? null;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = db.drafts.find((candidate) => candidate.id === where.id);
          Object.assign(row!, data);

          return row;
        },
      ),
      deleteMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        db.drafts = db.drafts.filter((row) => !match(row, where));

        return { count: 0 };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return db.users.find((row) => match(row, where)) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row: Record<string, unknown> = { ...data, id: `user-${db.nextId++}` };
        db.users.push(row);

        return { id: row.id as string, isStaff: row.isStaff as boolean };
      }),
    },
    staffMember: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return db.staffMembers.find((row) => match(row, where)) ?? null;
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        db.auditLogs.push(data);

        return data;
      }),
    },
    otpChallenge: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          ...data,
          id: `challenge-${db.nextId++}`,
          attemptCount: 0,
          consumedAt: null,
        };
        db.challenges.push(row);

        return { id: row.id };
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: Record<string, unknown>;
          data: Record<string, unknown>;
        }) => {
          for (const row of db.challenges) {
            if (match(row, where)) Object.assign(row, data);
          }

          return { count: 0 };
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where: Record<string, unknown>;
          orderBy?: Record<string, string>;
        }) => {
          const matches = db.challenges.filter((row) => match(row, where));
          const key = orderBy ? Object.keys(orderBy)[0] : "expiresAt";

          return (
            matches.sort(
              (a, b) => Number(new Date(b[key] as Date)) - Number(new Date(a[key] as Date)),
            )[0] ?? null
          );
        },
      ),
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const purposes = new Set(
          db.challenges.filter((row) => match(row, where)).map((row) => row.purpose),
        );

        return [...purposes].map((purpose) => ({ purpose }));
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = db.challenges.find((candidate) => candidate.id === where.id)!;

          if (data.attemptCount) {
            row.attemptCount =
              (row.attemptCount as number) + (data.attemptCount as { increment: number }).increment;
          }
          if (data.consumedAt) row.consumedAt = data.consumedAt;

          return { attemptCount: row.attemptCount };
        },
      ),
    },
    rateLimitCounter: {
      upsert: vi.fn(
        async ({
          where,
        }: {
          where: { key_windowStartedAt: { key: string; windowStartedAt: Date } };
        }) => {
          const { key, windowStartedAt } = where.key_windowStartedAt;
          const mapKey = `${key}@${windowStartedAt.getTime()}`;
          const count = (db.counters.get(mapKey) ?? 0) + 1;
          db.counters.set(mapKey, count);

          return { count };
        },
      ),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

// ---------------------------------------------------------------------------

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/registrations", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });
}

async function callStart(body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/registrations/route");

  return POST(
    jsonRequest({
      nationalId: SEEDED_CITIZEN.nationalId,
      birthYear: 1990,
      turnstileToken: "gecerli-jeton",
      ...body,
    }),
  );
}

async function callContact(body: Record<string, unknown> = {}) {
  const { PATCH } = await import("@/app/api/registrations/current/route");

  return PATCH(
    jsonRequest({
      email: "ayse@ornek.com",
      phone: "05321234567",
      password: "mavi-deniz-42",
      passwordConfirm: "mavi-deniz-42",
      ...body,
    }),
  );
}

async function callVerify(channel: "email" | "phone", code: string) {
  const { POST } = await import("@/app/api/registrations/current/verifications/route");

  return POST(jsonRequest({ channel, code }));
}

async function readBody(response: Response) {
  return (await response.json()) as { data?: Record<string, never>; error?: Record<string, never> };
}

beforeEach(() => {
  vi.resetModules();
  db.drafts = [];
  db.users = [];
  db.challenges = [];
  db.auditLogs = [];
  db.staffMembers = [];
  db.counters = new Map();
  db.cookieStore = new Map();
  db.nextId = 1;
  envMock.isProductionEnv = false;
  envMock.envLabel = "local";
  envMock.serverEnv.TURNSTILE_SECRET_KEY = undefined;
  lookupIdentity.mockClear();
  lookupIdentity.mockResolvedValue({ outcome: "success", identity: SEEDED_CITIZEN });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/registrations — kimlik adımı", () => {
  it("geçerli bilgilerle 201 döner ve kimlik alanlarını gösterir", async () => {
    const response = await callStart();
    const body = await readBody(response);

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      identity: {
        firstName: "Ayşe",
        lastName: "Yılmaz",
        // Kalıcı tutulmayan alanlar EKRANDA gösterilir (PRD §5.0)
        fatherName: "Mehmet",
        motherName: "Fatma",
        birthPlace: "Manisa",
        registeredAddress: "Konak Mahallesi 1234 Sokak No 5",
      },
    });
  });

  it("YANITTA TAM KİMLİK NUMARASI GEÇMEZ — yalnızca maskeli hâli döner", async () => {
    const response = await callStart();
    const raw = JSON.stringify(await readBody(response));

    expect(raw).not.toContain(SEEDED_CITIZEN.nationalId);
    expect(raw).toContain("100******46");
  });

  it("taslak çerezi httpOnly olarak yazılır ve kimlik URL'de geçmez", async () => {
    await callStart();

    expect(db.cookieStore.has("bb_registration")).toBe(true);
    // Çerezdeki değer taslağın kimliği DEĞİL, rastgele bir jeton.
    expect(db.cookieStore.get("bb_registration")).not.toBe(db.drafts[0].id);
  });

  it("taslak satırında DÜZ METİN kimlik numarası bulunmaz", async () => {
    await callStart();

    expect(JSON.stringify(db.drafts[0])).not.toContain(SEEDED_CITIZEN.nationalId);
  });

  it("taslak satırında DÜZ IP bulunmaz", async () => {
    await callStart();

    expect(JSON.stringify(db.drafts[0])).not.toContain("203.0.113.9");
  });

  it("kontrol basamağı hatalı numarayı 400 ile reddeder", async () => {
    const response = await callStart({ nationalId: "12345678901" });

    expect(response.status).toBe(400);
    expect(lookupIdentity).not.toHaveBeenCalled();
  });

  it("bulunamayan numara ve tutmayan doğum yılı AYNI kod ve mesajla döner", async () => {
    // Farklı yanıt vermek numara taramasına ipucu verirdi
    // (05-auth-security.md → tek tip mesaj).
    lookupIdentity.mockResolvedValue({ outcome: "failed" });

    const first = await readBody(await callStart());
    vi.resetModules();
    const second = await readBody(await callStart({ birthYear: 1991 }));

    expect(first.error).toEqual(second.error);
    expect(first.error).toMatchObject({ code: "IDENTITY_CHECK_FAILED" });
  });

  it("18 yaşını doldurmamış kişiyi 403 ile reddeder ve taslak OLUŞTURMAZ", async () => {
    vi.setSystemTime(new Date("2026-07-31T09:00:00Z"));
    lookupIdentity.mockResolvedValue({
      outcome: "success",
      identity: { ...SEEDED_CITIZEN, birthDate: "2010-01-01" },
    });

    const response = await callStart();

    expect(response.status).toBe(403);
    expect((await readBody(response)).error).toMatchObject({ code: "AGE_RESTRICTED" });
    expect(db.drafts).toHaveLength(0);

    vi.useRealTimers();
  });

  it("BUGÜN 18 olan kişiyi kabul eder — sınır durumu", async () => {
    vi.setSystemTime(new Date("2026-07-31T09:00:00Z"));
    lookupIdentity.mockResolvedValue({
      outcome: "success",
      identity: { ...SEEDED_CITIZEN, birthDate: "2008-07-31" },
    });

    expect((await callStart()).status).toBe(201);

    vi.useRealTimers();
  });

  it("hız sınırı aşılınca 429 döner", async () => {
    lookupIdentity.mockResolvedValue({ outcome: "rate_limited" });

    expect((await callStart()).status).toBe(429);
  });

  it("KPS erişilemezse 503 döner ve sayfa çökmez", async () => {
    lookupIdentity.mockResolvedValue({ outcome: "unavailable" });

    const response = await callStart();

    expect(response.status).toBe(503);
    expect((await readBody(response)).error).toMatchObject({
      code: "IDENTITY_SERVICE_UNAVAILABLE",
    });
  });

  it("aynı kimlik numarasıyla ikinci kayıt 409 döner", async () => {
    const { hashNationalId } = await import("@/lib/crypto");
    db.users.push({
      id: "user-existing",
      nationalIdHash: hashNationalId(SEEDED_CITIZEN.nationalId, "test-only-salt"),
    });

    const response = await callStart();

    expect(response.status).toBe(409);
    expect((await readBody(response)).error).toMatchObject({
      code: "IDENTITY_ALREADY_REGISTERED",
    });
  });

  it("yanıt önbelleklenmez", async () => {
    const response = await callStart();

    expect(response.headers.get("cache-control") ?? "").not.toBe("");
  });
});

describe("bot koruması — KPS sorgusundan ÖNCE", () => {
  beforeEach(() => {
    // Local'de anahtar yokken kapı atlanıyor; gerçek davranışı görmek için
    // preview ortamı taklit ediliyor.
    envMock.envLabel = "preview";
    envMock.serverEnv.TURNSTILE_SECRET_KEY = "test-secret";
  });

  it("jeton yoksa 403 döner ve KPS HİÇ sorgulanmaz", async () => {
    const response = await callStart({ turnstileToken: "" });

    expect(response.status).toBe(403);
    expect((await readBody(response)).error).toMatchObject({ code: "BOT_CHECK_REQUIRED" });
    expect(lookupIdentity).not.toHaveBeenCalled();
  });

  it("jeton geçersizse 403 döner ve KPS HİÇ sorgulanmaz", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: false })));

    const response = await callStart();

    expect(response.status).toBe(403);
    expect(lookupIdentity).not.toHaveBeenCalled();
  });

  it("Turnstile erişilemezse KAYIT DURUR (503), kapı atlanmaz", async () => {
    // ADR-004 bedel 2: güvenlik kapısı açık bırakılarak geçilmez.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const response = await callStart();

    expect(response.status).toBe(503);
    expect((await readBody(response)).error).toMatchObject({ code: "BOT_CHECK_UNAVAILABLE" });
    expect(lookupIdentity).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/registrations/current — iletişim adımı", () => {
  it("taslak çerezi yoksa 404 döner", async () => {
    expect((await callContact()).status).toBe(404);
  });

  it("iki kodu birden üretir ve local'de ekrana döndürür", async () => {
    await callStart();
    const body = await readBody(await callContact());

    expect(body.data).toMatchObject({
      simulationCodes: { email: expect.stringMatching(/^\d{6}$/) },
    });
    expect(db.challenges).toHaveLength(2);
  });

  it("PRODUCTION'DA kodu ekrana döndürmez", async () => {
    await callStart();
    envMock.isProductionEnv = true;

    const raw = JSON.stringify(await readBody(await callContact()));

    expect(raw).not.toMatch(/\b\d{6}\b/);
  });

  it("düz şifreyi hiçbir yere yazmaz", async () => {
    await callStart();
    await callContact();

    expect(JSON.stringify(db.drafts)).not.toContain("mavi-deniz-42");
    expect(db.drafts[0].passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("kısa şifreyi 422 ile reddeder", async () => {
    await callStart();

    expect((await callContact({ password: "kisa", passwordConfirm: "kisa" })).status).toBe(422);
  });

  it("yaygın şifreyi 422 ile reddeder", async () => {
    await callStart();
    const response = await callContact({
      password: "password123",
      passwordConfirm: "password123",
    });

    expect(response.status).toBe(422);
    expect((await readBody(response)).error).toMatchObject({ code: "LEAKED_PASSWORD" });
  });

  it("şifreler uyuşmuyorsa 422 döner", async () => {
    await callStart();

    expect((await callContact({ passwordConfirm: "baska-sifre-99" })).status).toBe(422);
  });

  it("geçersiz telefon numarasını reddeder", async () => {
    await callStart();

    expect((await callContact({ phone: "12345" })).status).toBe(422);
  });

  it("boşluklu telefon numarasını kabul eder ve normalize eder", async () => {
    await callStart();

    expect((await callContact({ phone: "0532 123 45 67" })).status).toBe(200);
  });

  it("kayıtlı e-posta için 409 döner", async () => {
    await callStart();
    db.users.push({ id: "user-existing", email: "ayse@ornek.com" });

    const response = await callContact();

    expect(response.status).toBe(409);
    expect((await readBody(response)).error).toMatchObject({ code: "EMAIL_ALREADY_REGISTERED" });
  });

  it("SÜRESİ DOLMUŞ taslakta 404 döner ve satır silinir — SÜRE DOLUMU TESTİ", async () => {
    await callStart();
    expect(db.drafts).toHaveLength(1);

    vi.setSystemTime(new Date(Date.now() + 15 * 60_000 + 1_000));

    expect((await callContact()).status).toBe(404);
    expect(db.drafts).toHaveLength(0);

    vi.useRealTimers();
  });
});

describe("POST /api/registrations/current/verifications — kod doğrulama", () => {
  async function startAndSendCodes() {
    await callStart();
    const body = await readBody(await callContact());

    return (body.data as unknown as { simulationCodes: { email: string; phone: string } })
      .simulationCodes;
  }

  it("yanlış kod 422 döner ve kalan hakkı bildirir", async () => {
    await startAndSendCodes();

    const response = await callVerify("email", "000000");
    const body = await readBody(response);

    expect(response.status).toBe(422);
    expect(body.error).toMatchObject({ code: "OTP_INVALID", details: { remainingAttempts: 2 } });
  });

  it("YALNIZCA BİR KANAL doğrulandıysa hesap AÇILMAZ", async () => {
    const codes = await startAndSendCodes();

    const response = await callVerify("email", codes.email);
    const body = await readBody(response);

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      completed: false,
      emailVerified: true,
      phoneVerified: false,
    });
    expect(db.users).toHaveLength(0);
  });

  it("iki kanal da doğrulanınca hesap oluşur ve 201 döner", async () => {
    const codes = await startAndSendCodes();

    await callVerify("email", codes.email);
    const response = await callVerify("phone", codes.phone);

    expect(response.status).toBe(201);
    expect((await readBody(response)).data).toMatchObject({ completed: true, isStaff: false });
    expect(db.users).toHaveLength(1);
  });

  it("hesap oluşunca taslak silinir ve çerez temizlenir", async () => {
    const codes = await startAndSendCodes();

    await callVerify("email", codes.email);
    await callVerify("phone", codes.phone);

    expect(db.drafts).toHaveLength(0);
    expect(db.cookieStore.has("bb_registration")).toBe(false);
  });

  it("KALICI TUTULMAYAN KPS ALANLARI users satırına YAZILMAZ", async () => {
    const codes = await startAndSendCodes();

    await callVerify("email", codes.email);
    await callVerify("phone", codes.phone);

    const raw = JSON.stringify(db.users[0]);
    for (const forbidden of [
      SEEDED_CITIZEN.fatherName,
      SEEDED_CITIZEN.motherName,
      SEEDED_CITIZEN.birthPlace,
      SEEDED_CITIZEN.registeredAddress,
      SEEDED_CITIZEN.maritalStatus,
      SEEDED_CITIZEN.nationalId,
    ]) {
      expect(raw).not.toContain(forbidden);
    }
  });

  it("izin verilen KPS alanlarını yazar", async () => {
    const codes = await startAndSendCodes();

    await callVerify("email", codes.email);
    await callVerify("phone", codes.phone);

    expect(db.users[0]).toMatchObject({
      fullName: "Ayşe Yılmaz",
      registeredProvince: "İzmir",
      registeredDistrict: "Konak",
      identityStatus: "kps_verified",
      nationalIdMasked: "100******46",
    });
  });

  it("personel rehberinde eşleşme varsa isStaff SUNUCUDA true olur", async () => {
    const { hashNationalId } = await import("@/lib/crypto");
    db.staffMembers.push({
      id: "staff-1",
      nationalIdHash: hashNationalId(SEEDED_CITIZEN.nationalId, "test-only-salt"),
      deletedAt: null,
      user: null,
    });

    const codes = await startAndSendCodes();
    await callVerify("email", codes.email);
    const response = await callVerify("phone", codes.phone);

    expect((await readBody(response)).data).toMatchObject({ isStaff: true });
    expect(db.users[0]).toMatchObject({ isStaff: true, staffMemberId: "staff-1" });
  });

  it("istemciden gelen isStaff ve role alanları YOK SAYILIR", async () => {
    const codes = await startAndSendCodes();
    await callVerify("email", codes.email);

    const { POST } = await import("@/app/api/registrations/current/verifications/route");
    await POST(jsonRequest({ channel: "phone", code: codes.phone, isStaff: true, role: "admin" }));

    expect(db.users[0].isStaff).toBe(false);
    expect(db.users[0].role).toBeUndefined();
  });

  it("kayıt işlemi denetim kaydına yazılır ve kimlik numarası içermez", async () => {
    const codes = await startAndSendCodes();
    await callVerify("email", codes.email);
    await callVerify("phone", codes.phone);

    expect(db.auditLogs).toHaveLength(1);
    expect(db.auditLogs[0]).toMatchObject({ action: "register", entityType: "user" });
    expect(JSON.stringify(db.auditLogs[0])).not.toContain(SEEDED_CITIZEN.nationalId);
  });

  it("SÜRESİ DOLMUŞ kod kabul edilmez — SÜRE DOLUMU TESTİ", async () => {
    const codes = await startAndSendCodes();

    vi.setSystemTime(new Date(Date.now() + 5 * 60_000 + 1_000));

    const response = await callVerify("email", codes.email);

    expect(response.status).toBe(422);
    expect((await readBody(response)).error).toMatchObject({ code: "OTP_EXPIRED" });

    vi.useRealTimers();
  });

  it("3 yanlış denemeden sonra 429 döner", async () => {
    await startAndSendCodes();

    await callVerify("email", "000000");
    await callVerify("email", "000001");
    const response = await callVerify("email", "000002");

    expect(response.status).toBe(429);
    expect((await readBody(response)).error).toMatchObject({ code: "OTP_TOO_MANY_ATTEMPTS" });
  });

  it("e-posta kodu telefon kanalında kabul edilmez", async () => {
    const codes = await startAndSendCodes();

    const response = await callVerify("phone", codes.email);

    expect(response.status).toBe(422);
    expect(db.users).toHaveLength(0);
  });
});

describe("DELETE /api/registrations/current — vazgeçme", () => {
  it("taslağı hemen siler ve çerezi temizler", async () => {
    await callStart();
    const { DELETE } = await import("@/app/api/registrations/current/route");

    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(db.drafts).toHaveLength(0);
    expect(db.cookieStore.has("bb_registration")).toBe(false);
  });
});
