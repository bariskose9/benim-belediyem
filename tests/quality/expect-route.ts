import { expect, type Page } from "@playwright/test";

/**
 * "Ölçtüğün sayfa, ölçtüğünü sandığın sayfa mı?"
 *
 * ⛔⛔ BU YARDIMCI BİR RAHATLIK DEĞİL, KAPININ KENDİSİNİN KAPISI.
 *
 * Giriş gerektiren bir sayfada `page.goto` **200 döndürüyor**: `guardPage()`
 * sunucuda `redirect()` çağırıyor ama sayfada `loading.tsx` olduğu için Next
 * önce bir kabuk akıtıyor, yönlendirme hidrasyondan SONRA uygulanıyor. Yani
 * durum koduna bakan bir kontrol bu durumu GÖREMİYOR.
 *
 * Bunu ölçerek öğrendik (2026-08-11): bütçe listesinde yanlışlıkla duran
 * `/spor-salonu` sayfasının LCP'si 240 ms ölçülmüştü ve tüm sayfaların en
 * hızlısı görünüyordu — çünkü ölçülen sayfa spor salonu değil, giriş
 * sayfasıydı. Kapı yeşildi ve hiçbir şey ölçmüyordu.
 *
 * Adım 18b'nin dersi aynen geçerli: bir testin ölçtüğü şeyi, ölçtüğünü
 * sandığın şeyle karıştırma.
 */
export async function expectRoute(page: Page, route: string): Promise<void> {
  // Yönlendirme hidrasyondan sonra geliyor; anlık bakmak onu kaçırır.
  await page.waitForLoadState("networkidle");

  expect(
    new URL(page.url()).pathname,
    `${route} başka bir sayfaya yönlendirdi — bu sayfa giriş gerektiriyor ` +
      `olabilir ve ölçüm yanlış sayfayı ölçüyor`,
  ).toBe(route);
}
