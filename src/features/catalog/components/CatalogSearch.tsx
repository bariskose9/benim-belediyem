import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { TextField } from "@/features/auth/components/TextField";
import { buildCatalogHref } from "@/features/catalog/schemas/catalog-search.schema";
import type { CatalogSearchCopy } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

/**
 * Katalog arama kutusu — market ve restoran ekranlarının ortak parçası.
 *
 * NEDEN SIRADAN BİR `GET` FORMU: arama sonucu bir adres (`?arama=…`), yani
 * paylaşılabilir ve geri tuşuyla gezilebilir olmalı. Form `method="get"` ile
 * kurulduğu için JavaScript kapalı olsa bile çalışıyor; her tuşta istek atan
 * bir istemci bileşeni ise hem gereksiz sorgu üretir hem de bu iki özelliği
 * kaybettirirdi.
 *
 * SEÇİLİ KATEGORİ GİZLİ ALANLA TAŞINIYOR: kullanıcı bir kategoriye süzüp
 * sonra arama yaptığında kategorisi silinmemeli.
 *
 * METİNLER DIŞARIDAN GELİYOR: markette "Ürün ara", restoranda "Yemek ara"
 * yazıyor. Bileşenin içine gömülselerdi tek ekran için doğru, diğeri için
 * yanlış olurdu.
 */
export function CatalogSearch({
  basePath,
  copy,
  query,
  selectedCategoryId,
}: {
  basePath: string;
  copy: CatalogSearchCopy;
  query?: string;
  selectedCategoryId?: string;
}) {
  return (
    <form action={basePath} method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
      {selectedCategoryId ? (
        <input type="hidden" name="kategori" value={selectedCategoryId} />
      ) : null}

      <div className="flex-1">
        <TextField
          label={copy.label}
          name="arama"
          type="search"
          defaultValue={query ?? ""}
          placeholder={copy.placeholder}
          maxLength={80}
          // Ürün adı özel isim değil: ilk harfi büyütmek "Süt" yerine "süt"
          // arayan kullanıcıyı engellemez ama mobil klavyede şaşırtır.
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit" className="min-h-11">
          <SearchIcon aria-hidden="true" />
          {copy.submit}
        </Button>

        {query ? (
          <Link
            href={buildCatalogHref(basePath, { categoryId: selectedCategoryId })}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            {copy.clear}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
