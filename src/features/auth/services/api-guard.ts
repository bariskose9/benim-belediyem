import { messages } from "@/config/messages";
import type { SessionUserRow } from "@/features/auth/repositories/session.repository";
import { evaluateAccess, type AccessRequirement } from "@/features/auth/services/access-control";
import { getCurrentSession } from "@/features/auth/services/session-context";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

/**
 * Korumalı API uçlarının kapısı — `page-guard.ts`'in HTTP karşılığı.
 *
 * NEDEN AYRI DOSYA: `guardPage` reddedince `redirect()` çağırıyor, yani
 * tarayıcıyı giriş ekranına yolluyor. Bir API ucunda bu yanlış olurdu; `fetch`
 * ile çağıran istemci 307 yönlendirmesini izleyip giriş SAYFASININ HTML'ini
 * alır ve "JSON bekliyordum" hatasıyla patlardı. Uçlar durum kodu döner.
 *
 * KARARI VEREN AYNI SAF FONKSİYON (`evaluateAccess`). İki kapı, tek kural:
 * sayfada izin verilen bir işlem uçta reddedilemez, tersi de olamaz. Kuralın
 * ikinci bir kopyası olsaydı, biri gevşetildiğinde diğerinin unutulması an
 * meselesiydi.
 *
 * 03-api-guidelines.md'nin iki sorusu burada cevaplanıyor:
 *  1. Bu kişi giriş yapmış mı? → 401
 *  2. Bu işlemi yapma yetkisi var mı? → 403
 * Üçüncü soru olan "bu KAYIT bu kişiye mi ait" kapının işi değil; onu her
 * uç kendi sorgusunda `where: { userId }` ile cevaplıyor.
 */

const copy = messages.auth.access;

export async function requireAccess(requirement: AccessRequirement): Promise<SessionUserRow> {
  const session = await getCurrentSession();
  const decision = evaluateAccess(session, requirement);

  if (!session || decision === "sign_in_required") {
    throw new UnauthorizedError(copy.signInRequired.description);
  }

  if (decision === "identity_required") {
    throw new ForbiddenError(copy.identityRequired.description);
  }

  if (decision === "staff_only") {
    throw new ForbiddenError(copy.staffOnly.description);
  }

  return session;
}
