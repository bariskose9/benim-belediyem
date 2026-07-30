import { expect, test } from "@playwright/test";

test.describe("anasayfa duman testi", () => {
  test("açılır ve tek bir h1 içerir", async ({ page }) => {
    await page.goto("/");

    // docs/standards/07-ui-design-system.md: "Anlamsal başlık hiyerarşisi (tek h1)."
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("sayfa dili Türkçe olarak işaretlenmiştir", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  });

  test("yatay kaydırma oluşturmaz", async ({ page }) => {
    await page.goto("/");

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });

  test("konsolda hata ve başarısız istek yoktur", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    await page.goto("/", { waitUntil: "networkidle" });

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("local ortamda ortam şeridi görünür", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("status")).toContainText(/LOCAL|PREVIEW/);
  });
});

test.describe("sağlık ucu", () => {
  test("GET /api/health uygulamanın ayakta olduğunu bildirir", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.status).toBe("ok");
    expect(["local", "preview", "production"]).toContain(body.data.env);
    expect(body.data.commit).toBeTruthy();
  });

  test("sağlık ucu önbelleklenmez", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["cache-control"]).toContain("no-store");

    const first = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await (await request.get("/api/health")).json();

    expect(second.data.timestamp).not.toBe(first.data.timestamp);
  });
});

test.describe("arama motoru görünürlüğü", () => {
  test("production dışındaki ortamlar taranmaya kapalıdır", async ({ page, request }) => {
    // docs/standards/13-environments.md: "Preview için noindex zorunlu."
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Disallow: /");

    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
