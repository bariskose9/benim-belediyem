import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { GoogleLoginButton } from "@/features/auth/components/GoogleLoginButton";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { isGoogleLoginConfigured } from "@/features/auth/services/google-oauth.service";
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

/**
 * Google akışından gelen hata kodunu Türkçe mesaja çevirir.
 *
 * Adres çubuğundan gelen değer BEYAZ LİSTEDEN geçiyor: bilinmeyen bir kod
 * `undefined` döner, ekrana basılmaz. Kodu doğrudan yazdırmak, adres çubuğuna
 * istediğini yazan birinin bizim sayfamızda kendi metnini göstermesine izin
 * verirdi (metin enjeksiyonu / kimlik avı).
 *
 * Birleştirme engelinin iki sebebi AYNI mesaja çıkıyor: kullanıcının yapması
 * gereken şey ikisinde de aynı — şifresiyle girip bağlantıyı profilden kurmak.
 */
function googleErrorMessage(code: string | undefined): string | undefined {
  const errors = copy.google.errors;

  const map: Record<string, string> = {
    google_kullanilamiyor: errors.unavailable,
    google_girisi_tamamlanamadi: errors.failed,
    baglanti_suresi_doldu: errors.expired,
    cok_fazla_deneme: errors.tooManyAttempts,
    dogrulama_gerekli_google_email_unverified: errors.verificationRequired,
    dogrulama_gerekli_local_email_unverified: errors.verificationRequired,
  };

  return code ? map[code] : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectPath(params.donus);

  if (await getCurrentSession()) redirect(redirectTo);

  const googleError = googleErrorMessage(params.hata);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-base text-muted-foreground">{copy.description}</p>
      </header>

      {params.durum === "giris-gerekli" ? (
        // Sayfada duran bilgi kutusu `role="status"` olmalı; shadcn `Alert`
        // varsayılanı `role="alert"` (assertive) ve ekran okuyucuyu böler.
        <Alert role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.redirectedNotice}</AlertDescription>
        </Alert>
      ) : null}

      {params.durum === "sifre-yenilendi" ? (
        <Alert role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.passwordResetDoneNotice}</AlertDescription>
        </Alert>
      ) : null}

      {googleError ? (
        <Alert role="status">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{googleError}</AlertDescription>
        </Alert>
      ) : null}

      <LoginForm
        turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        redirectTo={redirectTo}
      />

      {/*
        Düğme YALNIZCA yapılandırma varken çiziliyor. Ortam değişkeni yoksa
        çalışmayacak bir düğme göstermek, kullanıcıyı hataya sürüklemek olurdu
        (`auth-availability.ts` ile aynı desen).
      */}
      {isGoogleLoginConfigured() ? <GoogleLoginButton redirectTo={redirectTo} /> : null}

      <p className="text-base text-muted-foreground">
        <Link href="/sifremi-unuttum" className="font-medium underline underline-offset-4">
          {copy.forgotPasswordCta}
        </Link>
      </p>

      <p className="text-base text-muted-foreground">
        {copy.registerPrompt}{" "}
        <Link href="/kayit" className="font-medium underline underline-offset-4">
          {copy.registerCta}
        </Link>
      </p>
    </main>
  );
}
