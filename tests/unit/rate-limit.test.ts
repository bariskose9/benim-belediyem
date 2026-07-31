/**
 * @vitest-environment node
 *
 * Node ortamı ŞART: `src/config/env.ts` tarayıcıda `serverEnv`'e erişimi hata
 * fırlatarak engelliyor (gizli değer istemciye sızmasın diye). Varsayılan jsdom
 * ortamında `window` tanımlı olduğu için bu koruma devreye girer ve sunucu
 * tarafı kodu test edilemez hale gelir.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Hız sınırı sayacı (ADR-006).
 *
 * Prisma taklit ediliyor ama taklit ETKİSİZ değil: gerçek `upsert` davranışını
 * (aynı anahtar + aynı pencere → aynı satır) bellekte birebir uyguluyor.
 * Sadece "upsert çağrıldı mı" diye bakan bir test hiçbir şey kanıtlamazdı
 * (docs/standards/06-testing.md → "sadece mock'u doğrulayan test yazılmaz").
 */

type Row = { key: string; windowStartedAt: number; count: number };

const store = vi.hoisted(() => ({ rows: [] as Row[] }));

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

      store.rows.push({ key, windowStartedAt: windowStartedAt.getTime(), count: 1 });

      return { count: 1 };
    },
  ),
);

const deleteMany = vi.hoisted(() =>
  vi.fn(async (args: { where: { key: string } }) => {
    store.rows = store.rows.filter((row) => row.key !== args.where.key);

    return { count: 0 };
  }),
);

vi.mock("@/lib/db", () => ({ prisma: { rateLimitCounter: { upsert, deleteMany } } }));

const WINDOW_MS = 15 * 60_000;
const LIMIT = 5;

describe("consumeRateLimit — sayaç ve pencere", () => {
  beforeEach(() => {
    store.rows = [];
    upsert.mockClear();
  });

  it("limite kadar izin verir, limitin üstünde reddeder", async () => {
    const { consumeRateLimit } = await import("@/lib/rate-limit");
    const now = new Date("2026-07-31T10:00:00Z");
    const results = [];

    for (let attempt = 0; attempt < LIMIT + 1; attempt += 1) {
      results.push(
        await consumeRateLimit({ key: "kps:test", limit: LIMIT, windowMs: WINDOW_MS, now }),
      );
    }

    expect(results.slice(0, LIMIT).every((result) => result.allowed)).toBe(true);
    // 6. deneme — PRD §5.0: 5 deneme / 15 dakika
    expect(results[LIMIT].allowed).toBe(false);
  });

  it("SÜRE DOLUMU: pencere geçince sayaç sıfırdan başlar", async () => {
    // 06-testing.md: "süreye bağlı her kural için süre dolumu testi zorunludur".
    const { consumeRateLimit } = await import("@/lib/rate-limit");
    const first = new Date("2026-07-31T10:00:00Z");

    for (let attempt = 0; attempt < LIMIT + 1; attempt += 1) {
      await consumeRateLimit({ key: "kps:test", limit: LIMIT, windowMs: WINDOW_MS, now: first });
    }

    const later = new Date(first.getTime() + WINDOW_MS);
    const afterWindow = await consumeRateLimit({
      key: "kps:test",
      limit: LIMIT,
      windowMs: WINDOW_MS,
      now: later,
    });

    expect(afterWindow.allowed).toBe(true);
  });

  it("aynı pencerede farklı anlarda gelen istekler AYNI sayacı kullanır", async () => {
    // Pencere başlangıcı hizalanmasaydı her istek yeni satır açar ve sayaç
    // hiçbir zaman 1'i geçmezdi — sınır hiç tetiklenmezdi.
    const { consumeRateLimit } = await import("@/lib/rate-limit");
    const base = new Date("2026-07-31T10:00:00Z").getTime();

    for (let attempt = 0; attempt < LIMIT; attempt += 1) {
      await consumeRateLimit({
        key: "kps:test",
        limit: LIMIT,
        windowMs: WINDOW_MS,
        // Her istek pencerenin içinde farklı bir saniyede geliyor.
        now: new Date(base + attempt * 1_000),
      });
    }

    expect(store.rows).toHaveLength(1);
    expect(store.rows[0].count).toBe(LIMIT);
  });

  it("farklı anahtarlar birbirinin sayacını tüketmez", async () => {
    const { consumeRateLimit } = await import("@/lib/rate-limit");
    const now = new Date("2026-07-31T10:00:00Z");

    for (let attempt = 0; attempt < LIMIT + 1; attempt += 1) {
      await consumeRateLimit({ key: "kps:a", limit: LIMIT, windowMs: WINDOW_MS, now });
    }

    const other = await consumeRateLimit({ key: "kps:b", limit: LIMIT, windowMs: WINDOW_MS, now });

    expect(other.allowed).toBe(true);
  });
});

