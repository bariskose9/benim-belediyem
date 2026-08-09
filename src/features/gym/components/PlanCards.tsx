import Link from "next/link";

import { messages } from "@/config/messages";
import type { MembershipPlanOffer } from "@/features/gym/types";
import { formatTry } from "@/lib/money";

/**
 * Üyelik paketleri (PRD §5.6).
 *
 * ═══ İNDİRİM YÜZDESİ EKRANDA HESAPLANIR, VERİTABANINDA DURMAZ ═══
 * `data-model.md` bunu açıkça söylüyor: iki alan tutmak (fiyat + indirim)
 * ikisinin birbirinden sapma riskini yaratır. Yüzde, taahhütsüz paketin
 * fiyatından türetiliyor (`plan-pricing.ts`).
 *
 * ═══ ROZET RENKLE DEĞİL METİNLE ═══
 * "%15 indirimli" ve "3 ay taahhüt" ayrı ayrı YAZIYOR. Renk tek başına bilgi
 * taşımıyor (WCAG 2.1 AA) ve taahhüt bilgisi indirimin yanında duruyor —
 * kullanıcı ucuz fiyatı görüp bedelini görmemiş olmasın.
 */

const copy = messages.gym.plans;

export type PlanCardsProps = {
  plans: readonly MembershipPlanOffer[];
  /** Kullanıcının hâlihazırda kullandığı paket — kartı "mevcut" diye işaretlenir. */
  currentPlanId?: string | null;
  /** Üyeliği olan kullanıcı satın alamaz; onun için bağlantı hiç çizilmez. */
  hasMembership: boolean;
};

export function PlanCards({ plans, currentPlanId, hasMembership }: PlanCardsProps) {
  if (plans.length === 0) {
    return (
      <p role="status" className="text-base text-muted-foreground">
        {copy.empty}
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="paketler">
      <div className="flex flex-col gap-2">
        <h2 id="paketler" className="font-heading text-xl font-semibold tracking-tight">
          {copy.heading}
        </h2>
        <p className="max-w-prose text-base text-muted-foreground">{copy.note}</p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;

          return (
            <li
              key={plan.id}
              className={`flex flex-col gap-3 rounded-xl p-4 ring-1 ${
                isCurrent ? "ring-2 ring-brand-accent" : "ring-foreground/10"
              }`}
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold">{plan.name}</h3>
                <p className="font-heading text-2xl font-bold tabular-nums">
                  {copy.monthlyPrice(formatTry(plan.monthlyPriceKurus))}
                </p>
              </div>

              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>
                  {plan.commitmentMonths === 0
                    ? copy.noCommitment
                    : copy.commitment(plan.commitmentMonths)}
                </li>
                {plan.discountPercent > 0 ? (
                  <li className="font-medium text-brand-accent">
                    {copy.discountBadge(plan.discountPercent)}
                  </li>
                ) : null}
              </ul>

              {isCurrent ? (
                <p className="mt-auto text-sm font-medium">{copy.current}</p>
              ) : hasMembership ? null : (
                <Link
                  href={`/spor-salonu/paket/${encodeURIComponent(plan.id)}`}
                  aria-label={copy.chooseLabel(plan.name)}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {copy.choose}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
