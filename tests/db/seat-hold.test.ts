import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SEAT_HOLD_DURATION_MS, SEAT_HOLD_MAX_PER_USER } from "@/config/constants";
import { getCartSummary, removeItemFromCart } from "@/features/cart/services/cart.service";
import { findEventDetail } from "@/features/events/repositories/event.repository";
import { markSeatSold } from "@/features/events/repositories/seat-reservation.repository";
import { holdSeat, releaseSeat } from "@/features/events/services/seat-hold.service";
import { listNotifications } from "@/features/notifications/services/notification.service";
import { checkout } from "@/features/payment/services/checkout.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.2'NİN İKİ KABUL KRİTERİ ═══
 *  1. Aynı koltuk iki kez satılamaz — iki kullanıcı aynı anda denerse biri 409
 *  2. Süresi dolmuş kilit, TEMİZLİK GÖREVİ HİÇ ÇALIŞMASA BİLE koltuğu
 *     satılabilir gösterir (ADR-007)
 *
 * GERÇEK PostgreSQL'e karşı yazıldı ve bu şart: taklit bir istemci ne
 * `unique(event_id, seat_id)` ihlalini, ne `ON CONFLICT DO NOTHING`'in 0
 * satır dönmesini, ne de koşullu UPDATE'in ikinci istekte tutmamasını taklit
 * edebilirdi. Yanlış yazılmış bir taklit YANLIŞ YEŞİL gösterirdi.
 *
 * ZAMAN DIŞARIDAN VERİLİYOR: "10 dakika sonra ne olur" sorusu testin gerçekten
 * beklemesiyle değil, `now` ileri sarılarak cevaplanıyor. ADR-007 zaten bunu
 * mümkün kılmak için doğruluğu okuma anına taşımıştı.
 */

const ACTOR_IP = "203.0.113.77";
const NOW = new Date("2026-09-01T09:00:00.000Z");
const EVENT_STARTS_AT = new Date("2026-09-20T17:00:00.000Z");

const BUYER = testId("user", "seat-buyer");
const RIVAL = testId("user", "seat-rival");

const VENUE = testId("venue", "seat-salon");
const OTHER_VENUE = testId("venue", "seat-baska-salon");
const EVENT = testId("event", "seat-konser");
const PAST_EVENT = testId("event", "seat-gecmis");
const OTHER_VENUE_SEAT = testId("seat", "baska-salon-a-1-1");

const BASE_PRICE_KURUS = 500_00;

/** Salon: tek blok, 12 sıra × 8 koltuk — sıra sıralaması testi için 12 şart. */
const ROW_COUNT = 12;
const SEATS_PER_ROW = 8;

const CARD_OK = "4111111111111111";

function seatId(row: number, seat: number): string {
  return testId("seat", `a-${row}-${seat}`);
}

function minutesAfter(minutes: number): Date {
  return new Date(NOW.getTime() + minutes * 60_000);
}

/** Kilit süresinin BİR DAKİKA ötesi — süre dolumu testlerinin ortak anı. */
function afterHoldExpired(): Date {
  return new Date(NOW.getTime() + SEAT_HOLD_DURATION_MS + 60_000);
}

function card() {
  return {
    kind: "new" as const,
    number: CARD_OK,
    holderName: "Test Kullanici",
    expMonth: 12,
    expYear: 2030,
    cvv: "123",
    save: false,
  };
}

async function seatStateFor(userId: string | null, seat: string): Promise<string | undefined> {
  const detail = await findEventDetail({ eventId: EVENT, viewerId: userId, now: NOW });

  return detail?.blocks
    .flatMap((block) => block.rows.flatMap((row) => row.seats))
    .find((row) => row.id === seat)?.state;
}

beforeEach(async () => {
  await cleanupTestData();
  await seedFixtures();
  await resetBudgets();
});

afterEach(async () => {
  await cleanupTestData();
  await resetBudgets();
});

