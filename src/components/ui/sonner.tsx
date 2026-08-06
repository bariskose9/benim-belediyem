"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Bildirim balonu (toast) kabı.
 *
 * NEDEN `next-themes` YOK: shadcn'in ürettiği taslak temayı JavaScript'ten
 * okuyor ve bunun için `next-themes` paketini getiriyor. Bu projede tema
 * SINIF TABANLI (`src/lib/theme.ts`) ve React durumu bilerek tutulmuyor —
 * paketi bırakmak, aynı işi yapan ikinci bir tema kaynağı demekti ve ikisi
 * er ya da geç ayrışırdı.
 *
 * PEKİ BALON KOYU TEMAYI NASIL BİLİYOR: bilmiyor, bilmesi de gerekmiyor.
 * Renkler aşağıda tasarım token'larına bağlanmış (`--popover`, `--border`);
 * o token'ların değeri `.dark` sınıfı altında zaten değişiyor. Yani kararı
 * CSS veriyor — tema düğmesindeki (`ThemeToggle`) desenin aynısı.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  );
}
