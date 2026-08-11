import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  // Her projenin kendi `testDir`i var (aşağıda); ortak bir varsayılan yok ki
  // yeni bir spec yanlışlıkla iki kapıya birden düşmesin.
  fullyParallel: true,
  // CI'da yanlışlıkla bırakılmış .only merge'i engellemesin diye kırmızı olur.
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  /**
   * Local'de İŞÇİ SAYISI SINIRLI (varsayılan: çekirdek sayısının yarısı).
   *
   * Sebep ölçüldü: adım 5'te test sayısı 92'den 118'e çıkınca beş paralel işçi,
   * tek bir Next sunucusu + tek Postgres üzerinde 30 saniyelik test zaman
   * aşımlarına ve "session closed" protokol hatalarına yol açtı. Aynı testler
   * tek tek koşturulduğunda geçiyordu, yani sorun testlerde değil yüktesti —
   * argon2 (ADR-011) bilinçli olarak CPU pahalı ve beş işçi onu aynı anda
   * zorluyor.
   *
   * Testi zayıflatmak yerine koşum ortamı düzeltiliyor. CI zaten tek işçi.
   */
  workers: isCI ? 1 : 2,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chrome", testDir: "./tests/e2e", use: { ...devices["Desktop Chrome"] } },
    {
      // docs/standards/06-testing.md: her modül 375px'te de doğrulanır.
      name: "mobile-375",
      testDir: "./tests/e2e",
      use: { ...devices["Pixel 5"], viewport: { width: 375, height: 667 } },
    },
    /**
     * Performans ve erişilebilirlik bütçesi kapıları (adım 18c).
     *
     * ⛔ AYRI PROJE, çünkü ölçüm koşum ortamına duyarlı: davranış testleriyle
     * aynı projede koşsalardı iki maliyeti olurdu — (1) her ölçüm iki kez
     * (masaüstü + 375px) koşar ve CI süresi ölçtüğü değerden fazla artardı,
     * (2) `mobile-375` cihaz profilinin kendi CPU/ekran ayarları ölçüme
     * karışırdı. Ayrıca `--project=quality` ile tek başına koşturulabiliyor.
     *
     * Mobil genişlikteki düzen kayması `desktop-chrome`/`mobile-375`
     * projelerindeki davranış testlerinin işi; burada ölçülen şey sayfanın
     * AĞIRLIĞI ve ihlalleri, ki ikisi de genişlikten bağımsız.
     */
    {
      name: "quality",
      testDir: "./tests/quality",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Geliştirme sunucusu değil, fiilen yayınlanacak üretim yapısı test edilir —
    // "local'de çalışıyordu" sorununu baştan keser (docs/standards/13-environments.md).
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    env: {
      /**
       * BOT KORUMASI E2E'DE KAPALI — ve bunu açıkça yazıyoruz.
       *
       * Turnstile anahtarları boş bırakılınca `src/lib/turnstile.ts`'in
       * BELGELENMİŞ local atlaması devreye giriyor (ADR-004: atlama yalnızca
       * local'de geçerli). Gerekçe: aksi hâlde her E2E koşusu Cloudflare'a
       * ağdan bağımlı olurdu ve dış servis yavaşladığında testler kararsızlaşırdı.
       *
       * Bunun bedeli açıkça kabul ediliyor: bu testler bot kapısını
       * DOĞRULAMIYOR. Kapının kendisi `tests/unit/turnstile.test.ts` ve
       * `tests/integration/registrations-route.test.ts` içinde kapsanıyor,
       * ayrıca tarayıcıda elle doğrulandı. Sessizce atlanan bir güvenlik
       * kapısı, hiç test edilmemiş olmasından kötüdür — o yüzden burada yazılı.
       */
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",

      /**
       * GOOGLE İSTEMCİSİ SAHTE — ve her ortamda sahte.
       *
       * Bu değerler tanımlı değilse "Google ile devam et" düğmesi bilerek hiç
       * çizilmiyor (`isGoogleLoginConfigured`), dolayısıyla E2E CI'da düğmeyi
       * bulamayıp kırmızıya dönüyordu. Gerçek anahtarı CI'ya taşımak yerine
       * sahtesi veriliyor: testler zaten Google'ın giriş ekranına hiç
       * girmiyor, yalnızca BİZİM ürettiğimiz adresin PKCE + `state` + `nonce`
       * taşıdığını doğruluyor. Sahte kimlik bunun için yeterli.
       *
       * Değerler burada sabit: `.env`'deki gerçek anahtarları da eziyorlar.
       * Böylece test sonucu geliştiricinin makinesindeki yapılandırmaya göre
       * değişmiyor.
       *
       * BEDELİ AÇIKÇA KABUL EDİLİYOR: `openid-client` akışı başlatırken
       * Google'ın `.well-known` belgesini ağdan okuyor (kimlik bilgisi
       * göndermeden, salt okuma, süreç başına bir kez önbelleklenerek).
       * Yani bu testler Google'ın erişilebilir olmasına bağlı. Alternatifi
       * üretim koduna yalnızca test için bir "issuer adresini değiştir" kapısı
       * açmaktı; dışarıdan yönlendirilebilen bir kimlik sağlayıcı adresi,
       * ağ bağımlılığından daha büyük bir risk.
       */
      GOOGLE_CLIENT_ID: "e2e-test-client-id.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "e2e-test-client-secret",
    },
  },
});
