import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { IdentityVerificationForm } from "@/features/auth/components/IdentityVerificationForm";
import { guardPage } from "@/features/auth/services/page-guard";
import { DEFAULT_REDIRECT_PATH, sanitizeRedirectPath } from "@/lib/redirect";

/**
 * Kimlik doğrulama — MEVCUT hesaba KPS kimliği bağlar (teknik borç #32).
 *
 * ⛔ KADEME `authenticated`, `identity_verified` DEĞİL ve bu kritik: sayfa tam
 * olarak kimliği DOĞRULANMAMIŞ kullanıcı için var. `identity_verified`
 * isteseydi, sayfa hedef kitlesini kapıda geri çevirirdi.
 *
 * Girişsiz kullanıcı `guardPage` tarafından giriş ekranına yönlendiriliyor:
 * doğrulama bir HESABA bağlanma işlemi, hesabı olmayan kullanıcı önce kayıt
 * olmalı (kayıt akışı zaten kimliği kendi içinde doğruluyor).
 *
 * DOĞRULANMIŞ KULLANICI FORMU HİÇ GÖRMEZ: aynı numarayı ikinci kez girmesi
 * anlamsız, üstelik uç de reddederdi. Ekran bunu formu göstermeden söylüyor.
 */
export const dynamic = "force-dynamic";

const copy = messages.auth.identityVerification;

export const metadata: Metadata = {
  title: copy.pageTitle,
};

export default async function IdentityVerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const returnTo = readReturnTo(await searchParams);

  /**
   * Giriş ekranına gönderilirken DÖNÜŞ ADRESİ DE taşınıyor.
   *
   * Oturumu düşmüş bir kullanıcı hastanedeki bağlantıya tıklarsa önce giriş
   * yapıyor; sabit `/kimlik-dogrulama` verilseydi `?donus=` orada kaybolur ve
   * doğrulamayı bitirdiğinde hastaneye değil hesabına düşerdi.
   */
  const guard = await guardPage("authenticated", currentPath(returnTo));

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  const isVerified = guard.session.identityStatus === "kps_verified";

  return (
    <main className="page-shell flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      {isVerified ? (
        <>
          <Alert role="status">
            <CheckCircleIcon aria-hidden="true" />
            <AlertTitle>{copy.verified.title}</AlertTitle>
            <AlertDescription>{copy.verified.description}</AlertDescription>
          </Alert>

          <Link href="/hesabim" className="font-medium underline underline-offset-4">
            {copy.verified.cta}
          </Link>
        </>
      ) : (
        <>
          <p className="max-w-prose text-base text-muted-foreground">{copy.purposeNotice}</p>

          <IdentityVerificationForm
            turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
            returnTo={returnTo}
          />
        </>
      )}
    </main>
  );
}

/**
 * "Doğrulama bitince nereye dönülecek" adresi.
 *
 * AÇIK YÖNLENDİRME KORUMASI: değer adres çubuğundan geliyor ve
 * `sanitizeRedirectPath` yalnızca kendi sitemizdeki YOLLARI kabul ediyor
 * (`redirect.ts`). Kullanıcı hastanedeki uyarıdan geldiyse doğrulama sonrası
 * oraya dönüyor; parametre yoksa hesabına gidiyor.
 */
function readReturnTo(params: Record<string, string | string[] | undefined>): string {
  const raw = params.donus;

  return sanitizeRedirectPath(Array.isArray(raw) ? raw[0] : raw);
}

/** Giriş sonrası buraya geri dönülürken dönüş adresi de korunsun. */
function currentPath(returnTo: string): string {
  if (returnTo === DEFAULT_REDIRECT_PATH) return "/kimlik-dogrulama";

  return `/kimlik-dogrulama?donus=${encodeURIComponent(returnTo)}`;
}
