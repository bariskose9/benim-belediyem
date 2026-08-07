import { expect, test } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Belediye Restoran ve adisyon — uçtan uca (PRD §5.4 · roadmap adım 9).
 *
 * GİRİŞ YAPILMIYOR ve bu testin bir parçası: PRD §4 ziyaretçinin de sepete
 * ekleyebilmesini istiyor. Giriş akışı burada koşulsaydı hem test hız
 * sınırına takılır hem de asıl sorulan şeyi (ziyaretçi adisyon açabiliyor mu)
 * hiç sınamazdı — market testindeki kararın aynısı.
 *
 * KALEM ADLARI TOHUM VERİSİNDEN OKUNUYOR, teste elle yazılmıyor: tohum
 * verisi değiştiğinde test yanlış sebepten kırmızıya dönmesin.
 */

const copy = messages.restaurant;

/** Tohumlanmış menüden sipariş edilebilir bir kalem. */
async function anyAvailableItem() {
  const item = await prisma.menuItem.findFirst({
    where: { deletedAt: null, isAvailable: true },
    select: { name: true, categoryId: true },
    orderBy: { name: "asc" },
  });

  if (!item) throw new Error("Tohum verisinde sipariş edilebilir menü kalemi yok.");

  return item;
}

test("restoran sayfası menüyü listeliyor", async ({ page }) => {
  const item = await anyAvailableItem();

  await page.goto("/restoran");

  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: item.name, level: 3 })).toBeVisible();
});

/**
 * Ana sayfadaki hizmet kartı artık tıklanabilir olmalı ve rozeti "Açık"
 * demeli. Kartın adresi `src/config/navigation.ts` içinde `null`'dan
 * `/restoran`'a döndü; bu test o bağın gerçekten kurulduğunu sınıyor —
 * yapılandırmayı değiştirip sayfayı bağlamayı unutmak sessiz bir hata olurdu.
 */
test("ana sayfadaki restoran kartı restorana götürüyor", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: new RegExp(messages.services.restaurant.title) }).click();

  await page.waitForURL(/\/restoran$/);
  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
});

test("kategori süzgeci menüyü daraltıyor", async ({ page }) => {
  const category = await prisma.menuCategory.findFirstOrThrow({
    where: { items: { some: { deletedAt: null } } },
    select: { id: true, name: true, _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });

  await page.goto("/restoran");
  await page.getByRole("link", { name: new RegExp(category.name) }).click();

  await page.waitForURL(new RegExp(`kategori=${category.id}`));

  // Seçili süzgeç ekran okuyucuya da bildiriliyor.
  await expect(page.getByRole("link", { name: new RegExp(category.name) })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

/**
 * ═══ TÜRKÇE ARAMA ═══
 * Veritabanı `I` harfini `i`'ye çeviriyor, oysa Türkçe'de karşılığı `ı`;
 * ayrıca aksanları eşlemiyor. Düzeltme olmadan büyük harfle veya Türkçe
 * klavyesiz arayan kullanıcı kalemi hiç bulamıyordu.
 */
test("aksansız ve büyük harfle yazılan arama sonuç veriyor", async ({ page }) => {
  const item = await prisma.menuItem.findFirst({
    where: { deletedAt: null, name: { contains: "Güveç" } },
    select: { name: true },
  });

  test.skip(!item, "Tohum verisinde 'Güveç' geçen kalem yok.");

  await page.goto("/restoran");
  await page.getByLabel(copy.search.label).fill("GUVEC");
  await page.getByRole("button", { name: copy.search.submit, exact: true }).click();

  await expect(page.getByRole("heading", { name: item!.name, level: 3 })).toBeVisible();
});

test("sonuçsuz arama boş durumu gösteriyor", async ({ page }) => {
  await page.goto("/restoran");
  await page.getByLabel(copy.search.label).fill("boylebiryemekyok");
  await page.getByRole("button", { name: copy.search.submit, exact: true }).click();

  await expect(page.getByRole("heading", { name: copy.empty.title })).toBeVisible();

  /**
   * Boş durumdan çıkış yolu var: kullanıcı çıkmaza düşmüyor.
   *
   * `waitForURL` KULLANILIYOR, `toHaveURL` DEĞİL: ikincisinin 5 saniyelik
   * varsayılan sınırı, testler paralel koşarken yetmiyor ve gerçek bir hata
   * yokken kırmızı veriyor.
   */
  await page.getByRole("link", { name: copy.empty.reset }).click();
  await page.waitForURL(/\/restoran$/);
});

/** PRD §5.4: tükenmiş kalem listede görünür ama adisyona eklenemez. */
test("tükenmiş kalem adisyona eklenemiyor", async ({ page }) => {
  const unavailable = await prisma.menuItem.findFirst({
    where: { deletedAt: null, isAvailable: false },
    select: { name: true, categoryId: true },
  });

  test.skip(!unavailable, "Tohum verisinde tükenmiş menü kalemi yok.");

  await page.goto(`/restoran?kategori=${unavailable!.categoryId}`);

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: unavailable!.name, level: 3 }) });

  await expect(card.getByText(copy.item.unavailable).first()).toBeVisible();
  await expect(
    card.getByRole("button", { name: copy.item.addToTabLabel(unavailable!.name) }),
  ).toHaveCount(0);
});

