"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Personel yetkisi doğrulama formu — iki adım, tek bileşen
 * (adım 17c · ADR-017 ilke 2).
 *
 * ═══ NEDEN TEK BİLEŞEN ═══
 * İki adım arasında taşınması gereken TEK durum kurumsal adres ve o adres
 * ikinci istekte sunucuya geri gönderiliyor (bağlama kanıtı için). Ayrı iki
 * sayfa yapılsaydı adresin sayfalar arasında taşınması gerekirdi ve bunun
 * tek yolu ya adres çubuğu (kişisel veri URL'de) ya da ikinci bir çerezdi.
 *
 * ⛔ İSTEMCİDE HİÇBİR YETKİ KARARI YOK. Buradaki adım göstergesi yalnızca
 * görsel; hangi personel kaydına bağlanacağını sunucu doğrulanmış adresten
 * türetiyor ve `isStaff` istemciden hiç gelmiyor.
 */

const copy = messages.staffVerification;

type Step = "request" | "confirm" | "done";

export function StaffVerificationForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [workEmail, setWorkEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCode, setRevealedCode] = useState<string | undefined>(undefined);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await apiRequest<{ revealedCode?: string }>("/api/v1/staff-verifications", {
      method: "POST",
      body: { workEmail },
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setRevealedCode(result.data.revealedCode);
    setStep("confirm");
  }

  async function confirmCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await apiRequest<{ isStaff: boolean }>(
      "/api/v1/staff-verifications/confirmations",
      { method: "POST", body: { workEmail, code } },
    );

    setPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setStep("done");
  }

  /**
   * ⛔ `router.refresh()` BURADA, DOĞRULAMA ANINDA DEĞİL.
   *
   * Doğrulamanın hemen ardından tazelenseydi sayfanın sunucu tarafı kullanıcıyı
   * artık "personel" görür, formun yerine "zaten personelsiniz" bilgisini
   * çizer ve az önce gösterilen BAŞARI PANELİ bir anda kaybolurdu. Aynı tuzak
   * `IdentityVerificationForm`'da yaşandı ve orada da böyle çözüldü.
   *
   * Kullanıcı "hesabıma dön" dediğinde tazeleniyor: gidilecek sayfa yeni
   * yetkiyi görsün diye şart, yoksa istemci önbelleğindeki eski sunucu çıktısı
   * kullanılabilir.
   */
  function handleContinue() {
    router.refresh();
    router.push("/hesabim");
  }

  if (step === "done") {
    return (
      <div className="flex flex-col gap-5">
        <Alert role="status">
          <AlertTitle>{copy.success.title}</AlertTitle>
          <AlertDescription>{copy.success.description}</AlertDescription>
        </Alert>

        <Button type="button" onClick={handleContinue} className="min-h-11 w-full sm:w-auto">
          {copy.success.cta}
        </Button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form
        onSubmit={(event) => void confirmCode(event)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormAlert message={error} />

        <p aria-live="polite" className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base">
          {copy.request.sent}
        </p>

        {revealedCode ? <SimulationCodeNotice code={revealedCode} /> : null}

        <h2 className="font-heading text-xl font-semibold tracking-tight">
          {copy.confirm.heading}
        </h2>

        <p className="max-w-prose text-base text-muted-foreground">{copy.confirm.description}</p>

        <TextField
          label={copy.confirm.codeLabel}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          required
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? copy.confirm.pending : copy.confirm.action}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setStep("request");
              setCode("");
              setRevealedCode(undefined);
              setError(null);
            }}
          >
            {copy.confirm.changeEmail}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void requestCode(event)} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <h2 className="font-heading text-xl font-semibold tracking-tight">{copy.request.heading}</h2>

      <p className="max-w-prose text-base text-muted-foreground">{copy.request.description}</p>

      <TextField
        label={copy.request.emailLabel}
        help={copy.request.emailHint}
        type="email"
        inputMode="email"
        // Kurumsal adres kullanıcının kendi adresi değil; tarayıcının kişisel
        // e-posta önerisini buraya doldurması yanlış olurdu.
        autoComplete="off"
        value={workEmail}
        onChange={(event) => setWorkEmail(event.target.value)}
        required
      />

      <div>
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? copy.request.pending : copy.request.action}
        </Button>
      </div>
    </form>
  );
}

/**
 * ⚠️ BU BİLEŞEN ÜÇÜNCÜ KOPYA (`VerificationPanels.tsx` ve
 * `PasswordResetCompleteForm.tsx` içinde aynısı var) — teknik borç olarak
 * yazıldı. Ortak bir bileşene çıkarmak kayıt ve şifre sıfırlama akışlarına
 * dokunmayı gerektiriyor; CLAUDE.md §7 aynı anda tek modül diyor.
 */
function SimulationCodeNotice({ code }: { code: string }) {
  const [before, after] = copy.confirm.simulationNotice.split("{code}");

  return (
    <div
      role="status"
      className="rounded-md border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {before}
      <strong className="font-mono text-base tracking-widest">{code}</strong>
      {after}
    </div>
  );
}
