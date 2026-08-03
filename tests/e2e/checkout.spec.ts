import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Ortak sepet ve ödeme — uçtan uca (PRD §4 · §6.1 · §6.2 · roadmap adım 7).
 *
 * SEPETE EKLEME UCU ÜZERİNDEN YAPILIYOR, ekrandan değil: market, restoran ve
 * etkinlik EKRANLARI henüz yok (adım 8, 9, 11). Bu testin sorusu "kullanıcı
 * dolu bir sepeti tarayıcıda ödeyebiliyor mu" — ekleme düğmesinin kendisi o
 * adımlarda gelecek ve orada test edilecek.
 *
 * İş kuralları gerçek PostgreSQL'e karşı `tests/db/checkout.test.ts` içinde
 * kanıtlandı; burada akışın tıklanabilirliği sınanıyor.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/** Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek DB'ye yazıyor. */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "96927119284", email: "mehmet.duman7@ornek.test" },
  "mobile-375": { nationalId: "90217164022", email: "arda.aydin9@ornek.test" },
};

function account(projectName: string) {
  const found = USER_BY_PROJECT[projectName];

  if (!found) {
    throw new Error(
      `'${projectName}' için test hesabı yok. Yeni proje eklendiyse USER_BY_PROJECT'e AYRI hesap ekleyin.`,
    );
  }

  return found;
}

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;
const STEP_TIMEOUT_MS = 20_000;

async function signIn(page: Page, nationalId: string) {
  ipCounter += 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/hesabim$/, { timeout: STEP_TIMEOUT_MS });
}

/** Sepete tohumlanmış bir market ürünü ekler — ekleme UCU üzerinden. */
async function addMarketItem(page: Page, quantity = 1): Promise<{ name: string }> {
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 5 }, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  if (!product) throw new Error("Stoklu tohumlanmış ürün bulunamadı. Önce seed çalıştırın.");

  const response = await page.request.post("/api/carts/current/items", {
    data: { itemType: "market", refId: product.id, quantity },
  });

  expect(response.status()).toBe(201);

  return { name: product.name };
}

/** Testin açtığı sepet, sipariş ve ödemeleri temizler. */
async function cleanup(projectName: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: account(projectName).email },
    select: { id: true },
  });

  if (!user) throw new Error(`Test hesabı bulunamadı: ${account(projectName).email}`);

  await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: user.id } } });
  await prisma.cart.deleteMany({ where: { userId: user.id } });
  await prisma.savedCard.deleteMany({ where: { userId: user.id } });
}

test.beforeAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
  await prisma.$disconnect();
});

test("sepet dolar, tutar görünür, adet değişir", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);
  const product = await addMarketItem(page, 2);

  await page.goto("/sepet");

  await expect(page.getByRole("heading", { name: messages.cart.title })).toBeVisible();
  await expect(page.getByText(product.name)).toBeVisible();
  await expect(page.getByText(messages.cart.sections.market)).toBeVisible();

  // Teslimat ücreti satırı görünmeli (market eşiğin altında).
  await expect(page.getByText(messages.cart.summary.total)).toBeVisible();

  /**
   * Adet artır → ekranda görünen adet değişmeli.
   *
   * Adet, ekran okuyucu için gizli bir etiketle birlikte çiziliyor
   * ("Adet: 3"), bu yüzden metin o bütünlükle aranıyor. Yalnızca "3"
   * aramak sayfadaki başka bir 3'e de takılabilirdi.
   */
  await page.getByRole("button", { name: new RegExp(`${product.name} adedini artır`) }).click();
  await expect(page.getByText(`${messages.cart.line.quantity}: 3`)).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
});

test("ödeme tamamlanır ve sahte fiş görünür", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);
  await addMarketItem(page, 1);

  await page.goto("/sepet");
  await page.getByRole("link", { name: messages.cart.summary.checkout }).click();
  await expect(page).toHaveURL(/\/odeme$/, { timeout: STEP_TIMEOUT_MS });

  // Kalıcı uyarı: gerçek kart girilmemeli.
  await expect(page.getByText(messages.payment.fakeNotice)).toBeVisible();

  await page.getByLabel(messages.payment.card.number).fill("4111 1111 1111 1111");
  await page.getByLabel(messages.payment.card.holder).fill("Test Kullanici");
  await page.getByLabel(messages.payment.card.expiryMonth, { exact: true }).fill("12");
  await page.getByLabel(messages.payment.card.expiryYear, { exact: true }).fill("2030");
  await page.getByLabel(messages.payment.card.cvv, { exact: true }).fill("123");

  await page.getByRole("button", { name: new RegExp(messages.payment.submit) }).click();

  await expect(page).toHaveURL(/\/odeme\/tamamlandi/, { timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: messages.payment.success.title })).toBeVisible();
  await expect(page.getByText(messages.payment.success.receiptHeading)).toBeVisible();
  // İşlem kodu fişte görünmeli.
  await expect(page.getByText(/TRX-/)).toBeVisible();

  // ⛔ KART NUMARASI EKRANIN HİÇBİR YERİNDE GEÇMEMELİ.
  expect(await page.content()).not.toContain("4111111111111111");

  // Ödeme sonrası sepet boşalmalı.
  await page.goto("/sepet");
  await expect(page.getByText(messages.cart.empty.title)).toBeVisible();
});

test("reddedilen kart sipariş oluşturmaz ve sepet korunur", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);
  await addMarketItem(page, 1);

  await page.goto("/odeme");

  await page.getByLabel(messages.payment.card.number).fill("4000 0000 0000 0002");
  await page.getByLabel(messages.payment.card.holder).fill("Test Kullanici");
  await page.getByLabel(messages.payment.card.expiryMonth, { exact: true }).fill("12");
  await page.getByLabel(messages.payment.card.expiryYear, { exact: true }).fill("2030");
  await page.getByLabel(messages.payment.card.cvv, { exact: true }).fill("123");

  await page.getByRole("button", { name: new RegExp(messages.payment.submit) }).click();

  // Hata METİNLE aranıyor: Next.js her sayfaya boş bir `role="alert"` koyuyor.
  await expect(page.getByText(messages.payment.errors.declined)).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(page).toHaveURL(/\/odeme$/);

  // Sepet KORUNMUŞ olmalı (PRD §6.1 kabul kriteri).
  await page.goto("/sepet");
  await expect(page.getByText(messages.cart.empty.title)).toHaveCount(0);
});

test("giriş yapmamış ziyaretçi sepeti görür ama ödeyemez", async ({ page }) => {
  ipCounter += 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${(ipCounter + 100) % 250}`,
  });

  await page.goto("/sepet");

  // Sepet ekranı ziyaretçiye AÇIK (PRD §4) — yönlendirme yok.
  await expect(page.getByRole("heading", { name: messages.cart.title })).toBeVisible();
  await expect(page).toHaveURL(/\/sepet$/);

  // Ödeme ekranı ise giriş istiyor.
  await page.goto("/odeme");
  await expect(page).toHaveURL(/\/giris/);
  await expect(page).toHaveURL(/donus=%2Fodeme/);
});
