import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { readCartOwner } from "@/features/cart/services/cart-context";
import { getCartSummary } from "@/features/cart/services/cart.service";
import { CatalogFilter } from "@/features/catalog/components/CatalogFilter";
import { CatalogSearch } from "@/features/catalog/components/CatalogSearch";
import { parseCatalogSearchParams } from "@/features/catalog/schemas/catalog-search.schema";
import { MenuGrid } from "@/features/restaurant/components/MenuGrid";
import { TabPanel } from "@/features/restaurant/components/TabPanel";
import {
  findMenuCategoryById,
  listMenuCategories,
  listMenuItems,
} from "@/features/restaurant/repositories/menu.repository";

/**
 * Belediye Restoran (PRD §5.4).
 *
 * GİRİŞ ZORUNLU DEĞİL: PRD §4 ziyaretçinin de sepete ekleyebilmesini istiyor;
 * adisyon `bb_anon` çerezindeki sepette taşınıyor ve giriş yapılınca hesaptaki
 * sepetle birleşiyor (adım 7). Zorunluluk ödeme adımında başlıyor — bu yüzden
 * burada `guardPage` YOK.
 *
 * ÇEREZ YAZILMIYOR: `readCartOwner()` yalnızca okuyor. Sunucu bileşeninde
 * `cookies().set()` Next.js'te istisna fırlatıyor; ziyaretçi kimliği ilk
 * yazma isteğinde (uçta) üretiliyor. Bu yüzden siteye ilk kez giren kullanıcı
 * boş bir adisyon görüyor ve bu doğru davranış.
 *
 * SÜZGEÇLER ADRESTE: `?kategori=…&arama=…` — market ve hastane ekranlarındaki
 * desenin aynısı.
 */
export const dynamic = "force-dynamic";

const copy = messages.restaurant;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function RestaurantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseCatalogSearchParams(await searchParams);

  /**
   * Var olmayan bir kategori kimliği adrese elle yazılmış olabilir. O durumda
   * hata basmak yerine süzgeci düşürüyoruz: kurcalayan kişiye bilgi vermeyen,
   * meşru kullanıcıyı da hata ekranıyla karşılamayan davranış bu.
   */
  const selectedCategory = filters.categoryId
    ? await findMenuCategoryById(filters.categoryId)
    : null;
  const categoryId = selectedCategory?.id;

  const owner = await readCartOwner();

  const [categories, items, cart] = await Promise.all([
    listMenuCategories(),
    listMenuItems({ categoryId, query: filters.query }),
    owner ? getCartSummary(owner, new Date()) : null,
  ]);

  const tabSection = cart?.sections.find((section) => section.itemType === "restaurant") ?? null;

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <div className="flex flex-col gap-4">
        <CatalogSearch
          basePath="/restoran"
          copy={copy.search}
          query={filters.query}
          selectedCategoryId={categoryId}
        />
        <CatalogFilter
          basePath="/restoran"
          copy={copy.filters}
          options={categories}
          selectedCategoryId={categoryId}
          query={filters.query}
        />
      </div>

      {/*
        ADİSYON MOBİLDE MENÜNÜN ÜSTÜNDE, masaüstünde sağda: telefonda 31
        kartın altına düşen bir adisyon paneli hiç görülmezdi.
      */}
      <div className="flex flex-col gap-8 lg:flex-row-reverse lg:items-start">
        <TabPanel section={tabSection} />

        <div className="flex-1">
          <MenuGrid items={items} query={filters.query} />
        </div>
      </div>
    </main>
  );
}
