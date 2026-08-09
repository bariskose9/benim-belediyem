"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { formatIstanbulDate } from "@/lib/datetime";
import { formatTry } from "@/lib/money";

/**
 * Üyelik iptali — geri alınamaz ve PARA HAREKETİ DOĞURABİLİR, bu yüzden
 * onay istenir (PRD §5.6: "Bu tutar iptal onayından önce ekranda gösterilir
 * ve kullanıcı onaylamadan işlem yapılmaz").
 *
 * ONAY SATIR İÇİ, AÇILIR PENCERE DEĞİL: sipariş ve randevu iptalindeki
 * kararın aynısı — yeni bağımlılık (Radix Dialog) gerektirmiyor ve odak
 * tuzağı gibi modal'a özgü erişilebilirlik yükümlülüklerini doğurmuyor.
 *
 * ⛔ TUTAR BURADA HESAPLANMIYOR. Sunucudan geliyor ve isteğe geri
 * gönderiliyor; sunucu kendi hesabıyla karşılaştırıp tutmuyorsa işlemi
 * durduruyor. Yani ekrandaki rakam bir GÖSTERİM, tahsil edilecek tutarın
 * kaynağı değil.
 */

const copy = messages.gym.membership;

export type CancelMembershipPanelProps = {
  membershipId: string;
  /** Sunucunun hesapladığı erken çıkış farkı (kuruş). Yoksa 0. */
  feeKurus: number;
  /** Farkın çarpanı — metinde "ödediğiniz N ay" diye geçiyor. */
  paidMonths: number;
  /** Erişimin biteceği an: ödenmiş dönemin sonu. */
  accessEndsAt: Date | null;
};

export function CancelMembershipPanel(props: CancelMembershipPanelProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endsAtLabel = props.accessEndsAt ? formatIstanbulDate(props.accessEndsAt) : "";

  async function cancel() {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<{ feeKurus: number }>(
      `/api/memberships/${props.membershipId}`,
      {
        method: "DELETE",
        body: {
          acknowledgedFeeKurus: props.feeKurus,
          // Her denemede yeni anahtar: ilk deneme kartta takılırsa kullanıcı
          // aynı anahtarla "zaten yapılmış" duvarına çarpmasın.
          idempotencyKey: crypto.randomUUID(),
        },
      },
    );

    setIsPending(false);
    setIsConfirming(false);

    if (!result.ok) {
      setError(result.message);
    } else {
      toast.success(messages.gym.toast.cancelled);
    }

    // İki durumda da tazeleniyor: başarıda yeni durum, hatada gerçek durum
    // görünsün diye. Sunucuda çizilen sayfa kendiliğinden tazelenmiyor.
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="iptal">
      <h2 id="iptal" className="font-heading text-lg font-semibold">
        {copy.cancelHeading}
      </h2>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {isConfirming ? (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-4">
          <p className="max-w-prose text-base">
            {props.feeKurus > 0
              ? copy.cancelWithFee(formatTry(props.feeKurus), props.paidMonths, endsAtLabel)
              : copy.cancelNoFee(endsAtLabel)}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              disabled={isPending}
              onClick={() => void cancel()}
            >
              {isPending ? copy.cancelling : copy.cancelConfirm}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11"
              disabled={isPending}
              onClick={() => setIsConfirming(false)}
            >
              {copy.cancelDismiss}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => setIsConfirming(true)}
        >
          {copy.cancel}
        </Button>
      )}
    </section>
  );
}
