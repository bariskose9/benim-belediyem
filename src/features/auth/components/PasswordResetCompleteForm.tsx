"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { OTP_CODE_LENGTH } from "@/config/constants";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * ADIM 2 — kod + yeni şifre (PRD §5.0 "Şifre sıfırlama").
 *
 * KOD VE ŞİFRE TEK İSTEKTE gönderiliyor: ayrı iki uç olsaydı "kod doğrulandı
 * ama şifre henüz değişmedi" diye korunması gereken üçüncü bir durum doğardı.
 *
 * Sunucu şifre kurallarını KODDAN ÖNCE denetliyor, bu yüzden zayıf bir şifre
 * kullanıcının 3 deneme hakkından birini yakmıyor.
 */

const copy = messages.auth.passwordReset.verify;

export function PasswordResetCompleteForm({
  turnstileSiteKey,
  isSimulated,
}: {
  turnstileSiteKey: string | undefined;
  /** Test ortamında kod ekranda gösterilir; production'da yalnızca gönderilir. */
  isSimulated: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [revealedCode, setRevealedCode] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /*
   * ⛔ BULMACA ÖLDÜĞÜNDE GÖNDERİM KİLİTLENİR — sadece hata YAZMAK yetmez.
   * Bu bayrak olmadan ekranda "servise ulaşılamıyor" yazarken düğme
   * tıklanabilir kalıyordu: kullanıcı basıyor, jeton boş gidiyor, sunucu
   * reddediyor ve ikinci bir hata görüyordu (teknik borç #115).
   * Bulmaca kendini toparlar da jeton gelirse kilit AÇILIR.
   */
  const [botCheckUnavailable, setBotCheckUnavailable] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token);
    // Jeton geldiyse bulmaca yeniden ayaktadır; kilidi açık tutmanın anlamı yok.
    if (token) setBotCheckUnavailable(false);
  }, []);
  const handleUnavailable = useCallback(() => {
    setBotCheckUnavailable(true);
    setError(messages.auth.passwordReset.errors.botCheckUnavailable);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    const result = await apiRequest("/api/v1/password-resets/current/password", {
      method: "PUT",
      body: { code, password, passwordConfirm },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);

      return;
    }

    /**
     * `refresh()` ŞART: üst menü bir sunucu bileşeni ve oturumu sunucuda
     * okuyor. Şifre değişince tüm oturumlar düştüğü için menü tazelenmezse
     * kullanıcı hâlâ "Hesabım" görebilir.
     */
    router.replace("/giris?durum=sifre-yenilendi");
    router.refresh();
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setRevealedCode(undefined);
    setIsResending(true);

    const result = await apiRequest<{ simulationCode?: string }>(
      "/api/v1/password-resets/current/otp-challenges",
      { method: "POST", body: { turnstileToken } },
    );

    setIsResending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setRevealedCode(result.data.simulationCode);

    // Test ortamında kod gelmediyse gösterilecek bir kod yok demektir —
    // bunun sebebini söylemek "hesap yok" demek OLMAZ, çünkü aynı cümle
    // e-posta kanalının kapalı olduğu her durumda da geçerli.
    setNotice(
      isSimulated && !result.data.simulationCode ? copy.simulationNoCode : copy.resendNotice,
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {revealedCode ? <SimulationCodeNotice code={revealedCode} /> : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormAlert message={error} />
        <FormAlert message={notice} variant="info" />

        <TextField
          label={copy.codeLabel}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={OTP_CODE_LENGTH}
          // iOS ve Android klavyesi e-postadan gelen kodu otomatik doldurur.
          autoComplete="one-time-code"
          required
        />

        <TextField
          label={copy.passwordLabel}
          help={copy.passwordHelp}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          // Şifre yöneticisine "bu yeni bir şifre" ipucu.
          autoComplete="new-password"
          required
        />

        <TextField
          label={copy.passwordConfirmLabel}
          type="password"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
          required
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            disabled={isSubmitting || botCheckUnavailable || code.length !== OTP_CODE_LENGTH}
          >
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>

          {/* Ayrı bir bekleme süresi YOK (constants.ts gerekçesi); düğme
              yalnızca istek sürerken kilitli. Asıl koruma gönderim bütçesinde. */}
          <Button
            type="button"
            variant={isSimulated ? "default" : "outline"}
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? copy.resending : isSimulated ? copy.revealCode : copy.resend}
          </Button>
        </div>
      </form>

      {/* Yeni kod isteme de bot doğrulaması istiyor (PRD §5.0). */}
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        onToken={handleToken}
        onUnavailable={handleUnavailable}
      />
    </div>
  );
}

/**
 * Simülasyon kodu kutusu — YALNIZCA local ve preview.
 *
 * Production'da bu bileşene kod ULAŞAMAZ: sunucu `revealCodeIfAllowed()` ile
 * alanı boşaltıyor. Kutu bilerek dikkat çekici: canlı sitede görülse anında
 * yanlış olduğu anlaşılsın.
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
