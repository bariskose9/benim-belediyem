"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { TextField } from "@/features/auth/components/TextField";

/**
 * "Cep telefonum" kartı (teknik borç #80).
 *
 * ⛔ "DOĞRULANMADI" ROZETİ VE UYARISI KALDIRILAMAZ. Bu projede telefon
 * doğrulaması simüle (teknik borç #1): kod telefona değil kullanıcının kendi
 * e-postasına gidiyor, yani numaranın ona ait olduğunu kanıtlamıyor. Ekranda
 * "doğrulandı" yazmak, üretmediğimiz bir kanıtı varmış gibi göstermek olurdu
 * (`contact.service.ts`'te gerekçesi uzun uzun yazılı).
 *
 * Kayıt akışından gelen numaralar `phoneVerifiedAt` dolu olduğu için
 * "Doğrulandı" görünüyor — o damga kayıt akışının kendi kararı ve bu ekran
 * onu değiştirmiyor, yalnızca kendi yazdığı numarayı doğrulanmamış işaretliyor.
 */

const copy = messages.account.phone;

export function PhoneForm({
  currentPhone,
  isVerified,
}: {
  currentPhone: string | null;
  isVerified: boolean;
}) {
  const router = useRouter();

  const [phone, setPhone] = useState(currentPhone ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const result = await apiRequest<undefined>("/api/account/phone", {
      method: "PUT",
      body: { phone },
    });

    setPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="cep-telefonum"
      className="flex flex-col gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
    >
      <h2 id="cep-telefonum" className="font-heading text-xl font-semibold tracking-tight">
        {copy.heading}
      </h2>

      <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>

      <p className="text-base">
        <span className="text-muted-foreground">{copy.current}: </span>
        <span className="font-medium">{currentPhone ?? copy.none}</span>
        {currentPhone ? (
          <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-sm">
            {isVerified ? copy.verifiedBadge : copy.unverifiedBadge}
          </span>
        ) : null}
      </p>

      <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base text-muted-foreground">
        {copy.unverifiedNotice}
      </p>

      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3">
        <TextField
          label={copy.label}
          help={copy.hint}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={error ?? undefined}
        />

        {saved ? (
          <p aria-live="polite" className="rounded-lg bg-muted px-3 py-2 text-base">
            {copy.success}
          </p>
        ) : null}

        <div>
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? copy.pending : copy.action}
          </Button>
        </div>
      </form>
    </section>
  );
}
