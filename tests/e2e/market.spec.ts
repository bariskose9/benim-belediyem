import { expect, test } from "@playwright/test";

import { messages } from "../../src/config/messages";
import { prisma } from "../db/helpers";

/**
 * Belediye Market — uçtan uca (PRD §5.3 · roadmap adım 8).
 *
 * GİRİŞ YAPILMIYOR ve bu testin bir parçası: PRD §4 ziyaretçinin de sepete
 * ekleyebilmesini istiyor. Giriş akışı burada koşulsaydı hem test hız
 * sınırına takılır hem de asıl sorulan şeyi (ziyaretçi sepete ekleyebiliyor
 * mu) hiç sınamazdı.
 *
 * ÜRÜN ADLARI TOHUM VERİSİNDEN OKUNUYOR, teste elle yazılmıyor: tohum
 * verisi değiştiğinde test yanlış sebepten kırmızıya dönmesin.
 */

const copy = messages.market;

/** Tohumlanmış katalogdan satın alınabilir bir ürün. */
async function anyProductInStock() {
  const product = await prisma.product.findFirst({
    where: { deletedAt: null, stock: { gt: 0 } },
    select: { name: true, categoryId: true },
    orderBy: { name: "asc" },
  });

  if (!product) throw new Error("Tohum verisinde stoğu olan ürün yok.");

  return product;
}

test("market sayfası ürünleri listeliyor", async ({ page }) => {
  const product = await anyProductInStock();

  await page.goto("/market");

  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: product.name, level: 3 })).toBeVisible();
});

/**
 * Ana sayfadaki hizmet kartı artık tıklanabilir olmalı ve rozeti "Açık"
 * demeli. Kartın adresi `src/config/navigation.ts` içinde `null`'dan
 * `/market`'e döndü; bu test o bağın gerçekten kurulduğunu sınıyor —
 * yapılandırmayı değiştirip sayfayı bağlamayı unutmak sessiz bir hata olurdu.
 */
test("ana sayfadaki market kartı markete götürüyor", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: new RegExp(messages.services.market.title) }).click();

  await expect(page).toHaveURL(/\/market$/);
  await expect(page.getByRole("heading", { name: copy.title, level: 1 })).toBeVisible();
});

test("kategori süzgeci ürünleri daraltıyor", async ({ page }) => {
  const category = await prisma.productCategory.findFirstOrThrow({
    where: { products: { some: { deletedAt: null } } },
    select: { id: true, name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  await page.goto("/market");
  await page.getByRole("link", { name: new RegExp(category.name) }).click();

  await expect(page).toHaveURL(new RegExp(`kategori=${category.id}`));

  // Seçili süzgeç ekran okuyucuya da bildiriliyor.
  await expect(page.getByRole("link", { name: new RegExp(category.name) })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const visibleCards = page.getByRole("listitem").filter({ has: page.getByRole("heading") });
  await expect(visibleCards).toHaveCount(category._count.products);
});

/**
 * ═══ TÜRKÇE ARAMA — GERÇEK BİR HATANIN NÖBETÇİSİ ═══
 *
 * Veritabanı `I` harfini `i`'ye çeviriyor, oysa Türkçe'de karşılığı `ı`.
 * Düzeltme olmadan BÜYÜK HARFLE arayan kullanıcı ürünü hiç bulamıyordu.
 */
test("büyük harfle Türkçe arama sonuç veriyor", async ({ page }) => {
  const product = await prisma.product.findFirst({
    where: { deletedAt: null, name: { contains: "Kağıt" } },
    select: { name: true },
  });

  test.skip(!product, "Tohum verisinde 'Kağıt' geçen ürün yok.");

  await page.goto("/market");
  await page.getByLabel(copy.search.label).fill("KAĞIT");
  await page.getByRole("button", { name: copy.search.submit }).click();

  await expect(page.getByRole("heading", { name: product!.name, level: 3 })).toBeVisible();
});

test("sonuçsuz arama boş durumu gösteriyor", async ({ page }) => {
  await page.goto("/market");
  await page.getByLabel(copy.search.label).fill("boylebirurunyok");
  await page.getByRole("button", { name: copy.search.submit }).click();

  await expect(page.getByRole("heading", { name: copy.empty.title })).toBeVisible();
  await expect(page.getByText(copy.empty.withQuery("boylebirurunyok"))).toBeVisible();

  // Boş durumdan çıkış yolu var: kullanıcı çıkmaza düşmüyor.
  await page.getByRole("link", { name: copy.empty.reset }).click();
  await expect(page).toHaveURL(/\/market$/);
});

/** PRD §5.3: "Stok yetersizse sepete eklenemez." */
test("tükenmiş ürün sepete eklenemiyor", async ({ page }) => {
  const soldOut = await prisma.product.findFirst({
    where: { deletedAt: null, stock: 0 },
    select: { name: true, categoryId: true },
  });

  test.skip(!soldOut, "Tohum verisinde stoğu 0 olan ürün yok.");

  await page.goto(`/market?kategori=${soldOut!.categoryId}`);

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: soldOut!.name, level: 3 }) });

  await expect(card.getByText(copy.product.outOfStock).first()).toBeVisible();
  await expect(
    card.getByRole("button", { name: copy.product.addToCartLabel(soldOut!.name) }),
  ).toHaveCount(0);
});

test("ziyaretçi ürünü sepete ekleyebiliyor", async ({ page }) => {
  const product = await anyProductInStock();

  await page.goto("/market");

  const card = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: product.name, level: 3 }) });

  await card.getByRole("button", { name: copy.product.addToCartLabel(product.name) }).click();

  // Onay bildirim balonu — ekran okuyucuya da ulaşan `aria-live` bölgesinde.
  await expect(page.getByText(copy.toast.added(product.name))).toBeVisible();

  await page.getByRole("link", { name: copy.toast.goToCart }).click();

  await expect(page).toHaveURL(/\/sepet$/);
  await expect(page.getByText(product.name).first()).toBeVisible();

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
