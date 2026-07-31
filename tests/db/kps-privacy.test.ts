import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTestData, expectUniqueViolation, prisma, testId } from "./helpers.js";

/**
 * KPS denetim kaydının ve hız sınırı sayacının GERÇEK veritabanındaki
 * gizlilik ve doğruluk garantileri.
 *
 * Neden burada, taklit edilmiş Prisma ile değil: "tabloda kimlik numarası
 * kolonu yok" iddiası ancak veritabanına sorularak kanıtlanabilir. Taklit
 * edilmiş bir istemci hangi kolonların var olduğunu bilmez — istenen her alanı
 * kabul eder. Aynı şekilde `unique(key, windowStartedAt)` kısıtını zorlayan
 * PostgreSQL'dir, uygulama kodu değil.
 */

beforeEach(cleanupTestData);
afterEach(cleanupTestData);

describe("kps_query_logs — kimlik numarası tutulamaz", () => {
  it("TABLODA kimlik numarası taşıyabilecek bir kolon YOKTUR", async () => {
    // Kuralın en güçlü hâli: alan yoksa yanlışlıkla yazılamaz. Kod incelemesi
    // atlanabilir, kolonun yokluğu atlanamaz (data-model.md).
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'kps_query_logs'
    `;

    const names = columns.map((column) => column.column_name).sort();

    expect(names).toEqual([
      "actor_ip_hash",
      "created_at",
      "duration_ms",
      "id",
      "is_seed_data",
      "result",
      "session_id",
    ]);

    for (const name of names) {
      expect(name).not.toMatch(/national|tckn|identity_number|kimlik/i);
    }
  });

  it("TABLODAKİ HİÇBİR SATIRDA tohumlanmış bir kimlik numarası geçmez", async () => {
    // Sorgu kaydı yazıldıktan sonra tablonun tamamı taranıyor: hangi kolona
    // yazılmış olursa olsun numara oradaysa bu test kırmızı olur.
    const citizens = await prisma.kpsCitizen.findMany({
      take: 50,
      select: { nationalId: true },
    });

    expect(citizens.length).toBeGreaterThan(0);

    await prisma.kpsQueryLog.createMany({
      data: [
        {
          id: testId("log", 1),
          actorIpHash: "a".repeat(64),
          result: "success",
          durationMs: 412,
        },
        {
          id: testId("log", 2),
          actorIpHash: "b".repeat(64),
          sessionId: testId("session"),
          result: "rate_limited",
          durationMs: 0,
        },
      ],
    });

    const rows = await prisma.kpsQueryLog.findMany();
    const dump = JSON.stringify(rows);

    for (const { nationalId } of citizens) {
      expect(dump).not.toContain(nationalId);
    }
  });

  it("denetim kaydı sorgunun sonucunu ve süresini tutar", async () => {
    // Numara yazılmıyor ama kayıt İŞE YARAMALI: kim (özet), ne zaman, hangi
    // sonuç, ne kadar sürdü (05-auth-security.md).
    await prisma.kpsQueryLog.create({
      data: {
        id: testId("log", 3),
        actorIpHash: "c".repeat(64),
        result: "not_found",
        durationMs: 733,
      },
    });

    const row = await prisma.kpsQueryLog.findUniqueOrThrow({ where: { id: testId("log", 3) } });

    expect(row.result).toBe("not_found");
    expect(row.durationMs).toBe(733);
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});

describe("rate_limit_counters — sayacı sıfırlatan yarış koşulu", () => {
  const WINDOW = new Date("2026-07-31T10:00:00.000Z");

  it("aynı anahtar + aynı pencere için İKİNCİ satır açılamaz", async () => {
    // Bu kısıt olmasaydı eşzamanlı iki istek iki ayrı sayaç satırı açar,
    // ikisi de 1'de kalır ve sınır hiçbir zaman tetiklenmezdi (ADR-006).
    await prisma.rateLimitCounter.create({
      data: { id: testId("rl", 1), key: testId("kps"), windowStartedAt: WINDOW, count: 1 },
    });

    await expectUniqueViolation(() =>
      prisma.rateLimitCounter.create({
        data: { id: testId("rl", 2), key: testId("kps"), windowStartedAt: WINDOW, count: 1 },
      }),
    );
  });

  it("aynı anahtarın FARKLI penceresi serbesttir — süre dolunca yeni sayaç açılır", async () => {
    await prisma.rateLimitCounter.create({
      data: { id: testId("rl", 3), key: testId("kps"), windowStartedAt: WINDOW, count: 5 },
    });

    const nextWindow = new Date(WINDOW.getTime() + 15 * 60_000);

    await prisma.rateLimitCounter.create({
      data: { id: testId("rl", 4), key: testId("kps"), windowStartedAt: nextWindow, count: 1 },
    });

    expect(await prisma.rateLimitCounter.count({ where: { key: testId("kps") } })).toBe(2);
  });

  it("SAYAÇ ANAHTARINDA kişisel veri tutulmaz", async () => {
    // ADR-006: anahtar "amaç + tuzlanmış özet" biçimindedir. Bu test, uygulama
    // kodunun ürettiği anahtarı gerçek tabloya yazıp içinde ham IP olmadığını
    // doğruluyor.
    const { rateLimitKey } = await import("../../src/lib/rate-limit.js");
    const key = rateLimitKey("kps_lookup", "ip", "203.0.113.42");

    await prisma.rateLimitCounter.create({
      data: { id: testId("rl", 5), key, windowStartedAt: WINDOW, count: 1 },
    });

    const row = await prisma.rateLimitCounter.findUniqueOrThrow({ where: { id: testId("rl", 5) } });

    expect(row.key).not.toContain("203.0.113.42");
    expect(row.key).toMatch(/^kps_lookup:ip:[0-9a-f]{64}$/);
  });
});
