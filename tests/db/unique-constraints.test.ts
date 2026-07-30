import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTestData, expectUniqueViolation, prisma, testId } from "./helpers.js";

/**
 * Eşzamanlılık kısıtlarının GERÇEKTEN çalıştığını kanıtlar
 * (docs/standards/04-database.md "Eşzamanlılık").
 *
 * Bu testlerin varlık sebebi: "önce kontrol et sonra yaz" iki eşzamanlı istekte
 * yetersizdir. İki kullanıcı aynı milisaniyede aynı koltuğu isterse ikisi de
 * "boş" görür ve ikisi de yazar. Tek gerçek koruma veritabanındaki benzersiz
 * index'tir — burada onun var olduğu değil, İŞ GÖRDÜĞÜ sınanır.
 */

const NOW = new Date("2026-09-01T09:00:00.000Z");

beforeEach(cleanupTestData);
afterEach(cleanupTestData);

describe("aynı doktora aynı saatte ikinci slot açılamaz", () => {
  it("ikinci kayıt benzersizlik hatasıyla reddedilir", async () => {
    const specialtyId = testId("specialty");
    const doctorId = testId("doctor");

    await prisma.specialty.create({ data: { id: specialtyId, name: testId("branş") } });
    await prisma.doctor.create({
      data: { id: doctorId, specialtyId, fullName: "Test Doktor", title: "specialist" },
    });
    await prisma.doctorSlot.create({ data: { id: testId("slot", 1), doctorId, startsAt: NOW } });

    await expectUniqueViolation(() =>
      // Aynı doktor + aynı saat: ikinci randevu saati açılamaz.
      prisma.doctorSlot.create({ data: { id: testId("slot", 2), doctorId, startsAt: NOW } }),
    );

    expect(await prisma.doctorSlot.count({ where: { doctorId } })).toBe(1);
  });

  it("aynı saat FARKLI doktor için serbesttir", async () => {
    const specialtyId = testId("specialty");

    await prisma.specialty.create({ data: { id: specialtyId, name: testId("branş") } });
    await prisma.doctor.createMany({
      data: [
        { id: testId("doctor", 1), specialtyId, fullName: "Test Doktor Bir", title: "specialist" },
        { id: testId("doctor", 2), specialtyId, fullName: "Test Doktor İki", title: "physician" },
      ],
    });
    await prisma.doctorSlot.createMany({
      data: [
        { id: testId("slot", 1), doctorId: testId("doctor", 1), startsAt: NOW },
        { id: testId("slot", 2), doctorId: testId("doctor", 2), startsAt: NOW },
      ],
    });

    expect(await prisma.doctorSlot.count({ where: { id: { startsWith: testId("slot") } } })).toBe(
      2,
    );
  });
});

describe("aynı etkinlikte aynı koltuk iki kez satılamaz", () => {
  it("ikinci rezervasyon benzersizlik hatasıyla reddedilir", async () => {
    const venueId = testId("venue");
    const seatId = testId("seat");
    const eventId = testId("event");
    const userId = testId("user", 1);

    await prisma.venue.create({ data: { id: venueId, name: testId("mekân"), address: "Test" } });
    await prisma.venueSeat.create({
      data: { id: seatId, venueId, block: "A", rowLabel: "1", seatNumber: 1 },
    });
    await prisma.event.create({
      data: {
        id: eventId,
        venueId,
        name: "Test Etkinlik",
        category: "concert",
        performer: "Test Topluluğu",
        startsAt: NOW,
        basePrice: "500.00",
      },
    });
    await prisma.user.createMany({
      data: [
        { id: userId, fullName: "Test Kullanıcı Bir" },
        { id: testId("user", 2), fullName: "Test Kullanıcı İki" },
      ],
    });
    await prisma.seatReservation.create({
      data: { id: testId("reservation", 1), eventId, seatId, userId, status: "sold" },
    });

    await expectUniqueViolation(() =>
      // Başka bir kullanıcı aynı koltuğu almaya çalışıyor — 409 dönmesi gereken durum.
      prisma.seatReservation.create({
        data: {
          id: testId("reservation", 2),
          eventId,
          seatId,
          userId: testId("user", 2),
          status: "sold",
        },
      }),
    );

    expect(await prisma.seatReservation.count({ where: { eventId } })).toBe(1);
  });
});

