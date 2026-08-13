/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Giriş ve çıkış uçlarının uçtan uca davranışı
 * (PRD §5.0 "Giriş akışı" · 05-auth-security.md · ADR-005).
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ DEĞİL: `users`, `sessions`,
 * `rate_limit_counters` ve `audit_logs` tablolarının davranışı bellekte
 * uygulanıyor. Gerçek Postgres'e karşı kanıtlar `tests/db/` altındadır.
 *
 * BU DOSYANIN ASIL İŞİ hesap sayımı korumasını kanıtlamak: "böyle bir hesap
 * yok" ile "şifre yanlış" AYNI durum kodunu, AYNI hata kodunu ve AYNI mesajı
 * üretmeli — ve ikisi de gerçekten bir argon2 doğrulamasından geçmeli.
 */

const NATIONAL_ID = "10000000146";
/**
 * KONTROL BASAMAĞI GEÇERLİ ama kayıtlı olmayan numara.
 *
 * Bu ayrım şart: geçersiz kontrol basamaklı bir numara şemada takılır ve
 * şifre doğrulamasına HİÇ ulaşmaz. O numarayla yazılan "hesap sayımı" testi,
 * korumayı test ettiğini SANIR ama aslında biçim kontrolünü test eder.
 */
const UNKNOWN_NATIONAL_ID = "10000002058";
const PASSWORD = "yesil-orman-88";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  users: [] as Row[],
  sessions: [] as Row[],
  auditLogs: [] as Row[],
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
    TURNSTILE_SECRET_KEY: "test-only-turnstile-secret",
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

/**
 * Bot kapısı ağa çıkmadan sınanabilsin diye Cloudflare çağrısı taklit ediliyor.
 *
 * Taklit GERÇEK DAVRANIŞI taşıyor: boş jeton `failed` döner (`turnstile.ts`
 * boş jeton için ağa hiç çıkmıyor). Her koşulda "success" dönen bir taklit,
 * "jeton göndermeden geçilemez" kuralını test ediyor GİBİ görünür ama
 * geçilebilir bir uygulamayı da yeşil gösterirdi.
 */
const defaultTurnstile = async ({ token }: { token: string }) => (token ? "success" : "failed");
const verifyTurnstileToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken }));

/** Sahte doğrulamanın gerçekten çalıştığını görebilmek için sarmalanıyor. */
const verifyPasswordSpy = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/services/password.service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/features/auth/services/password.service")>();

  return {
    ...original,
    verifyPassword: async (hash: string, password: string) => {
      verifyPasswordSpy(hash, password);

      return original.verifyPassword(hash, password);
    },
  };
});

function match(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async ({ where }: { where: Row }) => {
        return db.users.find((row) => match(row, where)) ?? null;
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
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        for (const row of db.sessions) if (match(row, where)) Object.assign(row, data);

        return { count: 0 };
      }),
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
      deleteMany: vi.fn(async ({ where }: { where: { key: string } }) => {
        for (const mapKey of [...db.counters.keys()]) {
          if (mapKey.startsWith(`${where.key}@`)) db.counters.delete(mapKey);
        }

        return { count: 0 };
      }),
    },
  },
}));

// ---------------------------------------------------------------------------

const { hashPassword } = await import("@/features/auth/services/password.service");
const { hashNationalId } = await import("@/lib/crypto");
const { SESSION_COOKIE_NAME } = await import("@/config/constants");
const { messages } = await import("@/config/messages");

async function seedUser(overrides: Row = {}): Promise<Row & { id: string }> {
  const row: Row & { id: string } = {
    id: `user-${db.nextId++}`,
    nationalIdHash: hashNationalId(NATIONAL_ID, envMock.serverEnv.NATIONAL_ID_HASH_SALT),
    fullName: "Ayşe Yılmaz",
    passwordHash: await hashPassword(PASSWORD),
    role: "user",
    isStaff: false,
    identityStatus: "kps_verified",
    deletedAt: null,
    ...overrides,
  };
  db.users.push(row);

  return row;
}

function loginRequest(body: Row, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9", ...headers },
    body: JSON.stringify(body),
  });
}

async function callLogin(body: Row = {}, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/v1/sessions/route");

  return POST(loginRequest({ nationalId: NATIONAL_ID, password: PASSWORD, ...body }, headers));
}

