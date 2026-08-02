import Link from "next/link";

import { messages } from "@/config/messages";
import { formatIstanbulShortDay } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/**
 * Gün şeridi — doktorun saatlerinin bulunduğu günler.
 *
 * YATAY KAYDIRILIR, satır atlamaz (`overflow-x-auto`). 14 gün mobilde alt
 * alta sarılsaydı saat listesi ekranın çok aşağısına düşerdi; şerit hâlinde
 * kalınca "gün seç, hemen altında saatleri gör" akışı 375px'te de bozulmuyor.
 *
 * Seçili gün YALNIZCA RENKLE gösterilmiyor: `aria-current="date"` ekran
 * okuyucuya da söylüyor (07-ui-design-system.md → bilgi tek başına renkle
 * verilmez).
 */

const copy = messages.hospital;

export type DayOption = {
  dayKey: string;
  date: Date;
  freeCount: number;
};

export function DayStrip({
  days,
  selectedDayKey,
  hrefForDay,
}: {
  days: readonly DayOption[];
  selectedDayKey: string;
  /** Adres üretimi sayfaya ait; bileşen adres şemasını bilmez. */
  hrefForDay: (dayKey: string) => string;
}) {
  return (
    <nav aria-label={copy.steps.slot}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {days.map((day) => {
          const isSelected = day.dayKey === selectedDayKey;

          return (
            <li key={day.dayKey} className="shrink-0">
              <Link
                href={hrefForDay(day.dayKey)}
                aria-current={isSelected ? "date" : undefined}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 text-sm ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "bg-brand-surface text-brand-surface-foreground ring-brand-surface-foreground/30"
                    : "bg-card text-foreground ring-foreground/10 hover:bg-muted",
                )}
              >
                <span className="font-medium whitespace-nowrap">
                  {formatIstanbulShortDay(day.date)}
                </span>
                <span
                  className={cn(
                    "text-xs whitespace-nowrap",
                    isSelected ? "opacity-80" : "text-muted-foreground",
                  )}
                >
                  {copy.freeCount(day.freeCount)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
