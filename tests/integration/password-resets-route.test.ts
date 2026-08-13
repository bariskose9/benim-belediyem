/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Şifre sıfırlama uçlarının uçtan uca davranışı
 * (PRD §5.0 "Şifre sıfırlama" · 05-auth-security.md · ADR-005).
 *
 * BU DOSYANIN ASIL İŞİ HESAP SAYIMI KORUMASINI KANITLAMAK. PRD "kayıtlı olsun
 * olmasın aynı mesaj ve aynı yanıt süresi" diyor; testler bunu üç ayrı yerde
 * ölçüyor: birinci ekranın yanıtı, ikinci ekranın davranışı ve yanıt süresi.
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ DEĞİL: `users`, `otp_challenges`,
 * `sessions`, `rate_limit_counters` ve `audit_logs` tablolarının davranışı
 * bellekte uygulanıyor — Prisma operatörleri (`not`, `gte`, `increment`) dahil.
 * TANINMAYAN OPERATÖR HATA FIRLATIYOR: 4b-2'de bir taklit bilmediği filtreyi
 * sessizce yok saymış ve testi yanlış yeşil göstermişti.
 */

/** Tohumlanmış hesabın numarası (kontrol basamağı geçerli). */
const NATIONAL_ID = "10000000146";

/**
 * KONTROL BASAMAĞI GEÇERLİ ama kayıtlı OLMAYAN numara. Hesap sayımı
 * karşılaştırmalarının tek değişkenli kalması için şart: geçersiz basamaklı bir
 * numara şemada takılır ve korumayı hiç sınamaz.
 */
const UNKNOWN_NATIONAL_ID = "10000002058";

const EMAIL = "ayse.yilmaz@ornek.test";
const OLD_PASSWORD = "eski-sifre-2020";
const NEW_PASSWORD = "yesil-orman-88";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  users: [] as Row[],
  challenges: [] as Row[],
  sessions: [] as Row[],
  auditLogs: [] as Row[],
  counters: new Map<string, number>(),
  cookieStore: new Map<string, string>(),
  nextId: 1,
  clock: 0,
}));

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  envLabel: "local" as string,
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
  serverEnv: {
    NATIONAL_ID_HASH_SALT: "test-only-salt",
    NATIONAL_ID_ENCRYPTION_KEY: "bG9jYWwtZGV2LW9ubHkta2V5LTMyLWJ5dGVzLXh4eHg=",
    TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
    OTP_EMAIL_CHANNEL: "mock",
    OTP_PHONE_CHANNEL: "mock",
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

const defaultTurnstile = async ({ token }: { token: string }) => (token ? "success" : "failed");
const verifyTurnstileToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken }));

/**
 * `sleep` TAKLİT EDİLİYOR ama ölçüm bozulmuyor.
 *
 * Sabit yanıt süresi 2 saniye; gerçekten beklenseydi bu dosya dakikalarca
 * sürerdi (06-testing.md). Taklit, İSTENEN bekleme süresini kaydediyor —
 * testler "gerçekte geçen süre + istenen bekleme" toplamını karşılaştırarak
 * doldurmanın işini yaptığını kanıtlıyor. Beklemeyi tamamen yok saymak,
 * korumanın kaldırıldığı bir sürümü de yeşil gösterirdi.
 */
const sleepCalls = vi.hoisted(() => [] as number[]);
vi.mock("@/lib/utils", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/utils")>();

  return {
    ...original,
    sleep: async (ms: number) => {
      sleepCalls.push(ms);
    },
  };
});

function matchValue(actual: unknown, expected: unknown): boolean {
  if (expected instanceof Date) {
    return actual instanceof Date && actual.getTime() === expected.getTime();
  }

  if (expected !== null && typeof expected === "object") {
    return Object.entries(expected as Row).every(([operator, value]) => {
      if (operator === "not") return actual !== value;
      if (operator === "gte") return (actual as Date).getTime() >= (value as Date).getTime();
      if (operator === "in") return (value as unknown[]).includes(actual);

      // Bilinmeyen operatörü sessizce geçmek, taklidin gerçek davranıştan
      // ayrıldığını gizler ve testi yanlış yeşil gösterir.
      throw new Error(`Taklit Prisma bu operatörü bilmiyor: ${operator}`);
    });
  }

  return actual === expected;
}

