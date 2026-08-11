import { createHash, randomBytes } from "node:crypto";

import { expect, test, type BrowserContext } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * HESAP YÖNETİMİ VE VERİ HAKLARI — uçtan uca (PRD §5.11 · ADR-017 · adım 17b).
 *
 * ═══ BU DOSYADA NE KANITLANIYOR ═══
 * Kullanıcının haklarını gerçekten KULLANABİLDİĞİ: dosyayı indirebiliyor,
 * silmeden önce neyin saklanacağını görüyor, siliyor ve çıkışa düşüyor.
 * Veritabanı testi "silme doğru yazıyor mu" diye soruyor; burada sorulan
 * "kullanıcı bu ekranı gerçekten kullanabiliyor mu".
 *
 * ⛔ SİLME TESTİ EN SONA KONDU ve dosya `serial` modda: hesabı silen bir test,
 * kendinden sonra koşacak testlerin oturumunu da götürür.
 *
 * ⛔ GİRİŞ ŞİFREYLE YAPILMIYOR: giriş ekranı kullanıcıyı T.C. numarasından
 * buluyor ve bu test hesabının numarası yok (Google ile açılmış hesabın
 * durumu). Oturum, uygulamanın açtığıyla BİREBİR aynı biçimde kuruluyor —
 * veritabanında jetonun SHA-256 özeti, tarayıcıda ham jeton
 * (`kimlik-dogrulama.spec.ts` ile aynı desen).
 */

test.describe.configure({ mode: "serial" });

const copy = messages.account;
const SESSION_COOKIE = "bb_session";
const STEP_TIMEOUT_MS = 20_000;

const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

/**
 * Her Playwright projesine AYRI hesap: projeler paralel koşuyor ve tek
 * veritabanına yazıyor. Hesap paylaşılsaydı biri diğerinin hesabını silerdi.
 */
function emailFor(projectName: string): string {
  return `hesap.e2e.${projectName}@ornek.test`;
}

