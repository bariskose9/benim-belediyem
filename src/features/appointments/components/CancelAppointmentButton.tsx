"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Randevu iptali — geri alınamaz bir işlem, bu yüzden ONAY İSTENİR.
 *
 * ONAY NEDEN AÇILIR PENCERE (modal) DEĞİL: satır içi onay yeni bir arayüz
 * bileşeni (Radix AlertDialog) gerektirmiyor ve odak tuzağı, kaçış tuşu,
 * kaydırma kilidi gibi modal'a özgü erişilebilirlik yükümlülüklerini
 * doğurmuyor. Kart yerinde kalıp iki düğme gösteriyor; klavye kullanıcısı
 * için de doğal bir sıra oluşuyor.
 *
 * KURAL BURADA UYGULANMIYOR. "2 saatten az kaldıysa iptal edilemez" kararını
 * sunucu veriyor; bu bileşen düğmeyi yalnızca sunucudan gelen `canCancel`
 * bilgisine göre gizliyor. Düğmeyi gizlemek yetki değildir
 * (05-auth-security.md) — isteği elle atan da aynı 409'u alır.
 */

const copy = messages.hospital.cancel;

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<undefined>(`/api/v1/appointments/${appointmentId}`, {
      method: "DELETE",
    });

    setIsPending(false);

    if (!result.ok) {
      setIsConfirming(false);
      setError(result.message);
      // Kayıt bu arada değişmiş olabilir (başka sekmede iptal edilmiş,
      // saati geçmiş); listeyi tazelemek kullanıcıyı gerçek duruma döndürür.
      router.refresh();

      return;
    }

    setIsConfirming(false);
    router.refresh();
  }

  if (error) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      </div>
    );
  }

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
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
