import { createHash, randomBytes } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { hashNationalId } from "../../src/lib/crypto";
import { prisma } from "../db/helpers";

/**
 * Google ile girenin KPS doğrulaması — uçtan uca (PRD §5.0 · teknik borç #32).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Doğrulanmamış kullanıcının artık GİDECEK BİR SAYFASI olduğu: hastanedeki
 * uyarıdan kimlik doğrulama ekranına gidiyor, kimliğini bağlıyor ve geldiği
 * yere dönüyor. Borç #32'nin şikâyeti tam olarak buydu.
 *
 * ⛔ GİRİŞ ŞİFREYLE YAPILMIYOR ve yapılamaz: giriş ekranı kullanıcıyı T.C.
 * kimlik numarasından buluyor, bu hesabın ise HENÜZ kimlik numarası yok
 * (Google ile açılan hesabın durumu). Gerçek Google akışının ortasında Google'ın
 * kendi ekranı var ve otomatik koşulamıyor (`google-login.spec.ts` ile aynı
 * sınır). Bu yüzden oturum, uygulamanın açtığıyla AYNI biçimde — satır
 * veritabanında, çerezde yalnızca ham jeton — doğrudan kuruluyor.
 *
 * ⛔ TOHUMA HESAP EKLENMEDİ: test kendi kullanıcısını kuruyor ve sonunda
 * siliyor. Gerekçe: uzak ortamlardaki tohum zaten güncel değil ve her adımda
 * yeni demo hesap eklemek o farkı büyütüyor (`altyapi-durumu.md`).
 */

test.describe.configure({ mode: "serial" });

const copy = messages.auth.identityVerification;
const accountCopy = messages.auth.account;
const accessCopy = messages.auth.access;

const SESSION_COOKIE = "bb_session";
const STEP_TIMEOUT_MS = 20_000;

/**
 * Her Playwright projesine AYRI hesap VE AYRI kimlik numarası — projeler
 * paralel koşuyor ve tek veritabanına yazıyor. Kimlik numarası paylaşılsaydı
 * ikinci proje "bu numara başka hesapta" hatasını alırdı; hesap paylaşılsaydı
 * biri diğerinin kimliğini bağlamış olurdu.
 */
const CITIZEN_OFFSET: Record<string, number> = { "desktop-chrome": 0, "mobile-375": 1 };

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

type TestCitizen = { nationalId: string; birthYear: number; fullName: string };

function offsetOf(projectName: string): number {
  const offset = CITIZEN_OFFSET[projectName];

  if (offset === undefined) {
    throw new Error(
      `'${projectName}' için kimlik havuzu ayrılmamış. Yeni proje eklendiyse CITIZEN_OFFSET'e AYRI bir sıra ekleyin.`,
    );
  }

  return offset;
}

/**
 * Hiçbir hesaba ve hiçbir personel kaydına bağlı OLMAYAN sahte vatandaş bulur.
 *
 * Sabit bir numara yazılmıyor: tohum sürüm sürüm değişiyor ve "bugün boşta olan
 * numara" yarın bir hesaba bağlanmış olabilir. Sıralama sabit olduğu için
 * seçim yine de deterministik — aynı proje her koşuda aynı numarayı alıyor.
 */
async function pickFreeCitizen(offset: number): Promise<TestCitizen> {
  const salt = process.env.NATIONAL_ID_HASH_SALT;

  if (!salt) throw new Error("NATIONAL_ID_HASH_SALT tanımlı değil.");

  const [citizens, users, staff] = await Promise.all([
    prisma.kpsCitizen.findMany({
      where: { simulationBehavior: "normal" },
      orderBy: { nationalId: "asc" },
      select: { nationalId: true, birthDate: true, firstName: true, lastName: true },
    }),
    prisma.user.findMany({
      where: { nationalIdHash: { not: null } },
      select: { nationalIdHash: true },
    }),
    prisma.staffMember.findMany({
      where: { nationalIdHash: { not: null } },
      select: { nationalIdHash: true },
    }),
  ]);

  const used = new Set(
    [...users, ...staff].map((row) => row.nationalIdHash).filter((hash): hash is string => !!hash),
  );

  const adultLimit = new Date();
  adultLimit.setUTCFullYear(adultLimit.getUTCFullYear() - 18);

  const free = citizens.filter(
    (citizen) =>
      !used.has(hashNationalId(citizen.nationalId, salt)) && citizen.birthDate <= adultLimit,
  );
  const picked = free[offset];

  if (!picked) throw new Error("Boşta sahte vatandaş kalmadı — tohumu yenileyin.");

  return {
    nationalId: picked.nationalId,
    birthYear: picked.birthDate.getUTCFullYear(),
    fullName: `${picked.firstName} ${picked.lastName}`,
  };
}

