import { redirect } from "next/navigation";

import type { SessionUserRow } from "@/features/auth/repositories/session.repository";
import { evaluateAccess, type AccessRequirement } from "@/features/auth/services/access-control";
import { getCurrentSession } from "@/features/auth/services/session-context";

/**
 * Korumalı sayfaların kapısı.
 *
 * Kapı SUNUCUDA ve SAYFANIN İÇİNDE. Menüden bağlantıyı gizlemek koruma
 * değildir (05-auth-security.md); adresi doğrudan yazan kullanıcı da aynı
 * kontrolden geçer.
 *
 * NEDEN `middleware.ts` KULLANILMIYOR: Next.js ara katmanı varsayılan olarak
 * Edge çalışma zamanında koşuyor; oturum kontrolü ise Prisma + `pg` sürücü
 * adaptörü gerektiriyor (ADR-008) ve bu ikisi Edge'de çalışmıyor. Kapıyı
 * sayfada tutmak ayrıca "hangi sayfa neyi istiyor" sorusunun cevabını
 * sayfanın kendisinde bırakıyor — merkezî bir yol listesi zamanla koddan
 * kopan bir kopyaya dönüşür.
 */

export type PageGuardResult =
  | { allowed: true; session: SessionUserRow }
  /**
   * Reddedildi ama SAYFA YİNE DE RENDER EDİLİR: kullanıcı eksiğinin ne
   * olduğunu görmeli. Yönlendirme yalnızca "hiç giriş yapmamış" durumunda var.
   */
  | { allowed: false; decision: "identity_required" | "staff_only" };

export async function guardPage(
  requirement: AccessRequirement,
  /** Giriş sonrası geri dönülecek adres — yalnızca kendi yollarımız. */
  currentPath: string,
): Promise<PageGuardResult> {
  const session = await getCurrentSession();
  const decision = evaluateAccess(session, requirement);

  if (!session || decision === "sign_in_required") {
    // `redirect()` bir istisna fırlatarak akışı keser; buradan sonrası çalışmaz.
    redirect(`/giris?durum=giris-gerekli&donus=${encodeURIComponent(currentPath)}`);
  }

  if (decision === "allowed") return { allowed: true, session };

  return { allowed: false, decision };
}
