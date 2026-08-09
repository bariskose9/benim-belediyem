import { CheckIcon } from "lucide-react";

import { messages } from "@/config/messages";
import {
  SUPPORT_TIMELINE_STAGES,
  supportTimelineIndex,
} from "@/features/support/services/support-ticket-timeline";
import type { SupportTicketStatus } from "@/generated/prisma/enums";

/**
 * Talebin nerede olduğunu gösteren üç adımlı çizgi (PRD §5.7).
 *
 * ERİŞİLEBİLİRLİK: durum RENKLE DEĞİL, metinle ve tamamlanma işaretiyle
 * anlatılıyor (07-ui-design-system.md · WCAG 2.1 AA "Use of Color").
 * ✓ ikonu `aria-hidden` — aynı bilgi `aria-current` ve metinle veriliyor,
 * ekran okuyucu aynı şeyi iki kez okumamalı.
 *
 * KAPANMIŞ TALEP ÇİZGİYE GİRMEZ: kapanma bir aşama değil, çizginin bitişidir
 * (siparişteki iptal ile aynı karar).
 */

const copy = messages.support;

export function TicketStatusTrack({ status }: { status: SupportTicketStatus }) {
  if (status === "closed") {
    return (
      <p className="w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
        {copy.statuses.closed}
      </p>
    );
  }

  const currentIndex = supportTimelineIndex(status);

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {SUPPORT_TIMELINE_STAGES.map((stage, index) => {
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={stage}
            aria-current={isCurrent ? "step" : undefined}
            className={
              isDone
                ? "flex items-center gap-2 text-sm font-semibold text-foreground"
                : "flex items-center gap-2 text-sm text-muted-foreground"
            }
          >
            <span
              aria-hidden="true"
              className={
                isDone
                  ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-surface-foreground"
                  : "flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-foreground/20"
              }
            >
              {isDone ? <CheckIcon className="size-3" /> : null}
            </span>
            {copy.statuses[stage]}
          </li>
        );
      })}
    </ol>
  );
}
