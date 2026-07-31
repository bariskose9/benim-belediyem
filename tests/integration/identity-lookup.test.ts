/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KPS_CONSTANT_RESPONSE_MS, KPS_RATE_LIMIT_MAX_ATTEMPTS } from "@/config/constants";

import type { IdentityProvider, ProviderLookupResult } from "@/features/identity/types";

/**
 * `lookupIdentity` — kimlik sorgusunun iş mantığı katmanı.
 *
 * Buradaki testler ADIM 4a'nın GÜVENLİK VAATLERİNİ kanıtlıyor:
 * tek tip başarısızlık, hız sınırının deneme başına sayılması, sabit yanıt
 * süresi ve denetim kaydında kimlik numarasının bulunmaması.
 */

type Row = { key: string; windowStartedAt: number; count: number; updatedAt: Date };

const store = vi.hoisted(() => ({
  rows: [] as Row[],
  logs: [] as Record<string, unknown>[],
  sleeps: [] as number[],
}));

const upsert = vi.hoisted(() =>
  vi.fn(
    async (args: { where: { key_windowStartedAt: { key: string; windowStartedAt: Date } } }) => {
      const { key, windowStartedAt } = args.where.key_windowStartedAt;
      const existing = store.rows.find(
        (row) => row.key === key && row.windowStartedAt === windowStartedAt.getTime(),
      );

      if (existing) {
        existing.count += 1;

        return { count: existing.count };
      }

      store.rows.push({
        key,
        windowStartedAt: windowStartedAt.getTime(),
        count: 1,
        updatedAt: new Date(),
      });

      return { count: 1 };
    },
  ),
);

vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimitCounter: {
      upsert,
      findFirst: vi.fn(async () => null),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    kpsQueryLog: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        store.logs.push(args.data);

        return args.data;
      }),
    },
  },
}));

/**
 * `sleep` taklit ediliyor ama YOK SAYILMIYOR: beklenen süre kaydediliyor.
 * Sabit yanıt süresi kuralı ancak "ne kadar beklendi" ölçülerek kanıtlanır,
 * gerçekten 1,5 saniye beklenerek değil (06-testing.md).
 */
vi.mock("@/lib/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/utils")>()),
  sleep: vi.fn(async (ms: number) => {
    store.sleeps.push(ms);
  }),
}));

const IDENTITY = {
  firstName: "Emre",
  lastName: "Arslan",
  birthDate: "1990-04-12",
  birthPlace: "İzmir",
  fatherName: "Ali",
  motherName: "Ayşe",
  registeredProvince: "İzmir",
  registeredDistrict: "Konak",
  gender: "male",
  maritalStatus: "single",
  registeredAddress: "Konak Mah. 1 Sk. No:1",
};

const VALID_NATIONAL_ID = "97876775668";
const ACTOR_IP = "203.0.113.42";

