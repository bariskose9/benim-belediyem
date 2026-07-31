import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { REGISTRATION_COOKIE_NAME } from "@/config/constants";
import { isProductionEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { ContactForm } from "@/features/auth/components/ContactForm";
import { IdentitySummary } from "@/features/auth/components/IdentitySummary";
import { StepHeader } from "@/features/auth/components/StepHeader";
import { getRegistrationState } from "@/features/auth/services/registration.service";

/**
 * ADIM 2 — salt okunur kimlik bilgileri + iletişim ve şifre formu.
 *
 * Sunucu bileşeni: çerezi okur ve SERVİSİ çağırır. Prisma'ya doğrudan
 * dokunmuyor — katman kuralı korunuyor (01-architecture.md).
 *
 * Taslak yoksa veya süresi dolduysa başa yönlendiriyor; boş bir ekran
 * bırakmıyor (07-ui-design-system.md zorunlu ekran durumları).
 */
export const dynamic = "force-dynamic";

const copy = messages.auth.register;

export default async function RegisterContactPage() {
  const store = await cookies();
  const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

  if (!token) redirect("/kayit?durum=suresi-doldu");

  const state = await getRegistrationState(token);

  if (!state) redirect("/kayit?durum=suresi-doldu");

  // Kullanıcı bu adımı zaten tamamlamış (geri tuşuyla döndü): doğrulamaya al.
  if (state.step === "verify") redirect("/kayit/dogrulama");

  return (
    <>
      <StepHeader
        step={2}
        title={copy.steps.contact.title}
        description={copy.steps.contact.description}
      />

      <IdentitySummary identity={state.identity} />

      <ContactForm isSimulated={!isProductionEnv} />
    </>
  );
}
