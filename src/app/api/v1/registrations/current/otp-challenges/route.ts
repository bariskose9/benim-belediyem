import { cookies } from "next/headers";

import { REGISTRATION_COOKIE_NAME } from "@/config/constants";
import { RegistrationExpiredError } from "@/features/auth/errors";
import {
  otpChallengeResponseSchema,
  otpResendSchema,
} from "@/features/auth/schemas/registration.schema";
import { resendCode } from "@/features/auth/services/registration.service";
import { ValidationError } from "@/lib/errors";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/registrations/current/otp-challenges — "kodu tekrar gönder".
 *
 * PRD §5.0 bu ucu bot korumasının ZORUNLU olduğu yerler arasında sayıyor:
 * korumasız bırakılırsa hem gönderim maliyeti hem de kullanıcının posta
 * kutusuna bombardıman anlamına gelir.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = otpResendSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const store = await cookies();
    const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

    if (!token) throw new RegistrationExpiredError();

    const result = await resendCode({
      token,
      channel: parsed.data.channel,
      turnstileToken: parsed.data.turnstileToken,
      actorIp: readActorIp(request.headers),
    });

    return created(
      {
        expiresAt: result.expiresAt.toISOString(),
        simulationCode: result.simulationCode,
      },
      { schema: otpChallengeResponseSchema },
    );
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
