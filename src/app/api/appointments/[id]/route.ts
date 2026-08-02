import { InvalidAppointmentRequestError } from "@/features/appointments/errors";
import { appointmentIdSchema } from "@/features/appointments/schemas/appointment.schema";
import { cancelAppointment } from "@/features/appointments/services/appointment.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { fail, noContent } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * DELETE /api/appointments/{id} — randevuyu iptal eder (PRD §5.1).
 *
 * NEDEN `DELETE`, SATIR SİLİNMEDİĞİ HÂLDE: kullanıcı açısından kaynak
 * ortadan kalkıyor — randevusu artık yok ve saat başkalarına açılıyor.
 * Veritabanında satır `status = cancelled` olarak 3 yıl duruyor
 * (data-model.md saklama süreleri), ama bu bir SAKLAMA ayrıntısı ve
 * istemciyi ilgilendirmiyor. `PATCH ... {status: "cancelled"}` istemciye
 * durum makinesini dayatırdı; iptalden başka bir geçiş de yok.
 *
 * İPTAL DENETİM KAYDINA YAZILIR (CLAUDE.md §5.11 iptali açıkça sayıyor) —
 * kaydı servis atıyor.
 *
 * IDOR: sahiplik kontrolü servisin sorgusunda (`where: { id, userId }`).
 * Başkasının randevusu 404 alır, 403 değil — 403 kaydın var olduğunu
 * sızdırırdı.
 */
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAccess("staff");

    // Yol parametresi de bir GİRDİDİR ve doğrulanır (03-api-guidelines.md:
    // "body, query, params" — üçü de).
    const parsed = appointmentIdSchema.safeParse(await context.params);

    if (!parsed.success) throw new InvalidAppointmentRequestError();

    await cancelAppointment({
      userId: session.userId,
      appointmentId: parsed.data.id,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    // 204: gövdesi yok. İptal edilen randevunun ayrıntısını geri döndürmek,
    // istemcinin zaten bildiği bir kaydı ikinci kez taşımak olurdu.
    return noContent();
  } catch (error) {
    return fail(error);
  }
}
