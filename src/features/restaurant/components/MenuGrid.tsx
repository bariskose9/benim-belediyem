import { messages } from "@/config/messages";
import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import type { MenuItemView } from "../types";

import { MenuCard } from "./MenuCard";

/**
 * Menü ızgarası ve BOŞ DURUMU.
 *
 * Boş durum ortak bileşenden geliyor (`features/catalog`); metinleri restorana
 * ait. Üç sütun, dört değil: kartın içinde adet ve not formu açılıyor ve dar
 * bir sütunda o form sıkışıyor.
 */
export function MenuGrid({ items, query }: { items: readonly MenuItemView[]; query?: string }) {
  if (items.length === 0) {
    return (
      <CatalogEmptyState copy={messages.restaurant.empty} resetHref="/restoran" query={query} />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="h-full">
          <MenuCard item={item} />
        </li>
      ))}
    </ul>
  );
}
