import { findIdsMatchingQuery } from "@/features/catalog/repositories/catalog-search.repository";
import type { CatalogFilterOption } from "@/features/catalog/types";
import type {
  EventDetail,
  EventListItem,
  SeatBlock,
  SeatState,
  SeatView,
} from "@/features/events/types";
import type { Prisma } from "@/generated/prisma/client";
import type { EventCategory } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { toKurus } from "@/lib/money";
import { normalizeSearchQuery } from "@/lib/search-text";

/**
 * Etkinlik kataloğunun OKUMA tarafı (PRD §5.2).
 *
 * ═══ ADR-007 BU DOSYADA YAŞIYOR ═══
 * "Dolu koltuk" sorusunun cevabı iki satırdan oluşuyor: satılmış olanlar ve
 * SÜRESİ HENÜZ DOLMAMIŞ kilitler. Süresi geçmiş bir kilit sorgulandığı anda
 * yok sayılıyor, yani temizlik görevi hiç çalışmasa bile koltuk yeniden
 * satılabilir görünüyor (PRD §5.2 ikinci kabul kriteri).
 *
 * Bu koşul BU DOSYADAKİ HER SORGUDA var. Unutulduğu tek bir yer, süresi dolmuş
 * bir kilidin koltuğu sonsuza kadar kapatması demek olurdu — ADR-007'nin
 * "bedel" başlığı tam olarak bunu söylüyor.
 *
 * BU DOSYA YALNIZCA OKUR. Kilit koyma ve satışa çevirme yazma katmanında
 * (`seat-reservation.repository.ts`) ve iş kuralları servis katmanında.
 */

type Client = Prisma.TransactionClient | typeof prisma;

/** Tek listede en fazla kaç etkinlik — sayfalama yok (teknik borç #43 ile aynı gerekçe). */
const EVENT_LIST_LIMIT = 200;

/**
 * Koltuğu KAPATAN rezervasyonların koşulu.
 *
 * Tek yerde çünkü liste, detay ve müsaitlik sorgularının üçü de aynı tanımı
 * kullanmak zorunda: biri "süresi dolmuş kilit de doludur" derse ekranda
 * görünen boş koltuk sayısıyla gerçekte satılabilen koltuk sayısı ayrışırdı.
 */
function blockingReservationWhere(now: Date): Prisma.SeatReservationWhereInput {
  return {
    OR: [{ status: "sold" }, { status: "held", holdExpiresAt: { gt: now } }],
  };
}

/**
 * Süzgeçli etkinlik listesi.
 *
 * GEÇMİŞ ETKİNLİK LİSTELENMİYOR: tükenmiş market ürünü listede kalıyor çünkü
 * yarın yeniden gelebilir, ama dün akşamki konser bir daha olmayacak.
 *
 * Koltuk sayısı ETKİNLİK BAŞINA TEK SORGUDA toplanıyor; her kart için ayrı
 * sayım yapılsaydı 12 etkinlikte 12 gidiş-dönüş olurdu (N+1).
 */
export async function listEvents(filters: {
  category?: EventCategory;
  query?: string;
  now: Date;
}): Promise<EventListItem[]> {
  const query = normalizeSearchQuery(filters.query);
  const matchingIds = query ? await findIdsMatchingQuery("events", query) : null;

  if (matchingIds?.length === 0) return [];

  const rows = await prisma.event.findMany({
    where: {
      startsAt: { gt: filters.now },
      category: filters.category,
      ...(matchingIds ? { id: { in: matchingIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      category: true,
      performer: true,
      startsAt: true,
      basePrice: true,
      venue: { select: { name: true, _count: { select: { seats: true } } } },
    },
    // En yakın tarih üstte: kullanıcı önce bu haftayı görmek ister.
    orderBy: { startsAt: "asc" },
    take: EVENT_LIST_LIMIT,
  });

  const takenBySeatEvent = await countBlockedSeatsByEvent(
    rows.map((row) => row.id),
    filters.now,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    performer: row.performer,
    startsAt: row.startsAt,
    basePriceKurus: toKurus(row.basePrice),
    venueName: row.venue.name,
    availableSeatCount: row.venue._count.seats - (takenBySeatEvent.get(row.id) ?? 0),
  }));
}

/** Etkinlik başına kapalı koltuk sayısı — tek `GROUP BY` sorgusu. */
async function countBlockedSeatsByEvent(
  eventIds: readonly string[],
  now: Date,
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();

  const rows = await prisma.seatReservation.groupBy({
    by: ["eventId"],
    where: { eventId: { in: [...eventIds] }, ...blockingReservationWhere(now) },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.eventId, row._count._all]));
}

