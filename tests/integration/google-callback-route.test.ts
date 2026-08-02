/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Google dönüş ucunun uçtan uca davranışı (PRD §5.0 · adım 4c).
 *
 * BU DOSYANIN ASIL İŞİ üç kuralı kanıtlamak:
 *   1. İşlem çerezi yoksa akış ölür — CSRF korumasının fiilen çalıştığı yer
 *   2. Çerez TEK KULLANIMLIK: hata yolunda bile silinir
 *   3. Birleştirme engellendiğinde OTURUM AÇILMAZ ve hesap YAZILMAZ
 *
 * Protokol katmanı (`exchangeGoogleCallback`) burada taklit ediliyor; kendisi
 * `tests/unit/google-oauth.test.ts` içinde gerçek kütüphaneyle sınanıyor.
 * Taklit edilen sınır bilinçli: bu dosya "doğrulanmış kimlik geldikten SONRA
 * ne oluyor" sorusunu test ediyor.
 */

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  users: [] as Row[],
  accounts: [] as Row[],
  sessions: [] as Row[],
  auditLogs: [] as Row[],
  cookieStore: new Map<string, string>(),
  nextId: 1,
}));

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  envLabel: "local" as string,
  publicEnv: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
  serverEnv: {
    NATIONAL_ID_HASH_SALT: "test-only-salt",
    GOOGLE_CLIENT_ID: "test-client-id" as string | undefined,
    GOOGLE_CLIENT_SECRET: "test-client-secret" as string | undefined,
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

const exchangeGoogleCallback = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/services/google-oauth.service", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/features/auth/services/google-oauth.service")>();

  return { ...original, exchangeGoogleCallback };
});

function match(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (value !== null && typeof value === "object" && "not" in (value as Row)) {
      return row[key] !== (value as Row).not;
    }

    return row[key] === value;
  });
}

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async ({ where }: { where: Row }) => {
        return db.users.find((row) => match(row, where)) ?? null;
      }),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const { accounts, ...rest } = data as Row & { accounts?: { create: Row } };
        const row = { ...rest, id: `user-${db.nextId++}`, deletedAt: null };

        db.users.push(row);

        if (accounts?.create) {
          db.accounts.push({ ...accounts.create, userId: row.id });
        }

        return { id: row.id };
      }),
    },
    account: {
      findUnique: vi.fn(async ({ where }: { where: Row }) => {
        const key = where.provider_providerAccountId as Row;
        const row = db.accounts.find(
          (item) =>
            item.provider === key.provider && item.providerAccountId === key.providerAccountId,
        );

        if (!row) return null;

        const user = db.users.find((item) => item.id === row.userId);

        return { user: user ? { id: user.id, deletedAt: user.deletedAt } : null };
      }),
      /**
       * `skipDuplicates` GERÇEKTEN uygulanıyor. Her zaman satır ekleyen bir
       * taklit, "aynı anda gelen iki callback ikinci satırı sessizce atlar"
       * kuralını test ediyormuş gibi görünür ama patlayan bir uygulamayı da
       * yeşil gösterirdi.
       */
      createMany: vi.fn(
        async ({ data, skipDuplicates }: { data: Row[]; skipDuplicates: boolean }) => {
          let count = 0;

          for (const row of data) {
            const exists = db.accounts.some(
              (item) =>
                item.provider === row.provider && item.providerAccountId === row.providerAccountId,
            );

            if (exists && skipDuplicates) continue;
            if (exists) throw new Error("unique constraint");

            db.accounts.push(row);
            count += 1;
          }

          return { count };
        },
      ),
    },
    session: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { ...data, id: `session-${db.nextId++}` };

        db.sessions.push(row);

        return { id: row.id };
      }),
      delete: vi.fn(async ({ where }: { where: Row }) => {
        const index = db.sessions.findIndex((row) => match(row, where));

        if (index >= 0) db.sessions.splice(index, 1);

        return {};
      }),
      findUnique: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        db.auditLogs.push(data);

        return {};
      }),
    },
  },
}));

const GOOGLE_COOKIE = "bb_google_oauth";
const SESSION_COOKIE = "bb_session";

