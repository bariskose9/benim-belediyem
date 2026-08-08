"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * "Tümünü okundu işaretle".
 *
 * ONAY İSTENMİYOR: işlem yıkıcı değil ve kullanıcının kaybettiği tek şey
 * "okunmadı" işareti. Her düşük etkili eylemi onaya bağlamak, onayın kendisini
 * anlamsızlaştırır (iptal düğmesindeki onay bu yüzden ayrıcalıklı).
 *
 * HANGİ BİLDİRİMLERİN İŞARETLENECEĞİNİ İSTEMCİ SEÇMİYOR: kimlik listesi
 * göndermiyor, uç kapsamı oturumdan alıyor (IDOR yüzeyi yok).
 */

const copy = messages.notifications;

export function MarkAllReadButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markAllRead() {
    setError(null);
    setIsPending(true);

    const result = await apiRequest<{ updated: number }>("/api/notifications", {
      method: "PATCH",
    });

    setIsPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    // Sunucuda çizilen liste istemcinin yazdığından haberdar değil.
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit"
        disabled={isPending}
        onClick={() => void markAllRead()}
      >
        {isPending ? copy.markingAllRead : copy.markAllRead}
      </Button>

      {error ? (
        <p
          aria-live="assertive"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
