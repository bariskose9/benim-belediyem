import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { cleanupRegistration, prisma } from "../db/helpers";

/**
 * Kayıt akışı — uçtan uca (PRD §5.0 kabul kriterleri · 06-testing.md).
 *
 * Üretim yapısına karşı çalışır (`npm run build && npm run start`) ve hem
 * masaüstünde hem 375px'te koşar.
 *
 * BOT KORUMASI BU TESTLERDE KAPALI (gerekçe `playwright.config.ts` içinde).
 * Doğrulama kodu local ve preview'da ekranda göründüğü için akış
 * otomatikleştirilebiliyor; production'da o kutu hiç render edilmez.
 *
 * TESTLER BİRBİRİNDEN BAĞIMSIZ (06-testing.md). Bunu iki şey sağlıyor:
 *  1. Her testin KENDİ kimlik numarası var. Paylaşılsaydı, `startRegistration`
 *     eski taslakları sildiği için paralel testler birbirinin kaydını yok ederdi.
 *  2. Her testin KENDİ istemci IP'si var. Kimlik sorgusu IP başına 5 deneme /
 *     15 dakika ile sınırlı; paylaşılsaydı altıncı test hız sınırına takılırdı.
 *     Sınır KAPATILMIYOR — `readActorIp` zaten `x-forwarded-for` okuyor.
 */

/**
 * Tohumlanmış, 18 yaşından büyük ve HENÜZ HESABI OLMAYAN vatandaşlar.
 * Tohumlama deterministik olduğu için bu numaralar her kurulumda aynıdır
 * (`docs/project/fake-data-guide.md`).
 */
const CITIZENS = [
  { nationalId: "90142554820", birthYear: "1992" },
  { nationalId: "90196316016", birthYear: "1968" },
  { nationalId: "90266293186", birthYear: "1996" },
  { nationalId: "90357057130", birthYear: "1986" },
  { nationalId: "90450793096", birthYear: "1955" },
  { nationalId: "90509764190", birthYear: "1977" },
  { nationalId: "90652585864", birthYear: "1968" },
  { nationalId: "90743720204", birthYear: "1951" },
  { nationalId: "90803518352", birthYear: "1978" },
  { nationalId: "90843323664", birthYear: "1966" },
  { nationalId: "90886118012", birthYear: "1978" },
  { nationalId: "90948396952", birthYear: "1960" },
  { nationalId: "91197172052", birthYear: "1983" },
  { nationalId: "91211855732", birthYear: "1952" },
] as const;

const UNDER_18 = { nationalId: "90822561452", birthYear: "2010" };
const TURNS_18_TODAY = { nationalId: "92050662178", birthYear: "2008" };
const NOT_FOUND = { nationalId: "99918365820", birthYear: "1970" };

const PASSWORD = "yesil-orman-88";

/** Test + proje kombinasyonuna sabit bir vatandaş atar. */
function citizenFor(testInfo: TestInfo) {
  const projectOffset = testInfo.project.name === "mobile-375" ? CITIZENS.length / 2 : 0;
  const index = (testInfo.workerIndex + testInfo.line + projectOffset) % CITIZENS.length;

  return CITIZENS[Math.floor(index)];
}

function emailFor(nationalId: string): string {
  return `e2e.${nationalId}@ornek.test`;
}

/**
 * Telefon da vatandaşa özel olmalı.
 *
 * Sabit bir numara paylaşılsaydı "aynı hedefe 3 kod / 15 dakika" gönderim
 * sınırı (05-auth-security.md) iki proje arasında paylaşılır ve ikincisi
 * takılırdı. Kural doğru çalıştığı için testin ona uyması gerekiyor.
 */
function phoneFor(nationalId: string): string {
  return `0533${nationalId.slice(-7)}`;
}

async function hashOf(nationalId: string): Promise<string> {
  const { hashNationalId } = await import("../../src/lib/crypto");

  return hashNationalId(nationalId, process.env.NATIONAL_ID_HASH_SALT!);
}

/** Her test kendi verisini kurar ve temizler (06-testing.md). */
async function cleanupFor(nationalId: string) {
  await cleanupRegistration(emailFor(nationalId), await hashOf(nationalId));
}

