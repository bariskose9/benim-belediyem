import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Profil sayfası — uçtan uca (PRD §4 · §5.0 · roadmap adım 15).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Akışın TARAYICIDA çalıştığı: profil merkezi kayıt alanlarına açılıyor, adres
 * eklenip düzenlenip siliniyor, kayıtlı kart listeleniyor ve kaldırılıyor,
 * BAŞKASININ kaydına yapılan istek 404 dönüyor.
 *
 * İş kuralları (sahiplik, yumuşak silme, üst sınır, hız sınırı, denetim kaydı)
 * gerçek PostgreSQL'e karşı `tests/db/profile.test.ts` içinde kanıtlandı —
 * burada onların ekrandaki karşılığı sınanıyor.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/**
 * Her Playwright projesine AYRI hesap — projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Bu iki hesap adım 15'te tohuma EKLENDİ ve başka hiçbir
 * spec dosyasında kullanılmıyor; mevcut 12 demo hesabın hepsi doluydu.
 *
 * ⛔ NEDEN PAYLAŞILAMAZ: bu spec kullanıcının adreslerini ve kayıtlı kartlarını
 * değiştiriyor. Aynı kayıtları ödeme ve üyelik testleri de okuyor.
 */
const USER_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "97425842292", email: "asli.avci93@ornek.test" },
  "mobile-375": { nationalId: "98987802090", email: "ege.kurt94@ornek.test" },
};

/** Başkasına ait adresin sahibi — bu hesaba HİÇ giriş yapılmıyor. */
const STRANGER_EMAIL = "burak.tas2@ornek.test";

const ADDRESS_TITLE = "E2E Ev";
const ADDRESS_TITLE_EDITED = "E2E İş";
const ADDRESS_FULL = "Bostanlı Mahallesi 1740 Sokak No 3 Daire 5";
const ADDRESS_DISTRICT = "Karşıyaka";

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;
const STEP_TIMEOUT_MS = 20_000;

const copy = messages.profile;

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
    "x-forwarded-for": `198.54.${IP_RUN_BLOCK}.${ipCounter % 250}`,
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
 * Testin bıraktığı izleri siler ve TOHUM VERİSİNİ ONARIR.
 *
 * İki ayrı iş yapıyor ve ikisi de gerekli:
 *  1. Testin EKLEDİĞİ adresler siliniyor (`isSeedData: false` olanlar) —
 *     tohumun kendi adreslerine dokunulmuyor
 *  2. Testin SİLDİĞİ tohum kartı geri açılıyor (`deletedAt` → `null`) —
 *     yumuşak silme satırı bırakıyor, yani onarım mümkün ve tohumu yeniden
 *     koşturmaya gerek yok (`createMany({skipDuplicates})` zaten atlardı)
 */
