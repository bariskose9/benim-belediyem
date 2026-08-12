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
 * ADIM 1 — T.C. kimlik numarası + doğum yılı.
 *
 * İstemci tarafı doğrulama YALNIZCA kullanıcıya kolaylık: gerçek kapı
 * sunucuda (kontrol basamağı, KPS sorgusu, hız sınırı, bot koruması).
 * Buradaki kontrolleri geçmek hiçbir şeyi açmaz.
 */

const copy = messages.auth.register;

export function IdentityForm({ turnstileSiteKey }: { turnstileSiteKey: string | undefined }) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [birthYear, setBirthYear] = useState("");
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
    setError(copy.errors.botCheckUnavailable);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await apiRequest("/api/registrations", {
      method: "POST",
      body: { nationalId, birthYear, turnstileToken },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);

      return;
    }

    router.push("/kayit/bilgiler");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <TextField
        label={copy.identity.nationalIdLabel}
        help={copy.identity.nationalIdHelp}
        value={nationalId}
        onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={11}
        // Kimlik numarası tarayıcıya kaydettirilmez.
        autoComplete="off"
        required
      />

      <TextField
        label={copy.identity.birthYearLabel}
        help={copy.identity.birthYearHelp}
        value={birthYear}
        onChange={(event) => setBirthYear(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={4}
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
        {isSubmitting ? copy.identity.submitting : copy.identity.submit}
      </Button>
    </form>
  );
}
