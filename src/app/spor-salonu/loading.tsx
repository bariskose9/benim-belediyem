import { Skeleton } from "@/components/ui/skeleton";
import { messages } from "@/config/messages";

/**
 * Yükleniyor durumu (10-definition-of-done.md).
 *
 * Bu dosya `/spor-salonu` ve altındaki tüm adresleri (paket seçimi, üyeliğim)
 * kapsıyor — Next.js `loading.tsx`'i segment ağacında aşağı doğru uyguluyor.
 *
 * `role="status"` + `aria-live="polite"`: ekran okuyucu "yükleniyor" der ama
 * kullanıcının o anki işini bölmez.
 */
export default function GymLoading() {
  return (
    <div role="status" aria-live="polite" className="page-shell flex flex-col gap-6 py-8">
      <span className="sr-only">{messages.gym.loading}</span>

      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-full max-w-md" />

      {/* Dört paket kartı: gerçek sayı sabit, içerik gelince zıplama olmuyor. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-44 w-full" />
        ))}
      </div>

      <Skeleton className="h-40 w-full" />
    </div>
  );
}
