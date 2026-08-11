import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { expectRoute } from "./expect-route";

/**
 * Erişilebilirlik kapısı (adım 18c, teknik borç #11).
 *
 * `docs/standards/09-ci-cd-deploy.md` bu kapıyı yazılı olarak istiyordu ama
 * ölçen bir şey yoktu. CLAUDE.md §5.7 ölçütü WCAG 2.1 AA.
 */

/**
 * ⛔ AXE HER ŞEYİ BULMAZ — ve bunu bilerek yazıyoruz.
 *
 * Otomatik denetim, erişilebilirlik hatalarının yaklaşık üçte birini yakalar:
 * eksik `alt`, yetersiz kontrast, etiketsiz form alanı gibi MAKİNE İLE
 * ÖLÇÜLEBİLİR olanları. "Bu `alt` metni resmi gerçekten anlatıyor mu",
 * "klavye sırası mantıklı mı", "ekran okuyucuda anlaşılıyor mu" sorularının
 * cevabı burada DEĞİL. Bu kapının yeşil olması "erişilebilir" demek değil,
 * "ölçülebilir ihlal yok" demektir. Elle doğrulama bunun yerine geçmez.
 */

/**
 * Yalnızca WCAG 2.1 AA kuralları. Axe'ın "best-practice" kuralları da var ama
 * onlar bir standardın gereği değil, tavsiye; merge'i onlarla engellemek
 * kapıyı tartışmaya açık hâle getirirdi.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Kırmızıya döndüren ağırlık seviyeleri.
 *
 * Standart "kritik ihlal" diyor; `serious` de kapıya alındı çünkü 2026-08-11'de
 * ÖLÇÜLDÜ: bu seviyede duran bir ihlal yok, yani bedava sıkılan bir vida.
 * `moderate` ve `minor` bilerek dışarıda — bugün geçmeyen maddeler var ve
 * onları kapıya almak kapıyı ilk günden kırmızı yapardı (bkz. `budget.ts`,
 * cırcır ilkesi).
 */
const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

/**
 * Giriş gerektirmeyen sayfalar — kapı bir oturum akışına bağlanmasın diye.
 * Listenin neden yalnızca genel sayfalardan oluştuğu: `expect-route.ts`.
 */
const ROUTES = [
  "/",
  "/market",
  "/etkinlikler",
  "/sepet",
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/restoran",
  "/hakkimizda",
  "/iletisim",
  "/gizlilik",
  "/kullanim-sartlari",
  "/cerez-politikasi",
];

for (const route of ROUTES) {
  test(`erişilebilirlik: ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status(), `${route} açılmadı`).toBe(200);
    await expectRoute(page, route);

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const blocking = results.violations.filter(
      (violation) => violation.impact && BLOCKING_IMPACTS.has(violation.impact),
    );

    // Kapıya girmeyen ihlaller de rapora yazılıyor: görülmeyen borç ödenmez.
    const informational = results.violations.filter(
      (violation) => !violation.impact || !BLOCKING_IMPACTS.has(violation.impact),
    );

    if (informational.length > 0) {
      test.info().annotations.push({
        type: "erişilebilirlik (kapıya girmiyor)",
        description: informational
          .map((violation) => `${violation.impact}: ${violation.id} (${violation.nodes.length})`)
          .join(" · "),
      });
    }

    expect(
      blocking.map(
        (violation) =>
          `${violation.impact}: ${violation.id} — ${violation.help}\n` +
          violation.nodes.map((node) => `    ${node.target.join(" ")}`).join("\n"),
      ),
      `${route} sayfasında WCAG 2.1 AA ihlali`,
    ).toEqual([]);
  });
}
