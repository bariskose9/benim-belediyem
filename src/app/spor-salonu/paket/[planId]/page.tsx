import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";
import { MembershipPurchaseForm } from "@/features/gym/components/MembershipPurchaseForm";
import { getPurchasePageData } from "@/features/gym/services/membership-view";
import { addCalendarMonths } from "@/features/gym/services/billing-period";
import { MEMBERSHIP_BILLING_PERIOD_MONTHS } from "@/config/constants";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Üyelik başlatma ekranı (PRD §5.6).
 *
 * ═══ SATIN ALMA ÖNCESİ NE GÖSTERİLİYOR ═══
 * Bugün çekilecek tutar, bir sonraki tahsilat tarihi, taahhüt bitişi ve
 * erken çıkış kuralı. PRD "bu kural satın alma öncesi ekranda açıkça
 * gösterilir" diyor; tarihler SUNUCUDA hesaplanıyor ki ekrandaki gün ile
 * tahsilatın gerçek günü aynı kuraldan çıksın (`billing-period.ts`).
 *
 * ZATEN ÜYE OLAN BURAYA GİREMEZ: adresi elle yazsa bile üyelik sayfasına
 * yönlendiriliyor. Asıl kararı yine sunucu veriyor — uç, ikinci üyeliği
 * `active_user_id` benzersiz indeksiyle reddediyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.gym;

export const metadata: Metadata = { title: copy.purchase.pageTitle };

export default async function MembershipPurchasePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const guard = await guardPage("staff", `/spor-salonu/paket/${planId}`);

  if (!guard.allowed) {
    return (
      <main className="page-shell flex flex-col gap-6 py-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.purchase.heading}</h1>
        <AccessDeniedNotice decision={guard.decision} returnTo={`/spor-salonu/paket/${planId}`} />
      </main>
    );
  }

  const now = new Date();
  const data = await getPurchasePageData({ userId: guard.session.userId, planId, now });

  if (!data.plan) notFound();

  const plan = data.plan;
  const hasLiveMembership = data.active !== null && data.active.state.status !== "expired";

  const nextBillingAt = addCalendarMonths(now, MEMBERSHIP_BILLING_PERIOD_MONTHS);
  const commitmentEndsAt =
    plan.commitmentMonths === 0 ? null : addCalendarMonths(now, plan.commitmentMonths);

  return (
    <main className="page-shell flex max-w-2xl flex-col gap-8 py-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/spor-salonu"
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {copy.purchase.backToPlans}
        </Link>

        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.purchase.heading}</h1>
      </div>

      {hasLiveMembership ? (
        <div className="flex flex-col items-start gap-3">
          <p role="status" className="max-w-prose text-base">
            {copy.errors.alreadyMember}
          </p>
          <Link
            href="/spor-salonu/uyelik"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.membership.viewMembership}
          </Link>
        </div>
      ) : (
        <>
          <section
            className="flex flex-col gap-3 rounded-xl bg-brand-surface p-4 text-brand-surface-foreground sm:p-6"
            aria-labelledby="secilen-paket"
          >
            <h2 id="secilen-paket" className="font-heading text-lg font-semibold">
              {copy.purchase.summaryHeading}
            </h2>

            <dl className="flex flex-col gap-2">
              <Row label={copy.membership.planLabel} value={plan.name} />
              <Row
                label={copy.purchase.firstChargeHeading}
                value={formatTry(plan.monthlyPriceKurus)}
              />
              <Row
                label={copy.purchase.nextBillingLabel}
                value={formatIstanbulDate(nextBillingAt)}
              />
              <Row
                label={copy.purchase.commitmentEndsLabel}
                value={
                  commitmentEndsAt ? formatIstanbulDate(commitmentEndsAt) : copy.plans.noCommitment
                }
              />
            </dl>

            <p className="text-sm">{copy.purchase.firstChargeNote}</p>
          </section>

          <MembershipPurchaseForm
            plan={plan}
            monthlyGapKurus={Math.max(0, data.basePlanMonthlyKurus - plan.monthlyPriceKurus)}
            savedCards={data.savedCards}
          />
        </>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <dt className="text-base">{label}</dt>
      <dd className="text-base font-medium">{value}</dd>
    </div>
  );
}
