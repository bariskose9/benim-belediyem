import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidSeatRequestError } from "@/features/events/errors";
import { reservationIdSchema } from "@/features/events/schemas/seat-hold.schema";
import { releaseSeat } from "@/features/events/services/seat-hold.service";
import { fail, noContent } from "@/lib/http";

/**
 * DELETE /api/v1/events/[eventId]/seat-holds/[reservationId] — kilidi bırakır ve
 * sepet satırını kaldırır (PRD §5.2).
 *
 * SAHİPLİK SUNUCUDA: servis silme sorgusuna `user_id` koşulunu koyuyor, yani
 * başkasının kilidi hiç etkilenmiyor ve yanıt "bulunamadı" oluyor. 403 dönmek
 * "böyle bir kilit var ama senin değil" bilgisini sızdırırdı
 * (05-auth-security.md → IDOR). Randevu iptalindeki desenin aynısı.
 *
 * `eventId` adreste DURUYOR ama sorguda KULLANILMIYOR: rezervasyon kimliği
 * zaten tek başına benzersiz. Adreste durmasının sebebi kaynağın hiyerarşisi —
 * kilit bir etkinliğin altında yaşıyor ve adres onu doğru anlatmalı.
 */
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ reservationId: string }> },
) {
  try {
    const session = await requireAccess("authenticated");

    const reservationId = reservationIdSchema.safeParse((await context.params).reservationId);

    if (!reservationId.success) throw new InvalidSeatRequestError();

    await releaseSeat({
      userId: session.userId,
      reservationId: reservationId.data,
      now: new Date(),
    });

    return noContent();
  } catch (error) {
    return fail(error);
  }
}
