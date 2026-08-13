import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidStaffVerificationRequestError } from "@/features/staff-verification/errors";
import { staffVerificationConfirmSchema } from "@/features/staff-verification/schemas/staff-verification.schema";
import { confirmStaffVerification } from "@/features/staff-verification/services/staff-verification.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/same-origin";

/**
 * `POST /api/v1/staff-verifications/confirmations` — kodu doğrular ve personel
 * yetkisini bağlar (adım 17c · ADR-017 ilke 2).
 *
 * ═══ NEDEN AYRI BİR UÇ, `PATCH` DEĞİL ═══
 * İki adım iki farklı kaynak yaratıyor: birincisi bir GÖNDERİM, ikincisi bir
 * DOĞRULAMA. Aynı uca farklı gövdeyle iki iş yaptırmak, Zod şemasını
 * birleştirmeyi ve "hangi alan hangi adımda zorunlu" kuralını gövdeden
 * çıkarmayı gerektirirdi (03-api-guidelines.md: kaynak adları, fiil yok).
 *
 * ⛔ `staffMemberId` GÖVDEDE YOK: hangi personel kaydına bağlanacağını sunucu
 * yalnızca doğrulanmış kurumsal adresten türetiyor. Gövdede olsaydı, kodunu
 * kendi adresine alan biri başkasının kayıt kimliğini yazarak onun yetkisini
 * alırdı.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    // Gerekçe kardeş uçta yazılı: yetki akışında tek katmanla yetinilmiyor.
    if (!isSameOriginRequest(request.headers)) throw new InvalidStaffVerificationRequestError();

    const parsed = staffVerificationConfirmSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidStaffVerificationRequestError();

    const result = await confirmStaffVerification({
      userId: session.userId,
      workEmail: parsed.data.workEmail,
      code: parsed.data.code,
      actorIp: readActorIp(request.headers),
    });

    return created({ isStaff: result.isStaff });
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
