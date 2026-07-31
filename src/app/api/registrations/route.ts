import { cookies } from "next/headers";

import { REGISTRATION_COOKIE_NAME, REGISTRATION_DRAFT_TTL_MS } from "@/config/constants";
import { IdentityCheckFailedError } from "@/features/auth/errors";
import { registrationStartSchema } from "@/features/auth/schemas/registration.schema";
import { startRegistration } from "@/features/auth/services/registration.service";
import { ensureAnonymousId } from "@/lib/anonymous-id";
import { secureCookieDefaults } from "@/lib/cookies";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/registrations — kayıt akışının 1. adımı.
 *
 * Bu dosyada İŞ MANTIĞI YOKTUR (01-architecture.md): girdiyi Zod ile doğrular,
 * servisi çağırır, çerezi yazar ve hatayı tek tip zarfa çevirir.
 *
 * Taslak kimliği YANITTA VE URL'DE GEÇMEZ; yalnızca httpOnly çerezle taşınır
 * (05-auth-security.md — tanımlayıcı URL'ye, log'a ve Referer başlığına yazılmaz).
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = registrationStartSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      /**
       * ŞEMA HATASI DA 400 `IDENTITY_CHECK_FAILED` DÖNER, 422 DEĞİL.
       *
       * İki sebep:
       *  · PRD kabul kriteri "geçersiz kontrol basamağına sahip numara sunucuda
       *    reddedilir (400)" diyor.
       *  · 422 dönseydi DURUM KODUNUN KENDİSİ "numaran bozuk" ile "numara
       *    kayıtlı değil" arasındaki farkı sızdırırdı — `lookupIdentity` ve
       *    tek tip mesajın özenle sildiği ayrım geri gelirdi
       *    (05-auth-security.md → numara taraması koruması).
       *
       * Alan bazlı ayrıntı da dönülmüyor; hangi alanın tutmadığı söylenmez.
       */
      throw new IdentityCheckFailedError();
    }

    const result = await startRegistration({
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      // Hız sınırının "oturum" bacağını besler (ADR-006). Ziyaretçi kimliği
      // yoksa burada üretilir.
      sessionId: await ensureAnonymousId(),
    });

    const store = await cookies();
    store.set(REGISTRATION_COOKIE_NAME, result.token, {
      ...secureCookieDefaults,
      maxAge: Math.floor(REGISTRATION_DRAFT_TTL_MS / 1000),
    });

    return created({
      identity: result.identity,
      expiresAt: result.expiresAt.toISOString(),
    });
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
