"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * ADIM 1 — kod isteme formu (PRD §5.0 "Şifre sıfırlama").
 *
 * BOT KUTUSU BAŞTAN GÖRÜNÜR ve bu, giriş formundan bilinçli olarak FARKLI:
 * giriş "2 başarısız denemeden sonra" diyor, PRD burada ise doğrulamayı ilk
 * denemeden itibaren şart koşuyor. Sebep, bu ucun hesap sayımı ve e-posta
 * bombardımanı için birincil hedef olması.
 *
 * Ekran, girilen numaranın kayıtlı olup olmadığını HİÇBİR ŞEKİLDE göstermez:
 * yanıt her iki durumda da aynı olduğu için bileşenin dallanacağı bir bilgi
 * zaten yok.
 */

const copy = messages.auth.passwordReset.request;

export function PasswordResetRequestForm({
  turnstileSiteKey,
  isSimulated,
}: {
  turnstileSiteKey: string | undefined;
  /** Test ortamında düğme "kod oluştur" der; gönderim sözü verilmez. */
  isSimulated: boolean;
}) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
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
    setIsSubmitting(true);

    const result = await apiRequest("/api/v1/password-resets", {
      method: "POST",
      body: { nationalId, turnstileToken },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);

      return;
    }

    // Akış jetonu httpOnly çerezle geldi; sonraki ekran onu sunucuda okuyor.
    router.push("/sifremi-unuttum/dogrulama");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <TextField
        label={copy.nationalIdLabel}
        help={copy.nationalIdHelp}
        value={nationalId}
        onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={11}
        // Kimlik numarası tarayıcıya kaydettirilmez.
        autoComplete="off"
        required
      />

      <TurnstileWidget
        siteKey={turnstileSiteKey}
        onToken={handleToken}
        onUnavailable={handleUnavailable}
      />

      <Button
        type="submit"
        disabled={isSubmitting || botCheckUnavailable}
        className="w-full sm:w-auto"
      >
        {isSubmitting
          ? isSimulated
            ? copy.submittingSimulated
            : copy.submitting
          : isSimulated
            ? copy.submitSimulated
            : copy.submit}
      </Button>
    </form>
  );
}