const VALID_TRANSACTION = {
  state: "bizim-state",
  codeVerifier: "bizim-dogrulayici",
  nonce: "bizim-nonce",
  returnTo: "/hesabim",
};

const IDENTITY = {
  subject: "google-sub-1",
  email: "ahmet@ornek.test",
  emailVerified: true,
  name: "Ahmet Yılmaz",
};

async function callCallback(query = "?code=kod&state=bizim-state"): Promise<Response> {
  const { GET } = await import("@/app/api/auth/google/callback/route");

  return GET(
    new Request(`http://localhost:3000/api/auth/google/callback${query}`, {
      headers: { "x-forwarded-for": "203.0.113.7" },
    }),
  );
}

function seedTransaction(): void {
  db.cookieStore.set(GOOGLE_COOKIE, JSON.stringify(VALID_TRANSACTION));
}

function redirectTarget(response: Response): URL {
  return new URL(response.headers.get("location") ?? "");
}

beforeEach(() => {
  vi.resetModules();
  db.users.length = 0;
  db.accounts.length = 0;
  db.sessions.length = 0;
  db.auditLogs.length = 0;
  db.cookieStore.clear();
  db.nextId = 1;
  envMock.serverEnv.GOOGLE_CLIENT_ID = "test-client-id";
  envMock.serverEnv.GOOGLE_CLIENT_SECRET = "test-client-secret";
  exchangeGoogleCallback.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("işlem çerezi yoksa", () => {
  /**
   * CSRF KORUMASININ ÇALIŞTIĞI YER. Saldırgan kurbanın tarayıcısında bu adresi
   * açtırsa bile doğrulanacak bir `state` yok — akış Google'a hiç gitmeden ölür.
   */
  it("akış reddedilir ve jeton değişimi HİÇ denenmez", async () => {
    const response = await callCallback();

    expect(response.status).toBe(302);
    expect(redirectTarget(response).searchParams.get("hata")).toBe("baglanti_suresi_doldu");
    expect(exchangeGoogleCallback).not.toHaveBeenCalled();
  });

  it("oturum açılmaz", async () => {
    await callCallback();

    expect(db.sessions).toHaveLength(0);
    expect(db.cookieStore.has(SESSION_COOKIE)).toBe(false);
  });
});

describe("işlem çerezi tek kullanımlıktır", () => {
  /**
   * Çerez HATA YOLUNDA DA siliniyor. Ayakta kalsaydı, çalınmış bir
   * yetkilendirme kodu çerez ömrü boyunca (10 dk) tekrar denenebilirdi.
   */
  it("başarısız denemeden sonra çerez silinir ve ikinci deneme tutmaz", async () => {
    seedTransaction();
    exchangeGoogleCallback.mockRejectedValue(new Error("state uyuşmadı"));

    const first = await callCallback();

    expect(redirectTarget(first).searchParams.get("hata")).toBe("google_girisi_tamamlanamadi");
    expect(db.cookieStore.has(GOOGLE_COOKIE)).toBe(false);

    exchangeGoogleCallback.mockReset();

    const second = await callCallback();

    expect(redirectTarget(second).searchParams.get("hata")).toBe("baglanti_suresi_doldu");
    expect(exchangeGoogleCallback).not.toHaveBeenCalled();
  });

  it("başarılı girişten sonra da çerez silinir", async () => {
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);

    await callCallback();

    expect(db.cookieStore.has(GOOGLE_COOKIE)).toBe(false);
  });
});

describe("bu e-postayla hesap yoksa", () => {
  beforeEach(() => {
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);
  });

  it("doğrulanmamış hesap açılır ve oturum verilir", async () => {
    const response = await callCallback();

    expect(response.status).toBe(302);
    expect(db.users).toHaveLength(1);
    expect(db.users[0].identityStatus).toBe("unverified");
    expect(db.cookieStore.has(SESSION_COOKIE)).toBe(true);
  });

  /**
   * PRD §5.0 kabul kriteri: "Personel durumu istemciden gelen veriyle
   * değiştirilemez." Google ile açılan hesapta kimlik numarası da yoktur —
   * KPS adımı ayrıdır.
   */
  it("hesap personel yetkisi ve kimlik numarası ALMAZ", async () => {
    await callCallback();

    expect(db.users[0].isStaff).toBeUndefined();
    expect(db.users[0].nationalIdHash).toBeUndefined();
    expect(db.users[0].role).toBeUndefined();
  });

  it("hem kayıt hem giriş denetim kaydına yazılır", async () => {
    await callCallback();

    expect(db.auditLogs.map((row) => row.action)).toEqual(["register", "login"]);
  });

  /** Denetim kaydına düz IP değil, geri döndürülemez özeti yazılır. */
  it("denetim kaydında düz IP bulunmaz", async () => {
    await callCallback();

    for (const row of db.auditLogs) {
      expect(row.ipHash).not.toBe("203.0.113.7");
      expect(String(row.ipHash)).toHaveLength(64);
    }
  });
});

