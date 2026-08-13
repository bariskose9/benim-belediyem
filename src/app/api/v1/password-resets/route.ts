import { cookies } from "next/headers";

import { PASSWORD_RESET_COOKIE_NAME, PASSWORD_RESET_FLOW_TTL_MS } from "@/config/constants";
import {
  passwordResetRequestSchema,
  passwordResetStartResponseSchema,
} from "@/features/auth/schemas/password-reset.schema";
import { requestPasswordReset } from "@/features/auth/services/password-reset.service";
import { ensureAnonymousId } from "@/lib/anonymous-id";
import { secureCookieDefaults } from "@/lib/cookies";
import { ValidationError } from "@/lib/errors";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/password-resets — şifre sıfırlama kodu iste.
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ (`03-api-guidelines.md`): "şifremi sıfırla" bir
 * sıfırlama KAYNAĞI oluşturmaktır, `/api/reset-password` değil.
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR: girdiyi doğrular, servisi çağırır, çerezi
 * yazar, hatayı tek tip zarfa çevirir (01-architecture.md).
 *
 * AKIŞ KİMLİĞİ YANITTA VE URL'DE GEÇMEZ; yalnızca httpOnly çerezle taşınır
 * (05-auth-security.md — tanımlayıcı URL'ye, log'a ve Referer başlığına
 * yazılmaz). Yanıt gövdesi kayıtlı ve kayıtsız numarada AYNIDIR.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = passwordResetRequestSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const result = await requestPasswordReset({
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      // Hız sınırının "oturum" bacağını besler (ADR-006).
      sessionId: await ensureAnonymousId(),
    });

    const store = await cookies();
    store.set(PASSWORD_RESET_COOKIE_NAME, result.token, {
      ...secureCookieDefaults,
      maxAge: Math.floor(PASSWORD_RESET_FLOW_TTL_MS / 1000),
    });

    return created(
      { expiresAt: result.expiresAt.toISOString() },
      { schema: passwordResetStartResponseSchema },
    );
  } catch (error) {
    return fail(error);
  }
}

/** Gövdesi bozuk istekte JSON ayrıştırma hatası sızdırmadan boş nesne döner. */
async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