async function callLogout(headers: Record<string, string> = {}) {
  const { DELETE } = await import("@/app/api/v1/sessions/current/route");

  return DELETE(
    new Request("http://localhost:3000/api/v1/sessions/current", {
      method: "DELETE",
      headers: { "x-forwarded-for": "203.0.113.9", ...headers },
    }),
  );
}

async function bodyOf(response: Response) {
  return (await response.json()) as { data?: unknown; error?: { code: string; message: string } };
}

beforeEach(() => {
  db.users = [];
  db.sessions = [];
  db.auditLogs = [];
  db.counters.clear();
  db.cookieStore.clear();
  db.nextId = 1;
  verifyTurnstileToken.mockReset();
  verifyTurnstileToken.mockImplementation(defaultTurnstile);
  verifyPasswordSpy.mockClear();
});

describe("mutlu yol", () => {
  it("doğru bilgiyle giriş yapar, oturum açar ve çerezi yazar", async () => {
    const user = await seedUser();

    const response = await callLogin();

    expect(response.status).toBe(201);
    expect(db.sessions).toHaveLength(1);
    expect(db.sessions[0].userId).toBe(user.id);
    expect(db.cookieStore.get(SESSION_COOKIE_NAME)).toBeTruthy();
  });

  it("oturum jetonunu YANIT GÖVDESİNE koymaz", async () => {
    await seedUser();

    const body = await bodyOf(await callLogin());

    // Jeton yalnızca httpOnly çerezle taşınır (ADR-002); gövdeye konsaydı
    // JavaScript okuyabilir ve XSS ile çalınabilirdi.
    expect(JSON.stringify(body)).not.toContain(db.cookieStore.get(SESSION_COOKIE_NAME));
  });

  it("çerezdeki jetonun KENDİSİ veritabanında saklanmaz", async () => {
    await seedUser();
    await callLogin();

    expect(db.sessions[0].sessionToken).not.toBe(db.cookieStore.get(SESSION_COOKIE_NAME));
  });

  it("aynı tarayıcıdan tekrar giriş yapınca eski oturum kapanır", async () => {
    await seedUser();
    await callLogin();
    const firstToken = db.cookieStore.get(SESSION_COOKIE_NAME)!;

    await callLogin();

    const { readSession } = await import("@/features/auth/services/session.service");

    // Eski satır kalsaydı, kullanıcının artık ulaşamadığı ve "çıkış yap" ile
    // düşüremeyeceği bir jeton 7 gün daha geçerli kalırdı.
    expect(await readSession(firstToken)).toBeNull();
    expect(db.sessions).toHaveLength(1);
  });

  it("girişi denetim kaydına yazar — kimlik numarası YAZMADAN", async () => {
    const user = await seedUser();

    await callLogin();

    expect(db.auditLogs).toHaveLength(1);
    expect(db.auditLogs[0]).toMatchObject({
      userId: user.id,
      action: "login",
      entityType: "session",
    });
    // Kimlik numarası ve IP hiçbir alanda DÜZ hâliyle bulunmamalı.
    const serialized = JSON.stringify(db.auditLogs[0]);
    expect(serialized).not.toContain(NATIONAL_ID);
    expect(serialized).not.toContain("203.0.113.9");
  });
});

