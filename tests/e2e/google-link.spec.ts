import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Profilden Google bağlantısı — uçtan uca (PRD §5.0 · teknik borç #33).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Ekranın gerçekten çalıştığı: giriş yöntemleri kartı doğru durumu gösteriyor,
 * bağlama formu şifre istiyor, bağlantı tarayıcıdan kaldırılıyor ve SON giriş
 * yöntemi kaldırılamıyor.
 *
 * ⛔ GOOGLE'A GİDEN ADIM BURADA KOŞULMUYOR: akışın ortasında gerçek Google
 * ekranı var. Testin ölçebileceği yer, bizim ucumuzun Google'a doğru
 * yönlendirme üretip üretmediği — o da `verifyLinkStart` içinde isteğin
 * `accounts.google.com` adresine 303 döndüğü kontrol edilerek yapılıyor.
 * Bağlantının veritabanına doğru yazıldığı `tests/db/google-link.test.ts`
 * içinde gerçek PostgreSQL'e karşı kanıtlandı.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/**
 * Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Bu iki hesap adım 15c'de tohuma EKLENDİ ve başka hiçbir
 * spec dosyasında kullanılmıyor.
 *
 * ⛔ NEDEN PAYLAŞILAMAZ: bu spec hesabın GİRİŞ YÖNTEMLERİNİ değiştiriyor.
 * Paylaşılan bir hesapta paralel koşan başka bir spec'in girişini bozabilirdi.
 */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "93587078210", email: "kemal.guler95@ornek.test" },
  "mobile-375": { nationalId: "91269889192", email: "sinan.turan96@ornek.test" },
};

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;
const STEP_TIMEOUT_MS = 20_000;

const copy = messages.profile.loginMethods;

function account(projectName: string) {
  const found = USER_BY_PROJECT[projectName];

  if (!found) {
    throw new Error(
      `'${projectName}' için test hesabı yok. Yeni proje eklendiyse USER_BY_PROJECT'e AYRI hesap ekleyin.`,
    );
  }

  return found;
}

async function signIn(page: Page, nationalId: string) {
  ipCounter += 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.55.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL(/\/hesabim$/, { timeout: STEP_TIMEOUT_MS });
}

async function userIdOf(email: string): Promise<string> {
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });

  if (!user) throw new Error(`Test hesabı bulunamadı: ${email}`);

  return user.id;
}

/**
 * Testin bıraktığı izleri siler.
 *
 * Bağlantı satırını UYGULAMA ya da test yazıyor; kimliği `cuid()` olduğu için
 * ortak temizlik onu yakalayamaz, bağ kullanıcı üzerinden kuruluyor.
 * Denetim kayıtları da siliniyor: `audit_logs.user_id` `Restrict` olduğu için
 * birikirlerse tohum hesabı ileride silinemez hâle gelirdi.
 */
async function cleanup(projectName: string): Promise<void> {
  const userId = await userIdOf(account(projectName).email);

  await prisma.account.deleteMany({ where: { userId, provider: "google" } });
  await prisma.auditLog.deleteMany({
    where: { userId, action: { in: ["google_link", "google_unlink"] } },
  });
}

/** Testin kendi kurduğu bağlantı — Google'a hiç gitmeden. */
async function linkGoogle(projectName: string): Promise<void> {
  const userId = await userIdOf(account(projectName).email);

  await prisma.account.create({
    data: {
      userId,
      type: "oidc",
      provider: "google",
      providerAccountId: `e2e-${projectName}-${Date.now()}`,
    },
  });
}

test.beforeAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
  await prisma.$disconnect();
});

test("giriş yöntemleri kartı bağlı olmayan hesapta bağlama formunu gösteriyor", async ({
  page,
}, testInfo) => {
  await cleanup(testInfo.project.name);
  await signIn(page, account(testInfo.project.name).nationalId);

  // Arama BÖLGEYE sınırlanıyor: "Şifre" metni sayfanın başka yerinde de geçebilir.
  const card = page.getByRole("region", { name: messages.profile.settings.heading });

  await expect(card.getByText(copy.heading)).toBeVisible();
  await expect(card.getByText(copy.google.notLinked)).toBeVisible();

  // Şifre alanı bağlama formunun ÖZÜ: hesaba kalıcı giriş yolu ekleniyor.
  await expect(page.getByLabel(copy.link.passwordLabel)).toBeVisible();
  await expect(page.getByRole("button", { name: copy.link.submit })).toBeVisible();
});

/**
 * ⭐ Bizim ucumuzun ölçülebilir tek adımı: doğru şifreyle Google'a yönlendirme
 * üretiliyor mu. Yönlendirme İZLENMİYOR — hedefte gerçek Google var.
 */
test("doğru şifre Google'a yönlendirme üretiyor", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  const response = await page.request.post("/api/auth/google/connections", {
    form: { sifre: PASSWORD },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  expect(response.headers()["location"]).toContain("accounts.google.com");
});

test("yanlış şifre bağlama akışını başlatmıyor", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  const response = await page.request.post("/api/auth/google/connections", {
    form: { sifre: "YanlisSifre1!" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(422);
});

test("giriş yapmamış ziyaretçi bağlama akışını başlatamıyor", async ({ page }) => {
  const response = await page.request.post("/api/auth/google/connections", {
    form: { sifre: PASSWORD },
    maxRedirects: 0,
  });

  // 401: kimlik yok. Yönlendirme de üretilmiyor.
  expect(response.status()).toBe(401);
});

test("bağlı hesapta bağlantı onay kutusuyla kaldırılıyor", async ({ page }, testInfo) => {
  await linkGoogle(testInfo.project.name);
  await signIn(page, account(testInfo.project.name).nationalId);

  const settings = page.getByRole("region", { name: messages.profile.settings.heading });

  await expect(settings.getByText(copy.google.linked)).toBeVisible();

  await page.getByRole("button", { name: copy.unlink.action }).click();

  // Yıkıcı işlem SATIR İÇİ onay istiyor (shadcn'de Dialog bilerek yok).
  await expect(page.getByText(copy.unlink.confirmTitle)).toBeVisible();

  await page.getByRole("button", { name: copy.unlink.confirmAction }).click();

  await expect(settings.getByText(copy.google.notLinked)).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });

  const userId = await userIdOf(account(testInfo.project.name).email);
  expect(await prisma.account.count({ where: { userId, provider: "google" } })).toBe(0);
});

test("bağlantı kaldırıldıktan sonra denetim kaydına düşüyor", async ({ page }, testInfo) => {
  await cleanup(testInfo.project.name);
  await linkGoogle(testInfo.project.name);
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.getByRole("button", { name: copy.unlink.action }).click();
  await page.getByRole("button", { name: copy.unlink.confirmAction }).click();

  const settings = page.getByRole("region", { name: messages.profile.settings.heading });
  await expect(settings.getByText(copy.google.notLinked)).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });

  const userId = await userIdOf(account(testInfo.project.name).email);
  const audit = await prisma.auditLog.findFirst({
    where: { userId, action: "google_unlink" },
    select: { entityType: true, entityId: true },
  });

  expect(audit).not.toBeNull();
  // ⛔ Google kimliği denetim kaydına YAZILMIYOR (CLAUDE.md §5.11).
  expect(audit?.entityId).toBeNull();
  expect(audit?.entityType).toBe("account");
});
