"use client";

import { CheckCircle2Icon, ClockIcon, MailIcon, SmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * ADIM 3 — iki BAĞIMSIZ doğrulama paneli.
 *
 * PRD §5.0: "İki kod birbirinden bağımsız doğrulanır; biri geçerken diğeri
 * geçersizleşmez." Bu yüzden her panel AYRI bir `<form>`: Enter tuşu doğru
 * paneli gönderir ve her panelin kendi yükleniyor/hata durumu olur.
 *
 * Hesap yalnızca İKİSİ de doğrulandığında açılır — o kararı sunucu veriyor,
 * bu bileşen sadece sonucu gösteriyor.
 */

const copy = messages.auth.register.verify;

export type VerificationPanelsProps = {
  emailMasked: string;
  phoneMasked: string;
  initialEmailVerified: boolean;
  initialPhoneVerified: boolean;
  turnstileSiteKey: string | undefined;
  /** Test ortamında düğme "Kodu göster" der; production'da "Yeni kod gönder". */
  isSimulated?: boolean;
};

export function VerificationPanels(props: VerificationPanelsProps) {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState(props.initialEmailVerified);
  const [phoneVerified, setPhoneVerified] = useState(props.initialPhoneVerified);
  const [turnstileToken, setTurnstileToken] = useState("");

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  function handleVerified(channel: "email" | "phone", completed: boolean) {
    if (channel === "email") setEmailVerified(true);
    else setPhoneVerified(true);

    if (completed) router.push("/kayit/tamamlandi");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Bilgi kutuları `role="status"`: varsayılan `role="alert"` ekran
          okuyucuyu kesip araya girer ve sayfa açılışında duran kalıcı bir
          bilgi için yanlış (WCAG 2.1 AA). Yalnızca gerçek hatalar alert. */}
      <Alert role="status">
        <SmartphoneIcon aria-hidden="true" />
        <AlertDescription>{copy.smsSimulationNotice}</AlertDescription>
      </Alert>

      {!emailVerified || !phoneVerified ? (
        <Alert role="status">
          <ClockIcon aria-hidden="true" />
          <AlertDescription>{copy.waitingOther}</AlertDescription>
        </Alert>
      ) : null}

      <ChannelPanel
        channel="email"
        title={copy.emailTitle}
        destination={props.emailMasked}
        verified={emailVerified}
        turnstileToken={turnstileToken}
        isSimulated={props.isSimulated}
        onVerified={handleVerified}
      />

      <ChannelPanel
        channel="phone"
        title={copy.phoneTitle}
        destination={props.phoneMasked}
        verified={phoneVerified}
        turnstileToken={turnstileToken}
        isSimulated={props.isSimulated}
        onVerified={handleVerified}
      />

      {/* Tek widget iki paneli birden besliyor: "tekrar gönder" ikisinde de
          bot doğrulaması istiyor (PRD §5.0) ama kullanıcıya iki ayrı bulmaca
          göstermek gereksiz sürtünme olurdu. */}
      <TurnstileWidget siteKey={props.turnstileSiteKey} onToken={handleToken} />
    </div>
  );
}

type ChannelPanelProps = {
  channel: "email" | "phone";
  title: string;
  destination: string;
  verified: boolean;
  turnstileToken: string;
  isSimulated?: boolean;
  onVerified: (channel: "email" | "phone", completed: boolean) => void;
};

function ChannelPanel({
  channel,
  title,
  destination,
  verified,
  turnstileToken,
  isSimulated,
  onVerified,
}: ChannelPanelProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const titleId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const result = await apiRequest<{ completed: boolean }>(
      "/api/registrations/current/verifications",
      { method: "POST", body: { channel, code } },
    );

    setIsSubmitting(false);

    if (!result.ok) {
      const remaining = (result.details as { remainingAttempts?: number } | undefined)
        ?.remainingAttempts;

      setError(
        remaining === undefined
          ? result.message
          : `${result.message} ${copy.remainingAttempts.replace("{count}", String(remaining))}`,
      );

      return;
    }

    setCode("");
    onVerified(channel, result.data.completed);
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);

    const result = await apiRequest<{ simulationCode?: string }>(
      "/api/registrations/current/otp-challenges",
      { method: "POST", body: { channel, turnstileToken } },
    );

    setIsResending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setRevealedCode(result.data.simulationCode);
    setNotice("Yeni kod gönderildi.");
  }

  const Icon = channel === "email" ? MailIcon : SmartphoneIcon;

  return (
    // `<section aria-labelledby>` — adı olan bir bölüm ekran okuyucuda
    // gezinilebilir bir "bölge" olarak görünür, böylece kullanıcı iki panel
    // arasında doğrudan atlayabilir (07-ui-design-system.md · WCAG 2.1 AA).
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId} className="flex items-center gap-2 text-base">
            <Icon aria-hidden="true" className="size-4" />
            {title}
            {/* Durum renkle DEĞİL, metin + ikonla anlatılıyor (WCAG 2.1 AA). */}
            <span
              className={
                verified
                  ? "ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary"
                  : "ml-auto text-sm font-medium text-muted-foreground"
              }
            >
              {verified ? <CheckCircle2Icon aria-hidden="true" className="size-4" /> : null}
              {verified ? copy.verified : copy.pending}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{destination}</p>

          {/* Doğrulandıktan sonra kod ekranda KALMAZ: işi bitmiş bir kodu
              göstermeye devam etmek hem kafa karıştırır hem gereksiz. */}
          {revealedCode && !verified ? <SimulationCodeNotice code={revealedCode} /> : null}

          {verified ? null : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <FormAlert message={error} />
              <FormAlert message={notice} variant="info" />

              <TextField
                label={copy.codeLabel}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={OTP_CODE_LENGTH}
                // iOS ve Android klavyesi SMS/e-posta kodunu otomatik doldurur.
                autoComplete="one-time-code"
                required
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isSubmitting || code.length !== OTP_CODE_LENGTH}>
                  {isSubmitting ? copy.submitting : copy.submit}
                </Button>

                {/* Ayrı bir bekleme süresi YOK (src/config/constants.ts gerekçesi);
                    düğme yalnızca istek sürerken kilitli kalıyor. Asıl koruma
                    "aynı hedefe 3 kod / 15 dakika" hız sınırında. */}
                {/* Test ortamında düğme ne YAPTIĞINI söylüyor: gönderim yok,
                    kodu ekranda gösteriyor. "Yeni kod gönder" yazsaydı
                    kullanıcı yine postasına bakardı. */}
                <Button
                  type="button"
                  variant={isSimulated ? "default" : "outline"}
                  onClick={handleResend}
                  disabled={isResending}
                >
                  {isSimulated ? copy.revealCode : copy.resend}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

/**
 * Simülasyon kodu kutusu — YALNIZCA local ve preview.
 *
 * Production'da bu bileşene kod ULAŞAMAZ: sunucu `revealCodeIfAllowed()` ile
 * alanı boşaltıyor ve zaten sahte kanal production'da seçilemiyor
 * (`src/config/env.ts`). Kutu bilerek dikkat çekici: canlı sitede görülse
 * anında yanlış olduğu anlaşılsın.
 */
function SimulationCodeNotice({ code }: { code: string }) {
  return (
    <div
      role="status"
      className="rounded-md border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {copy.simulationNotice.split("{code}")[0]}
      <strong className="font-mono text-base tracking-widest">{code}</strong>
      {copy.simulationNotice.split("{code}")[1]}
    </div>
  );
}
