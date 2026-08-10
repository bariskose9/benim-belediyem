import { InvalidAccountRequestError } from "@/features/account/errors";
import { identityUnlinkSchema } from "@/features/account/schemas/account.schema";
import { unlinkIdentity } from "@/features/account/services/identity-unlink.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { isSameOriginRequest } from "@/lib/same-origin";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `POST /api/account/identity-unlinks` — hesaba bağlı KPS kimliğini çözer
 * (ADR-017 ilke 3: "her bağlama geri alınabilir olmalıdır").
 *
 * ⛔ OTURUM DÜŞÜRÜLMÜYOR ve bu bilinçli. Kimlik çözülünce hesap
 * `unverified` kademesine iniyor ve personel yetkisi kalkıyor, ama oturumun
 * KENDİSİ geçerli — kullanıcı hâlâ o hesabın sahibi. Oturum satırında
 * kademe saklanmıyor; `getCurrentSession` her istekte kullanıcıyı okuyor
 * (ADR-005), yani yeni kademe bir sonraki istekte kendiliğinden geçerli
 * oluyor. Oturumu düşürmek, kullanıcıyı Google ile yeniden giriş yapmaya
 * zorlamaktan başka bir işe yaramazdı.
 *
 * ⛔ KADEME `authenticated`, `identity_verified` DEĞİL: kademe kontrolü
 * `evaluateAccess`'in işi ama buradaki asıl kural "kimliği bağlı mı" ve onu
 * servis kendi hata tipiyle (`IdentityNotLinkedError`) cevaplıyor. Kapıya
 * `identity_verified` yazmak aynı kuralı iki yere kopyalamak olurdu.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    /**
     * ⛔ CSRF KAPISI — geri alınamaz bir işlem için ikinci katman.
     *
     * Asıl koruma çerezin kendisinde (`sameSite: lax`, başka siteden gelen
     * POST'ta gönderilmiyor). Bu kapı ikinci katman ve JSON gövdeli uçlarda
     * gerçek bir açığı kapatıyor: `request.json()` `content-type` başlığına
     * BAKMIYOR, yani `enctype="text/plain"` ile gönderilmiş bir HTML formunun
     * gövdesi de geçerli JSON olarak ayrıştırılır. Bu uçtaki işlem GERİ
     * ALINAMAZ olduğu için tek katmanla yetinilmedi.
     */
    if (!isSameOriginRequest(request.headers)) throw new InvalidAccountRequestError();

    const parsed = identityUnlinkSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidAccountRequestError();

    await unlinkIdentity({
      userId: session.userId,
      password: parsed.data.password,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return noContent();
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
