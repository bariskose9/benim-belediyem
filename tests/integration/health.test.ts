import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Veritabanı taklit ediliyor: bu testler sağlık ucunun KARAR mantığını doğruluyor
// (ulaşılabiliyorsa 200, ulaşılamıyorsa 503). Gerçek veritabanıyla uçtan uca
// doğrulama E2E testinde yapılıyor.
const queryRaw = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: queryRaw } }));

async function callHealth() {
  const { GET } = await import("@/app/api/health/route");

  return GET();
}

describe("GET /api/health — veritabanı ayakta", () => {
  beforeEach(() => {
    vi.resetModules();
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  });

  it("200 ve tek tip başarı zarfı döner", async () => {
    const response = await callHealth();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).not.toHaveProperty("error");
  });

  it("uygulamanın ve veritabanının durumunu ayrı ayrı bildirir", async () => {
    const body = await (await callHealth()).json();

    expect(body.data.status).toBe("ok");
    expect(body.data.app).toBe("ok");
    expect(body.data.db).toBe("ok");
  });

  it("hangi ortam, sürüm ve commit'in yayında olduğunu söyler", async () => {
    const body = await (await callHealth()).json();

    expect(["local", "preview", "production"]).toContain(body.data.env);
    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.data.commit).toBeTruthy();
    expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
  });

  it("araya giren CDN'in cevabı dondurmasını engeller", async () => {
    // force-dynamic yalnızca Next'in render'ını etkiliyor, yanıt başlığını değil.
    expect((await callHealth()).headers.get("cache-control")).toBe("no-store, max-age=0");
  });

  it("gizli değer veya iç detay sızdırmaz", async () => {
    const raw = JSON.stringify(await (await callHealth()).json());

    for (const forbidden of [
      "postgresql://",
      "belediye",
      "AUTH_SECRET",
      "/Users/",
      "node_modules",
    ]) {
      expect(raw).not.toContain(forbidden);
    }
  });

  it("önbelleğe alınmaz olarak işaretlenmiştir", async () => {
    const routeModule = await import("@/app/api/health/route");

    expect(routeModule.dynamic).toBe("force-dynamic");
  });
});

describe("GET /api/health — veritabanı düşük", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("veritabanına ulaşılamıyorsa 503 döner", async () => {
    queryRaw.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5432"));

    const response = await callHealth();

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("hangi parçanın düştüğünü söyler", async () => {
    queryRaw.mockRejectedValue(new Error("down"));

    const body = await (await callHealth()).json();

    expect(body.error.details.app).toBe("ok");
    expect(body.error.details.db).toBe("down");
  });

  it("hata mesajı Türkçe ve eyleme dönük", async () => {
    queryRaw.mockRejectedValue(new Error("down"));

    const body = await (await callHealth()).json();

    expect(body.error.message).toMatch(/tekrar deneyin/i);
  });

  it("bağlantı hatasının içeriğini istemciye sızdırmaz", async () => {
    // Gerçek hata sunucu log'una gitmeli, istemciye ASLA.
    queryRaw.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.5:5432 /Users/gizli/db.ts"));

    const raw = JSON.stringify(await (await callHealth()).json());

    expect(raw).not.toContain("ECONNREFUSED");
    expect(raw).not.toContain("/Users/");
    expect(raw).not.toContain("10.0.0.5");
  });

  it("veritabanı cevap vermezse süresiz beklemez", async () => {
    // Askıda kalan bir sorgu sağlık ucunu kilitlerse izleme aracı
    // "yavaş" ile "çökmüş" arasındaki farkı göremez.
    vi.useFakeTimers();
    queryRaw.mockReturnValue(new Promise(() => {}));

    const responsePromise = callHealth();
    await vi.advanceTimersByTimeAsync(3_500);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    vi.useRealTimers();
  });
});
