"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Sipariş iptali — geri alınamaz, bu yüzden ONAY İSTENİR.
 *
 * ONAY NEDEN AÇILIR PENCERE (modal) DEĞİL: randevu iptalindeki kararın
 * aynısı. Satır içi onay yeni bir bağımlılık (Radix Dialog) gerektirmiyor ve
 * odak tuzağı, kaçış tuşu, kaydırma kilidi gibi modal'a özgü erişilebilirlik
 * yükümlülüklerini doğurmuyor.
 *
 * ⛔ KURAL BURADA UYGULANMIYOR. "Hazırlık başladıysa iptal edilemez" kararını
 * sunucu veriyor; bu bileşen düğmeyi yalnızca sunucudan gelen `canCancel`
 * bilgisine göre gösteriyor. Düğmeyi gizlemek yetki değildir
 * (05-auth-security.md) — isteği elle atan da aynı 409'u alır (PRD §5.5
 * kabul kriteri).
 */

const copy = messages.orders.cancel;

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<undefined>(`/api/orders/${orderId}`, { method: "DELETE" });

    setIsPending(false);
    setIsConfirming(false);

    if (!result.ok) {
      setError(result.message);
    }

    /**
     * İki durumda da liste tazeleniyor. Başarıda yeni durum ("İptal edildi")
     * ve iade satırı görünsün diye; hatada ise sipariş bu arada ilerlemiş
     * olabilir ve kullanıcı gerçek durumu görmeli. Sunucuda çizilen sayfa
     * istemci bir şey yazdıktan sonra kendiliğinden tazelenmiyor.
     */
    router.refresh();
  }

  if (error) {
    return (
      <p
        aria-live="assertive"
        className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        {error}
      </p>
    );
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        onClick={() => setIsConfirming(true)}
      >
        {copy.action}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <p className="text-sm font-medium">{copy.confirmTitle}</p>
      <p className="text-sm text-muted-foreground">{copy.confirmBody}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={isPending}
          onClick={() => void cancel()}
        >
          {isPending ? copy.pending : copy.confirmAction}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          disabled={isPending}
          onClick={() => setIsConfirming(false)}
        >
          {copy.confirmDismiss}
        </Button>
      </div>
    </div>
  );
}
