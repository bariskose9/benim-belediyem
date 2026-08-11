"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";

/**
 * Hata durumu (10-definition-of-done.md).
 *
 * KULLANICIYA İÇ DETAY GÖSTERİLMEZ — `error.message` ekrana basılmaz; stack
 * trace, SQL veya dosya yolu içerebilir (03-api-guidelines.md). Ayrıntı
 * hata takibine gidiyor (Sentry, adım 18a).
 */
export default function GymError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Önceki hâl yalnızca sabit bir metin yazıyordu, yani hata KAYBOLUYORDU.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="page-shell flex flex-col items-start gap-4 py-8">
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>{messages.errors.unexpected}</AlertDescription>
      </Alert>

      <Button onClick={reset} className="min-h-11">
        Tekrar dene
      </Button>
    </div>
  );
}
