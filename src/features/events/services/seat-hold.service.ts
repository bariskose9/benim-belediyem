import {
  CART_MAX_LINES,
  SEAT_HOLD_DURATION_MS,
  SEAT_HOLD_MAX_PER_USER,
  SEAT_HOLD_RATE_LIMIT_MAX,
  SEAT_HOLD_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import { CartTooLargeError } from "@/features/cart/errors";
import {
  addOrIncrementItem,
  countCartLines,
  findActiveCart,
  findOrCreateActiveCart,
  removeItemByRef,
} from "@/features/cart/repositories/cart.repository";
import {
  EventNotFoundError,
  EventStartedError,
  SeatHoldNotFoundError,
  SeatHoldRateLimitedError,
  SeatNotFoundError,
  SeatTakenError,
  TooManySeatHoldsError,
} from "@/features/events/errors";
import {
  countActiveHolds,
  findEventForBooking,
  findSeatById,
} from "@/features/events/repositories/event.repository";
import {
  acquireSeatHold,
  findSeatReservation,
  releaseSeatHold,
} from "@/features/events/repositories/seat-reservation.repository";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";
import { toKurus } from "@/lib/money";
import { consumeRateLimit, hashActorIp, rateLimitKey } from "@/lib/rate-limit";

/**
 * Koltuk kilidinin İŞ KURALLARI (PRD §5.2 · ADR-007) — adım 11'in kalbi.
 *
 * ═══ KİLİT VE SEPET SATIRI AYRILMAZ ═══
 * Koltuk seçmek TEK bir kullanıcı eylemi: "bu koltuğu bana ayır". Karşılığında
 * iki satır yazılıyor (rezervasyon + sepet satırı) ve ikisi TEK TRANSACTION'da.
 * Ayrı yazılsalardı arada bir çökme, kimsenin göremediği ama koltuğu 10 dakika
 * kapatan bir kilit bırakırdı.
 *
 * ═══ BİLET SEPETE GENEL SEPET UCUNDAN EKLENEMEZ ═══
 * `addCartItemSchema` `event` türünü KABUL ETMİYOR. Sebep güvenlik: istemci
 * sepete rezervasyon kimliği yazabilseydi, başkasının kilidini kendi sepetinde
 * gösterebilir (hangi koltuğu tuttuğunu öğrenebilir) olurdu. Bilet sepete
 * yalnızca BURADAN, sunucunun kendi ürettiği kimlikle giriyor.
 *
 * "ŞİMDİ" DIŞARIDAN GELİR: bir isteğin tüm kararları aynı ana göre verilir ve
 * testler sahte saatle çalışabilir (06-testing.md · ADR-007 "süre dolumu testi
 * zorunludur").
 */

export type HoldSeatInput = {
  /** Oturumdan gelir. İstemcinin gönderdiği bir değer ASLA buraya ulaşmaz. */
  userId: string;
  eventId: string;
  seatId: string;
  actorIp: string;
  now: Date;
};

export type HeldSeat = {
  reservationId: string;
  eventName: string;
  block: string;
  rowLabel: string;
  seatNumber: number;
  holdExpiresAt: Date;
};

/**
 * Koltuğu 10 dakikalığına kilitler ve sepete ekler.
 *
 * KONTROL SIRASI TESADÜF DEĞİL — randevu servisindeki mantığın aynısı:
 *  1. Hız sınırı   → en ucuz kapı, veritabanı işlemi hiç açılmadan
 *  2. Etkinlik     → yoksa ya da başladıysa devam etmenin anlamı yok
 *  3. Koltuk       → istemciden gelen kimlik bu salona ait mi
 *  4. Kilit sayısı → kullanıcı bütçesi; satır kilitlenmeden ÖNCE
 *  5. Kilit + sepet→ satır kilidi burada alınır ve işlem hemen biter
 *
 * Rezervasyon en sona bırakıldı ki `seat_reservations` satırı mümkün olan en
 * kısa süre kilitli kalsın.
 */
export async function holdSeat(input: HoldSeatInput): Promise<HeldSeat> {
  await enforceWriteBudget(input.userId, input.now);

  const event = await findEventForBooking(input.eventId);

  if (!event) throw new EventNotFoundError();
  if (event.startsAt.getTime() <= input.now.getTime()) throw new EventStartedError();

  const seat = await findSeatById(input.seatId);

  /**
   * Koltuk BAŞKA BİR SALONA aitse "bulunamadı" deniyor: istemciden gelen kimlik
   * doğrulanmasaydı, o koltuk için bu etkinliğe rezervasyon yazılabilir ve
   * kayıt tutarlı görünürken salon planında hiç görünmezdi.
   */
  if (!seat || seat.venueId !== event.venueId) throw new SeatNotFoundError();

  /**
   * Kullanıcının kendi kilidine ikinci kez basması HATA DEĞİL: aynı sonucu
   * döner ve SÜREYİ UZATMAZ (PRD §5.2 "sepette geçen süre kilidi uzatmaz").
   *
   * Bu okuma bir YARIŞ KORUMASI DEĞİL, yalnızca kolaylık. Koruma aşağıdaki
   * tek ifadeli yazmada; buradaki okuma silinse de doğruluk bozulmaz, sadece
   * kullanıcı kendi koltuğu için "bu koltuk alındı" mesajı görürdü.
   */
  const existing = await findSeatReservation({ eventId: event.id, seatId: seat.id });

  if (
    existing &&
    existing.userId === input.userId &&
    existing.holdExpiresAt !== null &&
    existing.holdExpiresAt.getTime() > input.now.getTime()
  ) {
    return {
      reservationId: existing.id,
      eventName: event.name,
      block: seat.block,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      holdExpiresAt: existing.holdExpiresAt,
    };
  }

  if (
    (await countActiveHolds({ userId: input.userId, now: input.now })) >= SEAT_HOLD_MAX_PER_USER
  ) {
    throw new TooManySeatHoldsError();
  }

  const holdExpiresAt = new Date(input.now.getTime() + SEAT_HOLD_DURATION_MS);

  const reservation = await prisma.$transaction(async (tx) => {
    /**
     * PRD §5.2 BİRİNCİ KABUL KRİTERİ BURADA KARŞILANIYOR.
     *
     * `acquireSeatHold` iki tek-ifadeli yazma deniyor (süresi dolmuş kilidi
     * devral / hiç yoksa ekle) ve ikisi de tutmazsa `null` dönüyor. İki
     * kullanıcı aynı anda talip olursa biri buradan `null` alır → 409.
     */
    const held = await acquireSeatHold(
      {
        eventId: event.id,
        seatId: seat.id,
        userId: input.userId,
        holdExpiresAt,
        now: input.now,
      },
      tx,
    );

    if (!held) throw new SeatTakenError();

    const cart = await findOrCreateActiveCart({ userId: input.userId }, tx);

    if ((await countCartLines(cart.id, tx)) >= CART_MAX_LINES) throw new CartTooLargeError();

    /**
     * Sepet satırı REZERVASYONA bağlanıyor, etkinliğe değil (teknik borç #40).
     * Adet her zaman 1: bir koltuk bir kişiliktir ve "2 adet A-3-5 koltuğu"
     * diye bir şey yok.
     */
    await addOrIncrementItem(
      {
        cartId: cart.id,
        itemType: "event",
        refId: held.id,
        quantity: 1,
        unitPriceKurus: toKurus(event.basePrice),
      },
      tx,
    );

    return held;
  });

  /**
   * Denetim kaydı TRANSACTION'IN DIŞINDA (randevu ve giriş servisleriyle aynı
   * desen): denetim tablosuna yazma hatası kullanıcının koltuğunu geri almamalı.
   */
  await recordAuditLog({
    userId: input.userId,
    action: "seat_reserve",
    entityType: "seat_reservation",
    entityId: reservation.id,
    ipHash: hashActorIp(input.actorIp),
  });

  return {
    reservationId: reservation.id,
    eventName: event.name,
    block: seat.block,
    rowLabel: seat.rowLabel,
    seatNumber: seat.seatNumber,
    holdExpiresAt,
  };
}

export type ReleaseSeatInput = {
  userId: string;
  reservationId: string;
  now: Date;
};

/**
 * Kilidi bırakır ve sepet satırını kaldırır.
 *
 * SATILMIŞ BİLET BURADAN GERİ ALINAMAZ: `releaseSeatHold` yalnızca
 * `status = held` satırı siliyor. PRD §5.5 "etkinlik bileti iptal edilemez"
 * kuralının veritabanı seviyesindeki karşılığı bu — düğmeyi gizlemek değil.
 */
export async function releaseSeat(input: ReleaseSeatInput): Promise<void> {
  await enforceWriteBudget(input.userId, input.now);

  await prisma.$transaction(async (tx) => {
    const released = await releaseSeatHold(
      { reservationId: input.reservationId, userId: input.userId },
      tx,
    );

    if (!released) throw new SeatHoldNotFoundError();

    const cart = await findActiveCart({ userId: input.userId }, tx);

    // Sepet satırı yoksa da sorun değil: kilit bırakıldı, sonuç aynı.
    if (cart) {
      await removeItemByRef({ cartId: cart.id, itemType: "event", refId: input.reservationId }, tx);
    }
  });
}

/**
 * Yazma bütçesi — kullanıcı başına (CLAUDE.md §5.5).
 *
 * Kilitleme ve bırakma AYNI sayacı paylaşıyor: ayrı bütçe verilseydi
 * "kilitle-bırak-kilitle" döngüsüyle sınır iki katına çıkarılabilirdi
 * (randevu modülündeki gerekçenin aynısı).
 */
async function enforceWriteBudget(userId: string, now: Date): Promise<void> {
  const decision = await consumeRateLimit({
    key: rateLimitKey("seat_hold", "user", userId),
    limit: SEAT_HOLD_RATE_LIMIT_MAX,
    windowMs: SEAT_HOLD_RATE_LIMIT_WINDOW_MS,
    now,
  });

  if (!decision.allowed) throw new SeatHoldRateLimitedError();
}