function match(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => matchValue(row[key], value));
}

function applyData(row: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === "object" && "increment" in (value as Row)) {
      row[key] = (row[key] as number) + ((value as Row).increment as number);

      continue;
    }

    row[key] = value;
  }
}

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async ({ where }: { where: Row }) => {
        return db.users.find((row) => match(row, where)) ?? null;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const rows = db.users.filter((row) => match(row, where));
        for (const row of rows) applyData(row, data);

        return { count: rows.length };
      }),
    },
    otpChallenge: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row: Row = {
          id: `challenge-${db.nextId++}`,
          userId: null,
          attemptCount: 0,
          consumedAt: null,
          /**
           * ŞU ANA yakın ve artan bir zaman damgası.
           *
           * Sabit bir tarih yazmak testi sessizce bozardı: "yeni kod gönder"
           * akışı 15 dakikadan eski kayıtları elemek için `createdAt >= X`
           * filtresi kullanıyor. Artan sayaç ise aynı milisaniyede açılan iki
           * kaydın sırasını korumak için gerekli.
           */
          createdAt: new Date(Date.now() + db.clock++),
          ...data,
        };
        db.challenges.push(row);

        return { id: row.id };
      }),
      findFirst: vi.fn(async ({ where }: { where: Row }) => {
        return [...db.challenges].reverse().find((row) => match(row, where)) ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const row = db.challenges.find((item) => match(item, where))!;
        applyData(row, data);

        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const rows = db.challenges.filter((row) => match(row, where));
        for (const row of rows) applyData(row, data);

        return { count: rows.length };
      }),
    },
    session: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { ...data, id: `session-${db.nextId++}` };
        db.sessions.push(row);

        return { id: row.id };
      }),
      findUnique: vi.fn(async ({ where }: { where: Row }) => {
        const row = db.sessions.find((item) => match(item, where));

        if (!row) return null;

        const user = db.users.find((item) => item.id === row.userId)!;

        return {
          id: row.id,
          expires: row.expires,
          userId: row.userId,
          user: {
            fullName: user.fullName,
            role: user.role,
            isStaff: user.isStaff,
            identityStatus: user.identityStatus,
            deletedAt: user.deletedAt,
          },
        };
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
      deleteMany: vi.fn(async ({ where }: { where: Row }) => {
        const before = db.sessions.length;
        db.sessions = db.sessions.filter((row) => !match(row, where));

        return { count: before - db.sessions.length };
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        db.auditLogs.push(data);

        return data;
      }),
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
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { key_windowStartedAt: { key: string; windowStartedAt: Date } };
        }) => {
          const { key, windowStartedAt } = where.key_windowStartedAt;
          const count = db.counters.get(`${key}@${windowStartedAt.getTime()}`);

          return count === undefined ? null : { count };
        },
      ),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  },
}));

// ---------------------------------------------------------------------------

const { hashPassword, verifyPassword } = await import("@/features/auth/services/password.service");
const { hashNationalId, encryptNationalId } = await import("@/lib/crypto");
const { PASSWORD_RESET_COOKIE_NAME, PASSWORD_RESET_CONSTANT_RESPONSE_MS, SESSION_COOKIE_NAME } =
  await import("@/config/constants");
const { messages } = await import("@/config/messages");
const { issueSession } = await import("@/features/auth/services/session.service");

