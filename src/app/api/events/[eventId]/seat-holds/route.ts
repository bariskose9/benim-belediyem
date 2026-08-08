import { requireAccess } from "@/features/auth/services/api-guard";
import { InvalidSeatRequestError } from "@/features/events/errors";
import { eventIdSchema, holdSeatSchema } from "@/features/events/schemas/seat-hold.schema";
import { holdSeat } from "@/features/events/services/seat-hold.service";
import { created, fail } from "@/lib/http";
import { readActorIp } from "@/lib/rate-limit";

/**
 * POST /api/events/[eventId]/seat-holds — koltuğu 10 dakikalığına kilitler
 * ve sepete ekler (PRD §5.2).
 *
 * KAYNAK ADI ÇOĞUL VE FİİLSİZ: "koltuk tutmak" bir KİLİT kaynağı oluşturmaktır,
 * `/api/holdSeat` değil (03-api-guidelines.md). Kilit etkinliğin altında çünkü
 * aynı koltuk farklı etkinliklerde ayrı ayrı satılıyor — kilit koltuğun değil,
 * "etkinlik + koltuk" çiftinin.
 *
 * GİRİŞ ZORUNLU ve bu bir tercih değil, veri modelinin sonucu:
 * `seat_reservations.user_id` zorunlu, yani ziyaretçi adına kilit yazılamaz.
 * Etkinlik listesi ve salon planı ziyaretçiye AÇIK kalıyor — kapı yalnızca
 * koltuğa basıldığında devreye giriyor.
 *
 * KİMLİK DOĞRULAMASI YETERLİ, KPS DOĞRULAMASI GEREKMİYOR: PRD §5.0 erişim
 * tablosunda bilet alma doğrulanmamış hesaba da açık (hastane ve spor salonu
 * gibi personele özel değil).
 *
 * BU DOSYADA İŞ MANTIĞI YOK: kapıyı geçirir, girdiyi doğrular, servisi çağırır,
 * hatayı tek tip zarfa çevirir. 10 dakikalık kilit ve yarış koruması
 * `seat-hold.service.ts` içinde.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  try {
    // Kapı ÖNCE: yetkisiz istek gövde ayrıştırmasına bile girmesin.
    const session = await requireAccess("authenticated");

    const eventId = eventIdSchema.safeParse((await context.params).eventId);
    const parsed = holdSeatSchema.safeParse(await readJsonBody(request));

    if (!eventId.success || !parsed.success) throw new InvalidSeatRequestError();

    const held = await holdSeat({
      userId: session.userId,
      eventId: eventId.data,
      seatId: parsed.data.seatId,
      actorIp: readActorIp(request.headers),
      now: new Date(),
    });

    return created({
      id: held.reservationId,
      block: held.block,
      rowLabel: held.rowLabel,
      seatNumber: held.seatNumber,
      holdExpiresAt: held.holdExpiresAt.toISOString(),
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
