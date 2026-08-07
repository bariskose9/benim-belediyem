import Link from "next/link";
import { PackageSearchIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { CatalogEmptyCopy } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

/**
 * Süzgeç sonucu boşsa gösterilen ekran — market ve restoran için ortak.
 *
 * Boş durum ayrı bir sayfa değil, ızgaranın kendi hâli: her ekranda
 * yükleniyor / boş / hata durumları tanımlı olmalı (CLAUDE.md §5.7) ve boş
 * durumu her katalog ekranına kopyalamak o kuralı zamanla aşındırırdı.
 *
 * ARAMA METNİ GERİ GÖSTERİLİYOR ki kullanıcı ne aradığını görsün — "sonuç
 * yok" tek başına yazım hatasını fark ettirmez.
 */
export function CatalogEmptyState({
  copy,
  resetHref,
  query,
}: {
  copy: CatalogEmptyCopy;
  resetHref: string;
  query?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <PackageSearchIcon aria-hidden="true" className="size-8 text-muted-foreground" />
      <h2 className="font-heading text-lg font-semibold">{copy.title}</h2>
      <p className="max-w-prose text-base text-muted-foreground">
        {query ? copy.withQuery(query) : copy.withoutQuery}
      </p>
      <Link href={resetHref} className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}>
        {copy.reset}
      </Link>
    </div>
  );
}
