import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma, testId } from "../db/helpers";

/**
 * Şifre sıfırlama — uçtan uca (PRD §5.0 "Şifre sıfırlama" · 06-testing.md).
 *
 * Üretim yapısına karşı çalışır (`npm run build && npm run start`) ve hem
 * masaüstünde hem 375px'te koşar.
 *
 * BOT KORUMASI BU TESTLERDE KAPALI (gerekçe `playwright.config.ts` içinde).
 * Doğrulama kodu local ve preview'da ekranda göründüğü için akış
 * otomatikleştirilebiliyor.
 *
 * TESTLER BİRBİRİNDEN BAĞIMSIZ (06-testing.md) ve bu üç şeyle sağlanıyor:
 *  1. HER TEST KENDİ HESABINI KURAR. Tohumlanmış demo hesaplarından biri
 *     kullanılsaydı, iki proje (masaüstü + mobil) aynı hesabın şifresini
 *     eşzamanlı değiştirir ve testler "bazen geçen" hâle gelirdi.
 *  2. Hesabın kimlik numarası ve e-postası HER KOŞUDA YENİ. Sabit olsaydı
 *     "aynı hedefe 3 kod / 15 dakika" gönderim sınırı ikinci koşuyu düşürürdü.
 *  3. Her testin kendi istemci IP'si var — sıfırlama IP başına 5 deneme /
 *     15 dakika ile sınırlı. Sınır KAPATILMIYOR, test ona uyuyor.
 */

const OLD_PASSWORD = "Test1234!";
const NEW_PASSWORD = "yesil-orman-2026";

/**
 * Her KOŞU kendi IP bloğunu alır — arka arkaya iki koşu birbirinin 15 dakikalık
 * sayacını devralmasın diye. 198.51.100.0/24 belgelendirme için ayrılmış
 * TEST-NET-2 bloğudur, gerçek bir adrese denk gelmez.
 */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

async function assignOwnIp(page: Page) {
  ipCounter += 1;

  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
}

/**
 * Giriş sonrası yönlendirmeyi beklerken kullanılan pay — gerekçesi
 * `login.spec.ts` içinde: üretim sunucusu route modüllerini ilk istekte yüklüyor.
 */
const POST_LOGIN_TIMEOUT_MS = 15_000;

/** Sıfırlama ucu yanıtını sabit 2 saniyeye dolduruyor; varsayılan pay yetmez. */
const RESET_TIMEOUT_MS = 15_000;

/**
 * Kontrol basamağı geçerli, HER KOŞUDA YENİ bir kimlik numarası üretir.
 *
 * `9` ile başlıyor: `docs/project/fake-data-guide.md` sentetik numaraları böyle
 * işaretliyor, hiçbiri gerçek bir kişiye denk gelmez.
 */
function makeNationalId(): string {
  const firstNine = [9, ...Array.from({ length: 8 }, () => Math.floor(Math.random() * 10))];
  const oddSum = firstNine[0] + firstNine[2] + firstNine[4] + firstNine[6] + firstNine[8];
  const evenSum = firstNine[1] + firstNine[3] + firstNine[5] + firstNine[7];
  const tenth = (oddSum * 7 - evenSum + 100) % 10;
  const eleventh = (firstNine.reduce((total, digit) => total + digit, 0) + tenth) % 10;

  return `${firstNine.join("")}${tenth}${eleventh}`;
}

type TestAccount = { id: string; nationalId: string; email: string };

/**
 * Hesabı DOĞRUDAN veritabanına yazar.
 *
 * Kayıt akışından geçmiyor çünkü test edilen şey o değil; kayıt akışının kendi
 * E2E dosyası var (`register.spec.ts`). Kimlik numarası şifreli, özetli ve
 * maskeli hâlleriyle yazılıyor — uygulamanın yazdığı biçimin aynısı.
 */
async function createAccount(testInfo: TestInfo): Promise<TestAccount> {
  const { encryptNationalId, hashNationalId, maskNationalId } =
    await import("../../src/lib/crypto");
  const { hashPassword } = await import("../../src/features/auth/services/password.service");

  const nationalId = makeNationalId();
  const email = `e2e.reset.${nationalId}@ornek.test`;
  const id = testId("password-reset", testInfo.project.name, nationalId);

  await prisma.user.create({
    data: {
      id,
      nationalIdEncrypted: encryptNationalId(nationalId, process.env.NATIONAL_ID_ENCRYPTION_KEY!),
      nationalIdHash: hashNationalId(nationalId, process.env.NATIONAL_ID_HASH_SALT!),
      nationalIdMasked: maskNationalId(nationalId),
      fullName: "Test Sıfırlama",
      email,
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(OLD_PASSWORD),
      identityStatus: "kps_verified",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
    },
  });

  return { id, nationalId, email };
}

