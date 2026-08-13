import { cookies } from "next/headers";

import { REGISTRATION_COOKIE_NAME } from "@/config/constants";
import { OtpInvalidError, RegistrationExpiredError } from "@/features/auth/errors";
import {
  otpVerifySchema,
  registrationVerificationCompletedResponseSchema,
  registrationVerificationPendingResponseSchema,
} from "@/features/auth/schemas/registration.schema";
import { verifyCode } from "@/features/auth/services/registration.service";
import { ValidationError } from "@/lib/errors";
import { created, fail, ok } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/registrations/current/verifications — kod doğrulama.
 *
 * İKİ KANAL DA DOĞRULANIRSA HESAP BURADA OLUŞUR ve 201 döner.
 * Ayrı bir "hesabı oluştur" ucu YOK: olsaydı "iki kod da doğrulanmış ama hesap
 * henüz açılmamış" diye korunması gereken üçüncü bir durum ve dışarıya açık
 * ikinci bir yüzey doğardı.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parsed = otpVerifySchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Girdiğiniz bilgiler geçersiz.");
    }

    const store = await cookies();
    const token = store.get(REGISTRATION_COOKIE_NAME)?.value;

    if (!token) throw new RegistrationExpiredError();

    const result = await verifyCode({
      token,
      channel: parsed.data.channel,
      code: parsed.data.code,
      actorIp: readActorIp(request.headers),
    });

    /**
     * ⚠️ `as const` GEREKLİ VE SEBEBİ ŞEMA BAĞI (borç #107).
     *
     * İki yanıt yalnızca `completed` alanının DEĞERİYLE ayrışıyor; şemalar bu
     * yüzden `z.literal(false)` ve `z.literal(true)` kullanıyor. `as const`
     * olmasaydı TypeScript alanı `boolean`a genişletir, iki şema da eşleşir
     * hâle gelir ve yanlış şemayı vermek derlemeden geçerdi.
     */
    if (!result.completed) {
      return ok(
        {
          completed: false as const,
          emailVerified: result.emailVerified,
          phoneVerified: result.phoneVerified,
        },
        { noStore: true, schema: registrationVerificationPendingResponseSchema },
      );
    }

    // Hesap açıldı; taslak çerezi artık işe yaramaz ve tarayıcıda kalmamalı.
    store.delete(REGISTRATION_COOKIE_NAME);

    // ⛔ `isStaff` YANITTAN KALDIRILDI (adım 17c): yeni açılan hiçbir hesap
    // personel olarak doğmuyor.
    return created(
      { completed: true as const },
      { schema: registrationVerificationCompletedResponseSchema },
    );
  } catch (error) {
    // Kalan deneme hakkı istemciye ayrıntı olarak veriliyor: kod hakkında ipucu
    // vermez ama kullanıcı kaç hakkı kaldığını görmeli (07-ui-design-system.md).
    return error instanceof OtpInvalidError
      ? fail(error, { remainingAttempts: error.remainingAttempts })
      : fail(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
