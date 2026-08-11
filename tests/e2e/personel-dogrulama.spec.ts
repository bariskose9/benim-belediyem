import { createHash, randomBytes } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Personel yetkisi doğrulaması — uçtan uca (adım 17c · ADR-017 ilke 2).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Kimliği doğrulanmış ama personel OLMAYAN bir kullanıcının hastaneye
 * giremediği; kurumsal e-posta adresine giden kodu doğrulayınca girebildiği;
 * ve bu yetkiyi kimlik numarasından DEĞİL, kurumun kendi kayıtlarındaki
 * adresten aldığı.
 *
 * ⛔ GİRİŞ ŞİFREYLE YAPILMIYOR: oturum, uygulamanın açtığıyla AYNI biçimde
 * doğrudan kuruluyor (satır veritabanında, çerezde ham jeton). Gerekçe
 * `kimlik-dogrulama.spec.ts` ile aynı.
 *
 * ⛔ TOHUMA PERSONEL EKLENMEDİ: test kendi birimini ve personelini kuruyor,
 * sonunda siliyor. Tohumdaki 100 personelin hepsi belirli kimlik numaralarına
 * bağlı ve onlara dokunmak diğer testleri bozardı.
 */

test.describe.configure({ mode: "serial" });

const copy = messages.staffVerification;
const accountCopy = messages.auth.account;
const accessCopy = messages.auth.access;

const SESSION_COOKIE = "bb_session";
const STEP_TIMEOUT_MS = 20_000;

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

/**
 * ⚠️ KURUMSAL ADRES HER KOŞUDA TAZE — ve bu bir hız sınırı kararı.
 *
 * Kod gönderimi ADRES bazlı iki sayaç tüketiyor: akışın kendi bütçesi
 * (`staff_verification_send`) ve `issueOtp`'un kendi içindeki `otp_send`.
 * Sabit bir adres kullanılsaydı 15 dakika içindeki ikinci koşu "çok fazla kod
 * istediniz" ile düşerdi (tuzak listesindeki "E2E'yi 15 dakika içinde üst üste
 * koşturma" sorununun aynısı).
 *
 * ⛔ ÇÖZÜM OLARAK SAYAÇLARI SİLMEK SEÇİLMEDİ: `otp_send:` öneki kayıt ve şifre
 * sıfırlama akışlarıyla PAYLAŞILIYOR; toplu silmek paralel koşan başka bir
 * testin sınırını sessizce gevşetirdi. Taze adres hiçbir şeyi paylaşmıyor.
 */
const RUN_ID = randomBytes(4).toString("hex");

/**
 * Her Playwright projesine AYRI kurumsal adres, AYRI birim ve AYRI dahili
 * numara — projeler paralel koşuyor ve tek veritabanına yazıyor.
 * `work_email` ve `extension_number` BENZERSİZ; paylaşılsalardı ikinci proje
 * kurulum aşamasında kısıt hatasıyla düşerdi.
 */
function fixtureFor(projectName: string) {
  const slug = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const extensionBase = projectName === "desktop-chrome" ? 88101 : 88201;

  return {
    unitId: `e2e-17c-unit-${slug}`,
    staffId: `e2e-17c-staff-${slug}`,
    workEmail: `personel.17c.${slug}.${RUN_ID}@ornek.test`,
    extensionNumber: extensionBase,
    // Kullanıcı adresi SABİT: önceki koşudan kalmış hesabı `teardown` bundan
    // buluyor. Hız sınırıyla ilgisi yok, taze olması gerekmiyor.
    userEmail: `personel.e2e.17c.${slug}@ornek.test`,
  };
}

type Fixture = ReturnType<typeof fixtureFor>;

async function setup(fixture: Fixture): Promise<{ userId: string; token: string }> {
  await teardown(fixture);

  await prisma.orgUnit.create({
    data: {
      id: fixture.unitId,
      name: `E2E 17c Birim ${fixture.staffId}`,
      unitType: "directorate",
      sortOrder: 900,
    },
  });

  await prisma.staffMember.create({
    data: {
      id: fixture.staffId,
      orgUnitId: fixture.unitId,
      fullName: "E2E Personel Adayi",
      title: "officer",
      workEmail: fixture.workEmail,
      extensionNumber: fixture.extensionNumber,
      startYear: 2018,
    },
  });

  /**
   * Kullanıcı KİMLİĞİ DOĞRULANMIŞ ama personel DEĞİL — bu adımın tam hedef
   * kitlesi. Kimlik numarası yazılmıyor: bu akış numaraya hiç bakmıyor ve
   * bakmadığını göstermek testin kendi iddiasının parçası.
   */
  const user = await prisma.user.create({
    data: {
      fullName: "E2E Personel Adayi",
      email: fixture.userEmail,
      identityStatus: "kps_verified",
    },
    select: { id: true },
  });

  const token = randomBytes(32).toString("base64url");

  await prisma.session.create({
    data: {
      sessionToken: createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      expires: new Date(Date.now() + 60 * 60_000),
    },
  });

  return { userId: user.id, token };
}

/**
 * Temizlik SIRASI zorunlu: `users.staff_member_id` yabancı anahtarı `Restrict`,
 * yani personel kaydı kullanıcıdan ÖNCE silinemez. `audit_logs` ve
 * `consent_records` de `Restrict` — ikisi de kullanıcıdan önce gitmeli.
 *
 * Sahte (decoy) kod kayıtları `userId` TAŞIMAZ, dolayısıyla kullanıcı silinince
 * basamaklı olarak gitmezler; akış kimliğinden yakalanıyorlar.
 */
