import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";

/**
 * Görsel iskeletin testleri (roadmap adım 5).
 *
 * Bu dosya İKİ EKRAN BOYUTUNDA da koşuyor (`playwright.config.ts`: masaüstü ve
 * 375px). Ekran boyutuna göre farklı davranan testler `test.skip` ile kendi
 * projesine sınırlanıyor — aynı testi iki farklı beklentiyle yazmak yerine.
 */

const MOBILE_BREAKPOINT = 768;

function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < MOBILE_BREAKPOINT;
}

/**
 * Menü bağlantıları HER ZAMAN menünün içinde aranıyor.
 *
 * Ana sayfadaki hizmet kartları da aynı sayfalara bağlanıyor; sayfanın
 * tamamında "Hastane" aramak ikisini birden bulur ve test "hangisi?" diye
 * takılır. Doğru çözüm testi gevşetmek değil, doğru yere bakmak.
 */
function mainMenu(page: Page) {
  return page.getByRole("navigation", { name: messages.nav.label });
}

test.describe("tema", () => {
  test("düğme temayı değiştirir ve tercih sayfa yenilenince korunur", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    // Düğmenin adı da temaya göre değişmeli: ekran okuyucu kullanıcısı hangi
    // yöne geçeceğini bilmeli.
    await page.getByRole("button", { name: messages.theme.switchToDark }).click();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: messages.theme.switchToLight })).toBeVisible();

    // Asıl kanıt burada: tercih SAKLANIYOR mu?
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.getByRole("button", { name: messages.theme.switchToLight }).click();
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("tercih başka bir sayfaya geçince de geçerli olur", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: messages.theme.switchToDark }).click();

    await page.goto("/giris");

    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("üst menü", () => {
  test("logo ana sayfaya götürür", async ({ page }) => {
    await page.goto("/giris");

    await page.getByRole("link", { name: messages.app.name }).click();

    // `waitForURL` yönlendirme zaman aşımını kullanıyor; `toHaveURL`ün 5 sn'lik
    // sınırı, testler paralel koşarken sunucu yavaşladığında kırmızı veriyordu.
    await page.waitForURL(/^https?:\/\/[^/]+\/$/);
  });

  test("masaüstünde menü bağlantıları doğrudan görünür", async ({ page }) => {
    test.skip(isMobile(page), "yalnızca masaüstü düzeni");

    await page.goto("/");

    await expect(mainMenu(page).getByRole("link", { name: messages.nav.hospital })).toBeVisible();
    await expect(mainMenu(page).getByRole("link", { name: messages.nav.gym })).toBeVisible();
    // Menü düğmesi masaüstünde hiç olmamalı.
    await expect(page.getByRole("button", { name: messages.nav.openMenu })).toBeHidden();
  });

  test("mobilde menü açılıp kapanır", async ({ page }) => {
    test.skip(!isMobile(page), "yalnızca mobil düzen");

    await page.goto("/");

    const openButton = page.getByRole("button", { name: messages.nav.openMenu });
    const hospitalLink = mainMenu(page).getByRole("link", { name: messages.nav.hospital });

    await expect(openButton).toHaveAttribute("aria-expanded", "false");
    await expect(hospitalLink).toBeHidden();

    await openButton.click();

    await expect(hospitalLink).toBeVisible();

    await page.getByRole("button", { name: messages.nav.closeMenu }).click();

    await expect(hospitalLink).toBeHidden();
  });

  test("mobilde bağlantıya basınca menü kapanır", async ({ page }) => {
    test.skip(!isMobile(page), "yalnızca mobil düzen");

    await page.goto("/");
    await page.getByRole("button", { name: messages.nav.openMenu }).click();
    await mainMenu(page).getByRole("link", { name: messages.nav.hospital }).click();

    /**
     * HEDEF `/hastane` DEĞİL, GİRİŞ EKRANI — ve bu doğru davranış.
     *
     * Hastane personele özel; giriş yapmamış ziyaretçi `guardPage` tarafından
     * dönüş adresiyle birlikte `/giris`'e yollanıyor (PRD §5.0). Test önceden
     * `/hastane$` bekliyordu ve geçiyordu, ama YANILTICI biçimde: yönlendirme
     * tamamlanmadan önceki GEÇİCİ adresi yakalıyordu. Adım 6'da sayfaya
     * `loading.tsx` eklenince o zamanlama değişti ve test kırmızıya döndü —
     * yani test bir davranış değişikliğini değil, kendi kırılganlığını
     * bildirdi. Beklenti artık kalıcı sonuca bakıyor.
     */
    await expect(page).toHaveURL(/\/giris\?.*donus=%2Fhastane/);
    // Yeni sayfada kullanıcıyı karşılayan şey menü değil içerik olmalı.
    await expect(page.getByRole("button", { name: messages.nav.openMenu })).toBeVisible();
  });

  test("giriş bağlantısı menü açılmadan da görünür", async ({ page }) => {
    // En kritik eylem her ekran boyutunda tek dokunuş uzaklıkta olmalı.
    await page.goto("/");

    await expect(page.getByRole("link", { name: messages.nav.login })).toBeVisible();
  });
});