describe("kabul kriteri 1: aynı koltuk iki kez satılamaz", () => {
  it("ikinci kullanıcı aynı koltuğa talip olursa 409 alır", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(1, 1),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await expect(
      holdSeat({
        userId: RIVAL,
        eventId: EVENT,
        seatId: seatId(1, 1),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "SEAT_TAKEN", status: 409 });

    // Reddedilen istek HİÇBİR yan etki bırakmamalı: ne ikinci kayıt, ne sepet satırı.
    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(1);
    expect(await prisma.cartItem.count({ where: { cart: { userId: RIVAL } } })).toBe(0);
  });

  it("EŞ ZAMANLI iki istekten yalnızca biri koltuğu alır", async () => {
    /**
     * İki isteği `Promise.all` ile birlikte başlatmak, "önce oku sonra yaz"
     * deseninin yakalanamadığı yarışı zorluyor: ikisi de aynı anda boş görüyor.
     * Kararı veritabanı veriyor — `unique(event_id, seat_id)`.
     */
    const results = await Promise.allSettled([
      holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: seatId(2, 3),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
      holdSeat({
        userId: RIVAL,
        eventId: EVENT,
        seatId: seatId(2, 3),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(1);
  });

  it("SATILMIŞ koltuk yeniden kilitlenemez", async () => {
    await prisma.seatReservation.create({
      data: {
        id: testId("reservation", "satilmis"),
        eventId: EVENT,
        seatId: seatId(3, 1),
        userId: RIVAL,
        status: "sold",
        holdExpiresAt: null,
        isSeedData: true,
      },
    });

    await expect(
      holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: seatId(3, 1),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "SEAT_TAKEN", status: 409 });
  });
});

describe("kabul kriteri 2: süresi dolmuş kilit koltuğu serbest bırakır", () => {
  it("TEMİZLİK HİÇ ÇALIŞMADAN koltuk yeniden satılabilir görünür", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(4, 5),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    // Satır HÂLÂ TABLODA duruyor: hiçbir temizlik görevi çalışmadı.
    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(1);

    const detail = await findEventDetail({
      eventId: EVENT,
      viewerId: null,
      now: afterHoldExpired(),
    });
    const seat = detail?.blocks
      .flatMap((block) => block.rows.flatMap((row) => row.seats))
      .find((row) => row.id === seatId(4, 5));

    expect(seat?.state).toBe("available");
    expect(detail?.availableSeatCount).toBe(ROW_COUNT * SEATS_PER_ROW);
  });

  it("başka bir kullanıcı süresi dolmuş kilidi DEVRALABİLİR", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(5, 2),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const takeoverAt = afterHoldExpired();

    const held = await holdSeat({
      userId: RIVAL,
      eventId: EVENT,
      seatId: seatId(5, 2),
      actorIp: ACTOR_IP,
      now: takeoverAt,
    });

    expect(held.holdExpiresAt.getTime()).toBe(takeoverAt.getTime() + SEAT_HOLD_DURATION_MS);

    // Satır DEVRALINDI, ikinci satır AÇILMADI — benzersizlik kısıtı korunuyor.
    const rows = await prisma.seatReservation.findMany({ where: { eventId: EVENT } });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(RIVAL);
  });

  it("süresi DOLMAMIŞ kilit devralınamaz", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(6, 4),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await expect(
      holdSeat({
        userId: RIVAL,
        eventId: EVENT,
        seatId: seatId(6, 4),
        actorIp: ACTOR_IP,
        // Sürenin bir dakika ÖNCESİ: kilit hâlâ geçerli.
        now: new Date(NOW.getTime() + SEAT_HOLD_DURATION_MS - 60_000),
      }),
    ).rejects.toMatchObject({ code: "SEAT_TAKEN", status: 409 });
  });
});

describe("kilit süresi", () => {
  it("kilit TAM 10 dakika sürer", async () => {
    const held = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(7, 1),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    expect(held.holdExpiresAt.getTime() - NOW.getTime()).toBe(SEAT_HOLD_DURATION_MS);
  });

  it("AYNI koltuğa ikinci kez basmak süreyi UZATMAZ", async () => {
    const first = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(7, 2),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const second = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(7, 2),
      actorIp: ACTOR_IP,
      // Beş dakika sonra: uzatsaydı bitiş anı ileri kayardı.
      now: minutesAfter(5),
    });

    expect(second.holdExpiresAt.getTime()).toBe(first.holdExpiresAt.getTime());
  });
});