/**
 * Etkinlik detayı + salon planı.
 *
 * `viewerId` GİRİŞ YAPMAMIŞ ZİYARETÇİDE `null`: plan yine çiziliyor, yalnızca
 * "benim kilidim" durumu hiçbir koltukta oluşmuyor. Ekranı girişe kapatmak
 * kullanıcıya salonun dolu olup olmadığını göstermezdi.
 */
export async function findEventDetail(input: {
  eventId: string;
  viewerId: string | null;
  now: Date;
}): Promise<EventDetail | null> {
  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
    select: {
      id: true,
      name: true,
      category: true,
      performer: true,
      startsAt: true,
      basePrice: true,
      venue: { select: { id: true, name: true, address: true } },
    },
  });

  if (!event) return null;

  const [seats, reservations] = await Promise.all([
    prisma.venueSeat.findMany({
      where: { venueId: event.venue.id },
      select: { id: true, block: true, rowLabel: true, seatNumber: true },
    }),
    prisma.seatReservation.findMany({
      where: { eventId: event.id, ...blockingReservationWhere(input.now) },
      select: { id: true, seatId: true, userId: true, holdExpiresAt: true },
    }),
  ]);

  const blockedBySeat = new Map(reservations.map((row) => [row.seatId, row]));

  const seatViews = seats.map<SeatView>((seat) => {
    const reservation = blockedBySeat.get(seat.id);
    const state = resolveSeatState(reservation, input.viewerId);

    return {
      id: seat.id,
      block: seat.block,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      state,
      holdExpiresAt: state === "held_by_me" ? (reservation?.holdExpiresAt ?? null) : null,
      reservationId: state === "held_by_me" ? (reservation?.id ?? null) : null,
    };
  });

  return {
    id: event.id,
    name: event.name,
    category: event.category,
    performer: event.performer,
    startsAt: event.startsAt,
    basePriceKurus: toKurus(event.basePrice),
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    blocks: groupIntoBlocks(seatViews),
    availableSeatCount: seats.length - reservations.length,
    hasStarted: event.startsAt.getTime() <= input.now.getTime(),
  };
}

function resolveSeatState(
  reservation: { userId: string; holdExpiresAt: Date | null } | undefined,
  viewerId: string | null,
): SeatState {
  if (!reservation) return "available";

  /**
   * Kendi kilidim "dolu" görünmez — ekranda seçili görünür ve tekrar basınca
   * bırakılır. `holdExpiresAt` dolu olması kaydın kilit (satış değil) olduğunu
   * söylüyor: satılmış bilette bu alan boşaltılıyor.
   */
  const isMine = viewerId !== null && reservation.userId === viewerId;

  return isMine && reservation.holdExpiresAt !== null ? "held_by_me" : "taken";
}

/**
 * Düz koltuk listesini blok → sıra → koltuk düzenine çevirir.
 *
 * SIRA NUMARASI SAYI GİBİ SIRALANIYOR: kolon metin (`row_label`) ve metin
 * sıralaması 10'u 2'den önce koyar. Veritabanına sıralatmak bu yüzden yanlış
 * sonuç verirdi; salon planı 1, 2, … 10, 11 diye çizilmek zorunda.
 */
