import { cookies } from "next/headers";

import { REGISTRATION_COOKIE_NAME } from "@/config/constants";
import { RegistrationExpiredError } from "@/features/auth/errors";
import {
  registrationContactResponseSchema,
  registrationContactSchema,
  registrationStateResponseSchema,
} from "@/features/auth/schemas/registration.schema";
import {
  cancelRegistration,
  getRegistrationState,
  submitContact,
} from "@/features/auth/services/registration.service";
import { ValidationError } from "@/lib/errors";
import { fail, noContent, ok } from "@/lib/http";

/**
 * /api/v1/registrations/current — devam eden kayıt.
 *
 * `current` tekil kaynak adı bilinçli: taslağın kimliği httpOnly çerezde
 * duruyor ve URL'de GEÇMEMELİ. `/api/v1/registrations/{id}` olsaydı kimlik
 * tarayıcı geçmişine, sunucu erişim log'una ve Referer başlığına düşerdi.
 */
export const dynamic = "force-dynamic";

async function readToken(): Promise<string> {
  const store = await cookies();
  const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

  if (!token) throw new RegistrationExpiredError();

  return token;
}

/** Ekranların okuduğu durum: hangi adımdayız, hangi kanal doğrulandı. */
export async function GET() {
  try {
    const state = await getRegistrationState(await readToken());

    if (!state) throw new RegistrationExpiredError();

    return ok(
      {
        step: state.step,
        identity: state.identity,
        emailMasked: state.emailMasked,
        phoneMasked: state.phoneMasked,
        emailVerified: state.emailVerified,
        phoneVerified: state.phoneVerified,
        expiresAt: state.expiresAt.toISOString(),
      },
      { noStore: true, schema: registrationStateResponseSchema },
    );
  } catch (error) {
    return fail(error);
  }
}

/** İletişim bilgisi + şifre; iki doğrulama kodu burada gönderilir. */
export async function PATCH(request: Request) {
  try {
    const parsed = registrationContactSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const result = await submitContact({ token: await readToken(), payload: parsed.data });

    return ok(
      {
        expiresAt: result.expiresAt.toISOString(),
        // Yalnızca local ve preview'da dolu; production'da servis katmanı
        // bu alanı zaten `undefined` yapıyor.
        simulationCodes: result.simulationCodes,
      },
      { noStore: true, schema: registrationContactResponseSchema },
    );
  } catch (error) {
    return fail(error);
  }
}

/** Kullanıcı vazgeçti — taslak hemen silinir, 15 dakika beklenmez. */
export async function DELETE() {
  try {
    const store = await cookies();
    const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

    if (token) await cancelRegistration(token);

    store.delete(REGISTRATION_COOKIE_NAME);

    return noContent();
  } catch (error) {
    return fail(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
