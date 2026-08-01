import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PASSWORD_RESET_COOKIE_NAME } from "@/config/constants";
import { isProductionEnv, publicEnv } from "@/config/env";
import { messages } from "@/config/messages";
import { PasswordResetCompleteForm } from "@/features/auth/components/PasswordResetCompleteForm";

/**
 * Şifre sıfırlama — 2. ekran (PRD §5.0).
 *
 * SAYFA HESABIN VAR OLUP OLMADIĞINI BİLMEZ ve bilmemesi gerekir: kayıtsız bir
 * numarayla gelen kullanıcı da tam olarak bu ekranı, aynı metinlerle görür.
 * Çerezdeki jeton dışında hiçbir şey okunmuyor — maskeli e-posta bile
 * gösterilmiyor, çünkü onu göstermek hesabın varlığını doğrulardı.
 *
 * Simülasyon kodu bu sayfada baştan gösterilmez: kod yalnızca gönderim anındaki
 * yanıtta dönüyor. "Kodu göster" düğmesi yeni bir kod isteyip onu ekrana
 * getiriyor — kayıt akışındaki desenin aynısı.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: messages.auth.passwordReset.pageTitle,
};

const copy = messages.auth.passwordReset.verify;

export default async function PasswordResetVerifyPage() {
  const store = await cookies();
  const token = store.get(PASSWORD_RESET_COOKIE_NAME)?.value;

  // Jeton yoksa akış hiç başlamamış ya da 15 dakikası dolmuş demektir.
  if (!token) redirect("/sifremi-unuttum?durum=suresi-doldu");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">
          {isProductionEnv ? copy.description : copy.descriptionSimulated}
        </p>
      </header>

      <PasswordResetCompleteForm
        turnstileSiteKey={publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        isSimulated={!isProductionEnv}
      />
    </main>
  );
}
