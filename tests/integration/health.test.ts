import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/route";

/**
 * Route handler doğrudan çağrılıyor: HTTP sunucusu ayağa kaldırmadan
 * yanıt sözleşmesinin (docs/standards/03-api-guidelines.md) korunduğu doğrulanır.
 */
describe("GET /api/health", () => {
  it("200 ve tek tip başarı zarfı döner", async () => {
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).not.toHaveProperty("error");
  });

  it("uygulamanın ayakta olduğunu ve hangi ortamda çalıştığını söyler", async () => {
    const body = await GET().json();

    expect(body.data.status).toBe("ok");
    expect(["local", "preview", "production"]).toContain(body.data.env);
  });

  it("hangi sürüm ve commit'in yayında olduğunu bildirir", async () => {
    // Duman testinin işe yaraması için: "yeni sürüm gerçekten çıktı mı?"
    const body = await GET().json();

    expect(body.data.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.data.commit).toBeTruthy();
  });

  it("geçerli bir zaman damgası döner", async () => {
    const body = await GET().json();

    expect(Number.isNaN(Date.parse(body.data.timestamp))).toBe(false);
  });

  it("gizli değer veya iç detay sızdırmaz", async () => {
    const raw = JSON.stringify(await GET().json());

    for (const forbidden of [
      "DATABASE_URL",
      "postgres",
      "AUTH_SECRET",
      "/Users/",
      "node_modules",
    ]) {
      expect(raw).not.toContain(forbidden);
    }
  });

  it("önbelleğe alınmaz olarak işaretlenmiştir", async () => {
    // Önbelleğe alınırsa "sağlıklı" cevabı donar ve uç anlamsızlaşır.
    const routeModule = await import("@/app/api/health/route");

    expect(routeModule.dynamic).toBe("force-dynamic");
  });

  it("araya giren CDN'in cevabı dondurmasını engeller", () => {
    // force-dynamic yalnızca Next'in render'ını etkiliyor, yanıt başlığını değil.
    expect(GET().headers.get("cache-control")).toBe("no-store, max-age=0");
  });
});
