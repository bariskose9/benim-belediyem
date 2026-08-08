import { expect, test, type Page } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Hastane randevu modülü — uçtan uca (PRD §5.1 · roadmap adım 6).
 *
 * Üretim yapısına karşı çalışır (`npm run build && npm run start`) ve hem
 * masaüstünde hem 375px'te koşar (`playwright.config.ts`).
 *
 * BU DOSYA KURALLARI DEĞİL AKIŞI SINAR. Dört iş kuralı gerçek PostgreSQL'e
 * karşı `tests/db/appointment-booking.test.ts` içinde kanıtlandı; burada
 * sorulan soru "kullanıcı tarayıcıda bunu gerçekten yapabiliyor mu".
 */

/**
 * BU DOSYA SIRALI KOŞAR — ve bu doğruluk şartı, yavaşlatma değil.
 *
 * `playwright.config.ts` `fullyParallel: true`; varsayılan davranışta aynı
 * dosyanın testleri FARKLI İŞÇİLERE dağılıyor ve `beforeAll` her işçide
 * yeniden çalışıyor. Aşağıdaki temizlik kancası veritabanına yazdığı için,
 * ikinci işçinin `beforeAll`'u birinci işçinin az önce aldığı randevuyu
 * siliyordu: randevu alınıyor, iptal ediliyor, sonra listede hiç görünmüyordu.
 * İlk koşuda tam olarak bu yaşandı ve "iptal edilen randevu kayboluyor" gibi
 * görünen bir hata sanıldı — oysa kod doğruydu, testler birbirini eziyordu.
 *
 * Sıralı mod hem `beforeAll`'u tek sefere indiriyor hem de paylaşılan
 * veritabanı durumuna sıra garantisi veriyor. Projeler (masaüstü / 375px)
 * yine paralel koşuyor; onların çakışmasını ayrı hesaplar önlüyor.
 */
test.describe.configure({ mode: "serial" });

const PASSWORD = "Test1234!";

/**
 * HER PLAYWRIGHT PROJESİ KENDİ PERSONEL HESABINI KULLANIR.
 *
 * Bu bir konfor tercihi değil, doğruluk şartı. `playwright.config.ts`
 * `fullyParallel: true` ve iki proje (masaüstü + 375px) AYNI ANDA koşuyor;
 * ikisi de tek bir veritabanına yazıyor. Tek hesap paylaşıldığında bir
 * projenin `beforeAll` temizliği diğerinin az önce aldığı randevuyu siliyor
 * ve test, kod doğru olduğu hâlde kırmızıya dönüyordu — ilk koşuda tam olarak
 * bu yaşandı. `login.spec.ts` içindeki oturum temizliği notu da aynı tuzağı
 * anlatıyor.
 *
 * Hesaplar `docs/project/test-hesaplari.md`'den; #1 ve #4 `login.spec.ts`'e
 * ait, o yüzden burada #2 ve #3 kullanılıyor.
 */
const STAFF_BY_PROJECT: Record<
  string,
  { nationalId: string; email: string; specialtyIndex: number }
> = {
  /**
   * `specialtyIndex` de projeye özel ve bu da doğruluk şartı.
   *
   * İki proje aynı branşın aynı doktorunun İLK BOŞ SAATİNİ seçerse aynı slotu
   * kapmaya çalışırlar: biri alır, diğeri 409 alıp kırmızıya döner. Kod doğru
   * çalıştığı hâlde test düşer. Adım 6'da bu yarış vardı ama zamanlama
   * sayesinde görünmüyordu; adım 7'nin eklediği yükle ortaya çıktı.
   * Ayrı branş, ayrı slot havuzu demek.
   */
  "desktop-chrome": {
    nationalId: "94002759196",
    email: "burak.tas2@ornek.test",
    specialtyIndex: 0,
  },
  "mobile-375": {
    nationalId: "91911650170",
    email: "nurcan.yilmaz3@ornek.test",
    specialtyIndex: 1,
  },
};

function staffAccount(projectName: string): {
  nationalId: string;
  email: string;
  specialtyIndex: number;
} {
  const account = STAFF_BY_PROJECT[projectName];

  if (!account) {
    throw new Error(
      `'${projectName}' projesi için personel hesabı tanımlı değil. ` +
        `Yeni bir Playwright projesi eklendiyse STAFF_BY_PROJECT'e AYRI bir hesap ekleyin — ` +
        `hesap paylaşmak testleri birbirine karıştırır.`,
    );
  }

  return account;
}

/**
 * Personel OLMAYAN vatandaş (#5).
 *
 * Bu hesap projeler arasında PAYLAŞILABİLİR: erişimi reddedilen testler
 * hiçbir veri yazmıyor, dolayısıyla birbirlerinin durumunu bozamazlar.
 */
const CITIZEN = { nationalId: "98551366676" };

