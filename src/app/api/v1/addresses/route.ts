import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidProfileRequestError } from "@/features/profile/errors";
import { addressInputSchema } from "@/features/profile/schemas/profile.schema";
import { createUserAddress } from "@/features/profile/services/address.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `POST /api/v1/addresses` — teslimat adresi ekler (PRD §5.0 · adım 15).
 *
 * ⛔ `userId` GÖVDEDEN OKUNMAZ, oturumdan gelir. Şemada böyle bir alan yok,
 * dolayısıyla istemci gönderse bile sonuca taşınamaz (05-auth-security.md).
 *
 * ⛔ `GET` UCU BİLEREK YOK. Adres listesini sayfa SUNUCUDA okuyor
 * (`listUserAddresses`), yani listeyi HTTP üzerinden döndüren bir uca ihtiyaç
 * yok. Açık duran her uç bakılması, test edilmesi ve korunması gereken bir
 * yüzeydir; kimsenin çağırmadığı bir uç bedava değildir (CLAUDE.md §5.2 YAGNI).
 * Mobil uygulama (adım 19) gerektirdiğinde kendi testiyle birlikte eklenir.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireAccess("authenticated");

    const parsed = addressInputSchema.safeParse(await readJsonBody(request));

    // Zod'un alan yolu istemciye GİTMİYOR; kullanıcı tek ve anlaşılır bir
    // Türkçe mesaj görüyor (03-api-guidelines.md).
    if (!parsed.success) throw new InvalidProfileRequestError();

    const address = await createUserAddress({
      userId: session.userId,
      payload: parsed.data,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({ id: address.id });
  } catch (error) {
    return fail(error);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
