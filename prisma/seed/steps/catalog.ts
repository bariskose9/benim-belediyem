import { MARKET_CATEGORIES, MEMBERSHIP_PLANS, MENU_CATEGORIES } from "../data/catalog.js";
import { createRng } from "../lib/rng.js";
import { priceInBand, seedId, slugify } from "../lib/seed-helpers.js";
import type { SeedContext } from "../types.js";

/**
 * Market, restoran ve spor salonu katalogları.
 *
 * Fiyatlar fake-data-guide.md'deki bantların DIŞINA ÇIKMAZ ve `.90 / .50 / .40`
 * gibi gerçekçi kuruşlarla biter. Görseller `public/images/` altındaki yerel
 * dosyalardır; dış siteden sıcak bağlantı verilmez.
 */

/** Boş durum testi için stoğu sıfırlanacak ürün sayısı (fake-data-guide.md: en az 2). */
const OUT_OF_STOCK_COUNT = 2;

/** "Tükendi" durumu testi için satışa kapatılacak menü kalemi sayısı (en az 2). */
const UNAVAILABLE_MENU_ITEM_COUNT = 2;

export interface CatalogSeedResult {
  readonly productCount: number;
  readonly menuItemCount: number;
  readonly planCount: number;
}

export async function seedCatalog(context: SeedContext): Promise<CatalogSeedResult> {
  const productCount = await seedMarket(context);
  const menuItemCount = await seedRestaurant(context);
  const planCount = await seedMembershipPlans(context);

  context.log(
    `Katalog: ${productCount} market ürünü · ${menuItemCount} menü kalemi · ${planCount} üyelik paketi`,
  );

  return { productCount, menuItemCount, planCount };
}

async function seedMarket(context: SeedContext): Promise<number> {
  const rng = createRng(20260734);

  const categories = MARKET_CATEGORIES.map((category, order) => ({
    id: seedId("pcat", order + 1),
    name: category.name,
    isSeedData: true,
  }));

  await context.prisma.productCategory.createMany({ data: categories, skipDuplicates: true });

  let productOrder = 0;
  const products = MARKET_CATEGORIES.flatMap((category, categoryOrder) =>
    category.items.map((name) => {
      productOrder += 1;

      return {
        id: seedId("product", productOrder),
        categoryId: categories[categoryOrder].id,
        name,
        description: `${name} — Belediye Market rafından. Bu bir örnek üründür.`,
        imageUrl: `/images/market/${slugify(category.name)}.svg`,
        price: priceInBand(rng, category.band.minLira, category.band.maxLira),
        stock: rng.int(1, 200),
        isSeedData: true,
      };
    }),
  );

  // Boş durum ekranı gerçek veriyle sınanabilsin diye en az iki ürün stoksuz.
  for (let offset = 0; offset < OUT_OF_STOCK_COUNT; offset += 1) {
    products[products.length - 1 - offset].stock = 0;
  }

  await context.prisma.product.createMany({ data: products, skipDuplicates: true });

  return products.length;
}

async function seedRestaurant(context: SeedContext): Promise<number> {
  const rng = createRng(20260735);

  const categories = MENU_CATEGORIES.map((category, order) => ({
    id: seedId("mcat", order + 1),
    name: category.name,
    isSeedData: true,
  }));

  await context.prisma.menuCategory.createMany({ data: categories, skipDuplicates: true });

  let itemOrder = 0;
  const items = MENU_CATEGORIES.flatMap((category, categoryOrder) =>
    category.items.map((name) => {
      itemOrder += 1;

      return {
        id: seedId("menu", itemOrder),
        categoryId: categories[categoryOrder].id,
        name,
        description: `${name} — Belediye Restoran mutfağından. Bu bir örnek kalemdir.`,
        imageUrl: `/images/restaurant/${slugify(category.name)}.svg`,
        price: priceInBand(rng, category.band.minLira, category.band.maxLira),
        isAvailable: true,
        isSeedData: true,
      };
    }),
  );

  // "Tükendi" durumu için en az iki kalem satışa kapalı.
  for (let offset = 0; offset < UNAVAILABLE_MENU_ITEM_COUNT; offset += 1) {
    items[items.length - 1 - offset].isAvailable = false;
  }

  await context.prisma.menuItem.createMany({ data: items, skipDuplicates: true });

  return items.length;
}

/** Paketlerin fiyatı rehberden BİREBİR gelir; rastgele üretilmez. */
async function seedMembershipPlans(context: SeedContext): Promise<number> {
  const plans = MEMBERSHIP_PLANS.map((plan, order) => ({
    id: seedId("plan", order + 1),
    name: plan.name,
    commitmentMonths: plan.commitmentMonths,
    monthlyPrice: plan.monthlyPrice,
    isSeedData: true,
  }));

  await context.prisma.membershipPlan.createMany({ data: plans, skipDuplicates: true });

  return plans.length;
}
