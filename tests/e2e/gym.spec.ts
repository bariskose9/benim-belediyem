import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Spor salonu üyeliği — uçtan uca (PRD §5.6 · roadmap adım 12).
 *
 * ═══ BURADA NE SINANIYOR, NE SINANMIYOR ═══
 * İş kuralları (aynı dönem iki kez tahsil edilemez · erken çıkış farkı ·
 * durum türetme · paket değişiminin dönemi bozmaması) gerçek PostgreSQL'e
 * karşı `tests/db/membership-purchase.test.ts` ve
 * `tests/db/membership-lifecycle.test.ts` içinde kanıtlandı — orada saat ay
 * ay ileri sarılıyor. Tarayıcıda bir ay beklemek testi kararsız kılardı.
 *
 * Burada AKIŞIN TIKLANABİLİRLİĞİ sınanıyor: paket seç → taahhüdü onayla →
 * kartla öde → üyelik ekranı → iptal. Ayrıca erişim kapısı: personel olmayan
 * kullanıcı hiçbir şey göremiyor.
 */

test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";
const STEP_TIMEOUT_MS = 20_000;

const copy = messages.gym;

/**
 * ═══ HER PROJEYE AYRI PERSONEL HESABI — DOĞRULUK ŞARTI ═══
 *
 * İki proje (masaüstü + 375px) AYNI ANDA koşuyor ve tek veritabanına yazıyor.
 * Üyelikte "aynı anda tek üyelik" kuralı var (PRD §5.6), yani hesap
 * PAYLAŞILAMAZ: biri üye olduğu anda diğeri `ALREADY_MEMBER` alır ve test,
 * uygulama doğru çalıştığı hâlde kırmızıya döner.
 *
 * Bu iki hesap adım 12'de tohuma EKLENDİ; mevcut üç demo personelin ikisi
 * hastane testine, biri giriş testine ait (`docs/project/test-hesaplari.md`).
 */
const STAFF_BY_PROJECT: Record<string, { nationalId: string; email: string }> = {
  "desktop-chrome": { nationalId: "97291447812", email: "zehra.kilic91@ornek.test" },
  "mobile-375": { nationalId: "96118559318", email: "esra.arslan92@ornek.test" },
};

/**
 * Personel OLMAYAN vatandaş (#6).
 *
 * Bu hesap projeler arasında PAYLAŞILABİLİR: erişimi reddedilen test hiçbir
 * veri yazmıyor, dolayısıyla diğerinin durumunu bozamaz.
 */
const CITIZEN = { nationalId: "92373556246" };

/** `fake-data-guide.md` test kartı — sonucu numaradan belirleniyor. */
const CARD_OK = "4111111111111111";

function staffAccount(projectName: string) {
  const found = STAFF_BY_PROJECT[projectName];

  if (!found) {
    throw new Error(
      `'${projectName}' için personel hesabı yok. Yeni bir Playwright projesi eklendiyse ` +
        `STAFF_BY_PROJECT'e AYRI bir hesap ekleyin — üyelikte hesap paylaşılamaz.`,
    );
  }

  return found;
}

/** Her koşu kendi IP bloğunu alır; hız sınırı testleri birbirine karıştırmasın. */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

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

/**
 * Testin bıraktığı üyelik, tahsilat ve kart kayıtlarını siler.
 *
 * SIRA YABANCI ANAHTAR ZİNCİRİNİ TAKİP EDER: tahsilat üyeliğe, üyelik de
 * kayıtlı karta `Restrict` ile bağlı. `audit_logs` da kullanıcıya `Restrict`
 * ile bağlı ama kullanıcı silinmediği için dokunulmuyor — yalnızca üyelik
 * kayıtları temizleniyor ki bir sonraki koşu sıfırdan üye olabilsin.
 */
async function cleanup(projectName: string): Promise<void> {
  const account = staffAccount(projectName);
  const user = await prisma.user.findFirst({
    where: { email: account.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      `Test hesabı bulunamadı: ${account.email}. Tohumlama güncel mi? (npm run db:reset)`,
    );
  }

  await prisma.membershipPayment.deleteMany({ where: { membership: { userId: user.id } } });
  await prisma.membership.deleteMany({ where: { userId: user.id } });
  await prisma.notification.deleteMany({ where: { userId: user.id } });
  await prisma.savedCard.deleteMany({ where: { userId: user.id } });
}

test.beforeAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.project.name);
  await prisma.$disconnect();
});

test("GİRİŞSİZ ziyaretçi spor salonuna giremez", async ({ page }) => {
  await page.goto("/spor-salonu");

  // Kapı `guardPage`: giriş yapmamış kullanıcı giriş ekranına yönlendiriliyor.
  await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });
});

test("PERSONEL OLMAYAN üye erişemez", async ({ page }) => {
  await signIn(page, CITIZEN.nationalId);
  await page.goto("/spor-salonu");

  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
  // Paket kartları çizilmiyor; yerine erişim reddi bildirimi var.
  await expect(page.getByRole("heading", { name: copy.plans.heading, exact: true })).toHaveCount(0);
});

