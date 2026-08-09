import { expect, test } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Hakkımızda: teşkilat şeması + personel rehberi — uçtan uca (PRD §5.9 · adım 15b).
 *
 * GİRİŞ YAPILMIYOR ve bu testin bir parçası: sayfa ziyaretçiye açık olmalı.
 * Giriş akışı burada koşsaydı hem test hız sınırına takılırdı hem de asıl
 * sorulan şeyi (girişsiz kullanıcı kurumsal bilgiyi görebiliyor mu) hiç
 * sınamazdı.
 *
 * HİÇBİR TEST VERİ YAZMIYOR: sayfa salt okunur, tohum verisiyle çalışıyor.
 * Bu yüzden Playwright projeleri (masaüstü + 375px) arasında paylaşılan kaynak
 * çakışması da yok — adım 15'te her projeye ayrı hesap gerektiren durumun
 * tersine, burada temizlenecek kayıt üretilmiyor.
 *
 * ADLAR TOHUM VERİSİNDEN OKUNUYOR, teste elle yazılmıyor: tohum değiştiğinde
 * test yanlış sebepten kırmızıya dönmesin.
 */

const copy = messages.about;

/** Personeli olan tek daire (fake-data-guide.md: yalnızca Bilgi İşlem dolu). */
async function itDirectorate() {
  const unit = await prisma.orgUnit.findFirstOrThrow({
    where: { deletedAt: null, unitType: "directorate", name: { contains: "Bilgi İşlem" } },
    select: { id: true, name: true },
  });

  return unit;
}

/** Şemada ismen görünen ama personeli olmayan bir daire. */
async function emptyDirectorate() {
  const unit = await prisma.orgUnit.findFirstOrThrow({
    where: {
      deletedAt: null,
      unitType: "directorate",
      name: { not: { contains: "Bilgi İşlem" } },
      staff: { none: {} },
      children: { none: {} },
    },
    select: { id: true, name: true },
  });

  return unit;
}

test("hakkımızda sayfası giriş yapmadan açılıyor", async ({ page }) => {
  await page.goto("/hakkimizda");

  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: copy.contact.heading, level: 2 })).toBeVisible();
  await expect(page.getByText(copy.contact.addressValue)).toBeVisible();
});

test("üst menüden hakkımızda sayfasına gidiliyor", async ({ page }) => {
  await page.goto("/");

  const menu = page.getByRole("navigation", { name: messages.nav.label });
  const openMenu = page.getByRole("button", { name: messages.nav.openMenu });

  // Mobilde menü hamburger'in arkasında; masaüstünde düğme hiç görünmüyor.
  if (await openMenu.isVisible()) await openMenu.click();

  await menu.getByRole("link", { name: messages.nav.about }).click();

  await page.waitForURL(/\/hakkimizda$/);
  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
});

test("teşkilat şeması daireleri listeliyor", async ({ page }) => {
  const directorate = await itDirectorate();

  await page.goto("/hakkimizda");

  /**
   * ARAMA ŞEMA LİSTESİNE SINIRLANDI: sayfada başka listeler de var (menü, alt
   * bilgi, rehber kartları). Çıplak bir `getByRole("listitem")` hepsini sayardı
   * — adım 15'te ölçülmüş tuzak.
   */
  const chart = page.getByRole("list", { name: copy.chart.listLabel });

  await expect(chart.getByRole("link", { name: new RegExp(directorate.name) })).toBeVisible();
});

test("bir birime tıklayınca o birimin personeli listeleniyor", async ({ page }) => {
  const directorate = await itDirectorate();
  const staffCount = await prisma.staffMember.count({ where: { deletedAt: null } });

  await page.goto("/hakkimizda");

  const chart = page.getByRole("list", { name: copy.chart.listLabel });
  await chart.getByRole("link", { name: new RegExp(directorate.name) }).click();

  await page.waitForURL(new RegExp(`birim=${directorate.id}`));

  // Seçili birim ekran okuyucuya da bildiriliyor.
  await expect(
    page.getByRole("link", { name: new RegExp(directorate.name) }).first(),
  ).toHaveAttribute("aria-current", "true");

  // Tohumda personelin tamamı bu dairenin altında; sayaç onu doğruluyor.
  await expect(page.getByText(copy.directory.resultCount(staffCount))).toBeVisible();

  const list = page.getByRole("list", { name: copy.directory.listLabel });
  await expect(list.getByRole("listitem")).toHaveCount(staffCount);
});

/** PRD §5.9: boş daireye tıklayan kullanıcı boş ekran değil, açıklama görmeli. */
test("personeli olmayan dairede bilgi mesajı çıkıyor", async ({ page }) => {
  const directorate = await emptyDirectorate();

  await page.goto(`/hakkimizda?birim=${directorate.id}`);

  await expect(
    page.getByRole("heading", { name: copy.directory.empty.unpublished.title, level: 3 }),
  ).toBeVisible();
  await expect(
    page.getByText(copy.directory.empty.unpublished.body(directorate.name)),
  ).toBeVisible();
});