function groupIntoBlocks(seats: readonly SeatView[]): SeatBlock[] {
  const byBlock = new Map<string, Map<string, SeatView[]>>();

  for (const seat of seats) {
    const rows = byBlock.get(seat.block) ?? new Map<string, SeatView[]>();
    const row = rows.get(seat.rowLabel) ?? [];

    row.push(seat);
    rows.set(seat.rowLabel, row);
    byBlock.set(seat.block, rows);
  }

  return [...byBlock.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "tr"))
    .map(([block, rows]) => ({
      block,
      rows: [...rows.entries()]
        .sort(([left], [right]) => compareRowLabels(left, right))
        .map(([rowLabel, seatsInRow]) => ({
          rowLabel,
          seats: [...seatsInRow].sort((left, right) => left.seatNumber - right.seatNumber),
        })),
    }));
}

function compareRowLabels(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  // Sayıya çevrilemeyen etiket (ileride "Balkon" gibi) alfabetik sıralanır.
  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    return left.localeCompare(right, "tr");
  }

  return leftNumber - rightNumber;
}

/**
 * Kilit koymadan önce gereken etkinlik alanları.
 *
 * Detay sorgusundan AYRI çünkü orası 192 koltuk ve tüm rezervasyonları da
 * okuyor; kilit koyarken bunların hiçbirine ihtiyaç yok ve her tıklamada
 * salonun tamamını okumak boşuna iş olurdu.
 */
export async function findEventForBooking(
  eventId: string,
  client: Client = prisma,
): Promise<{
  id: string;
  name: string;
  startsAt: Date;
  basePrice: Prisma.Decimal;
  venueId: string;
} | null> {
  return client.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, startsAt: true, basePrice: true, venueId: true },
  });
}

/**
 * Koltuk kaydı — hem doğrulama hem gösterim için.
 *
 * `venueId` DÖNÜYOR ki çağıran "bu koltuk gerçekten bu etkinliğin salonunda mı"
 * sorusunu cevaplayabilsin. İstemciden gelen koltuk kimliği doğrulanmasaydı
 * başka bir salonun koltuğu için bu etkinliğe rezervasyon yazılabilirdi.
 */
export async function findSeatById(
  seatId: string,
  client: Client = prisma,
): Promise<{
  id: string;
  venueId: string;
  block: string;
  rowLabel: string;
  seatNumber: number;
} | null> {
  return client.venueSeat.findUnique({
    where: { id: seatId },
    select: { id: true, venueId: true, block: true, rowLabel: true, seatNumber: true },
  });
}

/**
 * Kullanıcının şu an kaç aktif kilidi var (`SEAT_HOLD_MAX_PER_USER` için).
 *
 * Süresi dolmuş kilitler SAYILMIYOR — kullanıcı unuttuğu bir kilit yüzünden
 * ceza çekmemeli.
 */
export async function countActiveHolds(
  input: { userId: string; now: Date },
  client: Client = prisma,
): Promise<number> {
  return client.seatReservation.count({
    where: { userId: input.userId, status: "held", holdExpiresAt: { gt: input.now } },
  });
}

/**
 * Süzgeç şeridinin seçenekleri.
 *
 * KATEGORİLER TABLODAN DEĞİL ENUM'DAN geliyor (`EventCategory`): market ve
 * restoranın aksine etkinliğin kategori tablosu yok, üç sabit tür var
 * (data-model.md). Sayım yine veritabanından, çünkü "0 etkinlikli kategori
 * gösterilmez" kuralı market ekranıyla aynı.
 */
export async function listEventCategories(input: {
  labels: Readonly<Record<EventCategory, string>>;
  now: Date;
}): Promise<CatalogFilterOption[]> {
  const rows = await prisma.event.groupBy({
    by: ["category"],
    where: { startsAt: { gt: input.now } },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({
      id: row.category,
      name: input.labels[row.category],
      itemCount: row._count._all,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "tr"));
}
