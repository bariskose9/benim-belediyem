import type { Metadata } from "next";

import { messages } from "@/config/messages";
import { CatalogFilter } from "@/features/catalog/components/CatalogFilter";
import { CatalogSearch } from "@/features/catalog/components/CatalogSearch";
import { parseCatalogSearchParams } from "@/features/catalog/schemas/catalog-search.schema";
import { EventGrid } from "@/features/events/components/EventGrid";
import { listEventCategories, listEvents } from "@/features/events/repositories/event.repository";
import type { EventCategory } from "@/generated/prisma/enums";

/**
 * Etkinlik listesi (PRD §5.2 · adım 11).
 *
 * GİRİŞ ZORUNLU DEĞİL: program herkese açık. Zorunluluk KOLTUK SEÇİMİNDE
 * başlıyor — kilit bir kullanıcı kimliği gerektiriyor (`seat_reservations`).
 * Bu yüzden burada `guardPage` YOK; market ekranındaki desenin aynısı.
 *
 * SÜZGEÇLER ADRESTE: `?kategori=…&arama=…`. Her durum sunucuda çiziliyor, geri tuşu
 * bir adım geri alıyor ve kullanıcı bağlantıyı paylaşabiliyor.
 *
 * ARAMA VE SÜZGEÇ ORTAK KATMANDAN (`features/catalog`): market ve restoranla
 * aynı bileşenler, yalnızca metinler farklı.
 */
export const dynamic = "force-dynamic";

const copy = messages.events;

export const metadata: Metadata = { title: copy.pageTitle };

/** Adresteki tür değeri gerçekten bir `EventCategory` mi. */
function parseCategory(value: string | undefined): EventCategory | undefined {
  return value === "concert" || value === "theatre" || value === "kids" ? value : undefined;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseCatalogSearchParams(raw);

  /**
   * KATEGORİ BURADA `categoryId` DEĞİL, ENUM DEĞERİ. Ortak şema adresi
   * doğruluyor ve uzunluğunu sınırlıyor; enum'a ait olup olmadığı buradaki
   * kontrolde çözülüyor. Tanınmayan değer HATA DEĞİL, süzgeç düşüyor —
   * adresi kurcalayan kişiye bilgi vermeyen, meşru kullanıcıyı da hata
   * ekranıyla karşılamayan davranış (market ekranındaki desen).
   */
  const category = parseCategory(filters.categoryId);
  const now = new Date();

  const [categories, events] = await Promise.all([
    listEventCategories({ labels: copy.categories, now }),
    listEvents({ category, query: filters.query, now }),
  ]);

  return (
    <main className="page-shell flex flex-col gap-8 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <div className="flex flex-col gap-4">
        <CatalogSearch
          basePath="/etkinlikler"
          copy={copy.search}
          query={filters.query}
          selectedCategoryId={category}
        />
        <CatalogFilter
          basePath="/etkinlikler"
          copy={copy.filters}
          options={categories}
          selectedCategoryId={category}
          query={filters.query}
        />
      </div>

      <EventGrid events={events} query={filters.query} />
    </main>
  );
}
