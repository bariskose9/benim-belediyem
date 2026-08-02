import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { bookAppointment } from "@/features/appointments/services/appointment.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.1 KABUL KRİTERİ ═══
 * "İki kullanıcı aynı saati aynı anda seçemez (409 döner)."
 *
 * BU TEST TAKLİT PRİSMA İLE YAZILAMAZ ve bu dosyanın var oluş sebebi tam
 * olarak budur. Yarışı çözen şey uygulama kodu değil, PostgreSQL'in satır
 * kilidi: `UPDATE ... WHERE is_booked = false` çalıştığında ikinci işlem
 * birincinin commit'ini bekler, sonra WHERE'i YENİDEN DEĞERLENDİRİR ve satır
 * artık koşulu sağlamadığı için atlar (PostgreSQL, Transaction Isolation →
 * Read Committed). Bellekte çalışan bir taklit istemcide böyle bir kilit yok;
 * orada iki istek de "boş" görür ve test yanlış yeşil olurdu.
 *
 * `Promise.all` gerçek eşzamanlılık üretiyor: her çağrı bağlantı havuzundan
 * ayrı bir bağlantı alıyor ve iki transaction aynı anda açık kalıyor.
 */

const ACTOR_IP = "203.0.113.20";
const NOW = new Date("2026-09-01T06:00:00.000Z");
const SLOT_AT = new Date("2026-09-01T08:00:00.000Z");

const SPECIALTY = testId("specialty", "race");
const DOCTOR = testId("doctor", "race");
const CONTESTED_SLOT = testId("slot", "race");

/** Beş ayrı kullanıcı aynı saate saldırıyor — ikiden fazlası daha sıkı bir sınav. */
const RIVALS = [1, 2, 3, 4, 5].map((index) => testId("user", "race", index));

beforeEach(async () => {
  await cleanupTestData();
  await seedFixtures();
  await resetBudgets();
});

afterEach(async () => {
  await cleanupTestData();
  await resetBudgets();
});

describe("aynı saate eşzamanlı randevu", () => {
  it("yalnızca BİR kullanıcı alır, diğerleri 409 SLOT_TAKEN alır", async () => {
    const attempts = await Promise.allSettled(
      RIVALS.map((userId) =>
        bookAppointment({ userId, slotId: CONTESTED_SLOT, actorIp: ACTOR_IP, now: NOW }),
      ),
    );

    const succeeded = attempts.filter((attempt) => attempt.status === "fulfilled");
    const failed = attempts.filter((attempt) => attempt.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(RIVALS.length - 1);

    // Kaybedenlerin HEPSİ 409 almalı. Biri 500 alsaydı yarış "çözülmüş"
    // görünürdü ama kullanıcıya beklenmeyen hata dönerdi.
    for (const attempt of failed) {
      expect(attempt.reason).toMatchObject({ code: "SLOT_TAKEN", status: 409 });
    }
  });

  it("veritabanında tek bir aktif randevu ve dolu tek bir saat kalır", async () => {
    await Promise.allSettled(
      RIVALS.map((userId) =>
        bookAppointment({ userId, slotId: CONTESTED_SLOT, actorIp: ACTOR_IP, now: NOW }),
      ),
    );

    const appointments = await prisma.appointment.findMany({
      where: { slotId: CONTESTED_SLOT },
      select: { userId: true, status: true },
    });
    const slot = await prisma.doctorSlot.findUnique({ where: { id: CONTESTED_SLOT } });

    /**
     * ASIL KANIT BURADA. Yukarıdaki test "kaç istek başarılı döndü" diye
     * soruyor; bu test veritabanına bakıyor. Koşullu güncelleme olmasaydı
     * beş satır birden yazılabilir ve API yine beş kez "oldu" derdi —
     * çift satış ancak tabloya bakılarak yakalanır.
     */
    expect(appointments).toHaveLength(1);
    expect(appointments[0]?.status).toBe("booked");
    expect(slot?.isBooked).toBe(true);

    // Kazanan, isteği başarıyla dönen kullanıcı olmalı — rastgele biri değil.
    expect(RIVALS).toContain(appointments[0]?.userId);
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: RIVALS.map((id, index) => ({
      id,
      fullName: `Test Yarışmacı ${index + 1}`,
      email: `${id}@ornek.test`,
      identityStatus: "kps_verified" as const,
      isStaff: true,
      isSeedData: true,
    })),
  });

  await prisma.specialty.create({
    data: { id: SPECIALTY, name: testId("branş", "race"), isSeedData: true },
  });
  await prisma.doctor.create({
    data: {
      id: DOCTOR,
      specialtyId: SPECIALTY,
      fullName: "Test Doktor Yarış",
      title: "specialist",
      isSeedData: true,
    },
  });
  await prisma.doctorSlot.create({
    data: { id: CONTESTED_SLOT, doctorId: DOCTOR, startsAt: SLOT_AT, isSeedData: true },
  });
}

async function resetBudgets(): Promise<void> {
  await Promise.all(
    RIVALS.map((userId) => resetRateLimit(rateLimitKey("appointment_write", "user", userId))),
  );
}
