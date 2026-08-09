import { ExternalLinkIcon, NewspaperIcon } from "lucide-react";

import { NEWS_SOURCE_NAME } from "@/config/constants";
import { messages } from "@/config/messages";
import { formatIstanbulShortDay } from "@/lib/datetime";

import { getNews } from "../services/info-widgets.service";
import { WidgetCard, WidgetErrorState } from "./WidgetCard";

/**
 * Haber kartı — güncel başlıklar ve kaynağa bağlantı (PRD §5.8).
 *
 * GÜVENLİK NOTLARI (ADR-016):
 *  · Başlık METİN olarak çiziliyor; React kaçışı sayesinde akıştan gelen hiçbir
 *    şey HTML olarak yorumlanmıyor. `dangerouslySetInnerHTML` YOK.
 *  · Bağlantılar zaten alan adı beyaz listesinden geçti; ayrıca `rel="noopener
 *    noreferrer"` ile açılıyor — yeni sekme, açan sayfaya erişemez.
 *  · Haberin bize ait olmadığı kartta AÇIKÇA yazıyor.
 */

const copy = messages.infoWidgets.news;

export async function NewsWidget() {
  const result = await getNews();

  if (result.status === "error") {
    return (
      <WidgetCard title={copy.title} icon={NewspaperIcon} headingId="widget-haber">
        <WidgetErrorState />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      title={copy.title}
      icon={NewspaperIcon}
      headingId="widget-haber"
      fetchedAt={result.fetchedAt}
      isStale={result.isStale}
    >
      {result.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {result.data.items.map((item) => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                // Dokunma hedefi en az 44px (07-ui-design-system.md).
                className="flex min-h-11 items-start gap-2 rounded-md text-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                />
                <span>
                  {item.title}
                  <span className="sr-only"> ({copy.opensInNewTab})</span>
                  {item.publishedAt ? (
                    <span className="ml-1 text-xs whitespace-nowrap text-muted-foreground">
                      {formatIstanbulShortDay(new Date(item.publishedAt))}
                    </span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{copy.source(NEWS_SOURCE_NAME)}</p>
    </WidgetCard>
  );
}
