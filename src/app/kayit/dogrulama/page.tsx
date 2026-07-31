import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { REGISTRATION_COOKIE_NAME } from "@/config/constants";
import { isProductionEnv, publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { StepHeader } from "@/features/auth/components/StepHeader";
import { VerificationPanels } from "@/features/auth/components/VerificationPanels";
import { getRegistrationState } from "@/features/auth/services/registration.service";

/**
 * ADIM 3 — iki bağımsız doğrulama paneli.
 *
 * Kodlar bir önceki adımda gönderildi. Kullanıcı sayfayı yenilerse kodlar
 * TEKRAR GÖNDERİLMEZ (gönderim hız sınırı boşa harcanmasın diye); ekranda
 * "yeni kod gönder" düğmesi var.
 *
 * Simülasyon kodu bu sayfada gösterilmiyor: kod yalnızca gönderim anındaki
 * yanıtta dönüyor. Sayfa yenilenince kutu kaybolur, kullanıcı yeni kod ister.
 * Kodu taslakta saklamak, "kod veritabanında yalnızca özet olarak durur"
 * kuralını (05-auth-security.md) delerdi.
 */
export const dynamic = "force-dynamic";

const copy = messages.auth.register;

export default async function RegisterVerifyPage() {
  const store = await cookies();
  const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

  if (!token) redirect("/kayit?durum=suresi-doldu");

  const state = await getRegistrationState(token);

  if (!state) redirect("/kayit?durum=suresi-doldu");

  // İletişim adımı henüz tamamlanmamış: kod gönderilecek bir adres yok.
  if (state.step === "contact") redirect("/kayit/bilgiler");

  return (
    <>
      <StepHeader
        step={3}
        title={copy.steps.verify.title}
        description={copy.steps.verify.description}
      />

      <VerificationPanels
        emailMasked={state.emailMasked ?? ""}
        phoneMasked={state.phoneMasked ?? ""}
        initialEmailVerified={state.emailVerified}
        initialPhoneVerified={state.phoneVerified}
        turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        showSimulationHint={!isProductionEnv}
      />
    </>
  );
}
