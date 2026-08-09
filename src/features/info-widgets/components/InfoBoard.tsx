import { Suspense } from "react";

import { messages } from "@/config/messages";
import { Skeleton } from "@/components/ui/skeleton";

import { MarketsWidget } from "./MarketsWidget";
import { NewsWidget } from "./NewsWidget";
import { WeatherWidget } from "./WeatherWidget";

/**
 * Anasayfadaki bilgi panosu (PRD §5.8).
 *
 * ═══ HER WIDGET KENDİ `Suspense` SINIRINDA ═══
 *
 * Neden: üç widget üç farklı dış servise gidiyor ve hızları farklı. Tek bir
 * sınıra konsalardı sayfanın bu bölümü **en yavaş sağlayıcı kadar** beklerdi.
 * Ayrı sınırlarda her kart hazır olduğunda tek başına akıyor; sayfanın kalanı
 * (tanıtım bölümü, hizmet ızgarası) hiç beklemiyor.
 *
 * HATA SINIRI GEREKMİYOR: servis katmanı istisna fırlatmıyor, ayrık birleşim
 * döndürüyor (`types.ts`). Hata, kartın İÇİNDE bir duruma dönüşüyor — bu yüzden
 * çöken bir dış servis sayfayı düşüremiyor (PRD §5.8 kuralı).
 */

const copy = messages.infoWidgets;

export function InfoBoard() {
  return (
    <section aria-labelledby="bilgi-panosu" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="bilgi-panosu" className="text-xl font-semibold tracking-tight">
          {copy.heading}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.intro}</p>
      </div>

      {/* Mobil önce tek sütun; yer açıldıkça ikiye ve üçe çıkar. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<WidgetSkeleton />}>
          <WeatherWidget />
        </Suspense>

        <Suspense fallback={<WidgetSkeleton />}>
          <NewsWidget />
        </Suspense>

        <Suspense fallback={<WidgetSkeleton />}>
          <MarketsWidget />
        </Suspense>
      </div>
    </section>
  );
}

/**
 * Yükleniyor durumu (07-ui-design-system.md zorunlu üç durumdan biri).
 *
 * Yüksekliği dolu karta yakın tutuluyor: iskelet gerçek içerikten çok kısa
 * olsaydı veri gelince sayfa zıplardı (düzen kayması).
 */
function WidgetSkeleton() {
  return (
    <div
      /**
       * ⛔ BURADA `role="status"` KULLANILAMAZ.
       *
       * Ortam şeridi (`EnvBanner`) sayfadaki TEK `status` rolü olmak zorunda:
       * hem uçtan uca test onu `getByRole("status")` ile arıyor hem de ekran
       * okuyucu için iki canlı bölge birbirini bastırırdı. Üç iskelet aynı
       * rolü aldığında anasayfada dört eşleşme oluştu ve duman testi kırıldı.
       *
       * Yerine: görsel çubuklar ekran okuyucudan gizleniyor, durum tek bir
       * `sr-only` metinle söyleniyor. İçerik hazır olduğunda kart zaten kendi
       * başlığıyla geliyor.
       */
      aria-busy="true"
      className="flex h-full min-h-56 flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <span className="sr-only">{copy.loading}</span>

      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
