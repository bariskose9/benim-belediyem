import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { CategoryFilter } from "@/features/market/components/CategoryFilter";
import { ProductGrid } from "@/features/market/components/ProductGrid";
import { ProductSearch } from "@/features/market/components/ProductSearch";
import {
  findCategoryById,
  listCategories,
  listProducts,
} from "@/features/market/repositories/product.repository";
import { parseMarketSearchParams } from "@/features/market/schemas/market.schema";

/**
 * Belediye Market (PRD §5.3).
 *
 * GİRİŞ ZORUNLU DEĞİL ve bu bilinçli: PRD §4 ziyaretçinin de sepete
 * ekleyebilmesini istiyor, sepet `bb_anon` çerezinde taşınıyor ve girişte
 * hesaptaki sepetle birleşiyor (adım 7). Zorunluluk ödeme adımında başlıyor —
 * bu yüzden burada `guardPage` YOK.
 *
 * SÜZGEÇLER ADRESTE: `?kategori=…&arama=…`. Hastane ekranındaki desenin
 * aynısı — her durum sunucuda çiziliyor, geri tuşu bir adım geri alıyor ve
 * kullanıcı bağlantıyı paylaşabiliyor.
 *
 * SEPET KURALLARI BURADA DEĞİL: stok kontrolü ve fiyat hesabı sepet
 * servisinde (adım 7). Bu sayfa yalnızca okuyor ve hazır ucu çağırıyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.market;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseMarketSearchParams(await searchParams);

  /**
   * Var olmayan bir kategori kimliği adrese elle yazılmış olabilir. O durumda
   * hata basmak yerine süzgeci düşürüyoruz: kurcalayan kişiye bilgi vermeyen,
   * meşru kullanıcıyı da bir hata ekranıyla karşılamayan davranış bu.
   */
  const selectedCategory = filters.categoryId ? await findCategoryById(filters.categoryId) : null;
  const categoryId = selectedCategory?.id;

  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({ categoryId, query: filters.query }),
  ]);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <div className="flex flex-col gap-4">
        <ProductSearch query={filters.query} selectedCategoryId={categoryId} />
        <CategoryFilter
          categories={categories}
          selectedCategoryId={categoryId}
          query={filters.query}
        />
      </div>

      <ProductGrid products={products} query={filters.query} />
    </main>
  );
}
