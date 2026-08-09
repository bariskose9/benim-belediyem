import { messages } from "@/config/messages";
import type { MembershipPaymentRow } from "@/features/gym/types";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Üyelik ödeme geçmişi (PRD §5.6 "Profilde görünür: … ödeme geçmişi").
 *
 * BAŞARISIZ DENEMELER DE LİSTELENİYOR. `membership_payments` append-only bir
 * denetim kaydı: "aidatım neden çekilmedi" sorusunun cevabı ancak deneme
 * görünürse verilebilir. Başarısızlık renkle DEĞİL metinle de belirtiliyor.
 *
 * Liste `overflow-x-auto` bir kapsayıcının içinde: 375px'te tarih + tür +
 * tutar üçlüsü dar kalıyor ve SAYFANIN kendisi yatay kaymamalı
 * (07-ui-design-system.md → geniş içerik kendi kapsayıcısında kayar).
 */

const copy = messages.gym.membership;

export function PaymentHistory({ payments }: { payments: readonly MembershipPaymentRow[] }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="odeme-gecmisi">
      <h2 id="odeme-gecmisi" className="font-heading text-lg font-semibold">
        {copy.historyHeading}
      </h2>

      {payments.length === 0 ? (
        <p role="status" className="text-base text-muted-foreground">
          {copy.historyEmpty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <ul className="flex min-w-fit flex-col divide-y divide-foreground/10">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-medium">{copy.paymentKinds[payment.kind]}</span>
                  <span className="text-sm text-muted-foreground">
                    {payment.kind === "renewal"
                      ? copy.historyPeriod(
                          formatIstanbulDate(payment.periodStart),
                          formatIstanbulDate(payment.periodEnd),
                        )
                      : formatIstanbulDate(payment.attemptedAt)}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-base font-medium tabular-nums">
                    {formatTry(payment.amountKurus)}
                  </span>
                  <span
                    className={`text-sm ${
                      payment.status === "success" ? "text-muted-foreground" : "text-destructive"
                    }`}
                  >
                    {copy.paymentStatuses[payment.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
