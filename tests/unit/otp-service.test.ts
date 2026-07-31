/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tek kullanımlık kod iş kuralları (05-auth-security.md · PRD §5.0).
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ DEĞİL: `otp_challenges` tablosunun
 * gerçek davranışını bellekte uyguluyor (bekleyen kod arama, deneme sayacı,
 * tüketme). Yalnızca "repository çağrıldı mı" diye bakan bir test hiçbir iş
 * kuralını kanıtlamazdı (06-testing.md).
 *
 * `06-testing.md` süreye bağlı her kural için süre dolumu testi ZORUNLU tutuyor;
 * bu dosyada üç tane var: kod süresi, deneme hakkı, gönderim penceresi.
 */

type ChallengeRow = {
  id: string;
  registrationId: string;
  purpose: string;
  channel: string;
  destinationHash: string;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  createdAt: Date;
};

const db = vi.hoisted(() => ({
  challenges: [] as ChallengeRow[],
  counters: new Map<string, number>(),
  nextId: 1,
}));

const envMock = vi.hoisted(() => ({
  isProductionEnv: false,
  envLabel: "local" as string,
  serverEnv: {
    NATIONAL_ID_HASH_SALT: "test-only-salt",
    OTP_EMAIL_CHANNEL: "mock" as "mock" | "email",
    OTP_PHONE_CHANNEL: "mock" as "mock" | "email_sim" | "sms",
    EMAIL_API_KEY: undefined as string | undefined,
    EMAIL_FROM: undefined as string | undefined,
  },
}));

vi.mock("@/config/env", () => envMock);

vi.mock("@/lib/db", () => ({
  prisma: {
    otpChallenge: {
      create: vi.fn(async ({ data }: { data: Omit<ChallengeRow, "id" | "createdAt"> }) => {
        const row: ChallengeRow = {
          ...data,
          attemptCount: 0,
          consumedAt: null,
          id: `challenge-${db.nextId++}`,
          createdAt: new Date(),
        };
        db.challenges.push(row);

        return { id: row.id };
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { registrationId: string; purpose: string; consumedAt: null };
          data: { consumedAt: Date };
        }) => {
          for (const row of db.challenges) {
            if (
              row.registrationId === where.registrationId &&
              row.purpose === where.purpose &&
              row.consumedAt === null
            ) {
              row.consumedAt = data.consumedAt;
            }
          }

          return { count: 0 };
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: { registrationId: string; purpose: string; consumedAt?: null };
        }) => {
          const matches = db.challenges
            .filter(
              (row) =>
                row.registrationId === where.registrationId &&
                row.purpose === where.purpose &&
                (where.consumedAt === undefined || row.consumedAt === null),
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          return matches[0] ?? null;
        },
      ),
      findMany: vi.fn(async ({ where }: { where: { registrationId: string } }) => {
        const purposes = new Set(
          db.challenges
            .filter((row) => row.registrationId === where.registrationId && row.consumedAt !== null)
            .map((row) => row.purpose),
        );

        return [...purposes].map((purpose) => ({ purpose }));
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: { attemptCount?: { increment: number }; consumedAt?: Date };
        }) => {
          const row = db.challenges.find((candidate) => candidate.id === where.id);
          if (!row) throw new Error("kayıt yok");

          if (data.attemptCount) row.attemptCount += data.attemptCount.increment;
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
    },
  },
}));

const REGISTRATION_ID = "reg-1";
const NOW = new Date("2026-07-31T12:00:00Z");

async function issue(overrides: Record<string, unknown> = {}) {
  const { issueOtp } = await import("@/features/otp/services/otp.service");

  return issueOtp({
    registrationId: REGISTRATION_ID,
    purpose: "register_email",
    destinationKind: "email",
    destinationValue: "ayse@ornek.com",
    contactEmail: "ayse@ornek.com",
    now: NOW,
    ...overrides,
  });
}

async function verify(code: string, now: Date = NOW, purpose = "register_email") {
  const { verifyOtp } = await import("@/features/otp/services/otp.service");

  return verifyOtp({
    registrationId: REGISTRATION_ID,
    purpose: purpose as "register_email",
    code,
    now,
  });
}