async function seedUser(overrides: Row = {}): Promise<Row & { id: string }> {
  const row: Row & { id: string } = {
    id: `user-${db.nextId++}`,
    nationalIdHash: hashNationalId(NATIONAL_ID, envMock.serverEnv.NATIONAL_ID_HASH_SALT),
    nationalIdEncrypted: encryptNationalId(
      NATIONAL_ID,
      envMock.serverEnv.NATIONAL_ID_ENCRYPTION_KEY,
    ),
    fullName: "Ayşe Yılmaz",
    email: EMAIL,
    passwordHash: await hashPassword(OLD_PASSWORD),
    role: "user",
    isStaff: false,
    identityStatus: "kps_verified",
    deletedAt: null,
    ...overrides,
  };
  db.users.push(row);

  return row;
}

function jsonRequest(url: string, method: string, body: Row, ip: string) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function callRequestReset(body: Row = {}, ip = "203.0.113.9") {
  const { POST } = await import("@/app/api/v1/password-resets/route");

  return POST(
    jsonRequest(
      "http://localhost:3000/api/v1/password-resets",
      "POST",
      { nationalId: NATIONAL_ID, turnstileToken: "gecerli-jeton", ...body },
      ip,
    ),
  );
}

async function callResend(body: Row = {}, ip = "203.0.113.9") {
  const { POST } = await import("@/app/api/v1/password-resets/current/otp-challenges/route");

  return POST(
    jsonRequest(
      "http://localhost:3000/api/v1/password-resets/current/otp-challenges",
      "POST",
      { turnstileToken: "gecerli-jeton", ...body },
      ip,
    ),
  );
}

async function callComplete(body: Row = {}, ip = "203.0.113.9") {
  const { PUT } = await import("@/app/api/v1/password-resets/current/password/route");

  return PUT(
    jsonRequest(
      "http://localhost:3000/api/v1/password-resets/current/password",
      "PUT",
      { password: NEW_PASSWORD, passwordConfirm: NEW_PASSWORD, ...body },
      ip,
    ),
  );
}

async function bodyOf(response: Response) {
  return (await response.json()) as {
    data?: { simulationCode?: string; expiresAt?: string; completed?: boolean };
    error?: { code: string; message: string; details?: unknown };
  };
}

/** Ekranın yaptığını yapar: yeni kod isteyip simülasyon kodunu okur. */
async function readSimulationCode(ip = "203.0.113.9"): Promise<string | undefined> {
  return (await bodyOf(await callResend({}, ip))).data?.simulationCode;
}

beforeEach(() => {
  db.users = [];
  db.challenges = [];
  db.sessions = [];
  db.auditLogs = [];
  db.counters.clear();
  db.cookieStore.clear();
  db.nextId = 1;
  db.clock = 0;
  sleepCalls.length = 0;
  verifyTurnstileToken.mockReset();
  verifyTurnstileToken.mockImplementation(defaultTurnstile);
});

describe("mutlu yol", () => {
  it("kod isteyip yeni şifreyle akışı tamamlar", async () => {
    const user = await seedUser();
    // Satır nesnesi yerinde güncelleniyor; eski özet şimdi kopyalanmalı.
    const oldHash = user.passwordHash as string;

    const requested = await callRequestReset();
    expect(requested.status).toBe(201);
    expect(db.cookieStore.get(PASSWORD_RESET_COOKIE_NAME)).toBeTruthy();

    const code = await readSimulationCode();
    expect(code).toMatch(/^\d{6}$/);

    const completed = await callComplete({ code });

    expect(completed.status).toBe(200);

    const stored = db.users[0].passwordHash as string;
    expect(stored).not.toBe(oldHash);
    expect(await verifyPassword(stored, NEW_PASSWORD)).toBe(true);
    expect(await verifyPassword(stored, OLD_PASSWORD)).toBe(false);
    // Eski özet gerçekten eski şifreye aitti: kıyas anlamlı.
    expect(await verifyPassword(oldHash, OLD_PASSWORD)).toBe(true);
  });

  it("akış bitince sıfırlama çerezi düşer", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    await callComplete({ code });

    expect(db.cookieStore.has(PASSWORD_RESET_COOKIE_NAME)).toBe(false);
  });

  it("şifre sıfırlamayı denetim kaydına yazar — kimlik numarası YAZMADAN", async () => {
    const user = await seedUser();
    await callRequestReset();

    await callComplete({ code: await readSimulationCode() });

    expect(db.auditLogs).toHaveLength(1);
    expect(db.auditLogs[0]).toMatchObject({
      userId: user.id,
      action: "password_reset",
      entityType: "user",
    });

    const serialized = JSON.stringify(db.auditLogs[0]);
    expect(serialized).not.toContain(NATIONAL_ID);
    expect(serialized).not.toContain("203.0.113.9");
    expect(serialized).not.toContain(EMAIL);
  });

  it("kullanılan kod ikinci kez geçmez", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();
    await callComplete({ code });

    // Çerez düştüğü için ikinci istek zaten akışsız kalır.
    const second = await callComplete({ code });

    expect(second.status).toBe(404);
    expect((await bodyOf(second)).error?.code).toBe("PASSWORD_RESET_EXPIRED");
  });
});

