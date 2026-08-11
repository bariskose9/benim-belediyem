import { expect, test } from "@playwright/test";

import { CLS, FIRST_LOAD_JS_KB, LCP_MS, MEASURED_ROUTES, THROTTLING } from "./budget";
import { expectRoute } from "./expect-route";

/**
 * Performans bütçesi kapısı (adım 18c) — `docs/standards/09-ci-cd-deploy.md`.
 *
 * Eşikler ve neden o eşikler oldukları `budget.ts` içinde.
 */

type Measurement = {
  firstLoadJsKb: number;
  lcpMs: number;
  cls: number;
};

for (const route of MEASURED_ROUTES) {
  test(`bütçe: ${route}`, async ({ page, context }) => {
    /**
     * Kısıt sayfa AÇILMADAN ÖNCE kurulmak zorunda: `goto`'dan sonra kurulursa
     * ölçülen yükleme çoktan bitmiş olur ve kapı kısıtsız bir dünyayı ölçer.
     */
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLING.cpuSlowdownRate });
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: THROTTLING.latencyMs,
      downloadThroughput: THROTTLING.downloadBps,
      uploadThroughput: THROTTLING.uploadBps,
    });

    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: number; __cls: number };
      w.__lcp = 0;
      w.__cls = 0;

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) w.__lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });

      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          // Kullanıcının kendi tıklamasının yol açtığı kayma düzen hatası değildir.
          if (!shift.hadRecentInput) w.__cls += shift.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });

    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status(), `${route} açılmadı`).toBe(200);

    // LCP ve CLS yükleme bittikten sonra da değişebiliyor; sayfanın oturmasını bekle.
    await page.waitForTimeout(2000);
    await expectRoute(page, route);

    const measured: Measurement = await page.evaluate(() => {
      const w = window as unknown as { __lcp: number; __cls: number };
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

      /**
       * `encodedBodySize` = sıkıştırılmış hâliyle telden geçen bayt. Kullanıcının
       * indirmek zorunda kaldığı gerçek boyut bu; açılmış boyut değil.
       *
       * `loadEventEnd`'den SONRA gelen istekler sayılmıyor: Next.js görünürdeki
       * bağlantıların parçalarını önden indiriyor. Onlar BAŞKA sayfaların yükü;
       * bu sayfanın ilk yüküne yazmak bütçeyi yanlış yerde kırmızıya çevirirdi.
       */
      let jsBytes = 0;
      for (const resource of resources) {
        if (resource.name.includes(".js") && resource.startTime <= nav.loadEventEnd) {
          jsBytes += resource.encodedBodySize || 0;
        }
      }

      return {
        firstLoadJsKb: jsBytes / 1024,
        lcpMs: w.__lcp,
        cls: w.__cls,
      };
    });

    // Sayı her koşuda rapora yazılıyor: kapı kırmızıya döndüğünde "ne kadar
    // aştık" sorusunun cevabı için ayrıca koşturmak gerekmesin.
    test.info().annotations.push({
      type: "ölçüm",
      description:
        `JS ${measured.firstLoadJsKb.toFixed(1)} KB (bütçe ${FIRST_LOAD_JS_KB.current}) · ` +
        `LCP ${Math.round(measured.lcpMs)} ms (bütçe ${LCP_MS.current}) · ` +
        `CLS ${measured.cls.toFixed(4)} (bütçe ${CLS.current})`,
    });

    expect(
      measured.firstLoadJsKb,
      `${route} ilk yük JS bütçesi aşıldı — hedef ${FIRST_LOAD_JS_KB.target} KB (roadmap #108)`,
    ).toBeLessThanOrEqual(FIRST_LOAD_JS_KB.current);

    expect(measured.lcpMs, `${route} LCP bütçesi aşıldı`).toBeLessThanOrEqual(LCP_MS.current);
    expect(measured.cls, `${route} düzen kayması bütçesi aşıldı`).toBeLessThanOrEqual(CLS.current);
  });
}