/**
 * Adım geçişlerinde kullanılan pay.
 *
 * Varsayılan 5 saniye yetmiyor ve sebebi uygulamanın yavaşlığı DEĞİL: tek bir
 * Next.js üretim sunucusuna iki proje × birden fazla işçi aynı anda yükleniyor
 * ve route modülleri ilk istekte derleniyor. `login.spec.ts` aynı payı aynı
 * gerekçeyle veriyor.
 */
const STEP_TIMEOUT_MS = 15_000;

/** Her koşu kendi IP bloğunu alır (TEST-NET-2); `login.spec.ts` ile aynı gerekçe. */
const IP_RUN_BLOCK = Math.floor(Math.random() * 250);
let ipCounter = 0;

async function assignOwnIp(page: Page) {
  ipCounter += 1;

  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.${IP_RUN_BLOCK}.${ipCounter % 250}`,
  });
}

async function signIn(page: Page, nationalId: string) {
  await assignOwnIp(page);
  await page.goto("/giris");
  await page.getByLabel("T.C. kimlik numarası").fill(nationalId);
  await page.getByLabel("Şifre").fill(PASSWORD);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page).toHaveURL(/\/hesabim$/, { timeout: STEP_TIMEOUT_MS });
}

/**
 * Test hesabının TOHUMLANMIŞ randevularını kaldırır ve saatlerini boşaltır.
 *
 * NEDEN GEREKLİ: tohumlama her personele en fazla 2 randevu yazıyor ve
 * "aynı branşta aynı gün ikinci randevu alınamaz" kuralı (PRD §5.1) o
 * randevulardan birine denk gelirse test, kural doğru çalıştığı hâlde
 * başarısız olur. Yani temizlik kuralı ATLAMAK için değil, testin ölçtüğü
 * şeyi TEK DEĞİŞKENLİ tutmak için.
 *
 * Yalnızca bu hesaba dokunuyor ve sildiği satırlar `isSeedData: true`;
 * `npm run db:reset` hepsini geri getirir.
 */
async function clearSeededAppointments(projectName: string): Promise<void> {
  const { email } = staffAccount(projectName);

  const user = await prisma.user.findFirst({ where: { email }, select: { id: true } });

  if (!user) throw new Error(`Test hesabı bulunamadı: ${email}. Önce tohumlama çalıştırın.`);

  const appointments = await prisma.appointment.findMany({
    where: { userId: user.id },
    select: { id: true, slotId: true },
  });

  await prisma.appointment.deleteMany({ where: { userId: user.id } });
  await prisma.doctorSlot.updateMany({
    where: { id: { in: appointments.map((appointment) => appointment.slotId) } },
    data: { isBooked: false },
  });
}

test.beforeAll(async ({}, testInfo) => {
  await clearSeededAppointments(testInfo.project.name);
});

test.afterAll(async ({}, testInfo) => {
  await clearSeededAppointments(testInfo.project.name);
  await prisma.$disconnect();
});

/**
 * Akışın tamamı tek testte: branş → doktor → saat → randevu → iptal.
 *
 * BÖLÜNMEDİ çünkü adımlar birbirinin durumuna bağlı ve ayrı testler
 * arasında paylaşılan veritabanı üzerinden sıralama garantisi yok. Randevu
 * aynı test içinde iptal edildiği için tohumlanmış takvim de olduğu gibi
 * kalıyor.
 */
test("personel randevu alır, listede görür ve iptal eder", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);

  await page.goto("/hastane");
  await expect(page.getByRole("heading", { name: messages.hospital.title })).toBeVisible();

  // 1. adım — branş seç.
  await expect(
    page.getByRole("heading", { name: messages.hospital.steps.specialty }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /doktor$/ })
    .nth(staffAccount(testInfo.project.name).specialtyIndex)
    .click();

  // 2. adım — doktor seç. Adres çubuğu seçimi taşımalı.
  await expect(page).toHaveURL(/brans=/, { timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: messages.hospital.steps.doctor })).toBeVisible();
  await page
    .getByRole("link", { name: /^(Prof\.|Doç\.|Uzm\.|Dr\.)/ })
    .first()
    .click();

  // 3. adım — saat seç. Yalnızca BOŞ saatler düğme; dolular tıklanamaz.
  await expect(page).toHaveURL(/doktor=/, { timeout: STEP_TIMEOUT_MS });
  await expect(page.getByRole("heading", { name: messages.hospital.steps.slot })).toBeVisible();

  /**
   * ⛔ BUGÜN DEĞİL, YARIN SEÇİLİYOR — VE BU ŞART.
   *
   * Bu test randevu alıp sonra İPTAL ediyor, ama iptal en geç randevudan
   * 2 saat önce yapılabiliyor (PRD §5.1 · `APPOINTMENT_CANCEL_CUTOFF_MS`).
   * Bugünün ilk boş saati seçilirse ve o saate 2 saatten az kalmışsa iptal
   * düğmesi HİÇ ÇİZİLMİYOR; test de olmayan düğmeyi bekleyip zaman aşımına
   * uğruyor.
   *
   * Bu yüzden test 2026-08-08'e kadar GÜNÜN SAATİNE GÖRE kırılıyordu: sabah
   * koşulduğunda yeşil, öğleden sonra (son slot 16:30 → sınır 14:30)
   * kırmızıydı. Yerelde ve CI'da aynı anda kırmızıya düşmesi de bundan.
   *
   * Yarının bütün saatleri sınırın dışında kaldığı için gün şeridinden bir
   * sonraki gün seçiliyor ve test artık ne zaman koşulduğundan bağımsız.
   */
  await page
    .getByRole("navigation", { name: messages.hospital.steps.slot })
    .getByRole("link")
    .nth(1)
    .click();

  const bookable = page.getByRole("button", { name: /randevu al$/ });
  await expect(bookable.first()).toBeVisible();
  await bookable.first().click();

  // Randevu alındı → randevularım ekranına yönlendirilir.
  await expect(page).toHaveURL(/\/hastane\/randevularim/, { timeout: STEP_TIMEOUT_MS });

  /**
   * Mesaj METİNLE aranıyor, `getByRole("alert")` ile DEĞİL: Next.js her
   * sayfaya boş bir `role="alert"` duyurucusu koyuyor ve ikisi karışıyor
   * (`sonraki-adim-prompt.md` tuzaklar).
   */
  await expect(page.getByText(messages.hospital.booked.success)).toBeVisible();

  const upcoming = page.getByRole("region", {
    name: messages.hospital.myAppointments.upcomingHeading,
  });
  await expect(upcoming.getByRole("article")).toHaveCount(1, { timeout: STEP_TIMEOUT_MS });

  // İptal — geri alınamaz işlem olduğu için önce onay sorulur.
  await upcoming.getByRole("button", { name: messages.hospital.cancel.action }).click();
  await expect(page.getByText(messages.hospital.cancel.confirmTitle)).toBeVisible();
  await page.getByRole("button", { name: messages.hospital.cancel.confirmAction }).click();

  // Randevu yaklaşanlardan çıkıp geçmişe "İptal edildi" olarak düşmeli.
  await expect(page.getByText(messages.hospital.myAppointments.empty)).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(
    page.getByText(messages.hospital.myAppointments.statusCancelled).first(),
  ).toBeVisible({ timeout: STEP_TIMEOUT_MS });
});

test("dolu saat tıklanamaz ve durumu metinle yazar", async ({ page }, testInfo) => {
  await signIn(page, staffAccount(testInfo.project.name).nationalId);

  await page.goto("/hastane");
  await page
    .getByRole("link", { name: /doktor$/ })
    .nth(staffAccount(testInfo.project.name).specialtyIndex)
    .click();
  await expect(page).toHaveURL(/brans=/, { timeout: STEP_TIMEOUT_MS });
  await page
    .getByRole("link", { name: /^(Prof\.|Doç\.|Uzm\.|Dr\.)/ })
    .first()
    .click();
  await expect(page).toHaveURL(/doktor=/, { timeout: STEP_TIMEOUT_MS });

  /**
   * Dolu saatler düğme DEĞİL, bu yüzden `getByRole("button")` onları hiç
   * bulmaz — tıklanabilir olmadıklarının kanıtı bu. Bilgi ayrıca metinle de
   * veriliyor (07-ui-design-system.md: yalnızca renkle anlatılmaz).
   */
  const booked = page.getByLabel(/dolu, seçilemez$/);

  if ((await booked.count()) > 0) {
    await expect(booked.first()).toBeVisible();
    await expect(booked.first()).not.toHaveRole("button");
  }
});

test("personel olmayan kullanıcı hizmete erişemez", async ({ page }) => {
  await signIn(page, CITIZEN.nationalId);

  await page.goto("/hastane");

  // Kapı SAYFANIN İÇİNDE: sayfa açılıyor ama içerik yerine gerekçe gösteriliyor.
  await expect(page.getByText(messages.auth.access.staffOnly.title)).toBeVisible();
  await expect(page.getByRole("heading", { name: messages.hospital.steps.specialty })).toHaveCount(
    0,
  );

  // Randevularım ekranı da aynı kapıdan geçer.
  await page.goto("/hastane/randevularim");
  await expect(page.getByText(messages.auth.access.staffOnly.title)).toBeVisible();
});

test("giriş yapmamış ziyaretçi giriş ekranına yönlendirilir", async ({ page }) => {
  await assignOwnIp(page);

  await page.goto("/hastane/randevularim");

  await expect(page).toHaveURL(/\/giris/);
  await expect(page).toHaveURL(/donus=%2Fhastane%2Frandevularim/);
});
