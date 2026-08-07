import Link from "next/link";

import { buildCatalogHref } from "@/features/catalog/schemas/catalog-search.schema";
import type { CatalogFilterCopy, CatalogFilterOption } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

/**
 * Kategori süzgeci — market ve restoran ekranlarının ortak parçası.
 *
 * NEDEN BAĞLANTI, DÜĞME DEĞİL: her süzgeç kendi adresine gidiyor
 * (`/market?kategori=…`). Böylece geri tuşu çalışıyor, seçim paylaşılabiliyor
 * ve sayfa sunucuda çizildiği için JavaScript kapalıyken bile süzgeç işliyor.
 * İstemci tarafı bir düğme olsaydı üçü de kaybolurdu.
 *
 * ARAMA METNİ KORUNUYOR: kullanıcı "deterjan" arayıp sonra kategori
 * değiştirdiğinde araması silinmemeli.
 */
export function CatalogFilter({
  basePath,
  copy,
  options,
  selectedCategoryId,
  query,
}: {
  basePath: string;
  copy: CatalogFilterCopy;
  options: readonly CatalogFilterOption[];
  selectedCategoryId?: string;
  query?: string;
}) {
  return (
    <nav aria-label={copy.label}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterLink href={buildCatalogHref(basePath, { query })} isActive={!selectedCategoryId}>
            {copy.all}
          </FilterLink>
        </li>

        {options.map((option) => (
          <li key={option.id}>
            <FilterLink
              href={buildCatalogHref(basePath, { categoryId: option.id, query })}
              isActive={option.id === selectedCategoryId}
            >
              {option.name}
              <span className="text-xs opacity-75">{copy.itemCount(option.itemCount)}</span>
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