test.afterAll(async () => {
  for (const citizen of CITIZENS) await cleanupFor(citizen.nationalId);
  await cleanupFor(TURNS_18_TODAY.nationalId);
  await prisma.$disconnect();
});

/**
 * Her KOŞU kendi IP bloğunu alır.
 *
 * Sabit bir blok kullanılsaydı, arka arkaya iki koşu aynı adresleri kullanır ve
 * ikincisi birincinin 15 dakikalık hız sınırı sayacına takılırdı — testler
 * "bazen geçen" hâle gelirdi. Bu tam olarak `06-testing.md`'nin yasakladığı
 * kararsız (flaky) testtir.
 *
 * 198.51.100.0/24 belgelendirme için ayrılmış TEST-NET-2 bloğudur; gerçek
 * bir adrese denk gelmez.
 */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

async function assignOwnIp(page: Page) {
  ipCounter += 1;

  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
}

async function submitIdentity(page: Page, nationalId: string, birthYear: string) {
  await assignOwnIp(page);
  await page.goto("/kayit");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Doğum yılı").fill(birthYear);
  await page.getByRole("button", { name: "Kimliğimi doğrula" }).click();
}

/**
 * Panelde "Yeni kod gönder"e basıp ekranda görünen simülasyon kodunu okur.
 *
 * Panel, erişilebilir BÖLGE adıyla hedefleniyor (`<section aria-labelledby>`);
 * `form` veya CSS sınıfı gibi yapıya bağlı seçiciler biçim değişince kırılırdı.
 */
async function revealCode(panel: ReturnType<Page["locator"]>): Promise<string> {
  // Test ortamında düğme "Kodu göster" der (gönderim yok, gösterim var);
  // production'da "Yeni kod gönder". E2E her zaman test ortamında koşuyor.
  await panel.getByRole("button", { name: "Kodu göster" }).click();

  const notice = panel.getByText(/Test ortamı — doğrulama kodu:/);
  await expect(notice).toBeVisible();

  const code = ((await notice.textContent()) ?? "").match(/\b(\d{6})\b/)?.[1];
  expect(code, "simülasyon kodu ekranda bulunamadı").toBeTruthy();

  return code!;
}

test("kayıt akışı baştan sona tamamlanır", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);
  await cleanupFor(citizen.nationalId);

  await submitIdentity(page, citizen.nationalId, citizen.birthYear);

  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);
  await expect(page.getByText("Bu bilgiler nüfus kayıtlarından geldi")).toBeVisible();

  await page.getByLabel("E-posta adresi").fill(emailFor(citizen.nationalId));
  await page.getByLabel("Cep telefonu").fill(phoneFor(citizen.nationalId));
  await page.getByLabel("Şifre", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Şifre (tekrar)").fill(PASSWORD);
  await page.getByRole("button", { name: "Doğrulama kodlarını gönder" }).click();

  await expect(page).toHaveURL(/\/kayit\/dogrulama$/);

  const emailPanel = page.getByRole("region", { name: "E-posta kodu" });
  await emailPanel.getByLabel("6 haneli kod").fill(await revealCode(emailPanel));
  await emailPanel.getByRole("button", { name: "Doğrula", exact: true }).click();

  // PRD §5.0: tek kanal doğrulanınca hesap AÇILMAZ.
  await expect(page.getByText("Doğrulandı")).toBeVisible();
  await expect(page).toHaveURL(/\/kayit\/dogrulama$/);

  const phonePanel = page.getByRole("region", { name: "Telefon kodu" });
  await phonePanel.getByLabel("6 haneli kod").fill(await revealCode(phonePanel));
  await phonePanel.getByRole("button", { name: "Doğrula", exact: true }).click();

  await expect(page).toHaveURL(/\/kayit\/tamamlandi$/);
  await expect(page.getByRole("heading", { name: "Hesabınız oluşturuldu" })).toBeVisible();
});

test("18 yaşını doldurmamış kişi reddedilir ve gerekçesi yazar", async ({ page }) => {
  await submitIdentity(page, UNDER_18.nationalId, UNDER_18.birthYear);

  await expect(page.getByText("Bu hizmet 18 yaşını doldurmuş vatandaşlara açıktır.")).toBeVisible();
  await expect(page).toHaveURL(/\/kayit$/);
});