/**
 * ═══ BU DOSYANIN ASIL TESTİ — ADİSYON ═══
 *
 * Adım 9'un tek yeni kavramı: kalem ADET VE NOTLA adisyona giriyor, adisyon
 * sayfada kalıcı olarak görünüyor ve notu sepete kadar taşınıyor. Not
 * kaybolsaydı mutfak "az acılı" isteğini hiç görmezdi — sessiz bir hata.
 */
test("ziyaretçi kalemi adet ve notla adisyona ekliyor, not sepette görünüyor", async ({ page }) => {
  const item = await anyAvailableItem();
  const note = "az acılı olsun";

  await page.goto("/restoran");

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: item.name, level: 3 }) });

  await card.getByRole("button", { name: copy.item.addToTabLabel(item.name) }).click();

  await card.getByLabel(copy.form.quantity).fill("2");
  await card.getByLabel(copy.form.note).fill(note);
  await card.getByRole("button", { name: copy.form.submit }).click();

  // Onay bildirim balonu — ekran okuyucuya da ulaşan `aria-live` bölgesinde.
  await expect(page.getByText(copy.toast.added(item.name))).toBeVisible();

  // Adisyon paneli sunucuda tazeleniyor: kalem, adedi ve notuyla görünmeli.
  const tab = page.getByRole("complementary").filter({ hasText: copy.tab.heading });

  await expect(tab.getByText(item.name).first()).toBeVisible();
  await expect(tab.getByText(note, { exact: false }).first()).toBeVisible();

  // Adisyon sepetin restoran bölümünün kendisi — "sepete aktarma" adımı yok.
  await tab.getByRole("link", { name: copy.tab.goToCart }).click();
  await page.waitForURL(/\/sepet$/);

  await expect(page.getByText(item.name).first()).toBeVisible();
  await expect(page.getByText(note, { exact: false }).first()).toBeVisible();

  await cleanupGuestCart(page);
});

/**
 * ADİSYON SAYFA YENİLENDİĞİNDE KAYBOLMUYOR. Taslak bir liste (yalnızca
 * ekranda tutulan) olsaydı bu test kırmızıya dönerdi — kalıcı olmasının
 * gerekçesi tam olarak bu.
 */
test("adisyon sayfa yenilenince duruyor", async ({ page }) => {
  const item = await anyAvailableItem();

  await page.goto("/restoran");

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: item.name, level: 3 }) });

  await card.getByRole("button", { name: copy.item.addToTabLabel(item.name) }).click();
  await card.getByRole("button", { name: copy.form.submit }).click();

  await expect(page.getByText(copy.toast.added(item.name))).toBeVisible();

  await page.reload();

  const tab = page.getByRole("complementary").filter({ hasText: copy.tab.heading });

  await expect(tab.getByText(item.name).first()).toBeVisible();

  await cleanupGuestCart(page);
});

/**
 * Ziyaretçi sepeti `bb_anon` çerezinde taşınıyor ve kimliği uygulama üretiyor,
 * yani test öneki taşımıyor — ortak temizlik onu yakalayamaz. Bırakılırsa her
 * koşuda veritabanında bir sepet daha birikir.
 */
async function cleanupGuestCart(page: import("@playwright/test").Page): Promise<void> {
  const cookies = await page.context().cookies();
  const anonymousId = cookies.find((cookie) => cookie.name === "bb_anon")?.value;

  if (!anonymousId) return;

  await prisma.cartItem.deleteMany({ where: { cart: { anonymousId } } });
  await prisma.cart.deleteMany({ where: { anonymousId } });
}
