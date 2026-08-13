import { expect, test } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { COOKIE_REGISTRY } from "../../src/features/legal/cookie-registry";
import { LEGAL_PAGES } from "../../src/features/legal/legal-pages";

/**
 * Yasal sayfalar ve çerez bildirimi (PRD §5.10 · adım 17).
 *
 * ⛔ BU DOSYA GİRİŞ YAPMIYOR ve bu bilinçli: aydınlatma yükümlülüğü kişi hesap
 * açmadan ÖNCE de geçerli. Testler ziyaretçi gözüyle koşuyor.
 *
 * İki ekran boyutunda da koşuyor (`playwright.config.ts`).
 */

const legalCopy = messages.legal;

/**
 * Alt bilgi bağlantıları HER ZAMAN kendi `nav`'ının içinde aranıyor.
 *
 * Yasal belgeler birbirine de bağlantı veriyor ("Diğer yasal belgeler"), yani
 * sayfanın tamamında "Çerez Politikası" aramak iki eşleşme bulur ve test
 * "hangisi?" diye takılır (adım 15b'de öğrenilen tuzak).
 */
function footerNav(page: import("@playwright/test").Page) {
  return page.getByRole("navigation", { name: messages.footer.legalNavLabel });
}

test.describe("çerez bildirimi", () => {
  test("ziyaretçiye çıkıyor, kabul edilince kayboluyor ve geri gelmiyor", async ({ page }) => {
    await page.goto("/");

    const notice = page.getByRole("complementary", { name: legalCopy.cookieNotice.regionLabel });

    await expect(notice).toBeVisible();
    await expect(notice.getByText(legalCopy.cookieNotice.title)).toBeVisible();

    /**
     * ⛔ "REDDET" DÜĞMESİ OLMAMALI. Bugün zorunlu olmayan tek bir çerez bile
     * yok; reddedilecek bir şey yokken reddet düğmesi göstermek kullanıcıyı
     * yanıltır. Kataloğa `analytics` satırı eklenirse bu beklenti de
     * değişmek zorunda — yani onay arayüzü yazılmadan analitik eklenemez.
     */
    await expect(notice.getByRole("button")).toHaveCount(1);

    await notice.getByRole("button", { name: legalCopy.cookieNotice.acknowledgeAction }).click();

    // Uç 303 ile geri yönlendiriyor: kullanıcı geldiği sayfada kalmalı.
    await page.waitForURL("**/");
    await expect(notice).toHaveCount(0);

    // Asıl kanıt: tercih SAKLANIYOR mu?
    await page.reload();
    await expect(
      page.getByRole("complementary", { name: legalCopy.cookieNotice.regionLabel }),
    ).toHaveCount(0);

    // Başka bir sayfada da çıkmamalı — çerez tüm siteye yazılıyor.
    await page.goto("/hakkimizda");
    await expect(
      page.getByRole("complementary", { name: legalCopy.cookieNotice.regionLabel }),
    ).toHaveCount(0);
  });

  test("çerez politikasından tercih geri alınabiliyor", async ({ page }) => {
    await page.goto("/");

    const notice = page.getByRole("complementary", { name: legalCopy.cookieNotice.regionLabel });

    await notice.getByRole("button", { name: legalCopy.cookieNotice.acknowledgeAction }).click();
    await page.waitForURL("**/");

    await page.goto("/cerez-politikasi");

    const status = page.getByRole("region", { name: legalCopy.cookies.status.heading });

    await expect(status.getByText(legalCopy.cookies.status.acknowledged)).toBeVisible();

    await status.getByRole("button", { name: legalCopy.cookies.status.withdrawAction }).click();
    await page.waitForURL("**/cerez-politikasi");

    // Geri alındı: durum değişti VE bant yeniden çıktı.
    await expect(
      page
        .getByRole("region", { name: legalCopy.cookies.status.heading })
        .getByText(legalCopy.cookies.status.notAcknowledged),
    ).toBeVisible();

    await expect(
      page.getByRole("complementary", { name: legalCopy.cookieNotice.regionLabel }),
    ).toBeVisible();
  });
});