test("bugün 18 yaşını dolduran kişi kabul edilir — sınır durumu", async ({ page }) => {
  await cleanupFor(TURNS_18_TODAY.nationalId);

  await submitIdentity(page, TURNS_18_TODAY.nationalId, TURNS_18_TODAY.birthYear);

  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);
});

test("kayıtlı olmayan numarada tek tip hata çıkar", async ({ page }) => {
  await submitIdentity(page, NOT_FOUND.nationalId, NOT_FOUND.birthYear);

  await expect(page.getByText("Girdiğiniz bilgiler doğrulanamadı")).toBeVisible();
  await expect(page).toHaveURL(/\/kayit$/);
});

test("yanlış doğum yılı, bulunamayan numarayla AYNI mesajı verir", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);

  await submitIdentity(page, citizen.nationalId, "1970");

  // Farklı bir mesaj, saldırgana "bu numara var, sadece yılı bilmiyorsun"
  // bilgisini verirdi (05-auth-security.md).
  await expect(page.getByText("Girdiğiniz bilgiler doğrulanamadı")).toBeVisible();
});

test("sayfada ve ağ yanıtlarında TAM kimlik numarası geçmez", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);
  await cleanupFor(citizen.nationalId);
  const bodies: string[] = [];

  page.on("response", async (response) => {
    if (!response.url().includes("/api/registrations")) return;
    try {
      bodies.push(await response.text());
    } catch {
      // Gövdesi okunamayan yanıtlar atlanır.
    }
  });

  await submitIdentity(page, citizen.nationalId, citizen.birthYear);
  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);

  expect(await page.content()).not.toContain(citizen.nationalId);
  expect(bodies.join(" ")).not.toContain(citizen.nationalId);

  const masked = `${citizen.nationalId.slice(0, 3)}******${citizen.nationalId.slice(-2)}`;
  await expect(page.getByText(masked)).toBeVisible();
});

test("kayıt akışının ilk adımı yalnızca klavyeyle tamamlanabilir", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);
  await cleanupFor(citizen.nationalId);

  await assignOwnIp(page);
  await page.goto("/kayit");

  await page.keyboard.press("Tab");
  await page.keyboard.type(citizen.nationalId);
  await page.keyboard.press("Tab");
  await page.keyboard.type(citizen.birthYear);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);
});

test("375px'te yatay kaydırma yoktur", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);
  await cleanupFor(citizen.nationalId);

  await submitIdentity(page, citizen.nationalId, citizen.birthYear);
  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);

  // En yoğun ekran: 11 satırlık kimlik özeti + form.
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});

test("dark mode açıkken metinler okunabilir kalır", async ({ page }) => {
  await page.goto("/kayit");
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  const colors = await page.evaluate(() => {
    const body = getComputedStyle(document.body);

    return { background: body.backgroundColor, text: body.color };
  });

  expect(colors.background).not.toBe(colors.text);
  await expect(page.getByRole("heading", { name: "Kimlik doğrulama" })).toBeVisible();
});

test("6. denemede hız sınırı devreye girer", async ({ page }) => {
  // PRD kabul kriteri: "6. denemede hız sınırı devreye girer (429)."
  // Tek IP'den art arda deneniyor; sınır tam olarak bunun için var.
  await assignOwnIp(page);
  await page.goto("/kayit");

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.getByLabel("T.C. kimlik numarası").fill(NOT_FOUND.nationalId);
    await page.getByLabel("Doğum yılı").fill(NOT_FOUND.birthYear);
    await page.getByRole("button", { name: "Kimliğimi doğrula" }).click();
    await expect(page.getByText("Girdiğiniz bilgiler doğrulanamadı")).toBeVisible();
  }

  await page.getByRole("button", { name: "Kimliğimi doğrula" }).click();

  await expect(page.getByText("Çok fazla deneme yaptınız")).toBeVisible();
});

test("mutlu yolda konsol hatası ve başarısız istek yoktur", async ({ page }, testInfo) => {
  const citizen = citizenFor(testInfo);
  await cleanupFor(citizen.nationalId);

  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  await submitIdentity(page, citizen.nationalId, citizen.birthYear);
  await expect(page).toHaveURL(/\/kayit\/bilgiler$/);

  expect(failedRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
