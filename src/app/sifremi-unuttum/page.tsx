import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { isProductionEnv, publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { PasswordResetRequestForm } from "@/features/auth/components/PasswordResetRequestForm";
import { isPasswordResetOpen } from "@/features/auth/services/auth-availability";

/**
 * Şifre sıfırlama — 1. ekran (PRD §5.0).
 *
 * OTURUMU AÇIK KULLANICI DA GİREBİLİR: şifresini hatırlamayan ama tarayıcısında
 * oturumu duran kullanıcıyı kapıda çevirmek için bir sebep yok. Şifre değişince
 * o oturum da düşer (ADR-005).
 *
 * Akış kapalıysa (production'da e-posta sağlayıcısı yapılandırılmamışsa) form
 * hiç gösterilmez; kimlik numarasını girip hiç gelmeyecek bir kodu beklemek
 * kullanıcı için en kötü sonuç olurdu.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages.auth.passwordReset.pageTitle,
};

const copy = messages.auth.passwordReset;

export default async function PasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.request.title}</h1>
        <p className="text-sm text-muted-foreground">
          {/* Local ve preview'da e-posta GÖNDERİLMİYOR; "göndereceğiz" demek
              kullanıcıyı gelmeyecek bir postayı beklemeye iter. */}
          {isProductionEnv ? copy.request.description : copy.request.descriptionSimulated}
        </p>
      </header>

      {params.durum === "suresi-doldu" ? (
        // Sayfada duran bilgi kutusu `role="status"` olmalı; shadcn `Alert`
        // varsayılanı `role="alert"` (assertive) ve ekran okuyucuyu böler.
        <Alert role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.errors.resetExpired}</AlertDescription>
        </Alert>
      ) : null}

      {isPasswordResetOpen() ? (
        <PasswordResetRequestForm
          turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          isSimulated={!isProductionEnv}
        />
      ) : (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.errors.closed}</AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/giris" className="font-medium underline underline-offset-4">
          {copy.request.backToLogin}
        </Link>
      </p>
    </main>
  );
}
