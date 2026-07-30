import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // CI'da yanlışlıkla bırakılmış .only merge'i engellemesin diye kırmızı olur.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    {
      // docs/standards/06-testing.md: her modül 375px'te de doğrulanır.
      name: "mobile-375",
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 667 } },
    },
  ],
  webServer: {
    // Geliştirme sunucusu değil, fiilen yayınlanacak üretim yapısı test edilir —
    // "local'de çalışıyordu" sorununu baştan keser (docs/standards/13-environments.md).
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
