import Link from "next/link";
import { InfoIcon, UserSearchIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

import { buildDirectoryHref } from "../schemas/directory-search.schema";
import type { StaffDirectoryEntry } from "../types";

const copy = messages.about.directory;

/**
 * Personel rehberi listesi ve boş durumları (PRD §5.9).
 *
 * İKİ FARKLI BOŞ DURUM VAR ve ikisini ayırmak önemli:
 *   · "Bu birimin rehberi YAYINLANMADI" → veri yok, kullanıcı hata yapmadı.
 *     PRD §5.9 bunu açıkça istiyor: diğer dairelere tıklayan kullanıcı boş
 *     ekran değil, açıklama görmeli
 *   · "Aradığınız personel BULUNAMADI" → süzgeç tutmadı, çıkış yolu sunulmalı
 * Tek bir "sonuç yok" metni ikisini birden yanlış anlatırdı.
 *
 * BOŞ DURUM BAŞLIKLARI `h3`: bölümün kendi başlığı (`h2`) zaten var, aynı
 * seviyede ikinci bir başlık ekran okuyucuda yeni bir bölüm başladığını
 * söylerdi. Katalog ekranlarının ortak boş durumu (`CatalogEmptyState`) bu
 * yüzden burada kullanılmadı — orada başlık sayfanın tek `h2`'si.
 */
export function StaffDirectory({
  entries,
  query,
  unpublishedUnitName,
}: {
  entries: readonly StaffDirectoryEntry[];
  /** Boş sonuç metninde geri gösteriliyor — kullanıcı ne aradığını görsün. */
  query?: string;
  /** Seçili birimde HİÇ personel yoksa birimin adı; aksi hâlde `undefined`. */
  unpublishedUnitName?: string;
}) {
  if (unpublishedUnitName) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <InfoIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <h3 className="font-heading text-lg font-semibold">{copy.empty.unpublished.title}</h3>
        <p className="max-w-prose text-base text-muted-foreground">
          {copy.empty.unpublished.body(unpublishedUnitName)}
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <UserSearchIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <h3 className="font-heading text-lg font-semibold">{copy.empty.noResults.title}</h3>
        <p className="max-w-prose text-base text-muted-foreground">
          {query ? copy.empty.noResults.withQuery(query) : copy.empty.noResults.withoutQuery}
        </p>
        {/* Boş durumdan çıkış yolu: kullanıcı çıkmaza düşmüyor. */}
        <Link
          href={buildDirectoryHref({})}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          {copy.empty.noResults.reset}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{copy.resultCount(entries.length)}</p>

      {/*
        LİSTEYE ERİŞİLEBİLİR AD VERİLDİ: sayfa iskeletinde de (menü, alt bilgi)
        listeler var; adsız bir liste hem ekran okuyucuda hem testte
        diğerlerinden ayırt edilemiyordu (adım 15'te ölçülmüş tuzak).
      */}
      <ul
        aria-label={copy.listLabel}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {entries.map((entry) => (
          <StaffCard key={entry.id} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

function StaffCard({ entry }: { entry: StaffDirectoryEntry }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-base font-semibold wrap-break-word">{entry.fullName}</h3>
        <p className="text-sm font-medium text-brand-accent">{copy.titleLabels[entry.title]}</p>
      </div>

      {/*
        HER BİLGİ AYRI ELEMANDA (`dt`/`dd`): "Dahili 1042" tek bir metin
        düğümü olsaydı ne ekran okuyucu etiketi değerden ayırabilirdi ne de
        test değeri tek başına bulabilirdi.
      */}
      <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
        <div className="flex flex-col">
          <dt className="font-medium text-foreground">{copy.entry.unitLabel}</dt>
          <dd className="wrap-break-word">{entry.unitName}</dd>
        </div>

        <div className="flex flex-col">
          <dt className="font-medium text-foreground">{copy.entry.emailLabel}</dt>
          <dd>
            {/* Kurumsal adres tıklanabilir: rehberin işi iletişim kurdurmak. */}
            <a
              href={`mailto:${entry.workEmail}`}
              className="wrap-break-word text-primary underline underline-offset-4"
            >
              {entry.workEmail}
            </a>
          </dd>
        </div>

        <div className="flex flex-col">
          <dt className="font-medium text-foreground">{copy.entry.extensionLabel}</dt>
          <dd>{entry.extensionNumber}</dd>
        </div>
      </dl>
    </li>
  );
}