describe("girdi doğrulama ve sınırlar", () => {
  it("BAŞKA SALONUN koltuğu kabul edilmez", async () => {
    await expect(
      holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: OTHER_VENUE_SEAT,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "SEAT_NOT_FOUND", status: 404 });
  });

  it("olmayan etkinlik 404 döner", async () => {
    await expect(
      holdSeat({
        userId: BUYER,
        eventId: testId("event", "yok"),
        seatId: seatId(8, 1),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "EVENT_NOT_FOUND", status: 404 });
  });

  it("BAŞLAMIŞ etkinliğe koltuk kilitlenemez", async () => {
    await expect(
      holdSeat({
        userId: BUYER,
        eventId: PAST_EVENT,
        seatId: seatId(8, 2),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "EVENT_STARTED", status: 409 });
  });

  it("kullanıcı başına kilit sayısı sınırlı", async () => {
    for (let index = 1; index <= SEAT_HOLD_MAX_PER_USER; index += 1) {
      await holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: seatId(9, index),
        actorIp: ACTOR_IP,
        now: NOW,
      });
    }

    await expect(
      holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: seatId(10, 1),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "TOO_MANY_SEAT_HOLDS", status: 409 });

    /**
     * SÜRESİ DOLMUŞ KİLİTLER SAYILMAZ: kullanıcı unuttuğu kilitler yüzünden
     * ceza çekmemeli. Aynı istek süre dolduktan sonra geçmeli.
     */
    await expect(
      holdSeat({
        userId: BUYER,
        eventId: EVENT,
        seatId: seatId(10, 1),
        actorIp: ACTOR_IP,
        now: afterHoldExpired(),
      }),
    ).resolves.toMatchObject({ seatNumber: 1 });
  });
});

describe("salon planı", () => {
  it("kendi kilidim 'seçili', başkasınınki 'dolu' görünür", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(11, 3),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    expect(await seatStateFor(BUYER, seatId(11, 3))).toBe("held_by_me");
    expect(await seatStateFor(RIVAL, seatId(11, 3))).toBe("taken");
    // Ziyaretçi de "dolu" görür — kimin tuttuğu bilgisi sızmaz.
    expect(await seatStateFor(null, seatId(11, 3))).toBe("taken");
  });

  it("sıralar SAYI gibi sıralanır (1, 2, … 10, 11, 12)", async () => {
    const detail = await findEventDetail({ eventId: EVENT, viewerId: null, now: NOW });

    /**
     * `row_label` bir METİN kolonu; veritabanına sıralatmak 10'u 2'den önce
     * koyardı ve salon planı "1, 10, 11, 12, 2, 3…" diye çizilirdi.
     */
    expect(detail?.blocks[0]?.rows.map((row) => row.rowLabel)).toEqual(
      Array.from({ length: ROW_COUNT }, (_unused, index) => String(index + 1)),
    );
  });
});

describe("sepet bağı (teknik borç #40)", () => {
  it("koltuk kilidi sepete KOLTUK BAZLI bir satır ekler", async () => {
    const held = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(1, 4),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const summary = await getCartSummary({ userId: BUYER }, NOW);
    const line = summary.sections[0]?.lines[0];

    // Satır ETKİNLİĞİ değil REZERVASYONU gösteriyor — borcun ödendiği yer bu.
    expect(line?.refId).toBe(held.reservationId);
    expect(line?.quantity).toBe(1);
    expect(line?.unitPriceKurus).toBe(BASE_PRICE_KURUS);
    expect(line?.name).toContain("1. sıra, 4. koltuk");
    expect(line?.holdExpiresAt?.getTime()).toBe(held.holdExpiresAt.getTime());
    // Bilet teslim edilmiyor: ücret satırı hiç hesaplanmıyor (PRD §6.1).
    expect(summary.sections[0]?.deliveryFeeKurus).toBe(0);
  });

  it("süresi DOLAN koltuk sepetten DÜŞER ve bildirim yazılır", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(2, 6),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const summary = await getCartSummary({ userId: BUYER }, afterHoldExpired());

    expect(summary.lineCount).toBe(0);

    const notifications = await listNotifications({ userId: BUYER, now: afterHoldExpired() });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.type).toBe("seat_hold_expired");
    expect(notifications[0]?.body).toContain("2. sıra, 6. koltuk");

    // Kilit satırı da temizlendi: koltuk yeniden satılabilir.
    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(0);
  });

  it("AYNI BİLDİRİM İKİ KEZ YAZILMAZ — sepet tekrar tekrar okunsa bile", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(2, 7),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await getCartSummary({ userId: BUYER }, afterHoldExpired());
    await getCartSummary({ userId: BUYER }, afterHoldExpired());
    await getCartSummary({ userId: BUYER }, afterHoldExpired());

    expect(await listNotifications({ userId: BUYER, now: afterHoldExpired() })).toHaveLength(1);
  });

  it("satırı sepetten çıkarmak KİLİDİ DE bırakır", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(3, 8),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const summary = await getCartSummary({ userId: BUYER }, NOW);
    const itemId = summary.sections[0]?.lines[0]?.id;

    if (!itemId) throw new Error("sepet satırı bekleniyordu");

    await removeItemFromCart({
      owner: { userId: BUYER },
      anonymousId: testId("anon", BUYER),
      now: NOW,
      itemId,
    });

    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(0);
    // Koltuk aynı anda yeniden satılabilir — 10 dakika beklenmiyor.
    expect(await seatStateFor(null, seatId(3, 8))).toBe("available");
  });
});