async function teardown(fixture: Fixture): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: fixture.userEmail },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.otpChallenge.deleteMany({
      where: { registrationId: { in: userIds.map((id) => `staff:${id}`) } },
    });
    await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.consentRecord.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.staffMember.deleteMany({ where: { id: fixture.staffId } });
  await prisma.orgUnit.deleteMany({ where: { id: fixture.unitId } });
}

async function signInWithSession(context: BrowserContext, token: string): Promise<void> {
  ipCounter += 1;
  await context.setExtraHTTPHeaders({
    // Hız sınırının IP bacağı projeler arasında paylaşılmasın.
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await context.addCookies([{ name: SESSION_COOKIE, value: token, url: "http://localhost:3000" }]);
}

/** Sahte kanalın ekrana yazdığı kodu okur — yalnızca local/preview'da var. */
async function readRevealedCode(page: Page): Promise<string> {
  const notice = page.getByRole("status").filter({ hasText: "Test ortamı" });

  await expect(notice).toBeVisible({ timeout: STEP_TIMEOUT_MS });

  const code = (await notice.locator("strong").innerText()).trim();

  expect(code).toMatch(/^\d{6}$/);

  return code;
}

test("kimliği doğrulanmış kullanıcı kurumsal e-postayla personel yetkisi alır", async ({
  page,
  context,
}, testInfo) => {
  const fixture = fixtureFor(testInfo.project.name);
  const { token } = await setup(fixture);

  try {
    await signInWithSession(context, token);

    // 1) Hastane kapalı ve sebebi PERSONEL OLMAMAK — kimlik değil.
    await page.goto("/hastane");
    await expect(page.getByText(accessCopy.staffOnly.title, { exact: true })).toBeVisible();

    // 2) Hesabım ekranı personel doğrulamasına açılan kapıyı gösteriyor.
    await page.goto("/hesabim");
    await expect(
      page.getByText(accountCopy.staffStatusLabels.citizen, { exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: copy.entry.cta }).click();
    await page.waitForURL(/\/personel-dogrulama/, { timeout: STEP_TIMEOUT_MS });

    /**
     * 3) ⭐ EKRAN "NEDEN İKİNCİ BİR ADIM" SORUSUNU CEVAPLIYOR.
     *
     * ADR-017 ilke 2'nin kullanıcıya anlatılmış hâli. Kaybolursa kullanıcı
     * kimliğini doğrulamışken neden hâlâ giremediğini anlayamaz.
     */
    await expect(page.getByText(copy.page.whyNotice, { exact: true })).toBeVisible();

    // 4) Kurumsal adres → kod. Kod KURUMUN adresine gidiyor.
    await page.getByLabel(copy.request.emailLabel).fill(fixture.workEmail);
    await page.getByRole("button", { name: copy.request.action, exact: true }).click();

    await expect(page.getByText(copy.request.sent, { exact: true })).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });

    const code = await readRevealedCode(page);

    // 5) Yanlış kod TEK TİP mesajla reddediliyor ve yetki verilmiyor.
    await page.getByLabel(copy.confirm.codeLabel).fill(code === "000000" ? "111111" : "000000");
    await page.getByRole("button", { name: copy.confirm.action, exact: true }).click();
    await expect(page.getByText(copy.errors.codeInvalid)).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });

    // 6) Doğru kod yetkiyi bağlıyor.
    await page.getByLabel(copy.confirm.codeLabel).fill(code);
    await page.getByRole("button", { name: copy.confirm.action, exact: true }).click();
    await expect(page.getByText(copy.success.title, { exact: true })).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });

    // 7) Hesabım artık personel diyor ve doğrulama kartı kayboluyor.
    await page.getByRole("button", { name: copy.success.cta, exact: true }).click();
    await page.waitForURL(/\/hesabim/, { timeout: STEP_TIMEOUT_MS });
    await expect(
      page.getByText(accountCopy.staffStatusLabels.staff, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(copy.entry.title, { exact: true })).toHaveCount(0);

    // 8) ⭐ ASIL KANIT: hastane artık AÇIK.
    await page.goto("/hastane");
    await expect(page.getByText(accessCopy.staffOnly.title, { exact: true })).toHaveCount(0);

    // 9) Ekran ikinci kez açıldığında form hiç çizilmiyor.
    await page.goto("/personel-dogrulama");
    await expect(page.getByText(copy.entry.verifiedTitle, { exact: true })).toBeVisible();
    await expect(page.getByLabel(copy.request.emailLabel)).toHaveCount(0);
  } finally {
    await teardown(fixture);
  }
});

/**
 * ⭐ HESAP SAYIMI KORUMASI — EKRANDA DA GÖRÜNÜR OLMALI.
 *
 * Rehberde olmayan bir adres, rehberde olan bir adresle AYNI cümleyi
 * üretmeli. Aksi hâlde saldırgan ekranı okuyarak hangi personelin bu sitede
 * hesabı olduğunu öğrenirdi (kurumsal adresler `/hakkimizda`'da zaten açık;
 * gizlenen şey adresin varlığı değil, hesabın varlığı).
 */
test("rehberde olmayan adres de aynı cümleyi üretir", async ({ page, context }, testInfo) => {
  const fixture = fixtureFor(testInfo.project.name);
  const { token } = await setup(fixture);

  try {
    await signInWithSession(context, token);

    await page.goto("/personel-dogrulama");
    await page.getByLabel(copy.request.emailLabel).fill(`hicyok.${fixture.workEmail}`);
    await page.getByRole("button", { name: copy.request.action, exact: true }).click();

    await expect(page.getByText(copy.request.sent, { exact: true })).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });
  } finally {
    await teardown(fixture);
  }
});

test("girişsiz kullanıcı personel doğrulama ekranına giremez", async ({ page }) => {
  await page.goto("/personel-dogrulama");

  await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });
});