test("tesis bilgisi, salon saatleri ve ders programı görünüyor", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);
  await page.goto("/spor-salonu");

  /**
   * `exact: true` ŞART: "Tesis" başlığı, "Belediye Personel Spor Tesisi" ve
   * "Tesiste neler var" başlıklarıyla da eşleşiyor ve Playwright üç sonuçta
   * kesin mod ihlali veriyor (ilk koşuda fiilen yaşandı). Aynı tuzak market
   * ve etkinlik testlerinde de not edilmişti.
   */
  await expect(
    page.getByRole("heading", { name: copy.facility.heading, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: copy.facility.scheduleHeading, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: copy.facility.hoursHeading, exact: true }),
  ).toBeVisible();
  // Pazar KAPALI yazıyor — satırı gizlemek yerine dürüstçe söyleniyor.
  await expect(page.getByText(copy.facility.closed, { exact: true })).toBeVisible();

  /**
   * SAYFA YATAY KAYMAMALI (375px projesinde anlamlı).
   *
   * Ölçüm burada, `layout.spec.ts`'te DEĞİL: orası girişsiz koşuyor ve bu
   * sayfa personel girişi gerektiriyor. Ders programı ızgarası ve paket
   * kartları taşarsa mobil kullanıcı sayfayı sağa sola kaydırmak zorunda
   * kalırdı (07-ui-design-system.md).
   */
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});

test("dört paket, hesaplanmış indirimle listeleniyor", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);
  await page.goto("/spor-salonu");

  await expect(page.getByRole("heading", { name: copy.plans.heading, exact: true })).toBeVisible();

  const planCards = page.getByRole("link", { name: /paketini seç$/ });

  await expect(planCards).toHaveCount(4);

  // İndirim yüzdesi ekranda HESAPLANIYOR (veritabanında tutulmuyor).
  await expect(page.getByText(copy.plans.discountBadge(25))).toBeVisible();
  await expect(page.getByText(copy.plans.noCommitment).first()).toBeVisible();
});

test("üyelik başlatılır, ekranda görünür ve iptal edilir", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);
  await page.goto("/spor-salonu");

  // Taahhütsüz paket seçiliyor: iptal ekranı erken çıkış farkı üretmesin ve
  // test tek bir davranışı ölçsün.
  await page.getByRole("link", { name: /Taahhütsüz.*paketini seç$/ }).click();
  await page.waitForURL(/\/spor-salonu\/paket\//, { timeout: STEP_TIMEOUT_MS });

  await expect(page.getByRole("heading", { name: copy.purchase.heading, level: 1 })).toBeVisible();
  // Taahhüt ve erken çıkış kuralı SATIN ALMA ÖNCESİ ekranda (PRD §5.6).
  await expect(page.getByText(copy.purchase.termsNoCommitment)).toBeVisible();

  const submit = page.getByRole("button", { name: new RegExp(copy.purchase.submit) });

  // Onay kutusu işaretlenmeden düğme çalışmıyor.
  await expect(submit).toBeDisabled();

  await page.getByLabel(messages.payment.card.number).fill(CARD_OK);
  await page.getByLabel(messages.payment.card.holder).fill("Test Personel");
  await page.getByLabel(messages.payment.card.expiryMonth).fill("12");
  await page.getByLabel(messages.payment.card.expiryYear).fill("2030");
  await page.getByLabel(messages.payment.card.cvv).fill("123");
  await page.getByText(copy.purchase.termsAccept).click();

  await expect(submit).toBeEnabled();
  await submit.click();

  await page.waitForURL(/\/spor-salonu\/uyelik$/, { timeout: STEP_TIMEOUT_MS });

  await expect(
    page.getByRole("heading", { name: copy.membership.heading, level: 1 }),
  ).toBeVisible();
  // Durum rozeti: "Aktif". `exact` şart — "Aktif üyeliğiniz yok" da eşleşirdi.
  await expect(page.getByText(copy.membership.statuses.active, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: copy.membership.historyHeading, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(copy.membership.paymentKinds.renewal)).toBeVisible();

  /**
   * SAYFA YATAY KAYMAMALI (375px).
   *
   * Ölçüm bu dosyanın içinde, `layout.spec.ts`'te DEĞİL: orası girişsiz
   * koşuyor ve bu sayfa giriş gerektiriyor.
   */
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);

  // İptal: satır içi onay (shadcn'de Dialog yok, bilinçli — adım 10 deseni).
  await page.getByRole("button", { name: copy.membership.cancel }).click();
  await expect(page.getByText(/Ek ücret alınmaz/)).toBeVisible();
  await page.getByRole("button", { name: copy.membership.cancelConfirm }).click();

  await expect(page.getByText(copy.membership.statuses.cancelled, { exact: true })).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
});

test("aktif üyelik varken ikinci üyelik alınamaz", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);

  // Önceki test iptal etti ama üyelik ödenmiş dönem sonuna kadar YAŞIYOR;
  // PRD §5.6 bu durumda ikinci üyeliği yasaklıyor.
  await page.goto("/spor-salonu");

  await expect(page.getByRole("link", { name: /paketini seç$/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: copy.membership.viewMembership })).toBeVisible();
});
