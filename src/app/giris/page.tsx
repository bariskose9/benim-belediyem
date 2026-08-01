import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { sanitizeRedirectPath } from "@/lib/redirect";

/**
 * Giriş ekranı (PRD §5.0).
 *
 * Oturumu açık olan kullanıcı buraya hiç düşmez; giriş formunu ikinci kez
 * göstermek "acaba oturumum kapandı mı" sorusunu doğurur.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages.auth.login.pageTitle,
};

const copy = messages.auth.login;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(params.donus);

  if (await getCurrentSession()) redirect(redirectTo);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </header>

      {params.durum === "giris-gerekli" ? (
        // Sayfada duran bilgi kutusu `role="status"` olmalı; shadcn `Alert`
        // varsayılanı `role="alert"` (assertive) ve ekran okuyucuyu böler.
        <Alert role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.redirectedNotice}</AlertDescription>
        </Alert>
      ) : null}

      <LoginForm
        turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        redirectTo={redirectTo}
      />

      <p className="text-sm text-muted-foreground">
        {copy.registerPrompt}{" "}
        <Link href="/kayit" className="font-medium underline underline-offset-4">
          {copy.registerCta}
        </Link>
      </p>
    </main>
  );
}
