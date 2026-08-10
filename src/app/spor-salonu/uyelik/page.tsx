import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";
import { CancelMembershipPanel } from "@/features/gym/components/CancelMembershipPanel";
import { MembershipSummary } from "@/features/gym/components/MembershipSummary";
import { PaymentHistory } from "@/features/gym/components/PaymentHistory";
import { PlanChangePanel } from "@/features/gym/components/PlanChangePanel";
import { getMembershipPageData } from "@/features/gym/services/membership-view";

/**
 * "Üyeliğim" ekranı — PRD §5.6'nın "Profilde görünür" listesinin karşılığı.
 *
 * Dört bölüm: künye, paket değişimi, iptal, ödeme geçmişi. Hepsi TEK
 * SAYFADA çünkü kullanıcı "üyeliğim ne durumda" sorusunun cevabını parça
 * parça değil bir bakışta görmeli; ayrı sayfalar üç ayrı erişim kapısı ve üç
 * ayrı test yüzeyi demekti.
 *
 * ⛔ İPTAL VE DEĞİŞİM DÜĞMELERİ YALNIZCA YAŞAYAN ÜYELİKTE ÇİZİLİYOR — ama bu
 * bir GÖRÜNÜM kararı, koruma değil. Düğmeyi gizlemek yetki değildir
 * (05-auth-security.md); isteği elle atan da uçtan aynı hatayı alır.
 */
export const dynamic = "force-dynamic";

const copy = messages.gym;

export const metadata: Metadata = { title: copy.membership.pageTitle };

export default async function MembershipPage() {
  const guard = await guardPage("staff", "/spor-salonu/uyelik");

  if (!guard.allowed) {
    return (
      <main className="page-shell flex flex-col gap-6 py-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {copy.membership.heading}
        </h1>
        <AccessDeniedNotice decision={guard.decision} returnTo="/spor-salonu/uyelik" />
      </main>
    );
  }

  const data = await getMembershipPageData({ userId: guard.session.userId, now: new Date() });
  const active = data.active;
  const isLive = active !== null && active.state.status !== "expired";

  return (
    <main className="page-shell flex max-w-2xl flex-col gap-8 py-8">
      <div className="flex flex-col gap-4">
        <Link
          href="/spor-salonu"
          className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {copy.membership.backToGym}
        </Link>

        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {copy.membership.heading}
        </h1>
      </div>

      {active === null ? (
        <EmptyState />
      ) : (
        <>
          <MembershipSummary
            state={active.state}
            plan={active.plan}
            startsAt={active.membership.startsAt}
            commitmentEndsAt={active.membership.commitmentEndsAt}
            nextBillingAt={active.membership.nextBillingAt}
            nextAmountKurus={active.nextAmountKurus}
            autoRenewEnabled={active.membership.autoRenewEnabled}
            cardLabel={null}
          />

          {/*
            Paket değişimi ve iptal YALNIZCA yenilenmeye devam eden üyelikte
            anlamlı: iptal edilmiş bir üyeliği yeniden iptal etmenin ya da
            bitmiş bir üyeliğin paketini değiştirmenin karşılığı yok.
          */}
          {isLive && active.state.status !== "cancelled" ? (
            <>
              <PlanChangePanel
                membershipId={active.membership.id}
                currentPlanId={active.plan.id}
                plans={data.plans}
                effectiveAt={active.membership.nextBillingAt}
                pendingPlan={active.pendingPlan}
                isUnderCommitment={active.state.isUnderCommitment}
                earlyExitFeeKurus={active.earlyExit.feeKurus}
                currentCommitmentMonths={active.plan.commitmentMonths}
              />

              <CancelMembershipPanel
                membershipId={active.membership.id}
                feeKurus={active.earlyExit.feeKurus}
                paidMonths={active.earlyExit.paidMonths}
                accessEndsAt={active.membership.nextBillingAt}
              />
            </>
          ) : null}

          <PaymentHistory payments={data.payments} />
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h2 className="font-heading text-lg font-semibold">{copy.membership.empty.title}</h2>
      <p className="max-w-prose text-base text-muted-foreground">
        {copy.membership.empty.description}
      </p>
      <Link
        href="/spor-salonu"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copy.membership.backToGym}
      </Link>
    </div>
  );
}
