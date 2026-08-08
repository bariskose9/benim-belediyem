import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Etkinlik, koltuk seçimi ve bilet — uçtan uca (PRD §5.2 · roadmap adım 11).
 *
 * ═══ BURADA NE SINANIYOR, NE SINANMIYOR ═══
 * İki KABUL KRİTERİ (aynı koltuk iki kez satılamaz · süresi dolmuş kilit
 * koltuğu serbest bırakır) iş kuralı olduğu için gerçek PostgreSQL'e karşı
 * `tests/db/seat-hold.test.ts` içinde kanıtlandı — orada saat ileri sarılıyor
 * ve eş zamanlı iki istek gerçekten yarıştırılıyor. Tarayıcıda 10 dakika
 * beklemek ya da iki sekmeyi milisaniye farkıyla tıklatmak testi kararsız
 * kılardı.
 *
 * Burada AKIŞIN TIKLANABİLİRLİĞİ sınanıyor: liste → detay → koltuk seç →
 * sepette görün → öde → bilet siparişi.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";
const STEP_TIMEOUT_MS = 20_000;

const copy = messages.events;

/**
 * Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Bu hesaplar BAŞKA HİÇBİR spec dosyasında
 * kullanılmıyor; paylaşılsaydı bir testin temizliği diğerinin kilidini silerdi.
 */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "97271368182", email: "ipek.kurt4@ornek.test" },
  "mobile-375": { nationalId: "98551366676", email: "ferhat.tunc5@ornek.test" },
};

/**
 * ═══ HER PROJEYE AYRI ETKİNLİK — ÖLÇÜLMÜŞ BİR HATANIN ÇÖZÜMÜ ═══
 *
 * İki proje paralel koşuyor ve ikisi de "ilk boş koltuk"a tıklıyordu. Aynı
 * etkinlikte bu TAM OLARAK aynı koltuk demek: biri kilidi alıyor, diğeri
 * `SEAT_TAKEN` (409) alıp seçim yapamıyor ve test kırmızıya dönüyordu —
 * uygulama doğru çalıştığı hâlde. Hastane testindeki "ayrı branş" çözümünün
 * aynısı: ayrı etkinlik, ayrı koltuk havuzu.
 */
const EVENT_INDEX_BY_PROJECT: Record<string, number> = {
  "desktop-chrome": 0,
  "mobile-375": 1,
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

/** Tohumlanmış, HENÜZ BAŞLAMAMIŞ ve bu projeye AYRILMIŞ etkinlik. */
async function upcomingEvent(projectName: string) {
  const skip = EVENT_INDEX_BY_PROJECT[projectName];

  if (skip === undefined) {
    throw new Error(
      `'${projectName}' için etkinlik ayrılmamış. Yeni proje eklendiyse EVENT_INDEX_BY_PROJECT'e AYRI sıra ekleyin.`,
    );
  }

  const event = await prisma.event.findFirst({
    where: { startsAt: { gt: new Date() } },
    select: { id: true, name: true, performer: true },
    orderBy: { startsAt: "asc" },
    skip,
  });

  if (!event) throw new Error("Tohum verisinde yaklaşan etkinlik yok. Önce seed çalıştırın.");

  return event;
}

/**
 * Testin bıraktığı kilit, sepet ve siparişleri temizler.
 *
 * SIRA YABANCI ANAHTAR ZİNCİRİNİ TAKİP EDER: iade siparişe ve ödemeye
 * `Restrict` ile bağlı, dolayısıyla ikisinden de önce silinmeli.
 *
 * `seat_reservations` de siliniyor: testin kilitlediği koltuk kalırsa bir
 * sonraki koşu aynı koltuğu bulamaz ve YANLIŞ SEBEPTEN kırmızıya döner.
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
  await prisma.seatReservation.deleteMany({ where: { userId: user.id, status: "held" } });
}

test.beforeAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
  await prisma.$disconnect();
});

test("etkinlik listesi ve arama çalışıyor", async ({ page }, testInfo) => {
  const event = await upcomingEvent(testInfo.project.name);

  await page.goto("/etkinlikler");

  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: event.name, level: 3 })).toBeVisible();

  /**
   * SANATÇI ADIYLA ARAMA: etkinlikte `description` kolonu yok, arama ad VEYA
   * sanatçı üzerinde çalışıyor. Kullanıcı topluluğun adını hatırlayıp
   * etkinliğinkini hatırlamayabilir.
   *
   * "Ara" düğmesi sayfada birden fazla eşleşiyor (market ve restoran da aynı
   * metni kullanıyor) → `exact: true` şart.
   */
  await page.getByLabel(copy.search.label).fill(event.performer);
  await page.getByRole("button", { name: copy.search.submit, exact: true }).click();

  await page.waitForURL(/arama=/);
  await expect(page.getByRole("heading", { name: event.name, level: 3 })).toBeVisible();
});

/**
 * Ana sayfadaki hizmet kartı artık tıklanabilir olmalı. Kartın adresi
 * `src/config/navigation.ts` içinde `null`'dan `/etkinlikler`'e döndü; bu test
 * o bağın gerçekten kurulduğunu sınıyor — yapılandırmayı değiştirip sayfayı
 * bağlamayı unutmak sessiz bir hata olurdu.
 */
