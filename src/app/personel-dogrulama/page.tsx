import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheckIcon, CheckCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { messages } from "@/config/messages";
import { guardPage } from "@/features/auth/services/page-guard";
import { StaffVerificationForm } from "@/features/staff-verification/components/StaffVerificationForm";

/**
 * Kurum personeli doğrulaması (adım 17c · ADR-017 ilke 2).
 *
 * ⛔ KADEME `authenticated`, `staff` DEĞİL — bu kritik: sayfa tam olarak
 * personel OLMAYAN kullanıcı için var. `staff` isteseydi, sayfa hedef
 * kitlesini kapıda geri çevirirdi (`/kimlik-dogrulama` ile aynı tuzak, aynı
 * çözüm).
 *
 * KİMLİĞİ DOĞRULANMAMIŞ KULLANICI FORMU GÖRMEZ: ADR-017'nin sırası gereği
 * önce "kim olduğun" cevaplanmalı. Ekran onu kimlik doğrulamasına
 * yönlendiriyor — kapıda tek tip bir yetki hatasıyla geri çevirmek, ne
 * yapması gerektiğini söylemeden geri çevirmek olurdu.
 *
 * ZATEN PERSONEL OLAN KULLANICI DA FORMU GÖRMEZ: ikinci kez doğrulaması
 * anlamsız, üstelik uç de reddederdi (`StaffAlreadyVerifiedError`).
 */
export const dynamic = "force-dynamic";

const copy = messages.staffVerification;

export const metadata: Metadata = {
  title: copy.page.pageTitle,
};

export default async function StaffVerificationPage() {
  const guard = await guardPage("authenticated", "/personel-dogrulama");

  // `authenticated` kademesinde tek ret sebebi girişsizlik ve o zaten
  // yönlendirmeyle bitiyor; buraya gelen istek her zaman izinlidir.
  if (!guard.allowed) return null;

  const isStaff = guard.session.isStaff;
  const isIdentityVerified = guard.session.identityStatus === "kps_verified";

  return (
    <main className="page-shell flex max-w-2xl flex-col gap-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.page.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.page.description}</p>
      </header>

      {isStaff ? (
        <>
          <Alert role="status">
            <BadgeCheckIcon aria-hidden="true" />
            <AlertTitle>{copy.entry.verifiedTitle}</AlertTitle>
            <AlertDescription>{copy.entry.verifiedDescription}</AlertDescription>
          </Alert>

          <Link href="/hesabim" className="font-medium underline underline-offset-4">
            {copy.page.backToAccount}
          </Link>
        </>
      ) : !isIdentityVerified ? (
        <>
          <Alert role="status">
            <CheckCircleIcon aria-hidden="true" />
            <AlertTitle>{copy.errors.identityRequired}</AlertTitle>
            <AlertDescription>{copy.page.whyNotice}</AlertDescription>
          </Alert>

          <Link
            href="/kimlik-dogrulama?donus=%2Fpersonel-dogrulama"
            className="font-medium underline underline-offset-4"
          >
            {messages.auth.identityVerification.title}
          </Link>
        </>
      ) : (
        <>
          <p className="max-w-prose text-base text-muted-foreground">{copy.page.whyNotice}</p>

          {/* ⛔ Bu uyarı kaldırılmaz: canlıda kod teslim edilemiyor
              (teknik borç #25). Kullanıcıyı gelmeyecek bir kodu beklemeye
              bırakmak, sınırı yazmaktan çok daha kötü. */}
          <p className="max-w-prose rounded-lg bg-muted px-3 py-2 text-base text-muted-foreground">
            {copy.page.demoNotice}
          </p>

          <StaffVerificationForm />

          <Link href="/hesabim" className="font-medium underline underline-offset-4">
            {copy.page.backToAccount}
          </Link>
        </>
      )}
    </main>
  );
}
