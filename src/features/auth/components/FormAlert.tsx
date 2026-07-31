"use client";

import { AlertCircleIcon, InfoIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Form seviyesi hata / bilgi kutusu.
 *
 * ERİŞİLEBİLİRLİK (07-ui-design-system.md · WCAG 2.1 AA):
 *  · `role="alert"` — ekran okuyucu mesajı anında okur
 *  · hata çıktığında ODAK BURAYA TAŞINIR; aksi hâlde klavye kullanıcısı
 *    formu gönderdikten sonra ne olduğunu hiç fark etmez
 *  · renk TEK BAŞINA anlam taşımaz, ikon ve metin de var
 *
 * `sonner` yerine satır içi kutu kullanılıyor: hem yeni paket gerektirmiyor
 * (00-stack.md) hem de form hatası için kaybolan bir bildirim yanlış desen.
 */
export type FormAlertProps = {
  message: string | null;
  variant?: "error" | "info";
};

export function FormAlert({ message, variant = "error" }: FormAlertProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && variant === "error") ref.current?.focus();
  }, [message, variant]);

  if (!message) return null;

  const Icon = variant === "error" ? AlertCircleIcon : InfoIcon;

  return (
    <Alert
      ref={ref}
      tabIndex={-1}
      role={variant === "error" ? "alert" : "status"}
      variant={variant === "error" ? "destructive" : "default"}
      className="outline-ring/50 focus-visible:outline-2"
    >
      <Icon aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