describe("kilit bırakma", () => {
  it("BAŞKASININ kilidi bırakılamaz", async () => {
    const held = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(4, 1),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    /**
     * 403 DEĞİL 404: "böyle bir kilit var ama senin değil" demek kaydın
     * varlığını sızdırırdı (05-auth-security.md → IDOR).
     */
    await expect(
      releaseSeat({ userId: RIVAL, reservationId: held.reservationId, now: NOW }),
    ).rejects.toMatchObject({ code: "SEAT_HOLD_NOT_FOUND", status: 404 });

    expect(await prisma.seatReservation.count({ where: { eventId: EVENT } })).toBe(1);
  });

  it("SATILMIŞ bilet bırakılamaz (PRD §5.5: bilet iptal edilemez)", async () => {
    const reservationId = testId("reservation", "satilmis-iade");

    await prisma.seatReservation.create({
      data: {
        id: reservationId,
        eventId: EVENT,
        seatId: seatId(4, 2),
        userId: BUYER,
        status: "sold",
        holdExpiresAt: null,
        isSeedData: true,
      },
    });

    await expect(releaseSeat({ userId: BUYER, reservationId, now: NOW })).rejects.toMatchObject({
      code: "SEAT_HOLD_NOT_FOUND",
      status: 404,
    });

    expect(await prisma.seatReservation.count({ where: { id: reservationId } })).toBe(1);
  });
});

