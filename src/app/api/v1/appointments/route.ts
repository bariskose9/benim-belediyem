import { InvalidAppointmentRequestError } from "@/features/appointments/errors";
import { createAppointmentSchema } from "@/features/appointments/schemas/appointment.schema";
import { bookAppointment } from "@/features/appointments/services/appointment.service";
import { requireAccess } from "@/features/auth/services/api-guard";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/v1/appointments — hastane randevusu oluşturur (PRD §5.1).
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ (03-api-guidelines.md): "randevu almak" bir
 * randevu KAYNAĞI oluşturmaktır, `/api/bookAppointment` değil.
 *
 * BU DOSYADA İŞ MANTIĞI YOKTUR ve bu bilinçli: kapıyı geçirir, girdiyi
 * doğrular, servisi çağırır, hatayı tek tip zarfa çevirir. PRD'nin dört
 * kuralı `appointment.service.ts` içinde — böylece kural tek yerde durur ve
 * ileride ikinci bir çağıran (planlı görev, mobil uygulama) eklendiğinde
 * kuralın etrafından dolaşılamaz.
 *
 * `userId` GÖVDEDEN OKUNMAZ. Oturumdan geliyor; istemci gönderse bile Zod
 * şeması onu sonuca hiç taşımıyor (data-model.md → "İstemciden gelen userId
 * reddedilir").
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Kapı ÖNCE: yetkisiz istek gövde ayrıştırmasına bile girmesin.
    const session = await requireAccess("staff");

    const parsed = createAppointmentSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) throw new InvalidAppointmentRequestError();

    const result = await bookAppointment({
      userId: session.userId,
      slotId: parsed.data.slotId,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({
      id: result.appointmentId,
      startsAt: result.startsAt.toISOString(),
    });
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
