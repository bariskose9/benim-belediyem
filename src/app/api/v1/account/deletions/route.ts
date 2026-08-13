import { InvalidAccountRequestError } from "@/features/account/errors";
import { accountDeletionSchema } from "@/features/account/schemas/account.schema";
import { deleteAccount } from "@/features/account/services/account-deletion.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { clearSessionCookie } from "@/features/auth/services/session-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `POST /api/v1/account/deletions` — kullanıcı kendi hesabını siler
 * (PRD §5.11 · KVKK Yönetmeliği m.12).
 *
 * ═══ NEDEN `DELETE /api/v1/account` DEĞİL ═══
 * İki sebep. Birincisi teknik: istek bir GÖVDE taşıyor (şifre yeniden
 * doğrulaması) ve DELETE gövdesi araya giren vekiller tarafından
 * düşürülebiliyor — güvenlik kapısının sessizce kaybolması demek olurdu.
 * İkincisi anlamsal: yapılan şey satırı yok etmek değil, bir SİLME TALEBİ
 * oluşturup anında yerine getirmek. Kaynak adı bu yüzden çoğul ve olayın
 * kendisini adlandırıyor (03-api-guidelines.md: fiil yok, kaynak var).
 *
 * ⛔ KULLANICI KİMLİĞİ GÖVDEDEN GELMİYOR, oturumdan okunuyor: "başkasının
 * hesabını sil" diyebileceği bir alan yok (IDOR koruması tasarım gereği).
 *
 * ⛔ KADEME `authenticated`: kimliği doğrulanmamış bir kullanıcı da hesabını
 * silebilmeli. `identity_verified` istenseydi, Google ile açılmış ve hiç
 * doğrulanmamış hesaplar hiç silinemezdi — KVKK m.11'in tanıdığı hakkı bir
 * erişim kademesiyle iptal etmek olurdu.
 *
 * ÇEREZ BURADA SİLİNİYOR, SERVİSTE DEĞİL: HTTP katmanının işi
 * (01-architecture.md). Oturum SATIRLARI zaten transaction içinde silindi;
 * bu satır tarayıcıdaki ölü çerezi de temizliyor ki kullanıcı bir sonraki
 * istekte "geçersiz oturum" yoluna hiç girmesin.
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

    const parsed = accountDeletionSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidAccountRequestError();

    await deleteAccount({
      userId: session.userId,
      password: parsed.data.password,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    await clearSessionCookie();

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
