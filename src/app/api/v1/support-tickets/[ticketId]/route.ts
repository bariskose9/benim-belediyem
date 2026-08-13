import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidSupportTicketError } from "@/features/support/errors";
import { supportTicketIdSchema } from "@/features/support/schemas/support-ticket.schema";
import { closeSupportTicket } from "@/features/support/services/support-ticket.service";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * DELETE /api/v1/support-tickets/{ticketId} — talebi KAPATIR (PRD §5.7).
 *
 * NEDEN `DELETE`, SATIR SİLİNMEDİĞİ HÂLDE: sipariş iptalindeki gerekçenin
 * aynısı — kullanıcı açısından talep kapanıyor, kayıt veritabanında
 * `status = closed` olarak saklanmaya devam ediyor (data-model.md: 3 yıl).
 * `PATCH ... {status: "closed"}` istemciye durum makinesini dayatırdı ve
 * istemcinin verebileceği tek geçiş zaten bu — PRD §5.7 "Kapandı durumunu
 * yalnızca talebi açan üye verebilir" diyor.
 *
 * İKİ KABUL KRİTERİ BU UCUN ARKASINDA:
 *  · Başkasının talebi → 404 (varlığı bile sızdırılmaz, `errors.ts`)
 *  · Zaten kapalı talep → 409
 *
 * Kararı SERVİS veriyor, bu dosya değil.
 */
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ ticketId: string }> }) {
  try {
    const session = await requireAccess("authenticated");

    // Yol parametresi de bir GİRDİDİR ve doğrulanır (03-api-guidelines.md).
    const parsed = supportTicketIdSchema.safeParse(await context.params);

    if (!parsed.success) throw new InvalidSupportTicketError();

    await closeSupportTicket({
      userId: session.userId,
      ticketId: parsed.data.ticketId,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return noContent();
  } catch (error) {
    return fail(error);
  }
}