async function cleanup(projectName: string): Promise<void> {
  const userId = await userIdOf(account(projectName).email);

  await prisma.address.deleteMany({ where: { userId, isSeedData: false } });
  await prisma.savedCard.updateMany({
    where: { userId, isSeedData: true },
    data: { deletedAt: null },
  });
  await prisma.auditLog.deleteMany({
    where: {
      userId,
      action: { in: ["address_create", "address_update", "address_delete", "saved_card_delete"] },
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

test("profil merkezi kayıt alanlarına ve hesap ayarlarına açılıyor", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await expect(
    page.getByRole("heading", { name: messages.auth.account.title, exact: true }),
  ).toBeVisible();

  // Arama BÖLGEYE sınırlanıyor: aynı metin sayfanın başka yerinde de geçebilir.
  const records = page.getByRole("region", { name: copy.records.heading });

  await expect(records.getByRole("link", { name: copy.records.orders.title })).toBeVisible();
  await expect(records.getByRole("link", { name: copy.records.support.title })).toBeVisible();

  /**
   * PERSONELE ÖZEL BAĞLANTILAR GİZLİ: bu hesaplar vatandaş, yani randevu ve
   * spor salonu kartlarını görmemeliler. ⛔ Bu bir yetki kontrolü DEĞİL, sadece
   * kullanıcıyı giremeyeceği sayfaya göndermeme kolaylığı — asıl kapı o
   * sayfaların kendisinde.
   */
  await expect(records.getByRole("link", { name: copy.records.appointments.title })).toHaveCount(0);
  await expect(records.getByRole("link", { name: copy.records.membership.title })).toHaveCount(0);

  const settings = page.getByRole("region", { name: copy.settings.heading });

  await expect(settings.getByRole("link", { name: copy.settings.addresses.title })).toBeVisible();
  await expect(settings.getByRole("link", { name: copy.settings.cards.title })).toBeVisible();
});

test("adres eklenir, düzenlenir ve silinir", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/hesabim/adreslerim");
  await expect(
    page.getByRole("heading", { name: copy.addresses.title, exact: true }),
  ).toBeVisible();

  const list = page.getByRole("region", { name: copy.addresses.listHeading });

  // ═══ EKLE ═══
  await page.getByLabel(copy.addresses.form.titleLabel).fill(ADDRESS_TITLE);
  await page.getByLabel(copy.addresses.form.fullAddressLabel).fill(ADDRESS_FULL);
  await page.getByLabel(copy.addresses.form.districtLabel).fill(ADDRESS_DISTRICT);
  await page.getByRole("button", { name: copy.addresses.form.submitAdd }).click();

  await expect(list.getByRole("heading", { name: ADDRESS_TITLE, exact: true })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(list.getByText(ADDRESS_FULL)).toBeVisible();

  // ═══ DÜZENLE ═══
  await page.getByRole("button", { name: copy.addresses.item.editLabel(ADDRESS_TITLE) }).click();

  const titleField = page.getByLabel(copy.addresses.form.titleLabel).first();

  await titleField.fill(ADDRESS_TITLE_EDITED);
  await page.getByRole("button", { name: copy.addresses.form.submitEdit }).click();

  await expect(list.getByRole("heading", { name: ADDRESS_TITLE_EDITED, exact: true })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(list.getByRole("heading", { name: ADDRESS_TITLE, exact: true })).toHaveCount(0);

  // ═══ SİL ═══ — geri alınamaz işlem, önce ONAY istenir.
  await page
    .getByRole("button", { name: copy.addresses.item.removeLabel(ADDRESS_TITLE_EDITED) })
    .click();

  await expect(page.getByText(copy.addresses.remove.confirmTitle)).toBeVisible();
  await page.getByRole("button", { name: copy.addresses.remove.confirmAction }).click();

  await expect(list.getByRole("heading", { name: ADDRESS_TITLE_EDITED, exact: true })).toHaveCount(
    0,
    { timeout: STEP_TIMEOUT_MS },
  );
});

test("KABUL KRİTERİ: başkasının adresi düzenlenemez ve silinemez (404)", async ({
  page,
}, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  /**
   * Adres DOĞRUDAN veritabanına, giriş yapılmayan bir hesabın adına yazılıyor.
   * İkinci bir tarayıcı oturumu açmaya gerek yok: sınanan şey "bu kimliğin
   * sahibi başkasıysa ne oluyor" ve cevabı sunucu veriyor.
   */
  const stranger = await userIdOf(STRANGER_EMAIL);
  const foreign = await prisma.address.create({
    data: {
      userId: stranger,
      title: "E2E komşu adresi",
      fullAddress: "Alsancak Mahallesi 1453 Sokak No 7",
      district: "Konak",
    },
    select: { id: true },
  });

  try {
    const patched = await page.request.patch(`/api/addresses/${foreign.id}`, {
      data: { title: "Ele geçirildi", fullAddress: ADDRESS_FULL, district: ADDRESS_DISTRICT },
    });

    expect(patched.status()).toBe(404);

    const deleted = await page.request.delete(`/api/addresses/${foreign.id}`);

    expect(deleted.status()).toBe(404);

    // İstisna yetmez: satırın GERÇEKTEN değişmediği okunuyor.
    const row = await prisma.address.findUnique({ where: { id: foreign.id } });

    expect(row?.title).toBe("E2E komşu adresi");
    expect(row?.deletedAt).toBeNull();
  } finally {
    await prisma.address.delete({ where: { id: foreign.id } });
  }
});

test("KABUL KRİTERİ: başkasının kartı kaldırılamaz (404)", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  const stranger = await userIdOf(STRANGER_EMAIL);
  const foreign = await prisma.savedCard.findFirst({
    where: { userId: stranger, deletedAt: null },
    select: { id: true },
  });

  if (!foreign) throw new Error("Tohumlanmış yabancı kart bulunamadı.");

  const response = await page.request.delete(`/api/saved-cards/${foreign.id}`);

  expect(response.status()).toBe(404);

  const row = await prisma.savedCard.findUnique({ where: { id: foreign.id } });

  expect(row?.deletedAt).toBeNull();
});

test("kayıtlı kart tarayıcıdan kaldırılır", async ({ page }, testInfo) => {
  await signIn(page, account(testInfo.project.name).nationalId);

  await page.goto("/hesabim/kartlarim");
  await expect(page.getByRole("heading", { name: copy.cards.title, exact: true })).toBeVisible();

  // "Kart ekle" düğmesinin NEDEN olmadığı ekranda yazıyor.
  await expect(page.getByText(copy.cards.addNotice)).toBeVisible();

  // Arama LİSTEYE sınırlanıyor: sayfa iskeletinde de listeler var (menü, alt
  // bilgi) ve çıplak `getByRole("listitem")` onları da sayardı.
  const cards = page.getByRole("list", { name: copy.cards.listLabel }).getByRole("listitem");
  const before = await cards.count();

  expect(before).toBeGreaterThan(0);

  await cards.first().getByRole("button", { name: copy.cards.item.remove }).click();

  // Geri alınamaz işlem: önce onay istenir.
  await expect(page.getByText(copy.cards.remove.confirmTitle)).toBeVisible();
  await page.getByRole("button", { name: copy.cards.remove.confirmAction }).click();

  await expect(cards).toHaveCount(before - 1, { timeout: STEP_TIMEOUT_MS });
});
