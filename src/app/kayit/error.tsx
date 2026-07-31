"use client";

import { AlertCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";

/**
 * Hata durumu (10-definition-of-done.md).
 *
 * Kullanıcıya İÇ DETAY GÖSTERİLMEZ — `error.message` ekrana basılmaz; stack
 * trace, SQL veya dosya yolu içerebilir (03-api-guidelines.md). Ekranda genel
 * ve ne yapılacağını söyleyen Türkçe bir mesaj var; ayrıntı sunucu log'una
 * (ileride Sentry'ye, adım 18) gidiyor.
 */
export default function RegisterError({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Ayrıntı yalnızca geliştirici konsoluna; kullanıcıya değil.
    console.error("[KAYIT] beklenmeyen hata");
  }, []);

  return (
    <div className="flex flex-col items-start gap-4">
      <Alert variant="destructive">
        <AlertCircleIcon aria-hidden="true" />
        <AlertDescription>{messages.errors.unexpected}</AlertDescription>
      </Alert>

      <Button onClick={reset}>Tekrar dene</Button>
    </div>
  );
}