beforeEach(() => {
  db.challenges = [];
  db.counters = new Map();
  db.nextId = 1;
  envMock.isProductionEnv = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("issueOtp — kod üretimi ve gönderimi", () => {
  it("kod üretir, 5 dakikalık son kullanma verir", async () => {
    const result = await issue();

    expect(result.outcome).toBe("sent");
    if (result.outcome !== "sent") return;
    expect(result.expiresAt.getTime() - NOW.getTime()).toBe(5 * 60_000);
    expect(result.revealedCode).toMatch(/^\d{6}$/);
  });

  it("kodu veritabanına DÜZ METİN yazmaz", async () => {
    const result = await issue();
    if (result.outcome !== "sent") throw new Error("gönderilmeliydi");

    expect(db.challenges[0].codeHash).not.toBe(result.revealedCode);
    expect(db.challenges[0].codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gönderim hedefini DÜZ METİN yazmaz", async () => {
    await issue();

    expect(db.challenges[0].destinationHash).not.toContain("ayse@ornek.com");
  });

  it("production'da kodu ekrana DÖNDÜRMEZ", async () => {
    // İkinci kemer: sahte kanal production'da zaten seçilemiyor
    // (src/config/env.ts), ama süzgeç yine de burada duruyor.
    envMock.isProductionEnv = true;

    const result = await issue();

    expect(result.outcome).toBe("sent");
    if (result.outcome !== "sent") return;
    expect(result.revealedCode).toBeUndefined();
  });

  it("yeni kod üretilince önceki bekleyen kod geçersizleşir", async () => {
    // Aksi hâlde 3 deneme sınırı kodlar arasında paylaşılır ve fiilen
    // 3'ün katına çıkardı.
    const first = await issue();
    if (first.outcome !== "sent") throw new Error("gönderilmeliydi");

    const later = new Date(NOW.getTime() + 1_000);
    await issue({ now: later });

    expect(db.challenges[0].consumedAt).not.toBeNull();
    expect(db.challenges[1].consumedAt).toBeNull();

    await expect(verify(first.revealedCode!, later)).resolves.toMatchObject({
      outcome: "invalid",
    });
  });

  it("kanal erişilemezse veritabanına kayıt YAZMAZ", async () => {
    // Kaydı önce yazsaydık ve gönderim başarısız olsaydı, kullanıcının eline
    // hiç ulaşmayan bir kod eskisini geçersizleştirir ve kullanıcı kilitlenirdi.
    envMock.serverEnv.OTP_EMAIL_CHANNEL = "email";
    envMock.serverEnv.EMAIL_API_KEY = undefined;

    await expect(issue()).resolves.toEqual({ outcome: "unavailable" });
    expect(db.challenges).toHaveLength(0);

    envMock.serverEnv.OTP_EMAIL_CHANNEL = "mock";
  });
});

describe("issueOtp — gönderim hız sınırı ve bekleme süresi", () => {
  it("arka arkaya kod istemek AYRI bir bekleme süresine takılmaz", async () => {
    // Ayrı bir "tekrar gönder" beklemesi bilerek YOK (src/config/constants.ts):
    // hiçbir standartta geçmiyor ve local/preview'da kodun ekranda görüldüğü
    // akışta kullanıcıyı boş yere bekletiyordu. Koruma tamamen gönderim hız
    // sınırında ("aynı hedefe 3 kod / 15 dakika") — aşağıdaki testler onu ölçüyor.
    await issue();

    const soon = await issue({ now: new Date(NOW.getTime() + 1_000) });

    expect(soon.outcome).toBe("sent");
  });

  it("AYNI HEDEFE 15 dakikada 4. kod isteği reddedilir", async () => {
    // 05-auth-security.md: "Gönderim hız sınırına tabidir (aynı hedefe
    // 3 kod / 15 dakika)."
    const times = [0, 1_000, 2_000, 3_000].map((offset) => new Date(NOW.getTime() + offset));

    for (const now of times.slice(0, 3)) {
      await expect(issue({ now })).resolves.toMatchObject({ outcome: "sent" });
    }

    await expect(issue({ now: times[3] })).resolves.toEqual({ outcome: "rate_limited" });
  });

  it("15 dakikalık pencere geçince yeniden kod istenebilir — SÜRE DOLUMU TESTİ", async () => {
    for (const offset of [0, 1_000, 2_000]) {
      await issue({ now: new Date(NOW.getTime() + offset) });
    }

    await expect(issue({ now: new Date(NOW.getTime() + 3_000) })).resolves.toEqual({
      outcome: "rate_limited",
    });

    // Pencere sabit ve `windowMs`'in katına hizalı; bir sonraki pencereye geçiyoruz.
    const nextWindow = new Date(NOW.getTime() + 15 * 60_000 + 60_000);

    await expect(issue({ now: nextWindow })).resolves.toMatchObject({ outcome: "sent" });
  });

  it("farklı hedefler birbirinin bütçesini tüketmez", async () => {
    for (const offset of [0, 1_000, 2_000]) {
      await issue({ now: new Date(NOW.getTime() + offset) });
    }

    await expect(
      issue({
        now: new Date(NOW.getTime() + 3_000),
        purpose: "register_phone",
        destinationKind: "phone",
        destinationValue: "05321234567",
      }),
    ).resolves.toMatchObject({ outcome: "sent" });
  });
});

describe("verifyOtp — doğrulama, süre ve deneme hakkı", () => {
  it("doğru kod kabul edilir", async () => {
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    await expect(verify(issued.revealedCode!)).resolves.toEqual({ outcome: "verified" });
  });

  it("kullanılmış kod ikinci kez kabul edilmez — tek kullanımlık", async () => {
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    await verify(issued.revealedCode!);

    await expect(verify(issued.revealedCode!)).resolves.toEqual({ outcome: "expired" });
  });

  it("5 DAKİKADAN ESKİ KOD KABUL EDİLMEZ — SÜRE DOLUMU TESTİ", async () => {
    // Süre dolumu okuma anında uygulanıyor (ADR-007): temizlik görevi hiç
    // çalışmasa bile süresi geçmiş kod geçmez.
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    const justExpired = new Date(NOW.getTime() + 5 * 60_000 + 1_000);

    await expect(verify(issued.revealedCode!, justExpired)).resolves.toEqual({
      outcome: "expired",
    });
  });

  it("süre dolmadan bir saniye önce hâlâ geçerlidir", async () => {
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    const justBefore = new Date(NOW.getTime() + 5 * 60_000 - 1_000);

    await expect(verify(issued.revealedCode!, justBefore)).resolves.toEqual({
      outcome: "verified",
    });
  });

  it("yanlış kodda kalan deneme hakkını bildirir", async () => {
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    await expect(verify(wrongCode(issued.revealedCode!))).resolves.toEqual({
      outcome: "invalid",
      remainingAttempts: 2,
    });
  });

  it("3 YANLIŞ DENEMEDEN SONRA KOD KİLİTLENİR", async () => {
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");
    const wrong = wrongCode(issued.revealedCode!);

    await verify(wrong);
    await verify(wrong);
    await expect(verify(wrong)).resolves.toEqual({ outcome: "too_many_attempts" });

    // Kilitlendikten sonra DOĞRU kod da kabul edilmez; yeni kod istenmeli.
    await expect(verify(issued.revealedCode!)).resolves.toEqual({ outcome: "expired" });
  });

  it("hiç kod üretilmemişse expired döner", async () => {
    await expect(verify("123456")).resolves.toEqual({ outcome: "expired" });
  });

  it("e-posta kodu telefon kanalında kabul edilmez", async () => {
    // İki kod BAĞIMSIZ doğrulanır (PRD §5.0). Kod özeti kayıt + amaç kapsamıyla
    // üretildiği için aynı rakamlar diğer kanalda tutmaz.
    const issued = await issue();
    if (issued.outcome !== "sent") throw new Error("gönderilmeliydi");

    await issue({
      now: new Date(NOW.getTime() + 1_000),
      purpose: "register_phone",
      destinationKind: "phone",
      destinationValue: "05321234567",
    });

    await expect(
      verify(issued.revealedCode!, new Date(NOW.getTime() + 2_000), "register_phone"),
    ).resolves.toMatchObject({ outcome: "invalid" });
  });

  it("bir kanalın doğrulanması diğerini geçersizleştirmez", async () => {
    // PRD §5.0: "İki kod birbirinden bağımsız doğrulanır; biri geçerken
    // diğeri geçersizleşmez."
    const email = await issue();
    const phone = await issue({
      now: new Date(NOW.getTime() + 1_000),
      purpose: "register_phone",
      destinationKind: "phone",
      destinationValue: "05321234567",
    });
    if (email.outcome !== "sent" || phone.outcome !== "sent") throw new Error("gönderilmeliydi");

    await verify(email.revealedCode!, new Date(NOW.getTime() + 2_000));

    await expect(
      verify(phone.revealedCode!, new Date(NOW.getTime() + 3_000), "register_phone"),
    ).resolves.toEqual({ outcome: "verified" });
  });

  it("readVerifiedPurposes yalnızca doğrulanmış kanalları döner", async () => {
    const { readVerifiedPurposes } = await import("@/features/otp/services/otp.service");
    const email = await issue();
    if (email.outcome !== "sent") throw new Error("gönderilmeliydi");

    await expect(readVerifiedPurposes(REGISTRATION_ID)).resolves.toEqual(new Set());

    await verify(email.revealedCode!);

    await expect(readVerifiedPurposes(REGISTRATION_ID)).resolves.toEqual(
      new Set(["register_email"]),
    );
  });
});

/** Verilen kodun kesin olarak farklı, yine 6 haneli bir hâli. */
function wrongCode(code: string): string {
  const firstDigit = (Number(code[0]) + 1) % 10;

  return `${firstDigit}${code.slice(1)}`;
}