test.describe("yasal sayfalar", () => {
  test("alt bilgideki bağlantılar dört belgeye de götürüyor", async ({ page }) => {
    for (const legalPage of LEGAL_PAGES) {
      await page.goto("/");

      await footerNav(page).getByRole("link", { name: legalPage.linkLabel }).click();
      await page.waitForURL(`**${legalPage.slug}`);

      // Her belgenin TEK bir `h1`'i olmalı — arama motoru ve ekran okuyucu için.
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

      // Feragat her yasal sayfada tekrarlanıyor: arama sonucundan doğrudan
      // açan kullanıcı alt bilgideki uyarıyı hiç görmemiş olabilir.
      await expect(page.getByText(legalCopy.common.disclaimer)).toBeVisible();

      // Yürürlük tarihi görünür olmalı: "hangi metni okudum" sorusunun cevabı.
      await expect(page.getByText(legalCopy.common.effectiveDate)).toBeVisible();
    }
  });

  test("çerez politikası tarayıcıda saklanan her şeyi listeliyor", async ({ page }) => {
    await page.goto("/cerez-politikasi");

    /**
     * ⛔ TABLO KAYIT DEFTERİNDEN ÇİZİLİYOR: testin defteri okuyup her satırı
     * ekranda araması, "belge gerçekle uyumlu mu" sorusunun tek dürüst
     * cevabı. Elle yazılmış bir liste bu testi geçemezdi.
     */
    for (const entry of COOKIE_REGISTRY) {
      await expect(page.getByText(entry.name, { exact: true })).toBeVisible();
    }

    // Bugün dolu olan tek grup "Zorunlu"; diğer ikisi boş olduğunu söylemeli.
    await expect(page.getByText(legalCopy.cookies.categories.emptyGroup).first()).toBeVisible();
  });

  test("geçersiz hata kodu ekrana basılmıyor", async ({ page }) => {
    /**
     * ⛔ İÇERİK ENJEKSİYONU KORUMASI: adresteki değer doğrudan yazılsaydı
     * saldırgan bu sayfaya istediği metni gösteren bir bağlantı dağıtabilirdi.
     * Bilinmeyen kod SESSİZCE düşürülüyor.
     */
    await page.goto("/cerez-politikasi?hata=Hesabiniz+askiya+alindi");

    await expect(page.getByText("Hesabiniz askiya alindi")).toHaveCount(0);
  });

  test("başka bir siteden gönderilen rıza formu reddediliyor", async ({ page, baseURL }) => {
    /**
     * ⛔ CSRF: bu uç düz bir form kabul ediyor, yani saldırganın sayfasındaki
     * gizli bir form kurbanın tarayıcısından buraya POST atabilir. Çerezler
     * `sameSite: lax` olduğu için kurbanın ziyaretçi kimliği O İSTEKLE
     * GİTMEZ; uç yeni bir kimlik üretip cevapla kurbanın gerçek kimliğini
     * EZERDİ (sepeti ve hız sınırı sayacı sıfırlanırdı).
     */
    const forged = await page.request.post("/api/v1/consents", {
      form: { consentType: "necessary_cookies", isGranted: "1" },
      headers: { Origin: "https://sahte.example" },
      maxRedirects: 0,
    });

    expect(forged.status()).toBe(303);
    expect(forged.headers().location).toContain("hata=INVALID_CONSENT_REQUEST");

    // Aynı istek KENDİ sitemizden gelince kabul ediliyor: kapı meşru
    // kullanıcıyı dışarıda bırakmıyor.
    const genuine = await page.request.post("/api/v1/consents", {
      form: { consentType: "necessary_cookies", isGranted: "1" },
      headers: { Origin: baseURL ?? "http://localhost:3000" },
      maxRedirects: 0,
    });

    expect(genuine.status()).toBe(303);
    expect(genuine.headers().location).not.toContain("hata=");
  });

  test("site haritası yasal sayfaları ilan ediyor", async ({ page }) => {
    const response = await page.request.get("/sitemap.xml");

    expect(response.status()).toBe(200);

    const body = await response.text();

    for (const legalPage of LEGAL_PAGES) {
      expect(body).toContain(legalPage.slug);
    }
  });
});
