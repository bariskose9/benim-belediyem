import Link from "next/link";
import { PackageSearchIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";
import type { MarketProduct } from "../types";

import { ProductCard } from "./ProductCard";

/**
 * Ürün ızgarası ve BOŞ DURUMU.
 *
 * Boş durum ayrı bir ekran değil, ızgaranın kendi hâli: her ekranda
 * yükleniyor / boş / hata durumları tanımlı olmalı (CLAUDE.md §5.7) ve boş
 * durumu çağıran her sayfaya kopyalamak o kuralı zamanla aşındırırdı.
 */

const copy = messages.market.empty;

export function ProductGrid({
  products,
  query,
}: {
  products: readonly MarketProduct[];
  query?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <PackageSearchIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <h2 className="font-heading text-lg font-semibold">{copy.title}</h2>
        <p className="max-w-prose text-base text-muted-foreground">
          {query ? copy.withQuery(query) : copy.withoutQuery}
        </p>
        <Link href="/market" className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
          {copy.reset}
        </Link>
      </div>
    );
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