test("ana sayfadaki etkinlik kartı etkinliklere götürüyor", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: new RegExp(messages.services.events.title) }).click();

  await page.waitForURL(/\/etkinlikler$/);
  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
});

test("GİRİŞSİZ ziyaretçi salon planını görür ama koltuk seçemez", async ({ page }, testInfo) => {
  const event = await upcomingEvent(testInfo.project.name);

  await page.goto(`/etkinlikler/${event.id}`);

  await expect(page.getByRole("heading", { name: event.name, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: copy.detail.seatMapHeading })).toBeVisible();

  // Giriş bağlantısı görünüyor ve koltuk düğmeleri pasif.
  await expect(page.getByRole("link", { name: copy.detail.signInToSelect })).toBeVisible();

  const seatButtons = page.getByRole("button", { name: /Blok, .* sıra, .* koltuk$/ });

  await expect(seatButtons.first()).toBeDisabled();
});

test("koltuk seçimi sepete düşer, geri sayım görünür ve bilet satın alınır", async ({
  page,
}, testInfo) => {
  const event = await upcomingEvent(testInfo.project.name);

  await signIn(page, account(testInfo.project.name).nationalId);
  await page.goto(`/etkinlikler/${event.id}`);

  /**
   * İLK BOŞ KOLTUK seçiliyor — hangi koltuk olduğu önemli değil, seçilebilir
   * olması önemli. Dolu koltuklar düğme DEĞİL (hastane ekranındaki "dolu saat"
   * deseninin aynısı), bu yüzden `getByRole("button")` onları hiç görmüyor.
   */
  const availableSeat = page.getByRole("button", { name: /Blok, .* sıra, .* koltuk$/ }).first();
  const seatLabel = await availableSeat.getAttribute("aria-label");

  if (!seatLabel) throw new Error("koltuk etiketi okunamadı");

  await availableSeat.click();

  // Seçilen koltuk listede tam adresiyle ve geri sayımıyla görünüyor.
  await expect(page.getByRole("heading", { name: copy.detail.selectedHeading })).toBeVisible();
  await expect(
    page.getByText(new RegExp(messages.events.countdown.label("").trim())),
  ).toBeVisible();

  /**
   * SAYFA YATAY KAYDIRMA ÜRETMEMELİ.
   *
   * `layout.spec.ts`'teki aynı ölçüm bu sayfayı kapsayabilirdi (giriş
   * istemiyor), ama koltuk SEÇİLDİKTEN sonraki hâli yalnızca burada oluşuyor
   * ve salon planı 8 koltukluk sıralarıyla tam da taşmaya aday olan parça.
   */
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  // Sepette satır KOLTUK ADRESİYLE görünüyor (teknik borç #40 ödendi).
  await page.goto("/sepet");
  await expect(page.getByRole("heading", { name: messages.cart.sections.event })).toBeVisible();
  await expect(page.getByText(seatLabel, { exact: false })).toBeVisible();

  /**
   * BİLET SATIRINDA ADET DÜĞMESİ YOK: bir satır bir koltuk. Düğme olsaydı
   * kullanıcıya sunucunun her zaman reddedeceği bir işlem sunulmuş olurdu.
   */
  await expect(page.getByRole("button", { name: /adedini artır/i })).toHaveCount(0);

  // Ödeme: bilet teslim edilmediği için adres ve zaman aralığı SORULMUYOR.
  await page.getByRole("link", { name: messages.cart.summary.checkout }).click();
  await page.waitForURL(/\/odeme$/, { timeout: STEP_TIMEOUT_MS });

  await expect(page.getByText(messages.payment.delivery.ticketNotice)).toBeVisible();

  await page.getByLabel(messages.payment.card.number).fill("4111 1111 1111 1111");
  await page.getByLabel(messages.payment.card.holder).fill("Test Kullanici");
  await page.getByLabel(messages.payment.card.expiryMonth, { exact: true }).fill("12");
  await page.getByLabel(messages.payment.card.expiryYear, { exact: true }).fill("2030");
  await page.getByLabel(messages.payment.card.cvv, { exact: true }).fill("123");

  await page.getByRole("button", { name: new RegExp(messages.payment.submit) }).click();
  await page.waitForURL(/\/odeme\/tamamlandi/, { timeout: STEP_TIMEOUT_MS });

  /**
   * BİLET SİPARİŞİ DOĞRUDAN `Teslim edildi` DOĞAR ve İPTAL EDİLEMEZ
   * (PRD §5.5). İptal düğmesinin hiç çizilmemesi bir kolaylık; asıl engel
   * sunucuda ve `tests/db/seat-hold.test.ts` içinde kanıtlı.
   */
  await page.goto("/siparislerim");
  await expect(
    page.getByRole("heading", { name: messages.orders.fulfillment.ticket }),
  ).toBeVisible();
  await expect(page.getByText(messages.orders.statuses.delivered).first()).toBeVisible();
  await expect(page.getByRole("button", { name: messages.orders.cancel.action })).toHaveCount(0);
});
