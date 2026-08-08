import { messages } from "@/config/messages";
import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import { EventCard } from "@/features/events/components/EventCard";
import type { EventListItem } from "@/features/events/types";

/**
 * Etkinlik ızgarası ve BOŞ DURUMU.
 *
 * Boş durum ORTAK bileşenden geliyor (`features/catalog`): market ve restoran
 * da aynı ekranı gösteriyor, yalnızca metinleri farklı. Üçüncü bir kopya
 * yazmak, üçünün zamanla ayrışması demekti.
 */
export function EventGrid({ events, query }: { events: readonly EventListItem[]; query?: string }) {
  if (events.length === 0) {
    return (
      <CatalogEmptyState copy={messages.events.empty} resetHref="/etkinlikler" query={query} />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <li key={event.id} className="h-full">
          <EventCard event={event} />
        </li>
      ))}
    </ul>
  );
}
