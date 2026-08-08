import { CheckIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { ORDER_TIMELINE_STAGES, timelineIndex } from "@/features/orders/services/order-timeline";
import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Siparişin nerede olduğunu gösteren dört adımlı çizgi (PRD §5.5).
 *
 * ERİŞİLEBİLİRLİK: durum RENKLE DEĞİL, metinle ve tamamlanma işaretiyle
 * anlatılıyor. Renk körü bir kullanıcı da hangi adımın geçildiğini okuyabilir
 * (07-ui-design-system.md · WCAG 2.1 AA "Use of Color"). Geçilen adımların
 * yanındaki ✓ ikonu `aria-hidden`, çünkü aynı bilgi zaten `aria-current` ve
 * görünmez durum metniyle veriliyor — ekran okuyucu aynı şeyi iki kez okumamalı.
 *
 * İPTAL EDİLMİŞ SİPARİŞ ÇİZGİYE GİRMEZ: iptal bir aşama değil, çizginin
 * bitişidir. O durumda çizgi yerine tek bir rozet gösteriliyor.
 */

const copy = messages.orders;

export function OrderStatusTrack({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <p className="w-fit rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
        {copy.statuses.cancelled}
      </p>
    );
  }

  const currentIndex = timelineIndex(status);

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
      {ORDER_TIMELINE_STAGES.map((stage, index) => {
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