describe("şifre değişince TÜM oturumlar düşer (ADR-005)", () => {
  it("iki cihazdaki oturum da geçersizleşir", async () => {
    const user = await seedUser();
    const firstDevice = await issueSession(user.id);
    const secondDevice = await issueSession(user.id);

    await callRequestReset();
    await callComplete({ code: await readSimulationCode() });

    const { readSession } = await import("@/features/auth/services/session.service");

    expect(await readSession(firstDevice.token)).toBeNull();
    expect(await readSession(secondDevice.token)).toBeNull();
    expect(db.sessions).toHaveLength(0);
  });

  it("başka kullanıcının oturumuna DOKUNMAZ", async () => {
    const user = await seedUser();
    const other = await seedUser({
      id: "user-other",
      nationalIdHash: hashNationalId(UNKNOWN_NATIONAL_ID, envMock.serverEnv.NATIONAL_ID_HASH_SALT),
      email: "baska@ornek.test",
    });
    await issueSession(user.id);
    const otherSession = await issueSession(other.id);

    await callRequestReset();
    await callComplete({ code: await readSimulationCode() });

    const { readSession } = await import("@/features/auth/services/session.service");

    // Hedeflenen hesap sıfırlandı; diğerinin oturumu ayakta kalmalı.
    expect(await readSession(otherSession.token)).not.toBeNull();
  });
});

