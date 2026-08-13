import { cookies } from "next/headers";

import { PASSWORD_RESET_COOKIE_NAME } from "@/config/constants";
import { PasswordResetExpiredError } from "@/features/auth/errors";
import {
  passwordResetOtpResponseSchema,
  passwordResetResendSchema,
} from "@/features/auth/schemas/password-reset.schema";
import { resendPasswordResetCode } from "@/features/auth/services/password-reset.service";
import { ensureAnonymousId } from "@/lib/anonymous-id";
import { ValidationError } from "@/lib/errors";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/password-resets/current/otp-challenges — "yeni kod gönder".
 *
 * PRD §5.0 bu ucu bot korumasının ZORUNLU olduğu yerler arasında sayıyor:
 * korumasız bırakılırsa hem gönderim maliyeti hem de kullanıcının posta
 * kutusuna bombardıman anlamına gelir.
 *
 * KİMLİK NUMARASI İSTENMEZ: hangi hesabın kodu olduğu çerezdeki akış
 * jetonundan okunuyor. Numarayı ikinci kez sormak yeni bir tarama yüzeyi
 * açardı.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = passwordResetResendSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const store = await cookies();
    const token = store.get(PASSWORD_RESET_COOKIE_NAME)?.value;

    if (!token) throw new PasswordResetExpiredError();

    const result = await resendPasswordResetCode({
      token,
      turnstileToken: parsed.data.turnstileToken,
      actorIp: readActorIp(request.headers),
      sessionId: await ensureAnonymousId(),
    });

    /**
     * `simulationCode` YALNIZCA local ve preview'da dolu olur; production'da
     * `otp.service.ts` onu her zaman `undefined` yapar. Sahte akışta da boş
     * gelir — gösterilecek bir kod üretilmedi.
     */
    return created(
      {
        expiresAt: result.expiresAt.toISOString(),
        simulationCode: result.simulationCode,
      },
      { schema: passwordResetOtpResponseSchema },
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
