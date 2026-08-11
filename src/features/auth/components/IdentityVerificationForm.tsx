"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Mevcut hesaba kimlik bağlama formu (adım 15c-2 · teknik borç #32).
 *
 * Kayıt akışındaki `IdentityForm` ile aynı iki alanı sorar ama BAŞKA BİR UCA
 * gider ve hesap AÇMAZ. Tek bileşende birleştirilmedi çünkü ikisinin başarı
 * davranışı farklı: kayıt bir sonraki adıma geçiyor, bu ekran kullanıcıyı
 * geldiği yere geri gönderiyor.
 *
 * İstemci tarafı doğrulama YALNIZCA kolaylık: gerçek kapı sunucuda (kontrol
 * basamağı, KPS sorgusu, hız sınırı, bot koruması, 18 yaş, çakışma). Buradaki
 * kontrolleri geçmek hiçbir şeyi açmaz.
 */

const copy = messages.auth.identityVerification;

/**
 * ⛔ `isStaff` BU TİPTEN KALDIRILDI (adım 17c · ADR-017 ilke 2): kimlik
 * doğrulaması artık personel yetkisi vermiyor, dolayısıyla uç de öyle bir
 * alan döndürmüyor.
 */
type SuccessState = { fullName: string };

export function IdentityVerificationForm({
  turnstileSiteKey,
  returnTo,
}: {
  turnstileSiteKey: string | undefined;
  /** Doğrulama bitince dönülecek adres — sunucuda temizlenmiş bir YOL. */
  returnTo: string;
}) {
  const router = useRouter();
  const [nationalId, setNationalId] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);
  const handleUnavailable = useCallback(
    () => setError(messages.auth.register.errors.botCheckUnavailable),
    [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await apiRequest<SuccessState>("/api/identity-verifications", {
      method: "POST",
      body: { nationalId, birthYear, turnstileToken },
    });

    if (!result.ok) {
      setError(result.message);
      setIsSubmitting(false);

      return;
    }

    setSuccess(result.data);
    setIsSubmitting(false);
  }

  /**
   * ⛔ `router.refresh()` BURADA, GÖNDERİMDE DEĞİL — ve bunu tarayıcı testi
   * öğretti: gönderimin hemen ardından tazelenince sayfanın sunucu tarafı
   * kullanıcıyı artık "doğrulanmış" görüyor, formun yerine "kimliğiniz zaten
   * doğrulanmış" bilgisini çiziyor ve az önce gösterilen SONUÇ PANELİ
   * (gerçek ad + personel oldunuz bilgisi) bir anda kayboluyordu.
   *
   * Tazeleme kullanıcı "devam et" dediğinde yapılıyor: gidilecek sayfa
   * (hastane, spor salonu, hesabım) yeni kademeyi görsün diye şart, çünkü
   * yönlendirme istemci önbelleğindeki eski sunucu çıktısını kullanabilir.
   */
  function handleContinue() {
    router.refresh();
    router.push(returnTo);
  }

  if (success) {
    return (
      <div className="flex flex-col gap-5">
        <Alert role="status">
          <AlertTitle>{copy.success.title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{copy.success.description(success.fullName)}</span>
            <span>{copy.success.citizenNotice}</span>
            {/* Personel yetkisi ayrı bir akış (ADR-017 ilke 2). Kullanıcı
                hastanedeki uyarıdan gelmişse hâlâ giremeyeceğini görecek —
                nedenini ve devamını burada söylemezsek duvara çarpar. */}
            <span>{copy.success.staffHint}</span>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={handleContinue} className="min-h-11 w-full sm:w-auto">
            {copy.success.cta}
          </Button>

          <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
            <Link href="/personel-dogrulama">{copy.success.staffCta}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <TextField
        label={messages.auth.register.identity.nationalIdLabel}
        help={messages.auth.register.identity.nationalIdHelp}
        value={nationalId}
        onChange={(event) => setNationalId(event.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        maxLength={11}
        // Kimlik numarası tarayıcıya kaydettirilmez.
        autoComplete="off"
        required
      />

      <TextField
        label={messages.auth.register.identity.birthYearLabel}
        help={messages.auth.register.identity.birthYearHelp}
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

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