describe("hesap sayımı koruması", () => {
  it("kayıtlı ve kayıtsız numara AYNI yanıtı verir", async () => {
    await seedUser();

    const registered = await callRequestReset({}, "203.0.113.20");
    db.cookieStore.clear();
    const unregistered = await callRequestReset(
      { nationalId: UNKNOWN_NATIONAL_ID },
      "203.0.113.21",
    );

    expect(registered.status).toBe(unregistered.status);
    expect(registered.status).toBe(201);

    // Gövde `expiresAt` dışında boş; o da iki yolda aynı kuralla hesaplanıyor.
    const registeredBody = await bodyOf(registered);
    const unregisteredBody = await bodyOf(unregistered);
    expect(Object.keys(registeredBody.data ?? {})).toEqual(
      Object.keys(unregisteredBody.data ?? {}),
    );

    // İki yolda da çerez yazılıyor: yazılmasaydı çerezin YOKLUĞU "hesap yok"
    // demeye gelirdi.
    expect(db.cookieStore.has(PASSWORD_RESET_COOKIE_NAME)).toBe(true);
  });

  it("kayıtsız numarada da bir kod kaydı açılır", async () => {
    await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID });

    // Kayıt açılmasaydı ikinci ekran "süresi doldu" derdi; kayıtlı numarada ise
    // "kod hatalı". Fark, hesabın varlığını ele verirdi.
    expect(db.challenges).toHaveLength(1);
    expect(db.challenges[0].userId ?? null).toBeNull();
  });

  it("yanlış kod, kayıtlı ve kayıtsız numarada AYNI hatayı verir", async () => {
    await seedUser();

    await callRequestReset({}, "203.0.113.22");
    const registered = await bodyOf(await callComplete({ code: "000000" }, "203.0.113.22"));

    db.cookieStore.clear();
    await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID }, "203.0.113.23");
    const unregistered = await bodyOf(await callComplete({ code: "000000" }, "203.0.113.23"));

    expect(registered.error?.code).toBe("OTP_INVALID");
    expect(registered.error).toEqual(unregistered.error);
  });

  it("kayıtsız numarada da deneme hakkı 3'te kilitlenir", async () => {
    await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID });

    await callComplete({ code: "000000" });
    await callComplete({ code: "000001" });
    const third = await callComplete({ code: "000002" });

    expect((await bodyOf(third)).error?.code).toBe("OTP_TOO_MANY_ATTEMPTS");
  });

  it("kayıtsız numarada gösterilecek simülasyon kodu YOKTUR", async () => {
    await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID });

    // Kod dönseydi, alanın varlığı test ortamında hesabın varlığını ele verirdi.
    expect(await readSimulationCode()).toBeUndefined();
  });

  it("silinmiş hesap, hiç olmayan hesapla aynı davranır", async () => {
    await seedUser({ deletedAt: new Date("2026-07-30T00:00:00.000Z") });

    const response = await callRequestReset();

    expect(response.status).toBe(201);
    expect(db.challenges[0].userId ?? null).toBeNull();
  });

  it("e-postası olmayan hesap da aynı davranır", async () => {
    await seedUser({ email: null });

    const response = await callRequestReset();

    expect(response.status).toBe(201);
    expect(db.challenges[0].userId ?? null).toBeNull();
  });

  it("ilk adımın yanıtında simülasyon kodu HİÇ dönmez", async () => {
    await seedUser();

    const body = await bodyOf(await callRequestReset());

    expect(body.data).toEqual({ expiresAt: expect.any(String) });
  });

  it("iki yolda da yanıt süresi aynı tabana doldurulur", async () => {
    await seedUser();

    const registeredStart = Date.now();
    await callRequestReset({}, "203.0.113.24");
    const registeredTotal = Date.now() - registeredStart + sleepCalls.at(-1)!;

    db.cookieStore.clear();
    sleepCalls.length = 0;

    const unregisteredStart = Date.now();
    await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID }, "203.0.113.25");
    const unregisteredTotal = Date.now() - unregisteredStart + sleepCalls.at(-1)!;

    // İki yol da SABİT tabana kadar dolduruluyor: hesabın varlığı yanıt
    // süresinden okunamaz (PRD §5.0 "aynı yanıt süresi").
    for (const total of [registeredTotal, unregisteredTotal]) {
      expect(Math.abs(total - PASSWORD_RESET_CONSTANT_RESPONSE_MS)).toBeLessThan(150);
    }
  });
});