describe("aynı üyelik döneminde ikinci tahsilat yazılamaz", () => {
  it("yenileme görevi iki kez çalışsa da çift tahsilat oluşmaz", async () => {
    const userId = testId("user");
    const planId = testId("plan");
    const membershipId = testId("membership");
    const periodStart = new Date("2026-09-01T00:00:00.000Z");

    await prisma.user.create({ data: { id: userId, fullName: "Test Üye" } });
    await prisma.membershipPlan.create({
      data: { id: planId, name: testId("paket"), commitmentMonths: 0, monthlyPrice: "949.90" },
    });
    await prisma.membership.create({
      data: { id: membershipId, userId, planId, startsAt: periodStart },
    });
    await prisma.membershipPayment.create({
      data: {
        id: testId("mpay", 1),
        membershipId,
        periodStart,
        periodEnd: new Date("2026-10-01T00:00:00.000Z"),
        amount: "949.90",
        kind: "renewal",
        status: "success",
        attemptedAt: periodStart,
        idempotencyKey: testId("mkey", 1),
      },
    });

    await expectUniqueViolation(() =>
      prisma.membershipPayment.create({
        data: {
          id: testId("mpay", 2),
          membershipId,
          periodStart,
          periodEnd: new Date("2026-10-01T00:00:00.000Z"),
          amount: "949.90",
          kind: "renewal",
          status: "success",
          attemptedAt: periodStart,
          idempotencyKey: testId("mkey", 2),
        },
      }),
    );

    expect(await prisma.membershipPayment.count({ where: { membershipId } })).toBe(1);
  });
});

describe("aynı idempotency anahtarıyla ikinci ödeme yazılamaz", () => {
  it("çift tıklamada ikinci tahsilat oluşmaz", async () => {
    const userId = testId("user");

    await prisma.user.create({ data: { id: userId, fullName: "Test Ödeyen" } });
    await prisma.payment.create({
      data: {
        id: testId("payment", 1),
        userId,
        brand: "visa",
        cardLast4: "1111",
        fakeTransactionId: testId("txn", 1),
        status: "success",
        amount: "250.00",
        idempotencyKey: testId("idem"),
        attemptedAt: NOW,
      },
    });

    await expectUniqueViolation(() =>
      prisma.payment.create({
        data: {
          id: testId("payment", 2),
          userId,
          brand: "visa",
          cardLast4: "1111",
          fakeTransactionId: testId("txn", 2),
          status: "success",
          amount: "250.00",
          idempotencyKey: testId("idem"),
          attemptedAt: NOW,
        },
      }),
    );

    expect(await prisma.payment.count({ where: { userId } })).toBe(1);
  });
});

describe("kimlik ve personel tekilliği", () => {
  it("aynı kimlik özetiyle ikinci hesap açılamaz", async () => {
    const hash = testId("hash");

    await prisma.user.create({
      data: { id: testId("user", 1), fullName: "Test Bir", nationalIdHash: hash },
    });

    await expectUniqueViolation(() =>
      prisma.user.create({
        data: { id: testId("user", 2), fullName: "Test İki", nationalIdHash: hash },
      }),
    );
  });

  it("iki hesap aynı personel kaydına bağlanamaz", async () => {
    // Tohumlanmış personelin bir kısmı zaten bir hesaba bağlı; boşta olanı seçiyoruz.
    const staffMemberId = (
      await prisma.staffMember.findFirstOrThrow({ where: { user: null }, select: { id: true } })
    ).id;

    await prisma.user.create({
      data: { id: testId("user", 1), fullName: "Test Bir", staffMemberId, isStaff: true },
    });

    await expectUniqueViolation(() =>
      prisma.user.create({
        data: { id: testId("user", 2), fullName: "Test İki", staffMemberId, isStaff: true },
      }),
    );
  });
});
