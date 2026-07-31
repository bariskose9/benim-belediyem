"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * ADIM 2 — iletişim bilgisi ve şifre.
 *
 * Bu form gönderildiğinde İKİ KOD BİRDEN üretilip gönderiliyor
 * (e-posta + telefon), sonra doğrulama ekranına geçiliyor.
 */

const copy = messages.auth.register;

export function ContactForm({ isSimulated }: { isSimulated?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await apiRequest("/api/registrations/current", {
      method: "PATCH",
      body: { email, phone, password, passwordConfirm },
    });

    if (!result.ok) {
      // Taslak süresi dolduysa kullanıcı en baştan başlamalı.
      if (result.code === "REGISTRATION_EXPIRED") {
        router.push("/kayit?durum=suresi-doldu");

        return;
      }

      setError(result.message);
      setIsSubmitting(false);

      return;
    }

    router.push("/kayit/dogrulama");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={error} />

      <TextField
        label={copy.contact.emailLabel}
        // Test ortamında gönderim yok; söz vermeyen metin gösteriliyor.
        help={isSimulated ? copy.contact.emailHelpSimulated : copy.contact.emailHelp}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        inputMode="email"
        required
      />

      <TextField
        label={copy.contact.phoneLabel}
        help={copy.contact.phoneHelp}
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        autoComplete="tel"
        inputMode="tel"
        required
      />

      <TextField
        label={copy.contact.passwordLabel}
        help={copy.contact.passwordHelp}
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        required
      />

      <TextField
        label={copy.contact.passwordConfirmLabel}
        type="password"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        autoComplete="new-password"
        error={
          passwordConfirm && password !== passwordConfirm ? copy.errors.passwordMismatch : undefined
        }
        required
      />

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting
          ? isSimulated
            ? copy.contact.submittingSimulated
            : copy.contact.submitting
          : isSimulated
            ? copy.contact.submitSimulated
            : copy.contact.submit}
      </Button>
    </form>
  );
}
