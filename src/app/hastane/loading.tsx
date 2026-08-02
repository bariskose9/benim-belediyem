import { Skeleton } from "@/components/ui/skeleton";
import { messages } from "@/config/messages";

/**
 * Yükleniyor durumu (10-definition-of-done.md).
 *
 * Sayfa sunucu bileşeni ve veritabanına gidiyor; boş beyaz ekran yerine
 * iskelet gösteriliyor. Bu dosya `/hastane` ve altındaki tüm adresleri
 * (randevularım dahil) kapsıyor — Next.js `loading.tsx`'i segment ağacında
 * aşağı doğru uyguluyor.
 *
 * `role="status"` + `aria-live="polite"`: ekran okuyucu "yükleniyor" der ama
 * kullanıcının o anki işini bölmez.
 */
export default function HospitalLoading() {
  return (
    <div role="status" aria-live="polite" className="page-shell flex flex-col gap-6 py-8">
      <span className="sr-only">{messages.hospital.loading}</span>

      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-full max-w-md" />
      <Skeleton className="h-11 w-40" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Sabit sayıda iskelet kutu: gerçek sayı bilinmiyor, altı satır
            ekranı dengeli dolduruyor ve içerik gelince zıplama olmuyor. */}
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
