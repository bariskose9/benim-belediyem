import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { TextField } from "@/features/auth/components/TextField";
import type { StaffTitle } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { ABOUT_PATH, buildDirectoryHref, STAFF_TITLES } from "../schemas/directory-search.schema";

const copy = messages.about.directory;

/**
 * Personel rehberinin süzgeçleri: ad araması + unvan şeridi + seçili birim.
 *
 * ARAMA SIRADAN BİR `GET` FORMU (market ekranındaki desenin aynısı): sonuç bir
 * adres olduğu için paylaşılabiliyor, geri tuşuyla gezilebiliyor ve JavaScript
 * kapalıyken de çalışıyor. Her tuşta istek atan bir istemci bileşeni üçünü de
 * kaybettirirdi.
 *
 * DİĞER SÜZGEÇLER GİZLİ ALANLA TAŞINIYOR: kullanıcı bir birim seçip sonra
 * arama yaptığında birimi silinmemeli.
 */
export function DirectoryFilters({
  filters,
  selectedUnitName,
}: {
  filters: { unitId?: string; title?: StaffTitle; query?: string };
  selectedUnitName?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <form
        action={ABOUT_PATH}
        method="get"
        role="search"
        className="flex flex-col gap-3 sm:flex-row"
      >
        {filters.unitId ? <input type="hidden" name="birim" value={filters.unitId} /> : null}
        {filters.title ? <input type="hidden" name="unvan" value={filters.title} /> : null}

        <div className="flex-1">
          <TextField
            label={copy.search.label}
            name="arama"
            type="search"
            defaultValue={filters.query ?? ""}
            placeholder={copy.search.placeholder}
            maxLength={80}
            // Ad özel isim ama ilk harfi otomatik büyütmek "şahin" arayan
            // kullanıcıyı engellemiyor; arama zaten büyük/küçük harf körü.
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" className="min-h-11">
            <SearchIcon aria-hidden="true" />
            {copy.search.submit}
          </Button>

          {filters.query ? (
            <Link
              href={buildDirectoryHref({ unitId: filters.unitId, title: filters.title })}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
            >
              {copy.search.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {/* Seçili birim ROZETİ: şemada aşağıda kalan seçim, listenin başında da
          görünmeli — kullanıcı neden 100 değil 6 kişi gördüğünü anlamalı. */}
      {selectedUnitName ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{copy.selectedUnit(selectedUnitName)}</span>
          <Link
            href={buildDirectoryHref({ title: filters.title, query: filters.query })}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
          >
            <XIcon aria-hidden="true" />
            {copy.clearUnit}
          </Link>
        </div>
      ) : null}

      <nav aria-label={copy.titles.label}>
        <ul className="flex flex-wrap gap-2">
          <li>
            <TitleLink
              href={buildDirectoryHref({ unitId: filters.unitId, query: filters.query })}
              isActive={!filters.title}
            >
              {copy.titles.all}
            </TitleLink>
          </li>

          {STAFF_TITLES.map((title) => (
            <li key={title}>
              <TitleLink
                href={buildDirectoryHref({ ...filters, title })}
                isActive={title === filters.title}
              >
                {copy.titleLabels[title]}
              </TitleLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Süzgeç bağlantısı — market kategori şeridiyle aynı görsel dil. */
function TitleLink({
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
      // Seçili süzgeci ekran okuyucu da bilmeli, rengi göremez.
      aria-current={isActive ? "page" : undefined}
      className={cn(
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