/** Testin kurduğu hesabı ve ona bağlı her şeyi siler. */
async function removeAccount(account: TestAccount): Promise<void> {
  await prisma.otpChallenge.deleteMany({ where: { userId: account.id } });
  await prisma.auditLog.deleteMany({ where: { userId: account.id } });
  await prisma.session.deleteMany({ where: { userId: account.id } });
  await prisma.user.deleteMany({ where: { id: account.id } });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

async function signIn(page: Page, nationalId: string, password: string) {
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

/** Kod isteme ekranını doldurur ve doğrulama ekranına geçer. */
async function requestCode(page: Page, nationalId: string) {
  await page.goto("/sifremi-unuttum");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  // Test ortamında düğme "oluştur" der (gönderim yok); production'da "gönder".
  await page.getByRole("button", { name: "Kod oluştur" }).click();

  await expect(page).toHaveURL(/\/sifremi-unuttum\/dogrulama$/, { timeout: RESET_TIMEOUT_MS });
}

/**
 * "Kodu göster"e basıp ekrana gelen simülasyon kodunu okur.
 *
 * Kod yalnızca gönderim yanıtında dönüyor (veritabanında ÖZET olarak duruyor),
 * bu yüzden ekranda görebilmek için yeni bir kod isteniyor — kayıt akışındaki
 * desenin aynısı.
 */
async function revealCode(page: Page): Promise<string | null> {
  await page.getByRole("button", { name: "Kodu göster" }).click();

  const notice = page.getByText(/Test ortamı — doğrulama kodu:/);
  const noCode = page.getByText(/Test ortamı — gösterilecek bir kod yok/);

  await expect(notice.or(noCode).first()).toBeVisible({ timeout: RESET_TIMEOUT_MS });

  if ((await noCode.count()) > 0) return null;

  return ((await notice.textContent()) ?? "").match(/\b(\d{6})\b/)?.[1] ?? null;
}

test("şifre sıfırlanır, eski oturum düşer, yeni şifreyle girilir", async ({
  page,
  browser,
}, testInfo) => {
  /**
   * Varsayılan 30 saniye bu teste yetmiyor ve sebebi uygulamanın yavaşlığı
   * DEĞİL: akış iki sıfırlama isteği (her biri sabit 2 saniyeye doldurulur),
   * üç giriş ve iki argon2 özeti içeriyor. Tek başına ~15 sn sürüyor, ama tüm
   * paket birkaç işçiyle koşarken sınırı aşıyordu.
   */
  test.slow();

  const account = await createAccount(testInfo);

  try {
    // 1) Kullanıcı BAŞKA bir cihazda giriş yapmış durumda.
    const otherDevice = await browser.newPage();
    await otherDevice.setExtraHTTPHeaders({
      "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${(ipCounter += 1) % 250}`,
    });
    await signIn(otherDevice, account.nationalId, OLD_PASSWORD);
    await expect(otherDevice).toHaveURL(/\/hesabim$/, { timeout: POST_LOGIN_TIMEOUT_MS });

    // 2) Şifresini unutup sıfırlıyor.
    await assignOwnIp(page);
    await requestCode(page, account.nationalId);

    const code = await revealCode(page);
    expect(code, "simülasyon kodu ekranda bulunamadı").toBeTruthy();

    await page.getByLabel("6 haneli kod").fill(code!);
    await page.getByLabel("Yeni şifre", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Yeni şifre (tekrar)").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Şifremi değiştir" }).click();

    await expect(page).toHaveURL(/\/giris\?durum=sifre-yenilendi$/, { timeout: RESET_TIMEOUT_MS });
    await expect(page.getByText("Şifreniz güncellendi")).toBeVisible();

    // 3) ADR-005'in varlık sebebi: diğer cihazdaki oturum ANINDA düşmüş olmalı.
    await otherDevice.goto("/hesabim");
    await expect(otherDevice).toHaveURL(/\/giris/);
    await otherDevice.close();

    // 4) Eski şifre artık geçmiyor.
    await assignOwnIp(page);
    await signIn(page, account.nationalId, OLD_PASSWORD);
    await expect(page.getByText(messages.auth.login.errors.invalidCredentials)).toBeVisible();

    // 5) Yeni şifreyle giriş yapılıyor.
    await assignOwnIp(page);
    await signIn(page, account.nationalId, NEW_PASSWORD);
    await expect(page).toHaveURL(/\/hesabim$/, { timeout: POST_LOGIN_TIMEOUT_MS });
  } finally {
    await removeAccount(account);
  }
});

test("kayıtsız numara, kayıtlı numarayla AYNI ekranları gösterir", async ({ page }) => {
  await assignOwnIp(page);

  // Hiçbir hesaba ait olmayan, kontrol basamağı geçerli numara.
  await requestCode(page, makeNationalId());

  // Aynı başlık, aynı açıklama: ekranın kendisi hesabın varlığını ele vermiyor.
  await expect(page.getByRole("heading", { name: "Yeni şifrenizi belirleyin" })).toBeVisible();

  // Test ortamında gösterilecek kod yok — ama akış aynı biçimde devam ediyor.
  expect(await revealCode(page)).toBeNull();

  await page.getByLabel("6 haneli kod").fill("000000");
  await page.getByLabel("Yeni şifre", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Yeni şifre (tekrar)").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Şifremi değiştir" }).click();

  /**
   * "Kod hatalı" çıkıyor, "süresi doldu" DEĞİL — ve fark tam olarak burada
   * önemli: kayıtsız numara için hiç kayıt açılmasaydı bu ekran farklı bir
   * mesaj gösterir ve hesabın olmadığını ele verirdi (PRD §5.0).
   *
   * Mesaj METİNLE aranıyor, `role="alert"` ile DEĞİL: Next.js her sayfaya boş
   * bir `role="alert"` duyurucusu koyuyor ve rol bazlı arama önce onu bulur.
   */
  await expect(page.getByText("Kod hatalı")).toBeVisible({ timeout: RESET_TIMEOUT_MS });
  await expect(page.getByText("Kodun süresi doldu")).toHaveCount(0);
});

