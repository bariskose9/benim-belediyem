import { Skeleton } from "@/components/ui/skeleton";

/**
 * Yükleniyor durumu (10-definition-of-done.md "Yükleniyor / boş / hata
 * durumları var").
 *
 * Kayıt adımları sunucu bileşeni ve veritabanına gidiyor; boş beyaz ekran
 * yerine iskelet gösteriliyor. `role="status"` ekran okuyucuya "içerik
 * yükleniyor" der.
 */
export default function RegisterLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Sayfa yükleniyor</span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-10 w-40" />
    </div>
  );
}