/**
 * Doğrulanmamış hesap + gerçek oturum.
 *
 * Oturum satırı uygulamanın yazdığıyla birebir aynı: veritabanında jetonun
 * SHA-256 özeti, tarayıcıda ham jeton (`session.service.ts`).
 */
async function createUnverifiedUser(
  projectName: string,
): Promise<{ userId: string; token: string }> {
  const email = `kimlik.e2e.${projectName}@ornek.test`;

  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      // Google ile açılan hesapta ad e-postanın "@" öncesinden geliyor.
      fullName: `kimlik.e2e.${projectName}`,
      email,
      identityStatus: "unverified",
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

async function cleanupUser(userId: string): Promise<void> {
  await prisma.auditLog.deleteMany({ where: { userId } });
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

async function signInWithSession(context: BrowserContext, token: string): Promise<void> {
  ipCounter += 1;
  await context.setExtraHTTPHeaders({
    // Hız sınırının IP bacağı projeler arasında paylaşılmasın.
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await context.addCookies([{ name: SESSION_COOKIE, value: token, url: "http://localhost:3000" }]);
}

async function fillIdentity(page: Page, nationalId: string, birthYear: number): Promise<void> {
  await page.getByLabel(messages.auth.register.identity.nationalIdLabel).fill(nationalId);
  await page.getByLabel(messages.auth.register.identity.birthYearLabel).fill(String(birthYear));
  await page.getByRole("button", { name: copy.submit, exact: true }).click();
}

test("doğrulanmamış kullanıcı kimliğini doğrulayıp geldiği hizmete döner", async ({
  page,
  context,
}, testInfo) => {
  const citizen = await pickFreeCitizen(offsetOf(testInfo.project.name));
  const { userId, token } = await createUnverifiedUser(testInfo.project.name);

  try {
    await signInWithSession(context, token);

    // 1) Profil eksiği söylüyor.
    await page.goto("/hesabim");
    await expect(
      page.getByText(accountCopy.identityStatusLabels.unverified, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(accountCopy.identityPrompt.title, { exact: true })).toBeVisible();

    // 2) Hastane uyarısı artık KAYIT ekranına değil, doğrulama ekranına götürüyor.
    await page.goto("/hastane");
    await expect(page.getByText(accessCopy.identityRequired.title, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: accessCopy.identityRequired.cta }).click();
    await page.waitForURL(/\/kimlik-dogrulama/, { timeout: STEP_TIMEOUT_MS });

    // 3) Yanlış doğum yılı TEK TİP mesajla reddediliyor.
    await fillIdentity(page, citizen.nationalId, citizen.birthYear - 1);
    await expect(page.getByText(messages.identity.lookupFailed)).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });

    // 4) Doğru bilgilerle doğrulama tamamlanıyor ve gerçek ad geliyor.
    await fillIdentity(page, citizen.nationalId, citizen.birthYear);
    await expect(page.getByText(copy.success.title, { exact: true })).toBeVisible({
      timeout: STEP_TIMEOUT_MS,
    });
    await expect(page.getByText(citizen.fullName, { exact: false })).toBeVisible();

    // 5) "Devam et" kullanıcıyı geldiği hizmete geri götürüyor ve oradaki mesaj
    //    DEĞİŞİYOR: artık eksik olan kimlik değil, personel olmak.
    await page.getByRole("button", { name: copy.success.cta, exact: true }).click();
    await page.waitForURL(/\/hastane$/, { timeout: STEP_TIMEOUT_MS });
    await expect(page.getByText(accessCopy.staffOnly.title, { exact: true })).toBeVisible();

    // 6) Profil doğrulanmış durumu ve maskeli numarayı gösteriyor.
    await page.goto("/hesabim");
    await expect(
      page.getByText(accountCopy.identityStatusLabels.kps_verified, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(accountCopy.identityPrompt.title, { exact: true })).toHaveCount(0);
    await expect(page.getByText(citizen.nationalId)).toHaveCount(0);

    // 7) Ekran ikinci kez açıldığında form hiç çizilmiyor.
    await page.goto("/kimlik-dogrulama");
    await expect(page.getByText(copy.verified.title, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.submit, exact: true })).toHaveCount(0);
  } finally {
    await cleanupUser(userId);
  }
});

test("girişsiz kullanıcı kimlik doğrulama ekranına giremez", async ({ page }) => {
  await page.goto("/kimlik-dogrulama");

  await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });
});