test("çerezsiz doğrulama ekranı başa yönlendirir", async ({ page }) => {
  await assignOwnIp(page);

  await page.goto("/sifremi-unuttum/dogrulama");

  await expect(page).toHaveURL(/\/sifremi-unuttum\?durum=suresi-doldu$/);
  await expect(page.getByText("Şifre sıfırlama işleminin süresi doldu")).toBeVisible();
});

test("giriş ekranından şifre sıfırlamaya bağlantı var", async ({ page }) => {
  await assignOwnIp(page);
  await page.goto("/giris");

  await page.getByRole("link", { name: "Şifrenizi mi unuttunuz?" }).click();

  await expect(page).toHaveURL(/\/sifremi-unuttum$/);
  await expect(page.getByRole("heading", { name: "Şifremi unuttum" })).toBeVisible();
});

test("375px'te yatay kaydırma yoktur ve dark mode okunabilir", async ({ page }) => {
  await assignOwnIp(page);
  await requestCode(page, makeNationalId());

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);

  // Dark mode SINIF tabanlı (`.dark`), `prefers-color-scheme` değil.
  await page.evaluate(() => document.documentElement.classList.add("dark"));

  const colors = await page.evaluate(() => {
    const body = getComputedStyle(document.body);

    return { background: body.backgroundColor, text: body.color };
  });

  expect(colors.background).not.toBe(colors.text);
  await expect(page.getByRole("heading", { name: "Yeni şifrenizi belirleyin" })).toBeVisible();
});

test("mutlu yolda konsol hatası ve başarısız istek yoktur", async ({ page }, testInfo) => {
  // İki sıfırlama isteği × 2 sn sabit süre + argon2 özeti; paket yüklüyken
  // varsayılan 30 saniye dar kalıyor.
  test.slow();

  const account = await createAccount(testInfo);
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
  });

  try {
    await assignOwnIp(page);
    await requestCode(page, account.nationalId);

    const code = await revealCode(page);
    await page.getByLabel("6 haneli kod").fill(code!);
    await page.getByLabel("Yeni şifre", { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel("Yeni şifre (tekrar)").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Şifremi değiştir" }).click();

    await expect(page).toHaveURL(/\/giris\?durum=sifre-yenilendi$/, { timeout: RESET_TIMEOUT_MS });

    expect(failedRequests).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } finally {
    await removeAccount(account);
  }
});
