import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Giriş, çıkış ve erişim kademeleri — uçtan uca
 * (PRD §5.0 "Giriş akışı" ve "Erişim kademeleri" · 06-testing.md).
 *
 * Üretim yapısına karşı çalışır (`npm run build && npm run start`) ve hem
 * masaüstünde hem 375px'te koşar.
 *
 * TESTLER BİRBİRİNDEN BAĞIMSIZ (06-testing.md):
 *  1. Her testin KENDİ istemci IP'si var — giriş IP başına 5 deneme / 15 dakika
 *     ile sınırlı (05-auth-security.md). Sınır KAPATILMIYOR, test ona uyuyor.
 *  2. Her tarayıcı bağlamı kendi çerezleriyle başlıyor, yani hız sınırının
 *     "ziyaretçi" bacağı da her testte temiz.
 *
 * Hesaplar tohumlama tarafından deterministik olarak üretiliyor
 * (`docs/project/test-hesaplari.md`); giriş hiçbir veriyi değiştirmediği için
 * testler aynı hesapları paylaşabilir.
 */

const PASSWORD = "Test1234!";

/** Kurum personeli — hastane ve spor salonuna erişebilir. */
const STAFF = { nationalId: "97876775668", fullName: "Emre Arslan" };

/** Personel olmayan vatandaş — o iki hizmete erişemez. */
const CITIZEN = { nationalId: "97271368182", fullName: "İpek Kurt" };

/**
 * Kontrol basamağı geçerli ama tohumlanmamış numara: "hesap yok" ile
 * "şifre yanlış" aynı yanıtı veriyor mu diye bakan test bunu kullanıyor.
 * Geçersiz basamaklı bir numara şemada takılır ve korumayı hiç sınamazdı.
 */
const UNREGISTERED_NATIONAL_ID = "10000002058";

/**
 * Her KOŞU kendi IP bloğunu alır — arka arkaya iki koşu birbirinin 15 dakikalık
 * sayacını devralmasın diye. 198.51.100.0/24 belgelendirme için ayrılmış
 * TEST-NET-2 bloğudur, gerçek bir adrese denk gelmez.
 */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

async function assignOwnIp(page: Page) {
  ipCounter += 1;

  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
}

/**
 * Giriş sonrası yönlendirmeyi beklerken kullanılan pay.
 *
 * Varsayılan 5 saniye yetmiyor ve sebebi uygulamanın yavaşlığı DEĞİL: Next.js
 * üretim sunucusu route modüllerini İLK İSTEKTE yüklüyor ve `npm run build &&
 * npm run start` biter bitmez beş işçi aynı anda giriş yapmaya başlıyor. Bu
 * yalnızca koşunun ilk saniyelerinde görülüyor; ölçülen normal giriş süresi
 * eşzamanlı beş istekte bile ~1 saniye.
 */
const POST_LOGIN_TIMEOUT_MS = 15_000;

async function signIn(page: Page, nationalId: string, password: string = PASSWORD) {
  await assignOwnIp(page);
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

/**
 * Testlerin açtığı oturum satırlarını temizler — ama yalnızca ESKİ koşulara ait
 * olanları.
 *
 * NEDEN BİR SAATLİK PAY: `afterAll` her işçide (worker) ve her projede ayrı
 * çalışıyor. "Bu hesabın tüm oturumlarını sil" denseydi, masaüstü projesi
 * bitince mobil projede AÇIK OLAN oturumlar da silinir ve o testler ortada
 * çıkış yapmış gibi olurdu. Bu fiilen yaşandı: testler "bazen geçen" hâle geldi.
 * Bir saatten eski satırlara hiçbir koşu sahip olamaz, dolayısıyla bu filtre
 * eş zamanlı hiçbir teste dokunmaz.
 */
const CLEANUP_MARGIN_MS = 60 * 60_000;

test.afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { nationalIdMasked: { in: [maskOf(STAFF.nationalId), maskOf(CITIZEN.nationalId)] } },
    select: { id: true },
  });

  await prisma.session.deleteMany({
    where: {
      userId: { in: users.map((user) => user.id) },
      createdAt: { lt: new Date(Date.now() - CLEANUP_MARGIN_MS) },
    },
  });
  await prisma.$disconnect();
});

function maskOf(nationalId: string): string {
  return `${nationalId.slice(0, 3)}${"*".repeat(6)}${nationalId.slice(-2)}`;
}

