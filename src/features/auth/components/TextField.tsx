"use client";

import { useId, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Etiketli metin alanı.
 *
 * ERİŞİLEBİLİRLİK KURALLARI TEK YERDE (07-ui-design-system.md · WCAG 2.1 AA):
 *  · GÖRÜNÜR etiket her zaman var — yer tutucu (placeholder) etiket YERİNE
 *    kullanılmaz; yazmaya başlayınca kaybolur ve kullanıcı alanın ne olduğunu
 *    unutur
 *  · `aria-describedby` hem yardım metnini hem hata metnini gösterir
 *  · `aria-invalid` hatayı ekran okuyucuya bildirir
 *  · hata metni renkle BİRLİKTE yazıyla da verilir
 */
export type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  help?: string;
  error?: string;
};

export function TextField({ label, help, error, ...inputProps }: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {help ? (
        <p id={helpId} className="text-sm text-muted-foreground">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