test.describe("erişilebilirlik", () => {
  test("klavyeyle gelen ilk odak içeriğe atlama bağlantısıdır", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: messages.nav.skipToContent });
    await expect(skipLink).toBeFocused();
    // Normalde gizli, odaklanınca GÖRÜNÜR olmalı — görünmeyen bir atlama
    // bağlantısı klavye kullanıcısına yardımcı olmaz.
    await expect(skipLink).toBeVisible();
  });

  test("sayfada tek bir h1 bulunur", async ({ page }) => {
    for (const path of ["/", "/giris", "/kayit"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });
});

test.describe("düzen", () => {
  test("hiçbir sayfa yatay kaydırma oluşturmaz", async ({ page }) => {
    for (const path of ["/", "/giris", "/kayit", "/sifremi-unuttum", "/hastane"]) {
      await page.goto(path);

      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows, `${path} yatay kaydırma oluşturuyor`).toBe(false);
    }
  });

  test("alt bilgi her sayfada gerçek kurum olmadığını yazar", async ({ page }) => {
    for (const path of ["/", "/giris"]) {
      await page.goto(path);

      await expect(
        page.getByText("Bu site gerçek bir belediyeye ait değildir", { exact: false }),
      ).toBeVisible();
    }
  });
});

test.describe("hizmet ızgarası", () => {
  test("açılmamış hizmet tıklanabilir bağlantı değildir", async ({ page }) => {
    await page.goto("/");

    // 404'e giden bir kart, kartın hiç olmamasından kötüdür.
    const marketTitle = page.getByText(messages.services.market.title, { exact: true });
    await expect(marketTitle).toBeVisible();
    await expect(page.getByRole("link", { name: messages.services.market.title })).toHaveCount(0);

    // Durum yalnızca renkle değil metinle de belirtilmeli.
    await expect(page.getByText(messages.badges.comingSoon).first()).toBeVisible();
  });

  test("açık hizmet kendi sayfasına götürür", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: new RegExp(messages.services.hospital.title) }).click();

    /**
     * Kart hastane hizmetine götürüyor; ziyaretçi giriş yapmadığı için kapı
     * onu dönüş adresiyle giriş ekranına yolluyor (PRD §5.0). Dönüş adresinin
     * `/hastane` olması, kartın DOĞRU hedefe bağlandığının kanıtı — kart kırık
     * olsaydı burada başka bir dönüş adresi görünürdü.
     *
     * Beklenti eskiden `/hastane$` idi ve yönlendirme öncesi geçici adresi
     * yakaladığı için geçiyordu; ayrıntı yukarıdaki menü testinde yazılı.
     */
    await expect(page).toHaveURL(/\/giris\?.*donus=%2Fhastane/);
  });
});
