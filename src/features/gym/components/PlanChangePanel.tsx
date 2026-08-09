"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import type { MembershipPlanOffer } from "@/features/gym/types";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Paket değiştirme (PRD §5.6).
 *
 * ═══ EKRANDA HANGİ TARİHTE HANGİ TUTAR YAZAR ═══
 * PRD bunu açıkça istiyor. Değişim bugün hiçbir tutarı değiştirmiyor; bir
 * sonraki tahsilat tarihinde yürürlüğe giriyor ve ödenmiş ay ne kısalıyor ne
 * uzuyor. Metin bu yüzden tarihi ve yeni tutarı BİRLİKTE veriyor.
 *
 * TAAHHÜTSÜZE DÜŞME ERKEN ÇIKIŞ FARKI DOĞURUR; o durumda tutar burada
 * gösterilir ve isteğe `acknowledgedFeeKurus` olarak geri gönderilir —
 * sunucu kendi hesabıyla tutmuyorsa işlemi durdurur.
 */

const copy = messages.gym.membership;

export type PlanChangePanelProps = {
  membershipId: string;
  currentPlanId: string;
  plans: readonly MembershipPlanOffer[];
  /** Değişimin yürürlüğe gireceği an: bir sonraki tahsilat. */
  effectiveAt: Date | null;
  /** Sıraya alınmış değişim varsa onun paketi. */
  pendingPlan: { id: string; name: string; monthlyPriceKurus: number } | null;
  /** Taahhüt sürüyor mu — taahhütsüze düşmenin fark doğurup doğurmadığını belirler. */
  isUnderCommitment: boolean;
  /** Taahhüt sürerken düşme yapılırsa çıkacak fark (kuruş). */
  earlyExitFeeKurus: number;
  /** Mevcut paketin taahhüt süresi — "düşme mi yükselme mi" bu ikisiyle bulunur. */
  currentCommitmentMonths: number;
};

export function PlanChangePanel(props: PlanChangePanelProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveLabel = props.effectiveAt ? formatIstanbulDate(props.effectiveAt) : "";
  const selectedPlan = props.plans.find((plan) => plan.id === selectedId);

  /**
   * Fark yalnızca DAHA KISA taahhüde geçerken ve taahhüt sürerken doğuyor.
   * Daha uzun taahhüde geçmek sözü kısaltmıyor, uzatıyor.
   */
  const feeKurus =
    props.isUnderCommitment &&
    selectedPlan !== undefined &&
    selectedPlan.commitmentMonths < props.currentCommitmentMonths
      ? props.earlyExitFeeKurus
      : 0;

  async function send(pendingPlanId: string | null) {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<{ pendingPlanId: string | null }>(
      `/api/memberships/${props.membershipId}`,
      {
        method: "PATCH",
        body: {
          pendingPlanId,
          ...(pendingPlanId === null || feeKurus === 0 ? {} : { acknowledgedFeeKurus: feeKurus }),
          idempotencyKey: crypto.randomUUID(),
        },
      },
    );

    setIsPending(false);

    if (!result.ok) {
      setError(result.message);
    } else {
      toast.success(
        pendingPlanId === null
          ? messages.gym.toast.planChangeCleared
          : messages.gym.toast.planChangeScheduled,
      );
      setSelectedId("");
    }

    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="paket-degistir">
      <h2 id="paket-degistir" className="font-heading text-lg font-semibold">
        {copy.changeHeading}
      </h2>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {props.pendingPlan ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-brand-surface p-4 text-brand-surface-foreground">
          <p role="status" className="max-w-prose text-base">
            {copy.pendingChange(
              props.pendingPlan.name,
              effectiveLabel,
              formatTry(props.pendingPlan.monthlyPriceKurus),
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={() => void send(null)}
          >
            {copy.cancelPendingChange}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="max-w-prose text-base text-muted-foreground">
            {copy.changeNote(effectiveLabel)}
          </p>

          <label className="flex max-w-sm flex-col gap-1.5">
            <span className="text-sm font-medium">{copy.planLabel}</span>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="min-h-11 rounded-lg bg-background px-3 ring-1 ring-foreground/15 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">—</option>
              {props.plans
                .filter((plan) => plan.id !== props.currentPlanId)
                .map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatTry(plan.monthlyPriceKurus)}
                  </option>
                ))}
            </select>
          </label>

          {/* Taahhütsüze düşerken doğacak fark, ONAYDAN ÖNCE ekranda. */}
          {feeKurus > 0 ? (
            <p role="status" className="max-w-prose text-base text-destructive">
              {copy.changeWithFee(formatTry(feeKurus))}
            </p>
          ) : null}

          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={isPending || selectedId === ""}
            onClick={() => void send(selectedId)}
          >
            {messages.gym.plans.switchTo}
          </Button>
        </div>
      )}
    </section>
  );
}
