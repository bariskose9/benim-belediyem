/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Devre kesici (ADR-010) — durum `rate_limit_counters` tablosunda.
 *
 * Taklit edilen Prisma gerçek davranışı uyguluyor: aynı anahtar + aynı pencere
 * tek satır, `updatedAt` her artışta tazeleniyor. Soğuma kararı bu alana
 * bağlı olduğu için taklidin bu ayrıntıyı doğru yapması testin kendisi kadar
 * önemli.
 */

type Row = { key: string; windowStartedAt: number; count: number; updatedAt: Date };

const store = vi.hoisted(() => ({ rows: [] as Row[], clock: new Date("2026-07-31T10:00:00Z") }));

const upsert = vi.hoisted(() =>
  vi.fn(
    async (args: { where: { key_windowStartedAt: { key: string; windowStartedAt: Date } } }) => {
      const { key, windowStartedAt } = args.where.key_windowStartedAt;
      const existing = store.rows.find(
        (row) => row.key === key && row.windowStartedAt === windowStartedAt.getTime(),
      );

      if (existing) {
        existing.count += 1;
        existing.updatedAt = store.clock;

        return { count: existing.count };
      }

      store.rows.push({
        key,
        windowStartedAt: windowStartedAt.getTime(),
        count: 1,
        updatedAt: store.clock,
      });

      return { count: 1 };
    },
  ),
);

const findFirst = vi.hoisted(() =>
  vi.fn(async (args: { where: { key: string; windowStartedAt: { gte: Date } } }) => {
    const matches = store.rows
      .filter(
        (row) =>
          row.key === args.where.key &&
          row.windowStartedAt >= args.where.windowStartedAt.gte.getTime(),
      )
      .sort((a, b) => b.windowStartedAt - a.windowStartedAt);

    return matches[0] ? { count: matches[0].count, updatedAt: matches[0].updatedAt } : null;
  }),
);

const deleteMany = vi.hoisted(() =>
  vi.fn(async (args: { where: { key: string } }) => {
    store.rows = store.rows.filter((row) => row.key !== args.where.key);

    return { count: 0 };
  }),
);

vi.mock("@/lib/db", () => ({
  prisma: { rateLimitCounter: { upsert, findFirst, deleteMany } },
}));

const THRESHOLD = 5;
const WINDOW_MS = 60_000;
const COOLDOWN_MS = 30_000;

function options(now: Date) {
  return {
    name: "test-service",
    failureThreshold: THRESHOLD,
    windowMs: WINDOW_MS,
    cooldownMs: COOLDOWN_MS,
    now,
  };
}

const START = new Date("2026-07-31T10:00:00Z");

async function failTimes(count: number, at: Date) {
  const { recordCircuitFailure } = await import("@/lib/circuit-breaker");

  store.clock = at;

  for (let index = 0; index < count; index += 1) {
    await recordCircuitFailure(options(at));
  }
}

describe("devre kesici", () => {
  beforeEach(() => {
    store.rows = [];
    store.clock = START;
  });

  it("sağlıklı serviste devre KAPALIDIR", async () => {
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    expect(await isCircuitOpen(options(START))).toBe(false);
  });

  it("eşiğin ALTINDA kalan hatalar devreyi açmaz", async () => {
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD - 1, START);

    expect(await isCircuitOpen(options(START))).toBe(false);
  });

  it("eşiğe ulaşınca devre AÇILIR — servis artık hiç çağrılmaz", async () => {
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD, START);

    expect(await isCircuitOpen(options(START))).toBe(true);
  });

  it("SÜRE DOLUMU: soğuma bitince devre kendiliğinden kapanır", async () => {
    // 06-testing.md: süreye bağlı her kural için süre dolumu testi zorunlu.
    // Bu olmadan devre bir kez açılıp sonsuza kadar açık kalabilir ve kimse
    // fark etmez — servis düzelse bile uygulama "kapalı" demeye devam eder.
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD, START);

    const justBefore = new Date(START.getTime() + COOLDOWN_MS - 1);
    const justAfter = new Date(START.getTime() + COOLDOWN_MS);

    expect(await isCircuitOpen(options(justBefore))).toBe(true);
    expect(await isCircuitOpen(options(justAfter))).toBe(false);
  });

  it("başarılı çağrı sayacı siler — geçmiş hatalar sonsuza kadar birikmez", async () => {
    const { isCircuitOpen, recordCircuitSuccess } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD, START);
    expect(await isCircuitOpen(options(START))).toBe(true);

    await recordCircuitSuccess({ name: "test-service" });

    expect(await isCircuitOpen(options(START))).toBe(false);
    expect(store.rows).toHaveLength(0);
  });

  it("pencerenin dışında kalan eski hatalar kararı etkilemez", async () => {
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD, START);

    // Bir pencere sonrası: eski satır artık sorguya girmiyor.
    const nextWindow = new Date(START.getTime() + WINDOW_MS * 2);

    expect(await isCircuitOpen(options(nextWindow))).toBe(false);
  });

  it("her servisin devresi ayrıdır", async () => {
    const { isCircuitOpen } = await import("@/lib/circuit-breaker");

    await failTimes(THRESHOLD, START);

    const otherService = { ...options(START), name: "another-service" };

    expect(await isCircuitOpen(otherService)).toBe(false);
  });
});