describe("rateLimitKey — anahtar kişisel veri içermez", () => {
  it("IP adresi anahtarda DÜZ HALİYLE geçmez", async () => {
    // ADR-006: "anahtar kişisel veri içermez — IP adresi tuzlanmış özet olarak".
    const { rateLimitKey } = await import("@/lib/rate-limit");
    const key = rateLimitKey("kps_lookup", "ip", "203.0.113.42");

    expect(key).not.toContain("203.0.113.42");
    expect(key).toMatch(/^kps_lookup:ip:[0-9a-f]{64}$/);
  });

  it("aynı IP her zaman aynı özeti verir — sayaç yoksa koruma da yok", async () => {
    const { rateLimitKey } = await import("@/lib/rate-limit");

    expect(rateLimitKey("kps_lookup", "ip", "203.0.113.42")).toBe(
      rateLimitKey("kps_lookup", "ip", "203.0.113.42"),
    );
  });

  it("farklı IP'ler farklı anahtar üretir", async () => {
    const { rateLimitKey } = await import("@/lib/rate-limit");

    expect(rateLimitKey("kps_lookup", "ip", "203.0.113.42")).not.toBe(
      rateLimitKey("kps_lookup", "ip", "203.0.113.43"),
    );
  });

  it("gönderim hedefi (e-posta/telefon) anahtarda DÜZ HALİYLE geçmez", async () => {
    // "Aynı hedefe 3 kod / 15 dakika" kuralı bu anahtarı kullanıyor
    // (05-auth-security.md). E-posta adresi kişisel veridir, sayaç tablosunda
    // düz metin duramaz.
    const { rateLimitKey } = await import("@/lib/rate-limit");
    const key = rateLimitKey("otp_send", "destination", "ayse@ornek.com");

    expect(key).not.toContain("ayse@ornek.com");
    expect(key).toMatch(/^otp_send:destination:[0-9a-f]{64}$/);
  });

  it("aynı e-posta büyük/küçük harf farkıyla AYNI bütçeye düşer", async () => {
    // Aksi hâlde saldırgan `Ali@x.com`, `ALI@x.com`, `aLi@x.com` diyerek
    // aynı posta kutusuna sınırsız kod gönderebilirdi.
    const { rateLimitKey } = await import("@/lib/rate-limit");

    expect(rateLimitKey("otp_send", "destination", "Ali@Ornek.com")).toBe(
      rateLimitKey("otp_send", "destination", "  ali@ornek.com  "),
    );
  });

  it("IP ve hedef özetleri birbirinden ayrı alanlarda üretilir", async () => {
    // Aynı metin hem IP hem hedef olarak özetlenirse, bir alanın özet tablosu
    // diğerine karşı kullanılabilirdi (crypto.ts → alan ayrımı gerekçesi).
    const { rateLimitKey } = await import("@/lib/rate-limit");
    const sameValue = "203.0.113.42";

    expect(rateLimitKey("x", "ip", sameValue).split(":")[2]).not.toBe(
      rateLimitKey("x", "destination", sameValue).split(":")[2],
    );
  });
});

describe("readActorIp — vekil başlığı", () => {
  it("x-forwarded-for zincirinden EN SOLDAKİ istemciyi alır", async () => {
    // Başlığın tamamı anahtar yapılsaydı araya bir vekil eklendiğinde anahtar
    // değişir ve saldırgan sayacı sıfırlayabilirdi.
    const { readActorIp } = await import("@/lib/rate-limit");
    const headers = new Headers({ "x-forwarded-for": "203.0.113.42, 70.41.3.18, 150.172.238.178" });

    expect(readActorIp(headers)).toBe("203.0.113.42");
  });

  it("başlık hiç yoksa sınırı ATLAMAZ, sabit bir yer tutucuya düşer", async () => {
    // "IP okunamadı → serbest bırak" davranışı, korumayı başlığı silerek
    // devre dışı bırakılabilir hale getirirdi.
    const { readActorIp } = await import("@/lib/rate-limit");

    expect(readActorIp(new Headers())).toBe("unknown");
  });
});
