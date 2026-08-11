import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `robots.txt` içindeki `/api/docs` satırı (adım 18b · ADR-019).
 *
 * ⛔ Bu satır bir GÜVENLİK önlemi DEĞİLDİR ve öyle sayılmıyor: `robots.txt`
 * yalnızca iyi niyetli tarayıcıları bağlar, saldırgan onu zaten okur. Koruma
 * ucun kendisinden geliyor (production'da varsayılan `404`). Buradaki satır
 * ikinci bir katman: bayrakla açıldığı gün belge arama sonuçlarına düşmesin.
 *
 * ⭐ Test var çünkü kural sessizce kaybolabilir: `rules` dizisi bir gün
 * yeniden yazılırken satır düşerse hiçbir şey hata vermez.
 */

const envMock = vi.hoisted(() => ({
  isProductionEnv: true,
  publicEnv: { NEXT_PUBLIC_APP_URL: "https://benim-belediyem.vercel.app" },
}));

vi.mock("@/config/env", () => envMock);

beforeEach(() => {
  vi.resetModules();
  envMock.isProductionEnv = true;
});

async function loadRobots() {
  const robots = (await import("@/app/robots")).default;

  return robots();
}

describe("robots.txt", () => {
  it("production'da /api/docs taramaya kapalı", async () => {
    const rules = (await loadRobots()).rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;

    expect(disallow).toContain("/api/docs");
  });

  it("production'da sahte KPS ucu da kapalı kalmaya devam ediyor", async () => {
    // Gerileme kapısı: yeni satır eklenirken eskisinin ezilmediğini kanıtlar.
    const rules = (await loadRobots()).rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;

    expect(disallow).toContain("/api/mock-kps");
  });

  it("production DIŞINDA site tamamen kapalı", async () => {
    envMock.isProductionEnv = false;

    const rules = (await loadRobots()).rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;

    expect(disallow).toBe("/");
  });
});
