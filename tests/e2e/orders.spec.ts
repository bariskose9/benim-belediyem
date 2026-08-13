import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Sipariş takibi ve iptali — uçtan uca (PRD §5.5 · roadmap adım 10).
 *
 * ═══ PRD §5.5 KABUL KRİTERİ 1 BU DOSYADA ═══
 * "Kullanıcı sipariş sonrası bildirimi ve durumu EKRANDA görebilmeli."
 *
 * Diğer üç kriter (409, 403, stok iadesi) iş kuralı olduğu için gerçek
 * PostgreSQL'e karşı `tests/db/order-cancellation.test.ts` içinde kanıtlandı;
 * burada akışın tıklanabilirliği sınanıyor.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/**
 * Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Bu hesaplar BAŞKA HİÇBİR spec dosyasında
 * kullanılmıyor; paylaşılsaydı bir testin temizliği diğerinin siparişini
 * silerdi.
 */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "95449943322", email: "gamze.toprak8@ornek.test" },
  "mobile-375": { nationalId: "95000320470", email: "baris.ates10@ornek.test" },
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
    "x-forwarded-for": `198.52.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await page.waitForURL(/\/hesabim$/, { timeout: STEP_TIMEOUT_MS });
}

/** Sepete tohumlanmış bir market ürünü ekler — ekleme UCU üzerinden. */
async function addMarketItem(page: Page): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 5 }, deletedAt: null },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!product) throw new Error("Stoklu tohumlanmış ürün bulunamadı. Önce seed çalıştırın.");

  const response = await page.request.post("/api/v1/carts/current/items", {
    data: { itemType: "market", refId: product.id, quantity: 1 },
  });

  expect(response.status()).toBe(201);
}

/** Ödeme ekranını doldurup gönderir ve fiş sayfasını bekler. */
async function payWithTestCard(page: Page): Promise<void> {
  await page.goto("/odeme");

  await page.getByLabel(messages.payment.card.number).fill("4111 1111 1111 1111");
  await page.getByLabel(messages.payment.card.holder).fill("Test Kullanici");
  await page.getByLabel(messages.payment.card.expiryMonth, { exact: true }).fill("12");
  await page.getByLabel(messages.payment.card.expiryYear, { exact: true }).fill("2030");
  await page.getByLabel(messages.payment.card.cvv, { exact: true }).fill("123");

  await page.getByRole("button", { name: new RegExp(messages.payment.submit) }).click();
  await page.waitForURL(/\/odeme\/tamamlandi/, { timeout: STEP_TIMEOUT_MS });
}

/**
 * Testin açtığı sipariş, iade, bildirim ve ödemeleri temizler.
 *
 * SIRA YABANCI ANAHTAR ZİNCİRİNİ TAKİP EDER: iade siparişe ve ödemeye
 * `Restrict` ile bağlı, dolayısıyla ikisinden de önce silinmeli.
 */
async function cleanup(projectName: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { email: account(projectName).email },
    select: { id: true },
  });

  if (!user) throw new Error(`Test hesabı bulunamadı: ${account(projectName).email}`);

  await prisma.refund.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
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

test("kabul kriteri: sipariş sonrası durum ve bildirim ekranda görünür", async ({
  page,
}, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);
  await addMarketItem(page);
  await payWithTestCard(page);

  // Fişten sipariş takibine geçiş — ödeme sonrası beklenen adım.
  await page.getByRole("link", { name: messages.payment.success.viewOrders }).click();
  await page.waitForURL(/\/siparislerim$/, { timeout: STEP_TIMEOUT_MS });

  await expect(page.getByRole("heading", { name: messages.orders.title })).toBeVisible();

  /**
   * Modül adı BAŞLIK ROLÜYLE aranıyor: "Belediye Market" metni sayfada
   * boş durum bağlantısında da geçebiliyor ve düz metin araması ikisine
   * birden takılırdı (adım 9'un dersi).
   */
  await expect(
    page.getByRole("heading", { name: messages.orders.fulfillment.market_delivery }),
  ).toBeVisible();

  // Yeni sipariş `Alındı` durumunda ve iptal düğmesi açık (PRD §5.5).
  await expect(page.getByText(messages.orders.statuses.received)).toBeVisible();
  await expect(page.getByRole("button", { name: messages.orders.cancel.action })).toBeVisible();

  /**
   * SAYFA YATAY KAYDIRMA ÜRETMEMELİ.
   *
   * `layout.spec.ts`'teki aynı ölçüm bu sayfayı kapsayamıyor: `/siparislerim`
   * giriş istiyor ve orası girişsiz koşuyor. Ölçüm burada, çünkü adım 9'da
   * dar bir kapsayıcıya konan sepet satırı tam olarak bunu bozmuştu.
   */
  await expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  // Bildirim ekranında "Siparişiniz alındı" görünmeli.
  await page.goto("/bildirimler");
  await expect(page.getByRole("heading", { name: messages.notifications.title })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: messages.notifications.order.createdTitle }),
  ).toBeVisible();
  await expect(page.getByText(messages.notifications.unreadLabel)).toBeVisible();

  await expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("bildirimler okundu işaretlenebilir", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/bildirimler");
  await page.getByRole("button", { name: messages.notifications.markAllRead }).click();

  // İşaretleme sonrası "Okunmadı" rozeti ve düğme kaybolmalı.
  await expect(page.getByText(messages.notifications.unreadLabel)).toHaveCount(0, {
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(page.getByRole("button", { name: messages.notifications.markAllRead })).toHaveCount(
    0,
  );
});

test("sipariş tarayıcıdan iptal edilir ve iade kaydı görünür", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/siparislerim");
  await page.getByRole("button", { name: messages.orders.cancel.action }).click();

  // Geri alınamaz işlem: önce onay istenir.
  await expect(page.getByText(messages.orders.cancel.confirmTitle)).toBeVisible();
  await page.getByRole("button", { name: messages.orders.cancel.confirmAction }).click();

  /**
   * `exact: true` ŞART: "İptal edildi" hem durum rozetinde hem de iptal
   * tarihi satırında ("İptal edildi: 8 Ağustos 2026 …") geçiyor ve gevşek
   * arama ikisine birden takılıyor.
   */
  await expect(page.getByText(messages.orders.statuses.cancelled, { exact: true })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  // Sahte iade kaydı ekranda (PRD §5.5).
  await expect(page.getByText(/tutarında iade kaydı oluşturuldu/)).toBeVisible();
  // İptal edilen siparişte düğme bir daha görünmez.
  await expect(page.getByRole("button", { name: messages.orders.cancel.action })).toHaveCount(0);
});

test("giriş yapmamış ziyaretçi sipariş ekranına giremez", async ({ page }) => {
  ipCounter += 1;
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.52.${IP_RUN_BLOCK}.${(ipCounter + 120) % 250}`,
  });

  await page.goto("/siparislerim");

  // Kapı sayfanın kendisinde: menüde bağlantı görünmemesi koruma değil.
  await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });
  await expect(page).toHaveURL(/donus=%2Fsiparislerim/);

  await page.goto("/bildirimler");
  await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });
  await expect(page).toHaveURL(/donus=%2Fbildirimler/);
});