/** Kontrollü saat: sağlayıcının "ne kadar sürdüğü" testte belirleniyor. */
function makeClock(start = 1_000_000) {
  let current = start;

  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

function fakeProvider(
  result: ProviderLookupResult,
  takesMs = 0,
  clock?: { advance(ms: number): void },
) {
  const calls = { count: 0 };
  const provider: IdentityProvider = {
    name: "fake",
    lookup: async () => {
      calls.count += 1;
      clock?.advance(takesMs);

      return result;
    },
  };

  return { provider, calls };
}

async function lookup(
  overrides: Partial<{ nationalId: string; birthYear: unknown; sessionId: string }> = {},
  deps: { provider?: IdentityProvider; now?: () => number } = {},
) {
  const { lookupIdentity } = await import("@/features/identity/services/identity-lookup.service");

  return lookupIdentity(
    {
      nationalId: VALID_NATIONAL_ID,
      birthYear: 1990,
      actorIp: ACTOR_IP,
      ...overrides,
    },
    deps,
  );
}

beforeEach(() => {
  store.rows = [];
  store.logs = [];
  store.sleeps = [];
  upsert.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TEK TİP BAŞARISIZLIK — hangi alanın tutmadığı söylenmez", () => {
  it("bulunamadı ve eşleşmedi AYNI sonucu döner", async () => {
    const notFound = await lookup({}, fakeProvider({ outcome: "not_found" }));
    const mismatch = await lookup({}, fakeProvider({ outcome: "mismatch" }));

    expect(notFound).toEqual({ outcome: "failed" });
    expect(mismatch).toEqual({ outcome: "failed" });
  });

  it("geçersiz kimlik numarası da AYNI sonuca düşer", async () => {
    // Kontrol basamağı hatalı bir numara "geçersiz numara" diye ayrılsaydı,
    // saldırgan hangi numaraların geçerli olduğunu ücretsiz öğrenirdi.
    const result = await lookup(
      { nationalId: "11111111111" },
      fakeProvider({ outcome: "success", identity: IDENTITY }),
    );

    expect(result).toEqual({ outcome: "failed" });
  });

  it("doğum yılı eksikse kimlik bilgisi DÖNMEZ — TCKN tek başına yetmez", async () => {
    const result = await lookup(
      { birthYear: undefined },
      fakeProvider({ outcome: "success", identity: IDENTITY }),
    );

    expect(result).toEqual({ outcome: "failed" });
  });

  it("mutlu yolda kimlik bilgisi döner", async () => {
    const result = await lookup({}, fakeProvider({ outcome: "success", identity: IDENTITY }));

    expect(result).toEqual({ outcome: "success", identity: IDENTITY });
  });
});

describe("HIZ SINIRI", () => {
  it("6. denemede reddeder (5 deneme / 15 dakika)", async () => {
    const results = [];

    for (let attempt = 0; attempt < KPS_RATE_LIMIT_MAX_ATTEMPTS + 1; attempt += 1) {
      results.push(await lookup({}, fakeProvider({ outcome: "not_found" })));
    }

    expect(results.slice(0, KPS_RATE_LIMIT_MAX_ATTEMPTS).every((r) => r.outcome === "failed")).toBe(
      true,
    );
    expect(results[KPS_RATE_LIMIT_MAX_ATTEMPTS]).toEqual({ outcome: "rate_limited" });
  });

  it("sınır aşılınca dış servis HİÇ çağrılmaz", async () => {
    const { provider, calls } = fakeProvider({ outcome: "not_found" });

    for (let attempt = 0; attempt < KPS_RATE_LIMIT_MAX_ATTEMPTS + 1; attempt += 1) {
      await lookup({}, { provider });
    }

    expect(calls.count).toBe(KPS_RATE_LIMIT_MAX_ATTEMPTS);
  });

  it("İÇ YENİDEN DENEMELER sayacı ARTIRMAZ", async () => {
    // Bir kullanıcı denemesi 3 HTTP çağrısına dönüşse bile bütçeden 1 düşmeli.
    // Aksi halde 5 deneme/15 dakika bütçesi üçte bir sürede biter ve koruma
    // kullanıcıyı kilitleyen bir arızaya dönüşür.
    const retryingProvider: IdentityProvider = {
      name: "retrying",
      lookup: async () => {
        // Sağlayıcı içinde 3 çağrı yaptığını taklit ediyor.
        await Promise.all([Promise.resolve(), Promise.resolve(), Promise.resolve()]);

        return { outcome: "unavailable" };
      },
    };

    await lookup({}, { provider: retryingProvider });

    const counter = store.rows.find((row) => row.key.startsWith("kps_lookup:ip:"));

    expect(counter?.count).toBe(1);
  });

  it("geçersiz biçimli istek de sayacı artırır — ücretsiz deneme yok", async () => {
    await lookup({ nationalId: "11111111111" }, fakeProvider({ outcome: "not_found" }));

    const counter = store.rows.find((row) => row.key.startsWith("kps_lookup:ip:"));

    expect(counter?.count).toBe(1);
  });

  it("oturum kimliği varsa IP'nin YANINDA o da sayılır", async () => {
    await lookup({ sessionId: "session-abc" }, fakeProvider({ outcome: "not_found" }));

    expect(store.rows.map((row) => row.key)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^kps_lookup:ip:/),
        "kps_lookup:session:session-abc",
      ]),
    );
  });

  it("farklı IP'ler birbirinin bütçesini tüketmez", async () => {
    for (let attempt = 0; attempt < KPS_RATE_LIMIT_MAX_ATTEMPTS + 1; attempt += 1) {
      await lookup({}, fakeProvider({ outcome: "not_found" }));
    }

    const { lookupIdentity } = await import("@/features/identity/services/identity-lookup.service");
    const other = await lookupIdentity(
      { nationalId: VALID_NATIONAL_ID, birthYear: 1990, actorIp: "198.51.100.7" },
      fakeProvider({ outcome: "not_found" }),
    );

    expect(other).toEqual({ outcome: "failed" });
  });
});

