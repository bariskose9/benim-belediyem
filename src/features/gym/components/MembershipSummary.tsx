import { messages } from "@/config/messages";
import type { MembershipState } from "@/features/gym/services/membership-state";
import type { MembershipPlanRow } from "@/features/gym/types";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Üyelik künyesi — PRD §5.6'nın "Profilde görünür" listesinin karşılığı:
 * aktif paket, taahhüt bitiş tarihi, sonraki tahsilat tarihi ve tutarı,
 * otomatik yenileme durumu.
 *
 * ⛔ DURUM KOLONDAN OKUNMUYOR. Bileşen `MembershipState` alıyor; o da
 * `deriveMembershipState`'ten geliyor (ADR-013). Kolona baksaydı, vadesi
 * geçmiş bir üyeliği "Aktif" gösterirdi.
 *
 * Durum RENKLE DEĞİL METİNLE veriliyor (WCAG 2.1 AA): rozetin içinde
 * "Ödeme bekliyor" yazıyor, kırmızı olması ek bir ipucu.
 */

const copy = messages.gym.membership;

export type MembershipSummaryProps = {
  state: MembershipState;
  plan: MembershipPlanRow;
  startsAt: Date;
  commitmentEndsAt: Date | null;
  nextBillingAt: Date | null;
  nextAmountKurus: number;
  autoRenewEnabled: boolean;
  cardLabel: string | null;
};

export function MembershipSummary(props: MembershipSummaryProps) {
  const rows: { label: string; value: string }[] = [
    { label: copy.planLabel, value: props.plan.name },
    { label: copy.startedLabel, value: formatIstanbulDate(props.startsAt) },
    {
      label: copy.commitmentEndsLabel,
      value:
        props.state.isUnderCommitment && props.commitmentEndsAt
          ? formatIstanbulDate(props.commitmentEndsAt)
          : copy.noCommitment,
    },
  ];

  /**
   * "Sonraki tahsilat" YALNIZCA yenilenmeye devam eden üyelikte gösteriliyor.
   *
   * Sona ermiş ya da iptal edilmiş üyelikte çekilecek bir tutar yok; tarihi
   * "sonraki tahsilat" diye yazmak kullanıcıya olmayan bir ödeme bekletirdi.
   * O durumda erişimin biteceği tarih zaten yukarıdaki cümlede geçiyor.
   */
  if (props.state.status !== "expired" && props.autoRenewEnabled && props.nextBillingAt) {
    rows.push(
      { label: copy.nextBillingLabel, value: formatIstanbulDate(props.nextBillingAt) },
      { label: copy.nextAmountLabel, value: formatTry(props.nextAmountKurus) },
    );
  }

  rows.push({
    label: copy.autoRenewLabel,
    value: props.autoRenewEnabled ? copy.autoRenewOn : copy.autoRenewOff,
  });

  if (props.cardLabel) rows.push({ label: copy.cardLabel, value: props.cardLabel });

  return (
    <section className="flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{props.plan.name}</h2>
        <StatusBadge status={props.state.status} />
      </div>

      {/*
        Süreye bağlı iki uyarı: iptal edilmiş üyeliğin biteceği tarih ve
        ödeme bekleyen üyeliğin son ödeme tarihi. İkisi de TARİHLE veriliyor —
        "yakında biter" gibi bir cümle kullanıcıya hazırlık yaptırmaz.
      */}
      {props.state.endsAt ? (
        <p role="status" className="text-base text-muted-foreground">
          {copy.endsAt(formatIstanbulDate(props.state.endsAt))}
        </p>
      ) : null}

      {props.state.paymentDueBy ? (
        <p role="status" className="text-base font-medium text-destructive">
          {copy.paymentDueBy(formatIstanbulDate(props.state.paymentDueBy))}
        </p>
      ) : null}

      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <dt className="text-base text-muted-foreground">{row.label}</dt>
            <dd className="text-base font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function StatusBadge({ status }: { status: MembershipState["status"] }) {
  const tone =
    status === "active"
      ? "bg-brand-surface text-brand-surface-foreground"
      : status === "payment_pending"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  return (
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${tone}`}>
      {copy.statuses[status]}
    </span>
  );
}
