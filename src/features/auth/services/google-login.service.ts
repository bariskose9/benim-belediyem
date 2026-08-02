import {
  createGoogleUser,
  findAccountForLinkingByEmail,
  findUserIdByGoogleSubject,
  linkGoogleAccount,
} from "@/features/auth/repositories/google-account.repository";
import {
  decideGoogleLink,
  type LinkBlockedReason,
} from "@/features/auth/services/google-account-linking";
import type { GoogleIdentity } from "@/features/auth/services/google-oauth.service";
import { issueSession } from "@/features/auth/services/session.service";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * Google ile girişin AKIŞ katmanı (PRD §5.0 · adım 4c).
 *
 * Üç parçayı birleştirir: kimliği veritabanındaki kayıtlarla eşleştirir,
 * birleştirme kararını uygular, gerekirse oturum açar.
 *
 * OTURUM ELLE AÇILIYOR — Auth.js'in kendi oturumu kullanılmıyor (ADR-005
 * güncelleme notu). Bunun bedava getirisi şu: Google ile giren kullanıcı da
 * "tüm cihazlardan çık", "şifre değişince oturum düşer" ve anında iptal
 * davranışını hiçbir ek kod yazılmadan alıyor. İki ayrı oturum mekanizması
 * olsaydı bu kuralların ikisini de ayrıca yazmak gerekirdi.
 *
 * KATMAN: HTTP, çerez ve durum kodu route'un işi; burada yalnızca iş kuralı var.
 */

export type GoogleLoginOutcome =
  /** Oturum açıldı — çağıran çerezi yazar. */
  | {
      kind: "session";
      token: string;
      expiresAt: Date;
      userId: string;
      /** Yeni hesap mı açıldı — ekran "hoş geldin" akışına yönlendirebilsin diye. */
      isNewUser: boolean;
    }
  /**
   * Aynı e-postalı hesap var ama otomatik birleştirme koşulları sağlanmadı.
   * OTURUM AÇILMADI — kullanıcının şifre veya OTP ile kanıt sunması gerekiyor.
   */
  | { kind: "verification_required"; reason: LinkBlockedReason };

export type GoogleLoginInput = {
  identity: GoogleIdentity;
  actorIp: string;
  now?: Date;
};

export async function completeGoogleLogin(input: GoogleLoginInput): Promise<GoogleLoginOutcome> {
  const { identity } = input;

  const [linkedUserId, existingAccount] = await Promise.all([
    findUserIdByGoogleSubject(identity.subject),
    findAccountForLinkingByEmail(identity.email),
  ]);

  const decision = decideGoogleLink({ identity, linkedUserId, existingAccount });

  switch (decision.kind) {
    case "login":
      return openSession(decision.userId, input, { isNewUser: false });

    case "link_and_login":
      await linkGoogleAccount(decision.userId, identity.subject);

      return openSession(decision.userId, input, { isNewUser: false });

    case "create_unverified":
      return registerAndOpenSession(input);

    /**
     * Engellenen durumda HİÇBİR ŞEY YAZILMIYOR: ne hesap açılıyor, ne bağlantı
     * kuruluyor, ne oturum. Kısmi bir yazma, bir sonraki denemede kuralın
     * atlanmasına yol açabilirdi.
     */
    case "verification_required":
      return { kind: "verification_required", reason: decision.reason };
  }
}

/** Mevcut hesap için oturum açar ve denetim kaydını yazar. */
async function openSession(
  userId: string,
  input: GoogleLoginInput,
  options: { isNewUser: boolean },
): Promise<GoogleLoginOutcome> {
  const now = input.now ?? new Date();
  const session = await issueSession(userId, now);

  await recordAuditLog({
    userId,
    action: "login",
    entityType: "session",
    entityId: session.sessionId,
    ipHash: hashActorIp(input.actorIp),
  });

  return {
    kind: "session",
    token: session.token,
    expiresAt: session.expiresAt,
    userId,
    isNewUser: options.isNewUser,
  };
}

/**
 * Yeni hesabı açar, ardından oturum açar.
 *
 * İki ayrı denetim kaydı yazılıyor (`register` ve `login`) çünkü bunlar farklı
 * olaylar: "hesap ne zaman açıldı" sorusu ile "bu hesapla ne zaman girildi"
 * sorusu ileride ayrı ayrı sorulacak.
 */
async function registerAndOpenSession(input: GoogleLoginInput): Promise<GoogleLoginOutcome> {
  const user = await createGoogleUser(input.identity);

  await recordAuditLog({
    userId: user.id,
    action: "register",
    entityType: "user",
    entityId: user.id,
    ipHash: hashActorIp(input.actorIp),
  });

  return openSession(user.id, input, { isNewUser: true });
}
