import { InvalidAccountRequestError } from "@/features/account/errors";
import { accountPhoneSchema } from "@/features/account/schemas/account.schema";
import { updateAccountPhone } from "@/features/account/services/contact.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { isSameOriginRequest } from "@/lib/same-origin";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `PUT /api/account/phone` — hesabın cep telefonunu günceller
 * (teknik borç #80).
 *
 * `PUT`, `PATCH` DEĞİL: kaynak tek bir alandan ibaret ve istek onun TAMAMINI
 * yerine koyuyor. `PATCH` kısmi güncellemeyi ima eder ve burada kısmı yok.
 *
 * ⛔ NUMARA "DOĞRULANMAMIŞ" OLARAK YAZILIYOR — gerekçesi `contact.service.ts`
 * içinde uzun uzun yazılı (özet: telefon OTP'si bu projede simüle, kod
 * kullanıcının kendi e-postasına gidiyor, yani kanıt üretmiyor).
 *
 * ⛔ KULLANICI KİMLİĞİ GÖVDEDEN GELMİYOR, oturumdan okunuyor.
 */
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
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

    const parsed = accountPhoneSchema.safeParse(await readJsonBody(request));

    /**
     * Şema hatası kullanıcıya "numara biçimi" mesajını gösteriyor — burada
     * hesap sayımı riski YOK (giriş ve kimlik uçlarının aksine): kullanıcı
     * kendi hesabına yazıyor, dışarıya sızacak bir varlık bilgisi yok.
     */
    if (!parsed.success) {
      throw new InvalidAccountRequestError(parsed.error.issues[0]?.message);
    }

    await updateAccountPhone({
      userId: session.userId,
      phone: parsed.data.phone,
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
