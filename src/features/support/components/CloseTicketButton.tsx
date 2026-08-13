"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Talebi kapatma — geri alınamaz, bu yüzden ONAY İSTENİR.
 *
 * ONAY NEDEN AÇILIR PENCERE (modal) DEĞİL: sipariş iptalindeki kararın aynısı.
 * Satır içi onay yeni bir bağımlılık (Radix Dialog) gerektirmiyor ve odak
 * tuzağı, kaçış tuşu, kaydırma kilidi gibi modal'a özgü erişilebilirlik
 * yükümlülüklerini doğurmuyor.
 *
 * ⛔ KURAL BURADA UYGULANMIYOR. "Yalnızca talebi açan üye kapatabilir"
 * kararını sunucu veriyor (PRD §5.7); bu bileşen düğmeyi yalnızca sunucudan
 * gelen `canClose` bilgisine göre gösteriyor. Düğmeyi gizlemek yetki değildir
 * (05-auth-security.md) — isteği elle atan başkası 404, ikinci kez atan 409 alır.
 */

const copy = messages.support.close;

export function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function close() {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<undefined>(`/api/v1/support-tickets/${ticketId}`, {
      method: "DELETE",
    });

    setIsPending(false);
    setIsConfirming(false);

    if (!result.ok) {
      setError(result.message);
    }

    /**
     * İki durumda da sayfa tazeleniyor. Başarıda yeni durum ("Kapandı")
     * görünsün diye; hatada ise talep bu arada ilerlemiş olabilir ve kullanıcı
     * gerçek durumu görmeli. Sunucuda çizilen sayfa istemci bir şey yazdıktan
     * sonra kendiliğinden tazelenmiyor.
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
          onClick={() => void close()}
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