test("giriş → hesabım → çıkış", async ({ page }) => {
  await signIn(page, CITIZEN.nationalId);

  await expect(page).toHaveURL(/\/hesabim$/, { timeout: POST_LOGIN_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: "Hesabım" })).toBeVisible();
  await expect(page.getByText(CITIZEN.fullName)).toBeVisible();

  // Kimlik numarası ekranda MASKELİ olmalı, tam hâli hiçbir yerde geçmemeli.
  await expect(page.getByText(maskOf(CITIZEN.nationalId))).toBeVisible();
  expect(await page.content()).not.toContain(CITIZEN.nationalId);

  await page.getByRole("button", { name: "Çıkış yap" }).click();

  // Çıkıştan sonra menü yeniden "Giriş yap" göstermeli.
  await expect(page.getByRole("link", { name: "Giriş yap" })).toBeVisible();

  // Çıkış sunucu tarafında: adres elle yazılsa da hesabım açılmamalı.
  await page.goto("/hesabim");
  await expect(page).toHaveURL(/\/giris/);
});

test("giriş yapmadan korumalı sayfa açılmaz", async ({ page }) => {
  await assignOwnIp(page);

  await page.goto("/hesabim");

  await expect(page).toHaveURL(/\/giris/);
  await expect(page.getByText("Bu sayfayı görebilmek için önce giriş yapmanız")).toBeVisible();
});

test("girişten sonra gelinen korumalı sayfaya dönülür", async ({ page }) => {
  await assignOwnIp(page);
  await page.goto("/hastane");

  await expect(page).toHaveURL(/donus=%2Fhastane/);

  await page.getByLabel("T.C. kimlik numarası").fill(STAFF.nationalId);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();

  await expect(page).toHaveURL(/\/hastane$/, { timeout: POST_LOGIN_TIMEOUT_MS });
});

test("personel olmayan kullanıcı hastane ve spor salonuna erişemez", async ({ page }) => {
  await signIn(page, CITIZEN.nationalId);
  await expect(page).toHaveURL(/\/hesabim$/, { timeout: POST_LOGIN_TIMEOUT_MS });

  for (const path of ["/hastane", "/spor-salonu"]) {
    await page.goto(path);

    await expect(page.getByText("Bu hizmet yalnızca kurum personeline açıktır")).toBeVisible();
    // YÖNLENDİRME YOK (PRD §5.0): personel olmak kullanıcının
    // tamamlayabileceği bir adım değil, o yüzden bir yere gönderilmiyor.
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("personel hastane ve spor salonunu görebilir", async ({ page }) => {
  await signIn(page, STAFF.nationalId);
  await expect(page).toHaveURL(/\/hesabim$/, { timeout: POST_LOGIN_TIMEOUT_MS });
  await expect(page.getByText("Kurum personeli")).toBeVisible();

  for (const path of ["/hastane", "/spor-salonu"]) {
    await page.goto(path);

    await expect(page.getByText("Bu hizmet henüz açılmadı")).toBeVisible();
    await expect(page.getByText("yalnızca kurum personeline")).toHaveCount(0);
  }
});

test("yanlış şifre ile olmayan hesap AYNI mesajı verir", async ({ page, browser }) => {
  /**
   * Mesaj METNİYLE aranıyor, `role="alert"` ile DEĞİL: Next.js her sayfaya
   * ekran okuyucular için boş bir `role="alert"` duyurucusu koyuyor ve rol
   * bazlı arama önce onu buluyor. Bu, hata hiç görünmese bile testin geçmesine
   * yol açardı.
   */
  const expectedMessage = messages.auth.login.errors.invalidCredentials;

  await signIn(page, CITIZEN.nationalId, "kesinlikle-yanlis-sifre");
  await expect(page.getByText(expectedMessage)).toBeVisible();

  // İkinci deneme TEMİZ bir tarayıcı bağlamından: aynı bağlamda kalınsaydı bu
  // deneme "ikinci başarısızlık" olur ve bot kutusu devreye girerdi.
  const freshPage = await browser.newPage();
  await freshPage.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${(ipCounter += 1) % 250}`,
  });
  await freshPage.goto("/giris");
  await freshPage.getByLabel("T.C. kimlik numarası").fill(UNREGISTERED_NATIONAL_ID);
  await freshPage.getByLabel("Şifre").fill(PASSWORD);
  await freshPage.getByRole("button", { name: "Giriş yap" }).click();

  // Kayıtlı olmayan numara AYNI metni gösteriyor: hesabın var olup olmadığı
  // ekrandan anlaşılmıyor (PRD §5.0 hesap sayımı koruması).
  await expect(freshPage.getByText(expectedMessage)).toBeVisible();
  await expect(freshPage).toHaveURL(/\/giris/);

  await freshPage.close();
});