async function createUser(projectName: string): Promise<{ userId: string; token: string }> {
  const email = emailFor(projectName);

  await cleanupByEmail(email);

  const user = await prisma.user.create({
    data: {
      fullName: `hesap.e2e.${projectName}`,
      email,
      phone: "05320000009",
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

/**
 * Temizlik e-POSTADAN gidiyor, kimlikten değil.
 *
 * Silme akışı `users.email` alanını NULL yapıyor, yani silinmiş hesabı
 * e-postasından bulamayız. Bu yüzden test kendi `userId`'sini de saklıyor ve
 * temizlik ikisini birden deniyor.
 */
async function cleanupByEmail(email: string): Promise<void> {
  const users = await prisma.user.findMany({ where: { email }, select: { id: true } });

  await cleanupByIds(users.map((user) => user.id));
}

async function cleanupByIds(userIds: readonly string[]): Promise<void> {
  if (userIds.length === 0) return;

  const ids = { in: [...userIds] };

  // ⛔ SIRA: `Restrict` taşıyan tablolar kullanıcıdan ÖNCE. `consentRecord` ve
  // `auditLog` unutulursa temizlik `23001` ile patlar (adım 17'de yaşandı).
  await prisma.consentRecord.deleteMany({ where: { userId: ids } });
  await prisma.auditLog.deleteMany({ where: { userId: ids } });
  await prisma.session.deleteMany({ where: { userId: ids } });
  await prisma.account.deleteMany({ where: { userId: ids } });
  await prisma.user.deleteMany({ where: { id: ids } });
}

async function signInWithSession(context: BrowserContext, token: string): Promise<void> {
  ipCounter += 1;
  await context.setExtraHTTPHeaders({
    // Hız sınırının IP bacağı projeler arasında paylaşılmasın.
    "x-forwarded-for": `198.52.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
  await context.addCookies([{ name: SESSION_COOKIE, value: token, url: "http://localhost:3000" }]);
}

test("veri hakları ekranı hesabımdan erişilebiliyor ve dosya indirilebiliyor", async ({
  page,
  context,
}, testInfo) => {
  const { userId, token } = await createUser(testInfo.project.name);

  try {
    await signInWithSession(context, token);

    // 1) Kullanıcı bağlantıyı `/hesabim` üzerinde BULABİLİYOR — bir hakkı
    //    kullanmayı zorlaştırmak, o hakkı vermemenin yumuşak hâlidir.
    await page.goto("/hesabim");
    await page.getByRole("link", { name: new RegExp(copy.entry.title) }).click();
    await page.waitForURL(/\/hesabim\/verilerim/, { timeout: STEP_TIMEOUT_MS });

    await expect(page.getByRole("heading", { name: copy.export.heading })).toBeVisible();

    // 2) Dosya GERÇEKTEN iniyor ve içinde beklenen bölümler var.
    const downloadPromise = page.waitForEvent("download", { timeout: STEP_TIMEOUT_MS });

    await page.getByRole("button", { name: copy.export.action }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^benim-belediyem-verilerim-\d{4}-\d{2}-\d{2}\.json$/,
    );

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) chunks.push(Buffer.from(chunk));

    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;

    expect(parsed).toHaveProperty("profil");
    expect(parsed).toHaveProperty("rizaKayitlari");
    // ⛔ Dosyanın içinde NE OLMADIĞI da bir taahhüt.
    expect(JSON.stringify(parsed)).not.toContain("passwordHash");
  } finally {
    await cleanupByIds([userId]);
  }
});

test("kimlik bağı olmayan hesapta kart doğrulamaya yönlendiriyor", async ({
  page,
  context,
}, testInfo) => {
  const { userId, token } = await createUser(testInfo.project.name);

  try {
    await signInWithSession(context, token);
    await page.goto("/hesabim/verilerim");

    const section = page.getByRole("region", { name: copy.identity.heading });

    await expect(section.getByText(copy.identity.notLinked, { exact: true })).toBeVisible();
    // Çözülecek bir bağ yokken "çöz" düğmesi çizilmemeli.
    await expect(section.getByRole("button", { name: copy.identity.action })).toHaveCount(0);
    await expect(section.getByRole("link", { name: copy.identity.goVerify })).toBeVisible();
  } finally {
    await cleanupByIds([userId]);
  }
});

test("silme ekranı NEYİN SAKLANDIĞINI onaydan önce gösteriyor", async ({
  page,
  context,
}, testInfo) => {
  const { userId, token } = await createUser(testInfo.project.name);

  try {
    await signInWithSession(context, token);
    await page.goto("/hesabim/verilerim");

    const section = page.getByRole("region", { name: copy.deletion.heading });

    /**
     * ⛔ BU KONTROL YASAL BİR YÜKÜMLÜLÜĞÜ ÖLÇÜYOR. KVKK Yönetmeliği m.12/1-c:
     * kısmen karşılanan silme talebi GEREKÇESİYLE bildirilir. Liste bir
     * "ayrıntılar" düğmesinin arkasına saklanırsa bildirim yapılmamış olur —
     * bu test o gerilemeyi yakalamak için var.
     */
    await expect(section.getByText(copy.deletion.retained.heading, { exact: true })).toBeVisible();
    await expect(section.getByText(/Türk Ticaret Kanunu m\.82/)).toBeVisible();
    await expect(section.getByText(copy.deletion.erased.heading, { exact: true })).toBeVisible();

    // Onay paneli açılmadan yıkıcı düğme görünmemeli.
    await expect(section.getByRole("button", { name: copy.deletion.confirmAction })).toHaveCount(0);

    await section.getByRole("button", { name: copy.deletion.action, exact: true }).click();
    await expect(section.getByText(copy.deletion.confirmTitle, { exact: true })).toBeVisible();

    // Vazgeçmek gerçekten vazgeçiyor.
    await section.getByRole("button", { name: copy.deletion.confirmDismiss }).click();
    await expect(section.getByRole("button", { name: copy.deletion.confirmAction })).toHaveCount(0);
  } finally {
    await cleanupByIds([userId]);
  }
});

test("hesabımı sil: hesap kapanıyor, veda sayfası açılıyor ve oturum düşüyor", async ({
  page,
  context,
}, testInfo) => {
  const { userId, token } = await createUser(testInfo.project.name);

  try {
    await signInWithSession(context, token);
    await page.goto("/hesabim/verilerim");

    const section = page.getByRole("region", { name: copy.deletion.heading });

    await section.getByRole("button", { name: copy.deletion.action, exact: true }).click();
    await section.getByRole("button", { name: copy.deletion.confirmAction }).click();

    // 1) Veda sayfası — GİRİŞ GEREKTİRMİYOR, çünkü oturum az önce kapandı.
    await page.waitForURL(/\/hesap-silindi/, { timeout: STEP_TIMEOUT_MS });
    await expect(page.getByRole("heading", { name: copy.farewell.title })).toBeVisible();
    // Saklananlar burada BİR KEZ DAHA yazıyor (m.12/1-c bildirimi).
    await expect(page.getByText(/Türk Ticaret Kanunu m\.82/)).toBeVisible();

    // 2) Oturum gerçekten düştü: korumalı sayfa girişe yönlendiriyor.
    await page.goto("/hesabim");
    await page.waitForURL(/\/giris/, { timeout: STEP_TIMEOUT_MS });

    // 3) Veritabanında satır duruyor ama kişisel alanları boşaldı.
    const user = await prisma.user.findUnique({ where: { id: userId } });

    expect(user?.email).toBeNull();
    expect(user?.phone).toBeNull();
    expect(user?.deletedAt).not.toBeNull();
  } finally {
    await cleanupByIds([userId]);
  }
});
