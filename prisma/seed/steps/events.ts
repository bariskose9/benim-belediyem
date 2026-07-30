import { EVENTS, VENUES } from "../data/catalog.js";
import { createRng } from "../lib/rng.js";
import {
  addDays,
  insertInChunks,
  priceInBand,
  seedId,
  turkeyTimeToUtc,
} from "../lib/seed-helpers.js";
import type { SeedContext, SeededUser } from "../types.js";

/**
 * Etkinlik, mekân, koltuk düzeni ve satılmış biletler
 * (fake-data-guide.md "Etkinlik").
 *
 * Her etkinlikte koltukların %20-40'ı SATILMIŞ olarak tohumlanır. Satılmış her
 * koltuğun gerçek bir sahibi vardır (arka plan üyeleri); sahipsiz "dolu" işareti
 * bırakılmaz, çünkü `SeatReservation.userId` zorunludur ve sahipsiz kayıt
 * "randevu/bilet iptal edilince ne olacak" kurallarını test edilemez kılardı.
 *
 * Buradaki rezervasyonların hepsi `sold`; `held` (10 dakikalık kilit) durumu
 * gerçek kullanıcı akışında oluşur ve süre dolumu okuma anında uygulanır (ADR-007).
 */

/** Etkinlikler bugünden itibaren bu aralığa yayılır. */
const EVENT_WINDOW_DAYS = 60;
const EVENT_START_HOUR = 20;

const SOLD_RATIO = { min: 0.2, max: 0.4 } as const;

export interface EventSeedResult {
  readonly venueCount: number;
  readonly seatCount: number;
  readonly eventCount: number;
  readonly reservationCount: number;
}

export async function seedEvents(
  context: SeedContext,
  users: readonly SeededUser[],
): Promise<EventSeedResult> {
  const rng = createRng(20260737);

  const venues = VENUES.map((venue, order) => ({
    id: seedId("venue", order + 1),
    name: venue.name,
    address: venue.address,
    isSeedData: true,
  }));

  await context.prisma.venue.createMany({ data: venues, skipDuplicates: true });

  const seats = VENUES.flatMap((venue, venueOrder) =>
    venue.blocks.flatMap((block) =>
      Array.from({ length: venue.rowCount }, (_unusedRow, rowIndex) =>
        Array.from({ length: venue.seatsPerRow }, (_unusedSeat, seatIndex) => ({
          id: seedId("seat", venueOrder + 1, `${block}${rowIndex + 1}-${seatIndex + 1}`),
          venueId: venues[venueOrder].id,
          block,
          rowLabel: String(rowIndex + 1),
          seatNumber: seatIndex + 1,
          isSeedData: true,
        })),
      ).flat(),
    ),
  );

  await insertInChunks(seats, 1000, (chunk) =>
    context.prisma.venueSeat.createMany({ data: chunk, skipDuplicates: true }),
  );

  const seatsByVenue = new Map<string, typeof seats>();
  for (const seat of seats) {
    const bucket = seatsByVenue.get(seat.venueId) ?? [];

    bucket.push(seat);
    seatsByVenue.set(seat.venueId, bucket);
  }

  const events = EVENTS.map((event, order) => {
    const venue = venues[order % venues.length];

    return {
      id: seedId("event", order + 1),
      venueId: venue.id,
      name: event.name,
      category: event.category,
      performer: event.performer,
      // Etkinlikler önümüzdeki iki aya yayılır; saat Türkiye saatiyle 20:00.
      startsAt: turkeyTimeToUtc(
        addDays(context.today, rng.int(3, EVENT_WINDOW_DAYS)),
        EVENT_START_HOUR,
        0,
      ),
      basePrice: priceInBand(rng, event.band.minLira, event.band.maxLira),
      isSeedData: true,
    };
  });

  await context.prisma.event.createMany({ data: events, skipDuplicates: true });

  const reservationCount = await seedReservations(context, { rng, events, seatsByVenue, users });

  context.log(
    `Etkinlik: ${venues.length} mekân · ${seats.length} koltuk · ${events.length} etkinlik · ` +
      `${reservationCount} satılmış bilet`,
  );

  return {
    venueCount: venues.length,
    seatCount: seats.length,
    eventCount: events.length,
    reservationCount,
  };
}

async function seedReservations(
  context: SeedContext,
  input: {
    rng: ReturnType<typeof createRng>;
    events: readonly { id: string; venueId: string }[];
    seatsByVenue: Map<string, { id: string }[]>;
    users: readonly SeededUser[];
  },
): Promise<number> {
  const { rng, events, seatsByVenue, users } = input;

  if (users.length === 0) return 0;

  let reservationOrder = 0;
  const rows = events.flatMap((event, eventIndex) => {
    const venueSeats = seatsByVenue.get(event.venueId) ?? [];
    const soldCount = Math.round(
      venueSeats.length * (SOLD_RATIO.min + rng.next() * (SOLD_RATIO.max - SOLD_RATIO.min)),
    );

    return rng
      .shuffled(venueSeats)
      .slice(0, soldCount)
      .map((seat) => {
        reservationOrder += 1;

        return {
          id: seedId("reservation", reservationOrder),
          eventId: event.id,
          seatId: seat.id,
          // Biletler tüm üye havuzuna dağıtılır; kimse tek başına yüzlerce bilet almaz.
          userId: users[(reservationOrder + eventIndex) % users.length].id,
          status: "sold" as const,
          holdExpiresAt: null,
          isSeedData: true,
        };
      });
  });

  await insertInChunks(rows, 1000, (chunk) =>
    context.prisma.seatReservation.createMany({ data: chunk, skipDuplicates: true }),
  );

  return rows.length;
}
