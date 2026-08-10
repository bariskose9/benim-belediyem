import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { CookieTable } from "@/features/legal/components/CookieTable";
import { LegalDocument } from "@/features/legal/components/LegalDocument";
import { readCookieNoticeConsent } from "@/features/legal/services/consent.service";
import { ConsentType } from "@/generated/prisma/enums";
import { readAnonymousId } from "@/lib/anonymous-id";

/**
 * Çerez politikası (PRD §5.10 · adım 17).
 *
 * Diğer üç yasal sayfadan FARKI: burada veritabanına gidiliyor — kullanıcının
 * yürürlükteki tercihi gösteriliyor ve geri alınabiliyor. Bu yüzden `dynamic`.
 *
 * ⛔ RIZA DURUMU BURADA OKUNUYOR, BANTTA DEĞİL: bant her sayfada çiziliyor ve
 * orada bir sorgu, sitenin tamamına istek başına bir veritabanı okuması eklerdi.
 * Bu sayfa tek sayfa, bedeli tek sorgu.
 */
export const dynamic = "force-dynamic";

const copy = messages.legal.cookies;

export const metadata: Metadata = {
  title: copy.pageTitle,
  description: copy.description,
  alternates: { canonical: "/cerez-politikasi" },
};

/** Uçtan gelen hata kodunu Türkçe uyarıya çevirir. */
const ERROR_COPY: Record<string, string> = {
  INVALID_CONSENT_REQUEST: messages.legal.consentErrors.invalidRequest,
  CONSENT_RATE_LIMITED: messages.legal.consentErrors.tooManyRequests,
};

export default async function CookiePolicyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawError = typeof params.hata === "string" ? params.hata : undefined;

  /**
   * ⛔ ADRESTEKİ DEĞER EKRANA BASILMIYOR, YALNIZCA TABLODA ARANIYOR. Doğrudan
   * yazılsaydı saldırgan bu sayfaya istediği metni yazdıran bir bağlantı
   * dağıtabilirdi (içerik enjeksiyonu / kimlik avı).
   */
  const errorMessage = rawError ? ERROR_COPY[rawError] : undefined;

  const [session, anonymousId] = await Promise.all([getCurrentSession(), readAnonymousId()]);

  const isAcknowledged = await readCookieNoticeConsent({
    userId: session?.userId,
    anonymousId,
  });

  return (
    <LegalDocument
      slug="/cerez-politikasi"
      title={copy.title}
      intro={copy.intro}
      sections={copy.sections}
    >
      <CookieTable />

      {copy.afterTable.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{section.heading}</h2>

          {section.body.map((paragraph) => (
            <p key={paragraph} className="max-w-prose text-base wrap-break-word">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <section
        aria-labelledby="cerez-tercihi"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
      >
        <h2 id="cerez-tercihi" className="font-heading text-xl font-semibold tracking-tight">
          {copy.status.heading}
        </h2>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <p className="max-w-prose text-base">
          {isAcknowledged ? copy.status.acknowledged : copy.status.notAcknowledged}
        </p>

        {/*
          JavaScript'siz form — bandın kullandığı ucun aynısı. `returnTo` burada
          AÇIKÇA veriliyor çünkü sayfa kendi adresini biliyor; bantta bilmiyordu
          ve orada `Referer` başlığına düşülüyor.
        */}
        <form action="/api/consents" method="post">
          <input type="hidden" name="consentType" value={ConsentType.necessary_cookies} />
          <input type="hidden" name="isGranted" value={isAcknowledged ? "0" : "1"} />
          <input type="hidden" name="returnTo" value="/cerez-politikasi" />

          <Button
            type="submit"
            variant={isAcknowledged ? "outline" : "default"}
            className="min-h-11 px-6"
          >
            {isAcknowledged ? copy.status.withdrawAction : copy.status.acknowledgeAction}
          </Button>
        </form>
      </section>
    </LegalDocument>
  );
}