describe("aynı Google hesabı ikinci kez girerse", () => {
  it("yeni hesap açılmaz, mevcut hesaba giriş yapılır", async () => {
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);

    await callCallback();

    db.cookieStore.delete(SESSION_COOKIE);
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);

    await callCallback();

    expect(db.users).toHaveLength(1);
    expect(db.accounts).toHaveLength(1);
    expect(db.auditLogs.map((row) => row.action)).toEqual(["register", "login", "login"]);
  });
});

describe("aynı e-postalı hesap varsa", () => {
  function seedExistingUser(emailVerifiedAt: Date | null): void {
    db.users.push({
      id: "user-mevcut",
      email: IDENTITY.email,
      emailVerifiedAt,
      identityStatus: "kps_verified",
      isStaff: true,
      deletedAt: null,
    });
  }

  /**
   * SALDIRI SENARYOSU. Otomatik birleştirilseydi saldırgan, kurbanın
   * e-postasıyla açtığı bir Google hesabıyla personel yetkisi olan bir hesabı
   * devralırdı.
   */
  it("Google e-postayı doğrulamamışsa oturum AÇILMAZ ve bağlantı KURULMAZ", async () => {
    seedExistingUser(new Date("2026-07-01T00:00:00.000Z"));
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue({ ...IDENTITY, emailVerified: false });

    const response = await callCallback();

    expect(redirectTarget(response).searchParams.get("hata")).toBe(
      "dogrulama_gerekli_google_email_unverified",
    );
    expect(db.sessions).toHaveLength(0);
    expect(db.cookieStore.has(SESSION_COOKIE)).toBe(false);
    expect(db.accounts).toHaveLength(0);
    expect(db.users).toHaveLength(1);
  });

  it("bizdeki e-posta doğrulanmamışsa oturum AÇILMAZ", async () => {
    seedExistingUser(null);
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);

    const response = await callCallback();

    expect(redirectTarget(response).searchParams.get("hata")).toBe(
      "dogrulama_gerekli_local_email_unverified",
    );
    expect(db.sessions).toHaveLength(0);
    expect(db.accounts).toHaveLength(0);
  });

  /** İki taraf da doğrulanmışsa birleşme olur — yukarıdaki testlerin karşıtı. */
  it("İKİ TARAF da doğrulanmışsa bağlantı kurulur ve oturum açılır", async () => {
    seedExistingUser(new Date("2026-07-01T00:00:00.000Z"));
    seedTransaction();
    exchangeGoogleCallback.mockResolvedValue(IDENTITY);

    const response = await callCallback();

    expect(redirectTarget(response).pathname).toBe("/hesabim");
    expect(db.accounts).toHaveLength(1);
    expect(db.accounts[0].userId).toBe("user-mevcut");
    expect(db.sessions).toHaveLength(1);
    expect(db.cookieStore.has(SESSION_COOKIE)).toBe(true);
    // Yeni hesap AÇILMADI — mevcut hesaba bağlandı.
    expect(db.users).toHaveLength(1);
  });
});

describe("Google yapılandırılmamışsa", () => {
  it("iç detay sızdırmadan giriş ekranına döner", async () => {
    envMock.serverEnv.GOOGLE_CLIENT_ID = undefined;
    seedTransaction();

    const response = await callCallback();

    expect(redirectTarget(response).searchParams.get("hata")).toBe("google_kullanilamiyor");
    expect(exchangeGoogleCallback).not.toHaveBeenCalled();
  });
});
