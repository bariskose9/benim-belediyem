import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { IdentityForm } from "@/features/auth/components/IdentityForm";
import { StepHeader } from "@/features/auth/components/StepHeader";
import { isRegistrationOpen } from "@/features/auth/services/registration-availability";

/**
 * ADIM 1 — kimlik doğrulama.
 *
 * Kayıt kapalıysa (production'da e-posta sağlayıcısı henüz yapılandırılmamış)
 * form hiç gösterilmiyor. Formu gösterip son adımda hata vermek kullanıcının
 * kimlik numarasını ve şifresini boşuna girmesi demek olurdu.
 */
export const dynamic = "force-dynamic";

const copy = messages.auth.register;

export default function RegisterIdentityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <>
      <StepHeader
        step={1}
        title={copy.steps.identity.title}
        description={copy.steps.identity.description}
      />

      {isRegistrationOpen() ? (
        <>
          <ExpiredNotice searchParams={searchParams} />
          <IdentityForm turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
        </>
      ) : (
        <Alert variant="destructive">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{copy.errors.registrationClosed}</AlertDescription>
        </Alert>
      )}
    </>
  );
}

/** Taslak süresi dolduğu için başa dönen kullanıcıya neden olduğunu söyler. */
async function ExpiredNotice({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  if (params.durum !== "suresi-doldu") return null;

  return (
    <Alert role="status">
      <AlertCircleIcon aria-hidden="true" />
      <AlertDescription>{copy.errors.registrationExpired}</AlertDescription>
    </Alert>
  );
}