describe("kod kuralları", () => {
  it("süresi dolan kod kabul edilmez", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    // Kodun ömrü 5 dakika (OTP_TTL_MS); satırı geçmişe çekmek süre dolumunu
    // okuma anında tetikler (ADR-007).
    for (const row of db.challenges) row.expiresAt = new Date(Date.now() - 1_000);

    const response = await callComplete({ code });

    expect(response.status).toBe(422);
    expect((await bodyOf(response)).error?.code).toBe("OTP_EXPIRED");
  });

  it("3 hatalı denemeden sonra kod kilitlenir", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    await callComplete({ code: "000000" });
    await callComplete({ code: "000001" });
    const third = await callComplete({ code: "000002" });

    expect(third.status).toBe(429);
    expect((await bodyOf(third)).error?.code).toBe("OTP_TOO_MANY_ATTEMPTS");

    // Kilitlenen kod DOĞRU olsa bile artık geçmez.
    expect((await bodyOf(await callComplete({ code }))).error?.code).toBe("PASSWORD_RESET_EXPIRED");
  });

  it("yeni kod istenince eskisi geçersizleşir", async () => {
    await seedUser();
    await callRequestReset();
    const firstCode = await readSimulationCode();
    const secondCode = await readSimulationCode();

    expect(secondCode).not.toBe(firstCode);

    const response = await callComplete({ code: firstCode });

    // Eski kod geçerli kalsaydı 3 deneme sınırı kodlar arasında paylaşılır ve
    // fiilen katlanırdı.
    expect(response.status).toBe(422);
    expect((await bodyOf(response)).error?.code).toBe("OTP_INVALID");
  });

  it("kilitlenen koddan sonra YENİ kod istenebilir ve akış tamamlanır", async () => {
    await seedUser();
    await callRequestReset();
    await readSimulationCode();

    await callComplete({ code: "000000" });
    await callComplete({ code: "000001" });
    await callComplete({ code: "000002" });

    // Ekranda "yeni bir kod isteyin" yazıyor; akış gerçekten devam edebilmeli.
    const freshCode = await readSimulationCode();
    const response = await callComplete({ code: freshCode });

    expect(response.status).toBe(200);
  });

  it("şifre kuralı deneme hakkını YAKMAZ", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    const weak = await callComplete({ code, password: "kisa", passwordConfirm: "kisa" });
    expect(weak.status).toBe(422);

    // Sıra ters olsaydı doğru kod tüketilir ve kullanıcı 3 hakkından birini
    // zayıf şifre yüzünden kaybederdi.
    const response = await callComplete({ code });
    expect(response.status).toBe(200);
  });
});

describe("şifre kuralları", () => {
  it("kısa şifre reddedilir", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    const response = await callComplete({ code, password: "kisa", passwordConfirm: "kisa" });

    expect(response.status).toBe(422);
  });

  it("şifreler uyuşmazsa reddedilir", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    const response = await callComplete({ code, passwordConfirm: "baska-bir-sifre" });

    expect(response.status).toBe(422);
    expect((await bodyOf(response)).error?.message).toBe(
      messages.auth.register.errors.passwordMismatch,
    );
  });

  it("yaygın (sızmış) şifre reddedilir", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    const response = await callComplete({
      code,
      password: "sifre123",
      passwordConfirm: "sifre123",
    });

    expect((await bodyOf(response)).error?.code).toBe("LEAKED_PASSWORD");
  });

  it("KODU BİLMEYEN, şifre politikası yanıtını hiç göremez", async () => {
    await seedUser();
    await callRequestReset();
    await readSimulationCode();

    // Şifre hesabın ADINI içeriyor: politika önce çalışsaydı yanıt "şifreniz
    // adınızı içeremez" olurdu ve kodu bilmeyen biri hesap sahibinin adını
    // doğrulamış olurdu. Kod önce doğrulandığı için tek tip hata dönüyor.
    const response = await callComplete({
      code: "000000",
      password: "ayse-yilmaz-2026",
      passwordConfirm: "ayse-yilmaz-2026",
    });

    expect((await bodyOf(response)).error?.code).toBe("OTP_INVALID");
  });

  it("kendi kimlik numarasını içeren şifre reddedilir", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    const response = await callComplete({
      code,
      password: `deneme-${NATIONAL_ID}`,
      passwordConfirm: `deneme-${NATIONAL_ID}`,
    });

    expect((await bodyOf(response)).error?.code).toBe("WEAK_PASSWORD");
  });
});

