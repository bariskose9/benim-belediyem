import Link from "next/link";

import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";
import type { MarketCategory } from "../types";

/**
 * Kategori süzgeci.
 *
 * NEDEN BAĞLANTI, DÜĞME DEĞİL: her süzgeç kendi adresine gidiyor
 * (`/market?kategori=…`). Böylece geri tuşu çalışıyor, seçim paylaşılabiliyor
 * ve sayfa sunucuda çizildiği için JavaScript kapalıyken bile süzgeç işliyor.
 * İstemci tarafı bir düğme olsaydı üçü de kaybolurdu.
 *
 * ARAMA METNİ KORUNUYOR: kullanıcı "deterjan" arayıp sonra kategori
 * değiştirdiğinde araması silinmemeli.
 */

const copy = messages.market.filters;

export function CategoryFilter({
  categories,
  selectedCategoryId,
  query,
}: {
  categories: readonly MarketCategory[];
  selectedCategoryId?: string;
  query?: string;
}) {
  return (
    <nav aria-label={copy.label}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterLink href={buildHref(undefined, query)} isActive={!selectedCategoryId}>
            {copy.all}
          </FilterLink>
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <FilterLink
              href={buildHref(category.id, query)}
              isActive={category.id === selectedCategoryId}
            >
              {category.name}
              <span className="text-xs opacity-75">{copy.productCount(category.productCount)}</span>
            </FilterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FilterLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      // `aria-current`: seçili süzgeci ekran okuyucu da bilmeli, rengi göremez.
      aria-current={isActive ? "page" : undefined}
      className={cn(
        // Dokunma hedefi en az 44px (07-ui-design-system.md)
        "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

/** Süzgeç adresini kurar; boş parametreler adrese hiç yazılmaz. */
function buildHref(categoryId: string | undefined, query: string | undefined): string {
  const params = new URLSearchParams();

  if (categoryId) params.set("kategori", categoryId);
  if (query) params.set("arama", query);

  const search = params.toString();

  return search ? `/market?${search}` : "/market";
}
