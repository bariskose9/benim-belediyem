import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidProfileRequestError } from "@/features/profile/errors";
import { savedCardIdSchema } from "@/features/profile/schemas/profile.schema";
import { deleteUserSavedCard } from "@/features/profile/services/saved-card.service";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * `DELETE /api/saved-cards/{savedCardId}` — kayıtlı kartı kaldırır
 * (teknik borç #41).
 *
 * ⛔ BU KAYNAK İÇİN `POST` VE `PATCH` YOK ve olmayacak. Kart yalnızca gerçek
 * bir ödeme sırasında, sahte sağlayıcının doğrulamasından geçtikten sonra
 * kaydediliyor (PRD §6.2). Profilden kart eklemek, doğrulanmamış bir kartı
 * listeye koymak olurdu; kartı düzenlemek ise "başka bir kart" demek.
 *
 * Satır silinmiyor, `deleted_at` damgalanıyor: `payments` ve `memberships`
 * bu karta bağlı ve mali kayıt kaybolamaz.
 */
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ savedCardId: string }> },
) {
  try {
    const session = await requireAccess("authenticated");

    // Yol parametresi de bir GİRDİDİR ve doğrulanır (03-api-guidelines.md).
    const path = savedCardIdSchema.safeParse(await context.params);

    if (!path.success) throw new InvalidProfileRequestError();

    await deleteUserSavedCard({
      userId: session.userId,
      savedCardId: path.data.savedCardId,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return noContent();
  } catch (error) {
    return fail(error);
  }
}
