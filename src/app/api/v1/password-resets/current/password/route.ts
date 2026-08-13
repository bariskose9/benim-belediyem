import { cookies } from "next/headers";

import { PASSWORD_RESET_COOKIE_NAME } from "@/config/constants";
import { PasswordResetExpiredError } from "@/features/auth/errors";
import {
  passwordResetCompletedResponseSchema,
  passwordResetCompleteSchema,
} from "@/features/auth/schemas/password-reset.schema";
import { completePasswordReset } from "@/features/auth/services/password-reset.service";
import { clearSessionCookie } from "@/features/auth/services/session-context";
import { ValidationError } from "@/lib/errors";
import { fail, ok } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * PUT /api/v1/password-resets/current/password — kodu doğrula, şifreyi değiştir.
 *
 * PUT ÇÜNKÜ İŞLEM YERİNE KOYMADIR: mevcut şifrenin yerine yenisi yazılıyor,
 * yeni bir kaynak yaratılmıyor (`03-api-guidelines.md` — fiil yok, kaynak var).
 *
 * Yanıt gövdesinde kullanıcı kimliği, e-posta ya da düşürülen oturum sayısı
 * YOKTUR: hepsi hesabın varlığına dair bilgi taşır.
 */
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const parsed = passwordResetCompleteSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const store = await cookies();
    const token = store.get(PASSWORD_RESET_COOKIE_NAME)?.value;

    if (!token) throw new PasswordResetExpiredError();

    await completePasswordReset({
      token,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
    });

    // Akış bitti: jeton bir daha kullanılamamalı.
    store.delete(PASSWORD_RESET_COOKIE_NAME);

    /**
     * Kullanıcı şifresini oturumu açıkken sıfırladıysa o oturum da düştü
     * (ADR-005). Ölü jetonu tarayıcıda bırakmak, üst menüde bir süre daha
     * "giriş yapılmış" görüntüsü verirdi.
     */
    await clearSessionCookie();

    return ok({ completed: true }, { noStore: true, schema: passwordResetCompletedResponseSchema });
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
