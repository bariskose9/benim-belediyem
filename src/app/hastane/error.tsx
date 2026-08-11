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
 * trace, SQL veya dosya yolu içerebilir (03-api-guidelines.md). Ekranda genel
 * ve ne yapılacağını söyleyen Türkçe bir mesaj var; ayrıntı hata takibine
 * (Sentry, adım 18a) gidiyor.
 *
 * `reset()` sayfayı yeniden çizmeyi dener: hata geçiciyse (veritabanı bir an
 * cevap vermediyse) kullanıcı adres çubuğuna dokunmadan devam edebilir.
 */
export default function HospitalError({ error, reset }: { error: Error; reset: () => void }) {
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