describe("SABİT YANIT SÜRESİ — numara taraması koruması", () => {
  it("bulundu / eşleşmedi / bulunamadı AYNI süreyi alır", async () => {
    // Mesajlar aynı olsa bile süre farklıysa saldırgan kronometreyle
    // "bu numara kayıtlı" bilgisini çıkarabilir.
    const durations: number[] = [];

    for (const [result, takesMs] of [
      [{ outcome: "success" as const, identity: IDENTITY }, 250],
      [{ outcome: "mismatch" as const }, 700],
      [{ outcome: "not_found" as const }, 120],
    ] as const) {
      store.sleeps = [];

      const clock = makeClock();
      const { provider } = fakeProvider(result, takesMs, clock);

      await lookup({}, { provider, now: clock.now });

      durations.push(takesMs + store.sleeps.reduce((total, ms) => total + ms, 0));
    }

    expect(new Set(durations).size).toBe(1);
    expect(durations[0]).toBe(KPS_CONSTANT_RESPONSE_MS);
  });

  it("dış servis tabandan yavaşsa fazladan BEKLETMEZ", async () => {
    const clock = makeClock();
    const { provider } = fakeProvider(
      { outcome: "not_found" },
      KPS_CONSTANT_RESPONSE_MS + 500,
      clock,
    );

    await lookup({}, { provider, now: clock.now });

    expect(store.sleeps).toHaveLength(0);
  });

  it("hız sınırı ve servis arızası BİLEREK doldurulmaz", async () => {
    // Bu iki sonuç sorgulanan numaradan bağımsızdır — her numara için aynıdır,
    // dolayısıyla zamanlamaları hiçbir şey sızdırmaz. Doldurmak yalnızca
    // saldırgana ücretsiz kaynak tüketimi hediye ederdi.
    await lookup({}, fakeProvider({ outcome: "unavailable" }));

    expect(store.sleeps).toHaveLength(0);

    for (let attempt = 0; attempt < KPS_RATE_LIMIT_MAX_ATTEMPTS + 1; attempt += 1) {
      store.sleeps = [];
      await lookup({}, fakeProvider({ outcome: "not_found" }));
    }

    expect(store.sleeps).toHaveLength(0);
  });
});

describe("DENETİM KAYDI — numara YAZILMADAN", () => {
  it("her sorgu için bir kayıt yazılır", async () => {
    await lookup({}, fakeProvider({ outcome: "success", identity: IDENTITY }));

    expect(store.logs).toHaveLength(1);
    expect(store.logs[0].result).toBe("success");
  });

  it("KAYITTA KİMLİK NUMARASI GEÇMEZ", async () => {
    for (const result of [
      { outcome: "success" as const, identity: IDENTITY },
      { outcome: "mismatch" as const },
      { outcome: "not_found" as const },
      { outcome: "unavailable" as const },
    ]) {
      await lookup({}, fakeProvider(result));
    }

    const raw = JSON.stringify(store.logs);

    expect(raw).not.toContain(VALID_NATIONAL_ID);
    expect(store.logs.every((log) => !("nationalId" in log))).toBe(true);
  });

  it("IP adresi DÜZ HALİYLE yazılmaz", async () => {
    await lookup({}, fakeProvider({ outcome: "not_found" }));

    const raw = JSON.stringify(store.logs);

    expect(raw).not.toContain(ACTOR_IP);
    expect(store.logs[0].actorIpHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hız sınırına takılan deneme de kaydedilir", async () => {
    for (let attempt = 0; attempt < KPS_RATE_LIMIT_MAX_ATTEMPTS + 1; attempt += 1) {
      await lookup({}, fakeProvider({ outcome: "not_found" }));
    }

    expect(store.logs.at(-1)?.result).toBe("rate_limited");
  });

  it("servis erişilemediğinde sonuç timeout olarak kaydedilir", async () => {
    await lookup({}, fakeProvider({ outcome: "unavailable" }));

    expect(store.logs[0].result).toBe("timeout");
  });

  it("kimlik bilgisi kayda YAZILMAZ", async () => {
    await lookup({}, fakeProvider({ outcome: "success", identity: IDENTITY }));

    const raw = JSON.stringify(store.logs);

    expect(raw).not.toContain("Emre");
    expect(raw).not.toContain("Arslan");
  });
});
