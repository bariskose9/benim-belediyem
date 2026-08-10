import { describe, expect, it } from "vitest";

import {
  COOKIE_REGISTRY,
  groupByCategory,
  hasConsentRequiringStorage,
  type CookieEntry,
} from "@/features/legal/cookie-registry";

/**
 * Çerez kayıt defterinin testleri (adım 17).
 *
 * ⛔ BURADAKİ İLK TEST BİR KAPIDIR, BİR ÖLÇÜM DEĞİL: bugün zorunlu olmayan
 * depolama YOK, dolayısıyla çerez bandı "bilgilendirme" kipinde çiziliyor ve
 * yayımladığımız çerez politikası "analitik kullanmıyoruz" diyor. Kataloğa
 * `analytics` veya `marketing` sınıfında bir satır eklenirse bu test KIRMIZIYA
 * DÖNER ve o satırı ekleyen kişi onay arayüzünü de yazmak zorunda kalır.
 * Testi "güncellemek" çözüm değildir — kırmızılık işin yarım kaldığını söyler.
 */
describe("çerez kayıt defteri", () => {
  it("bugün zorunlu olmayan hiçbir depolama kullanılmıyor", () => {
    const optional = COOKIE_REGISTRY.filter((entry) => entry.category !== "necessary");

    expect(optional).toEqual([]);
    expect(hasConsentRequiringStorage()).toBe(false);
  });

  it("onay gerektiren bir satır eklenirse bant kipi değişir", () => {
    /**
     * Yukarıdaki kapının GERÇEKTEN ölçtüğünü kanıtlar: kataloğa sahte bir
     * analitik satırı verildiğinde fonksiyon `true` dönmeli. Dönmeseydi ilk
     * test her zaman yeşil kalır ve hiçbir şey korumazdı.
     */
    const withAnalytics: readonly CookieEntry[] = [
      ...COOKIE_REGISTRY,
      {
        name: "_test_analytics",
        kind: "cookie",
        category: "analytics",
        firstParty: true,
        purpose: "test",
        lifetimeMs: 60_000,
      },
    ];

    expect(hasConsentRequiringStorage(withAnalytics)).toBe(true);
  });

  it("her kaydın adı benzersiz", () => {
    const names = COOKIE_REGISTRY.map((entry) => entry.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("her kayıt kullanıcıya anlatılabilir bir amaç taşıyor", () => {
    for (const entry of COOKIE_REGISTRY) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
      // Kısa bir amaç metni "hizmet için gerekli" gibi içi boş bir cümledir;
      // politika sayfası bundan bir şey anlatamaz.
      expect(entry.purpose.trim().length).toBeGreaterThan(30);
    }
  });

  it("sonlu ömürler pozitif, süresizler açıkça null", () => {
    for (const entry of COOKIE_REGISTRY) {
      if (entry.lifetimeMs === null) continue;

      expect(entry.lifetimeMs).toBeGreaterThan(0);
    }
  });

  it("gruplama hiçbir kaydı düşürmüyor", () => {
    const grouped = groupByCategory();
    const total = [...grouped.values()].reduce((sum, entries) => sum + entries.length, 0);

    expect(total).toBe(COOKIE_REGISTRY.length);
  });
});