describe("hız sınırı ve bot kapısı", () => {
  it("bot doğrulaması İLK denemeden itibaren zorunludur", async () => {
    await seedUser();

    const response = await callRequestReset({ turnstileToken: "" });

    // Giriş ekranındaki "2 başarısız denemeden sonra" kuralı buraya GEÇMEZ.
    expect(response.status).toBe(403);
    expect((await bodyOf(response)).error?.code).toBe("BOT_CHECK_REQUIRED");
    expect(db.challenges).toHaveLength(0);
  });

  it("Cloudflare erişilemezse akış DURUR, kapı atlanmaz", async () => {
    await seedUser();
    verifyTurnstileToken.mockResolvedValue("unavailable");

    const response = await callRequestReset();

    // ADR-004 bedel 2: güvenlik kapısı açık bırakılarak atlanmaz.
    expect(response.status).toBe(503);
    expect(db.challenges).toHaveLength(0);
  });

  it("yeni kod isteme de bot doğrulaması ister", async () => {
    await seedUser();
    await callRequestReset();

    const response = await callResend({ turnstileToken: "" });

    expect(response.status).toBe(403);
  });

  it("6. denemede 429 döner", async () => {
    await seedUser();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID }, "203.0.113.30");
    }

    const response = await callRequestReset({ nationalId: UNKNOWN_NATIONAL_ID }, "203.0.113.30");

    expect(response.status).toBe(429);
    expect((await bodyOf(response)).error?.code).toBe("RATE_LIMITED");
  });

  it("aynı numaraya 4. kod isteği reddedilir — kayıtlı ve kayıtsızda AYNI yerde", async () => {
    await seedUser();

    async function fourthAttemptStatus(nationalId: string, ipSuffix: number): Promise<number> {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        db.cookieStore.clear();
        await callRequestReset({ nationalId }, `203.0.113.${ipSuffix}`);
      }

      db.cookieStore.clear();

      return (await callRequestReset({ nationalId }, `203.0.113.${ipSuffix}`)).status;
    }

    // Gönderim bütçesi HEDEFE değil kimlik numarasının özetine bağlı; kayıtsız
    // numarada hedef olmadığı için hedefe bağlı bir sayaç yalnızca gerçek
    // hesapta tetiklenir ve hesabın varlığını ele verirdi.
    expect(await fourthAttemptStatus(NATIONAL_ID, 40)).toBe(429);
    expect(await fourthAttemptStatus(UNKNOWN_NATIONAL_ID, 41)).toBe(429);
  });
});

describe("girdi doğrulama ve akış bütünlüğü", () => {
  it("11 haneli olmayan numara reddedilir", async () => {
    const response = await callRequestReset({ nationalId: "123" });

    expect(response.status).toBe(422);
    expect(db.challenges).toHaveLength(0);
  });

  it("kontrol basamağı geçersiz numara da normal akışa girer", async () => {
    // Reddedilseydi, "biçimi bozuk" ile "kayıtlı değil" farklı yanıt alır ve
    // saldırgan geçerli numara üretmek için bu farkı kullanırdı.
    const response = await callRequestReset({ nationalId: "12345678901" });

    expect(response.status).toBe(201);
    expect(db.challenges).toHaveLength(1);
  });

  it("çerezsiz istek 404 döner", async () => {
    const response = await callComplete({ code: "000000" });

    expect(response.status).toBe(404);
    expect((await bodyOf(response)).error?.code).toBe("PASSWORD_RESET_EXPIRED");
  });

  it("başka bir akışın jetonu kabul edilmez", async () => {
    await seedUser();
    await callRequestReset();
    const code = await readSimulationCode();

    // Saldırgan kendi akışını başlatıp kurbanın kodunu deniyor.
    db.cookieStore.set(PASSWORD_RESET_COOKIE_NAME, "baska-bir-jeton");

    const response = await callComplete({ code });

    expect(response.status).toBe(404);
    expect(db.users[0].passwordHash).not.toBe(NEW_PASSWORD);
  });

  it("bozuk JSON gövdesi 422 döner ve hiçbir kayıt açılmaz", async () => {
    const { POST } = await import("@/app/api/v1/password-resets/route");

    const response = await POST(
      new Request("http://localhost:3000/api/v1/password-resets", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: "bozuk-json",
      }),
    );

    expect(response.status).toBe(422);
    expect(db.challenges).toHaveLength(0);
  });

  it("yanıtta oturum jetonu veya kullanıcı kimliği geçmez", async () => {
    const user = await seedUser();
    await issueSession(user.id);
    await callRequestReset();

    const completed = await callComplete({ code: await readSimulationCode() });
    const raw = JSON.stringify(await bodyOf(completed));

    expect(raw).not.toContain(user.id);
    expect(raw).not.toContain(EMAIL);
    expect(db.cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
  });
});