describe("hesap sayımı koruması", () => {
  it("olmayan hesap ile yanlış şifre AYNI yanıtı verir", async () => {
    await seedUser();

    /**
     * İki istek FARKLI IP'den ve FARKLI ziyaretçi çerezinden geliyor.
     *
     * Aksi hâlde ikincisi "ikinci başarısız deneme" sayılır ve yanıtına bot
     * kutusu bayrağı eklenirdi. O fark hesaptan değil denemenin SIRASINDAN
     * gelir; buradaki soru ise "hesabın var olup olmadığı sızıyor mu".
     * İki isteği aynı başlangıç durumuna getirmek, kıyasın tek değişkenli
     * kalmasını sağlıyor.
     */
    const wrongPasswordResponse = await callLogin(
      { password: "yanlis-sifre-123" },
      { "x-forwarded-for": "203.0.113.10" },
    );
    db.cookieStore.clear();
    const unknownUserResponse = await callLogin(
      { nationalId: UNKNOWN_NATIONAL_ID, password: PASSWORD },
      { "x-forwarded-for": "203.0.113.11" },
    );

    const wrongPassword = await bodyOf(wrongPasswordResponse);
    const unknownUser = await bodyOf(unknownUserResponse);

    expect(wrongPasswordResponse.status).toBe(unknownUserResponse.status);
    expect(wrongPassword.error).toEqual(unknownUser.error);
    expect(wrongPassword.error?.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.error?.message).toBe(messages.auth.login.errors.invalidCredentials);
  });

  it("olmayan hesapta da bir argon2 doğrulaması ÇALIŞTIRIR", async () => {
    const { DUMMY_PASSWORD_HASH } = await import("@/features/auth/services/login.service");

    await callLogin({ nationalId: UNKNOWN_NATIONAL_ID });

    // Erken dönülseydi yanıt belirgin biçimde hızlanır ve süre farkı
    // "bu numara kayıtlı" bilgisini ele verirdi.
    expect(verifyPasswordSpy).toHaveBeenCalledWith(DUMMY_PASSWORD_HASH, PASSWORD);
  });

  it("şifresi olmayan hesapta (yalnızca Google ile açılmış) da aynı yanıtı verir", async () => {
    await seedUser({ passwordHash: null });

    const response = await callLogin();
    const body = await bodyOf(response);

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("silinmiş hesap giriş yapamaz ve varlığını ele vermez", async () => {
    await seedUser({ deletedAt: new Date("2026-07-30T00:00:00.000Z") });

    const response = await callLogin();

    expect(response.status).toBe(401);
    expect(db.sessions).toHaveLength(0);
  });

  it("bozuk kimlik numarası 422 değil 401 döner", async () => {
    await seedUser();

    const response = await callLogin({ nationalId: "12345678901" });

    // 422 dönseydi durum kodunun KENDİSİ "numaran bozuk" ile "şifren yanlış"
    // arasındaki farkı sızdırırdı.
    expect(response.status).toBe(401);
    expect((await bodyOf(response)).error?.code).toBe("INVALID_CREDENTIALS");
  });

  it("boş gövdede de aynı yanıtı verir", async () => {
    const { POST } = await import("@/app/api/v1/sessions/route");

    const response = await POST(
      new Request("http://localhost:3000/api/v1/sessions", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
        body: "bozuk-json",
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe("hız sınırı ve bot kapısı", () => {
  it("6. denemede 429 döner", async () => {
    await seedUser();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await callLogin({ password: "yanlis-sifre-123" }, { "x-forwarded-for": "203.0.113.50" });
    }

    const response = await callLogin(
      { password: "yanlis-sifre-123" },
      { "x-forwarded-for": "203.0.113.50" },
    );

    expect(response.status).toBe(429);
    expect((await bodyOf(response)).error?.code).toBe("RATE_LIMITED");
  });

  it("ilk iki denemede bot doğrulaması İSTEMEZ", async () => {
    await seedUser();

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.51" });
    await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.51" });

    // Şifresini doğru bilen kullanıcı bulmacayla hiç karşılaşmamalı.
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("2 başarısız denemeden sonra jetonsuz istek 403 BOT_CHECK_REQUIRED döner", async () => {
    await seedUser();

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.52" });
    await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.52" });

    const response = await callLogin({}, { "x-forwarded-for": "203.0.113.52" });

    expect(response.status).toBe(403);
    expect((await bodyOf(response)).error?.code).toBe("BOT_CHECK_REQUIRED");
    // Doğru şifre olsa bile kapı önce iner: oturum açılmamalı.
    expect(db.sessions).toHaveLength(0);
  });

  it("başarısız yanıt, ekranın kutuyu açması için bayrak taşır", async () => {
    await seedUser();

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.53" });
    const second = await bodyOf(
      await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.53" }),
    );

    expect(second.error).toMatchObject({ details: { botCheckRequired: true } });
  });

  it("geçerli bot jetonuyla akış devam eder", async () => {
    await seedUser();

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.54" });
    await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.54" });

    const response = await callLogin(
      { turnstileToken: "gecerli-jeton" },
      { "x-forwarded-for": "203.0.113.54" },
    );

    expect(response.status).toBe(201);
    expect(verifyTurnstileToken).toHaveBeenCalled();
  });

  it("Cloudflare erişilemezse giriş DURUR, kapı atlanmaz", async () => {
    await seedUser();
    verifyTurnstileToken.mockResolvedValue("unavailable");

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.55" });
    await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.55" });

    const response = await callLogin(
      { turnstileToken: "gecerli-jeton" },
      { "x-forwarded-for": "203.0.113.55" },
    );

    // ADR-004 bedel 2: güvenlik kapısı açık bırakılarak atlanmaz.
    expect(response.status).toBe(503);
    expect(db.sessions).toHaveLength(0);
  });

  it("başarılı giriş bot sayacını sıfırlar ama deneme sayacını sıfırlamaz", async () => {
    await seedUser();

    await callLogin({ password: "yanlis-1" }, { "x-forwarded-for": "203.0.113.56" });
    await callLogin({ password: "yanlis-2" }, { "x-forwarded-for": "203.0.113.56" });
    await callLogin({ turnstileToken: "gecerli-jeton" }, { "x-forwarded-for": "203.0.113.56" });

    verifyTurnstileToken.mockClear();
    const response = await callLogin({}, { "x-forwarded-for": "203.0.113.56" });

    // Bot kapısı indi: kullanıcı kendini kanıtladı.
    expect(response.status).toBe(201);
    expect(verifyTurnstileToken).not.toHaveBeenCalled();

    // Deneme sayacı DURUYOR: 5 denemenin 4'ü harcandı, 2 tane daha yapınca
    // sınır tetiklenmeli. Sıfırlansaydı, elinde tek geçerli hesap olan bir
    // saldırgan her başarılı girişten sonra 5 tahmin daha kazanırdı.
    await callLogin({ password: "yanlis-3" }, { "x-forwarded-for": "203.0.113.56" });
    const limited = await callLogin(
      { password: "yanlis-4" },
      { "x-forwarded-for": "203.0.113.56" },
    );

    expect(limited.status).toBe(429);
  });
});

describe("çıkış", () => {
  it("oturum satırını siler ve çerezi düşürür", async () => {
    await seedUser();
    await callLogin();

    const response = await callLogout();

    expect(response.status).toBe(204);
    expect(db.sessions).toHaveLength(0);
    expect(db.cookieStore.has(SESSION_COOKIE_NAME)).toBe(false);
  });

  it("çıkışı denetim kaydına yazar", async () => {
    const user = await seedUser();
    await callLogin();

    await callLogout();

    expect(db.auditLogs.at(-1)).toMatchObject({
      userId: user.id,
      action: "logout",
      entityType: "session",
    });
  });

  it("çıkıştan sonra aynı jeton artık geçerli değildir", async () => {
    await seedUser();
    await callLogin();
    const token = db.cookieStore.get(SESSION_COOKIE_NAME)!;

    await callLogout();

    const { readSession } = await import("@/features/auth/services/session.service");
    expect(await readSession(token)).toBeNull();
  });

  it("oturum yokken de 204 döner", async () => {
    const response = await callLogout();

    expect(response.status).toBe(204);
    // "Zaten çıkmışsınız" hatası, geçerli jetonu geçersizden ayırt eden bir
    // yanıt üretirdi.
    expect(db.auditLogs).toHaveLength(0);
  });

  it("başkasının oturumunu düşürmeye yarayacak bir parametre YOKTUR", async () => {
    const victim = await seedUser({ id: "user-victim" });
    const { issueSession } = await import("@/features/auth/services/session.service");
    await issueSession(victim.id);

    // Saldırgan hiç giriş yapmadan çıkış ucunu çağırıyor.
    await callLogout();

    // Kurbanın oturumu ayakta: uç yalnızca çağıranın kendi çerezine bakar.
    expect(db.sessions).toHaveLength(1);
  });
});

describe("şifre değişimi tüm oturumları düşürür (ADR-005)", () => {
  it("iki cihazda açık oturum, tek çağrıyla kapanır", async () => {
    const user = await seedUser();
    await callLogin();
    const firstDevice = db.cookieStore.get(SESSION_COOKIE_NAME)!;
    db.cookieStore.clear();
    await callLogin();
    const secondDevice = db.cookieStore.get(SESSION_COOKIE_NAME)!;

    const { readSession, revokeAllSessionsForUser } =
      await import("@/features/auth/services/session.service");

    // 4b-3'ün şifre sıfırlama akışı bu fonksiyonu çağıracak; mekanizma hazır.
    expect(await revokeAllSessionsForUser(user.id)).toBe(2);
    expect(await readSession(firstDevice)).toBeNull();
    expect(await readSession(secondDevice)).toBeNull();
  });
});