test("ada göre arama personeli buluyor", async ({ page }) => {
  const person = await prisma.staffMember.findFirstOrThrow({
    where: { deletedAt: null },
    select: { fullName: true },
    orderBy: { extensionNumber: "asc" },
  });

  await page.goto("/hakkimizda");

  await page.getByLabel(copy.directory.search.label).fill(person.fullName);
  await page.getByRole("button", { name: copy.directory.search.submit }).click();

  const list = page.getByRole("list", { name: copy.directory.listLabel });
  await expect(list.getByRole("heading", { name: person.fullName, level: 3 })).toBeVisible();
});

/**
 * ═══ TÜRKÇE ARAMA — market kataloğunda ölçülmüş hatanın rehberdeki karşılığı ═══
 * Veritabanı `I` harfini `i`'ye çeviriyor (Türkçe karşılığı `ı`). Düzeltme
 * olmadan BÜYÜK HARFLE arayan kullanıcı kişiyi hiç bulamazdı.
 */
test("büyük harfle yazılan arama sonuç veriyor", async ({ page }) => {
  const person = await prisma.staffMember.findFirstOrThrow({
    where: { deletedAt: null },
    select: { fullName: true },
    orderBy: { extensionNumber: "asc" },
  });

  await page.goto("/hakkimizda");

  await page.getByLabel(copy.directory.search.label).fill(person.fullName.toLocaleUpperCase("tr"));
  await page.getByRole("button", { name: copy.directory.search.submit }).click();

  const list = page.getByRole("list", { name: copy.directory.listLabel });
  await expect(list.getByRole("heading", { name: person.fullName, level: 3 })).toBeVisible();
});

test("sonuçsuz arama boş durumu ve çıkış yolunu gösteriyor", async ({ page }) => {
  await page.goto("/hakkimizda");

  await page.getByLabel(copy.directory.search.label).fill("boylebirpersonelyok");
  await page.getByRole("button", { name: copy.directory.search.submit }).click();

  await expect(
    page.getByRole("heading", { name: copy.directory.empty.noResults.title, level: 3 }),
  ).toBeVisible();

  // `waitForURL` kullanılıyor, `toHaveURL` değil: ikincisinin 5 saniyelik
  // varsayılan sınırı yüklü makinede gerçek hata yokken kırmızı veriyor.
  await page.getByRole("link", { name: copy.directory.empty.noResults.reset }).click();
  await page.waitForURL(/\/hakkimizda$/);
});

test("unvan süzgeci rehberi daraltıyor", async ({ page }) => {
  const headCount = await prisma.staffMember.count({
    where: { deletedAt: null, title: "department_head" },
  });

  await page.goto("/hakkimizda");

  await page
    .getByRole("link", { name: copy.directory.titleLabels.department_head, exact: true })
    .click();

  await page.waitForURL(/unvan=department_head/);

  await expect(page.getByText(copy.directory.resultCount(headCount))).toBeVisible();
});

/**
 * ═══ ŞEMA DAR EKRANDA TAŞMAMALI ═══
 *
 * Ağaç her kademede girinti ekliyor ve birim adları uzun ("Coğrafi Bilgi
 * Sistemleri (CBS) Şube Müdürlüğü"). Dördüncü kademe 375px'te yatay kaydırma
 * üretmeye en yakın yer; bu test onun nöbetçisi. Şema açık gelen bir birim
 * seçilerek en derin hâli ölçülüyor.
 */
test("dar ekranda yatay kaydırma oluşmuyor", async ({ page }) => {
  const directorate = await itDirectorate();

  await page.goto(`/hakkimizda?birim=${directorate.id}`);

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflows).toBe(false);
});

/**
 * ═══ GİZLİLİK — SAYFANIN KAYNAĞINDA KİMLİK ÖZETİ OLMAMALI ═══
 *
 * Rehber herkese açık. `staff_members.national_id_hash` sunucuda kalmalı;
 * sorgunun onu okumadığı birim ve veritabanı testlerinde kanıtlanıyor, burada
 * ise TARAYICIYA İNEN HTML'de hiç geçmediği doğrulanıyor — üç katman birlikte.
 */
test("personelin kimlik özeti sayfa kaynağında geçmiyor", async ({ page }) => {
  const person = await prisma.staffMember.findFirstOrThrow({
    where: { deletedAt: null, nationalIdHash: { not: null } },
    select: { nationalIdHash: true },
  });

  await page.goto("/hakkimizda");

  expect(await page.content()).not.toContain(person.nationalIdHash);
});