describe("ödeme", () => {
  it("ödeme kilidi SATIŞA çevirir ve bilet siparişi doğrudan teslim edilir", async () => {
    const held = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(5, 5),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const result = await checkout({
      userId: BUYER,
      actorIp: ACTOR_IP,
      now: NOW,
      payload: {
        idempotencyKey: testId("idem", "bilet"),
        expectedTotalKurus: BASE_PRICE_KURUS,
        card: card(),
        delivery: {},
      },
    });

    const reservation = await prisma.seatReservation.findUnique({
      where: { id: held.reservationId },
    });

    expect(reservation?.status).toBe("sold");
    // Satılmış bilette kilit süresi TEMİZLENİYOR: okuma sorguları onu kilit sanmasın.
    expect(reservation?.holdExpiresAt).toBeNull();

    const order = await prisma.order.findUnique({ where: { id: result.orderIds[0] ?? "" } });

    expect(order?.fulfillmentType).toBe("ticket");
    expect(order?.status).toBe("delivered");
    expect(order?.deliveryAddressId).toBeNull();
  });

  it("SÜRESİ DOLMUŞ kilitle ödeme yapılamaz ve HİÇBİR sipariş yazılmaz", async () => {
    await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(6, 6),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    /**
     * BİRİNCİ KEMER ÖDEMEDEN ÖNCE DEVREYE GİRİYOR: ödeme servisi sepeti
     * okurken süpürme çalışıyor, süresi dolmuş satır düşüyor ve ödeme
     * "sepetiniz boş" ile duruyor. Kullanıcı açısından doğru davranış bu —
     * süresi dolmuş bir koltuk için kart çekilmemeli.
     */
    await expect(
      checkout({
        userId: BUYER,
        actorIp: ACTOR_IP,
        now: afterHoldExpired(),
        payload: {
          idempotencyKey: testId("idem", "suresi-dolmus"),
          expectedTotalKurus: BASE_PRICE_KURUS,
          card: card(),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "CART_EMPTY", status: 409 });

    // Ne sipariş, ne ödeme kaydı — sağlayıcıya hiç gidilmedi.
    expect(await prisma.order.count({ where: { userId: BUYER } })).toBe(0);
    expect(await prisma.payment.count({ where: { userId: BUYER } })).toBe(0);

    // Kullanıcı sebebi öğreniyor: sessizce boşalan bir sepet açıklanamaz olurdu.
    const notifications = await listNotifications({ userId: BUYER, now: afterHoldExpired() });

    expect(notifications[0]?.type).toBe("seat_hold_expired");
  });

  it("İKİNCİ KEMER: süpürme hiç çalışmasa bile satış SQL seviyesinde reddedilir", async () => {
    const held = await holdSeat({
      userId: BUYER,
      eventId: EVENT,
      seatId: seatId(6, 7),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    /**
     * Ödeme servisi değil, satışı yazan İFADE doğrudan sınanıyor. Sepet
     * süpürmesi (birinci kemer) devre dışı bırakılmış gibi düşünülmeli:
     * `markSeatSold` süresi dolmuş bir kilitte 0 satır etkilemek ZORUNDA,
     * yoksa iki kemerden biri aslında hiç yokmuş demektir.
     */
    const sold = await markSeatSold(
      { reservationId: held.reservationId, userId: BUYER, now: afterHoldExpired() },
      prisma,
    );

    expect(sold).toBe(false);

    const reservation = await prisma.seatReservation.findUnique({
      where: { id: held.reservationId },
    });

    expect(reservation?.status).toBe("held");
  });

  it("BAŞKASININ kilidi satılamaz (IDOR)", async () => {
    const held = await holdSeat({
      userId: RIVAL,
      eventId: EVENT,
      seatId: seatId(7, 7),
      actorIp: ACTOR_IP,
      now: NOW,
    });

    /**
     * Rakibin sepet satırı ALICININ sepetine taşınıyor: uçlar bunu mümkün
     * kılmıyor (bilet sepete yalnızca kilit ucundan giriyor), ama koruma yine
     * de veri seviyesinde olmalı.
     */
    const buyerCart = await prisma.cart.create({
      data: { id: testId("cart", "idor"), userId: BUYER, status: "active", isSeedData: true },
    });

    await prisma.cartItem.create({
      data: {
        id: testId("cart-item", "idor"),
        cartId: buyerCart.id,
        itemType: "event",
        refId: held.reservationId,
        quantity: 1,
        unitPrice: "500.00",
        isSeedData: true,
      },
    });

    await expect(
      checkout({
        userId: BUYER,
        actorIp: ACTOR_IP,
        now: NOW,
        payload: {
          idempotencyKey: testId("idem", "idor"),
          expectedTotalKurus: BASE_PRICE_KURUS,
          card: card(),
          delivery: {},
        },
      }),
    ).rejects.toMatchObject({ code: "SEAT_TAKEN", status: 409 });

    const reservation = await prisma.seatReservation.findUnique({
      where: { id: held.reservationId },
    });

    expect(reservation?.status).toBe("held");
    expect(await prisma.order.count({ where: { userId: BUYER } })).toBe(0);
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: [BUYER, RIVAL].map((id, index) => ({
      id,
      fullName: `Test Koltuk ${index + 1}`,
      email: `${id}@ornek.test`,
      isSeedData: true,
    })),
  });

  await prisma.venue.createMany({
    data: [
      { id: VENUE, name: testId("salon"), address: "Test Mahallesi 1. Sokak", isSeedData: true },
      {
        id: OTHER_VENUE,
        name: testId("baska-salon"),
        address: "Test Mahallesi 2. Sokak",
        isSeedData: true,
      },
    ],
  });

  await prisma.venueSeat.createMany({
    data: Array.from({ length: ROW_COUNT }, (_unusedRow, rowIndex) =>
      Array.from({ length: SEATS_PER_ROW }, (_unusedSeat, seatIndex) => ({
        id: seatId(rowIndex + 1, seatIndex + 1),
        venueId: VENUE,
        block: "A",
        rowLabel: String(rowIndex + 1),
        seatNumber: seatIndex + 1,
        isSeedData: true,
      })),
    ).flat(),
  });

  await prisma.venueSeat.create({
    data: {
      id: OTHER_VENUE_SEAT,
      venueId: OTHER_VENUE,
      block: "A",
      rowLabel: "1",
      seatNumber: 1,
      isSeedData: true,
    },
  });

  await prisma.event.createMany({
    data: [
      {
        id: EVENT,
        venueId: VENUE,
        name: "Test Konseri",
        category: "concert",
        performer: "Test Topluluğu",
        startsAt: EVENT_STARTS_AT,
        basePrice: "500.00",
        isSeedData: true,
      },
      {
        id: PAST_EVENT,
        venueId: VENUE,
        name: "Geçmiş Konser",
        category: "concert",
        performer: "Test Topluluğu",
        // NOW'dan önce: başlamış etkinliğe bilet satılmaz.
        startsAt: new Date("2026-08-01T17:00:00.000Z"),
        basePrice: "500.00",
        isSeedData: true,
      },
    ],
  });
}

async function resetBudgets(): Promise<void> {
  await Promise.all([
    ...[BUYER, RIVAL].map((id) => resetRateLimit(rateLimitKey("seat_hold", "user", id))),
    ...[BUYER, RIVAL].map((id) => resetRateLimit(rateLimitKey("payment_attempt", "user", id))),
    ...[BUYER, RIVAL].map((id) =>
      resetRateLimit(rateLimitKey("cart_write", "session", testId("anon", id))),
    ),
  ]);
}
