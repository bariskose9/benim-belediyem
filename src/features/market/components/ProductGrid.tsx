import { messages } from "@/config/messages";
import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import type { MarketProduct } from "../types";

import { ProductCard } from "./ProductCard";

/**
 * Ürün ızgarası ve BOŞ DURUMU.
 *
 * Boş durum ortak bileşenden geliyor (`features/catalog`): restoran menüsü de
 * aynı ekranı gösteriyor, metinleri farklı.
 */

export function ProductGrid({
  products,
  query,
}: {
  products: readonly MarketProduct[];
  query?: string;
}) {
  if (products.length === 0) {
    return <CatalogEmptyState copy={messages.market.empty} resetHref="/market" query={query} />;
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <li key={product.id} className="h-full">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
