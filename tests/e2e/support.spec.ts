import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Destek talebi — uçtan uca (PRD §5.7 · roadmap adım 13).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Akışın TARAYICIDA çalıştığı: form doldurulup dosya seçilebiliyor, talep
 * listede ve detayda görünüyor, ek görseli yetkili uçtan yükleniyor, kapatma
 * onayı işliyor ve BAŞKASININ TALEBİ 404 veriyor.
 *
 * İş kuralları (zaman çizgisi, hız sınırı, dosya imzası, IDOR'un tüm
 * varyantları) gerçek PostgreSQL'e karşı `tests/db/support-ticket.test.ts`
 * içinde kanıtlandı — burada onların ekrandaki karşılığı sınanıyor.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/**
 * Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Bu hesaplar BAŞKA HİÇBİR spec dosyasında
 * kullanılmıyor (`sonraki-adim-prompt.md` "boşta" listesi).
 */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "97876775668", email: "emre.arslan1@ornek.test" },
  "mobile-375": { nationalId: "92373556246", email: "nazli.mentes6@ornek.test" },
};

/** Başkasına ait talebin sahibi — bu hesaba HİÇ giriş yapılmıyor. */
const STRANGER_EMAIL = "burak.tas2@ornek.test";

const SUBJECT = "E2E destek talebi";
const DESCRIPTION = "Bu talep uçtan uca test tarafından oluşturuldu ve sonunda siliniyor.";

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;
const STEP_TIMEOUT_MS = 20_000;

/**
 * Gerçek bir PNG'nin baytları (1×1 saydam).
 *
 * NEDEN GERÇEK DOSYA: sunucu türü BAYT İMZASINDAN doğruluyor. Sahte içerik
 * gönderen bir test, doğrulamanın çalıştığını değil sadece formun
 * gönderildiğini ölçerdi.
 */
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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
    "x-forwarded-for": `198.53.${IP_RUN_BLOCK}.${ipCounter % 250}`,
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

/** Testin açtığı talepleri ve bildirimleri siler (ekler `Cascade` ile gider). */
async function cleanup(projectName: string): Promise<void> {
  const userId = await userIdOf(account(projectName).email);
  const strangerId = await userIdOf(STRANGER_EMAIL);

  await prisma.supportTicket.deleteMany({ where: { userId } });
  await prisma.supportTicket.deleteMany({ where: { userId: strangerId, subject: SUBJECT } });
  await prisma.notification.deleteMany({ where: { userId, type: "support_ticket_update" } });
  await prisma.auditLog.deleteMany({
    where: { userId, action: { in: ["support_ticket_create", "support_ticket_close"] } },
  });
}

test.beforeAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
  await prisma.$disconnect();
});

test("talep oluşturulur, ek görseli detayda yüklenir", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/destek");
  await expect(
    page.getByRole("heading", { name: messages.support.title, exact: true }),
  ).toBeVisible();

  // Boş durum: hiç talep yokken kullanıcı ne yapacağını okuyabilmeli.
  await expect(page.getByText(messages.support.empty.title)).toBeVisible();

  await page.getByLabel(messages.support.form.subjectLabel).fill(SUBJECT);
  await page.getByLabel(messages.support.form.descriptionLabel).fill(DESCRIPTION);

  await page.getByLabel(messages.support.form.attachmentsLabel).setInputFiles({
    name: "ekran-goruntusu.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_BASE64, "base64"),
  });

  // Seçilen dosya listede görünmeli — kullanıcı ne yüklediğini görebilmeli.
  await expect(page.getByText("ekran-goruntusu.png")).toBeVisible();

  await page.getByRole("button", { name: messages.support.form.submit }).click();

  // Başarıda kullanıcı yeni talebinin detayına gider.
  await page.waitForURL(/\/destek\/[^/]+$/, { timeout: STEP_TIMEOUT_MS });

  await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();
  await expect(page.getByText(messages.support.statuses.open, { exact: true })).toBeVisible();

  /**
   * EK GÖRSELİ GERÇEKTEN YÜKLENİYOR MU: `<img>` etiketinin varlığı yetmez,
   * tarayıcı görseli ÇÖZMÜŞ olmalı. `naturalWidth > 0` bunu söyler; yetki
   * kapısı yanlış kurulsaydı istek 404 döner ve bu değer 0 kalırdı.
   */
  const image = page.getByRole("img", { name: /Ek görsel/ }).first();
  await expect(image).toBeVisible();
  await expect
    .poll(async () => image.evaluate((element: HTMLImageElement) => element.naturalWidth), {
      timeout: STEP_TIMEOUT_MS,
    })
    .toBeGreaterThan(0);

  /**
   * SAYFA YATAY KAYDIRMA ÜRETMEMELİ.
   *
   * `layout.spec.ts`'teki aynı ölçüm bu sayfayı kapsayamıyor: `/destek` giriş
   * istiyor ve orası girişsiz koşuyor (adım 12'nin dersi).
   */
  await expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("talep listede görünür ve bildirim düşer", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/destek");

  await expect(page.getByRole("heading", { name: SUBJECT })).toBeVisible();
  await expect(page.getByRole("link", { name: messages.support.detailAction })).toBeVisible();

  await page.goto("/bildirimler");
  await expect(
    page.getByRole("heading", { name: messages.notifications.supportTicket.createdTitle }),
  ).toBeVisible();
});

test("KABUL KRİTERİ: başkasının talebi açılamaz (404)", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  /**
   * Talep DOĞRUDAN veritabanına, giriş yapılmayan bir hesabın adına yazılıyor.
   * İkinci bir tarayıcı oturumu açmaya gerek yok: sınanan şey "bu kimliğin
   * sahibi başkasıysa ne oluyor" ve cevabı sunucu veriyor.
   */
  const stranger = await userIdOf(STRANGER_EMAIL);
  const foreign = await prisma.supportTicket.create({
    data: { userId: stranger, subject: SUBJECT, description: DESCRIPTION },
    select: { id: true },
  });

  const response = await page.goto(`/destek/${foreign.id}`);

  expect(response?.status()).toBe(404);
  // Talebin başlığı EKRANDA HİÇ GEÇMEMELİ — varlığı bile sızdırılmıyor.
  await expect(page.getByRole("heading", { name: SUBJECT })).toHaveCount(0);
});

test("talep tarayıcıdan kapatılır", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/destek");
  await page.getByRole("link", { name: messages.support.detailAction }).first().click();
  await page.waitForURL(/\/destek\/[^/]+$/, { timeout: STEP_TIMEOUT_MS });

  await page.getByRole("button", { name: messages.support.close.action }).click();

  // Geri alınamaz işlem: önce onay istenir.
  await expect(page.getByText(messages.support.close.confirmTitle)).toBeVisible();
  await page.getByRole("button", { name: messages.support.close.confirmAction }).click();

  await expect(page.getByText(messages.support.statuses.closed, { exact: true })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(page.getByRole("button", { name: messages.support.close.action })).toHaveCount(0);
});
