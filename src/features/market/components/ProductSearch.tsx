import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { TextField } from "@/features/auth/components/TextField";
import { cn } from "@/lib/utils";

/**
 * Ürün arama kutusu.
 *
 * NEDEN SIRADAN BİR `GET` FORMU: arama sonucu bir adres (`?arama=…`), yani
 * paylaşılabilir ve geri tuşuyla gezilebilir olmalı. Form `method="get"` ile
 * kurulduğu için JavaScript kapalı olsa bile çalışıyor; her tuşta istek atan
 * bir istemci bileşeni ise hem gereksiz sorgu üretir hem de bu iki özelliği
 * kaybettirirdi.
 *
 * SEÇİLİ KATEGORİ GİZLİ ALANLA TAŞINIYOR: kullanıcı bir kategoriye süzüp
 * sonra arama yaptığında kategorisi silinmemeli.
 */

const copy = messages.market.search;

export function ProductSearch({
  query,
  selectedCategoryId,
}: {
  query?: string;
  selectedCategoryId?: string;
}) {
  return (
    <form action="/market" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
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
            href={selectedCategoryId ? `/market?kategori=${selectedCategoryId}` : "/market"}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            {copy.clear}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
