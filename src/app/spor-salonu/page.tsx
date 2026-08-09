import type { Metadata } from "next";
import Link from "next/link";
import { DumbbellIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";
import { ClassSchedule } from "@/features/gym/components/ClassSchedule";
import { FacilityPanel } from "@/features/gym/components/FacilityPanel";
import { PlanCards } from "@/features/gym/components/PlanCards";
import { getGymPageData } from "@/features/gym/services/membership-view";

/**
 * Spor salonu üyeliği — tesis, ders programı ve paketler (PRD §5.6).
 *
 * ERİŞİM: yalnızca personel. Kapı SAYFANIN İÇİNDE (`guardPage`); menüde
 * bağlantıyı gizlemek koruma değildir (05-auth-security.md). Aynı kararı
 * uçlar da bağımsız olarak veriyor (`requireAccess("staff")`).
 *
 * ÜYELİK SEPETE GİRMİYOR: paket kartındaki bağlantı sepete değil kendi
 * satın alma ekranına gidiyor (PRD §5.6 · data-model.md → `CartItem` enum'ında
 * `gym` yok).
 */
export const dynamic = "force-dynamic";

const copy = messages.gym;

export const metadata: Metadata = { title: copy.pageTitle };

export default async function GymPage() {
  const guard = await guardPage("staff", "/spor-salonu");

  if (!guard.allowed) {
    return (
      <main className="page-shell flex flex-col gap-6 py-8">
        <PageHeader />
        <AccessDeniedNotice decision={guard.decision} />
      </main>
    );
  }

  const data = await getGymPageData({ userId: guard.session.userId, now: new Date() });
  const active = data.active;

  return (
    <main className="page-shell flex flex-col gap-10 py-8">
      <PageHeader />

      {/*
        Üyeliği olan kullanıcı önce KENDİ üyeliğini görmeli: paket listesine
        bakıp "hangisi benimdi" diye aramak zorunda kalmasın.
      */}
      {active ? (
        <Link
          href="/spor-salonu/uyelik"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-brand-surface px-4 text-sm font-medium text-brand-surface-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DumbbellIcon aria-hidden="true" className="size-4" />
          {copy.membership.viewMembership}
        </Link>
      ) : null}

      <PlanCards
        plans={data.plans}
        currentPlanId={active?.plan.id ?? null}
        hasMembership={active !== null && active.state.status !== "expired"}
      />

      <FacilityPanel />
      <ClassSchedule />
    </main>
  );
}

function PageHeader() {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
    </header>
  );
}
