import { logout } from "@/features/auth/services/login.service";
import {
  clearSessionCookie,
  getCurrentSession,
  readSessionToken,
} from "@/features/auth/services/session-context";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * DELETE /api/v1/sessions/current — çıkış.
 *
 * `current` bilinçli: istemci silmek istediği oturumun kimliğini VERMEZ,
 * yalnızca kendi çerezindekini silebilir. Adresin içinde bir oturum kimliği
 * olsaydı, başkasının oturumunu düşürmeyi denemek için bir yüzey açılırdı
 * (IDOR — 05-auth-security.md).
 *
 * OTURUM AÇIK OLMASA DA 204 DÖNER. "Zaten çıkmışsınız" hatası kullanıcıya
 * hiçbir şey kazandırmaz ve geçerli jetonu geçersizden ayırt eden bir yanıt
 * üretirdi. Çerez her hâlükârda silinir.
 */
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const [token, session] = await Promise.all([readSessionToken(), getCurrentSession()]);

    await logout({
      token,
      userId: session?.userId,
      sessionId: session?.sessionId,
      actorIp: readActorIp(request.headers),
    });

    await clearSessionCookie();

    return noContent();
  } catch (error) {
    return fail(error);
  }
}
