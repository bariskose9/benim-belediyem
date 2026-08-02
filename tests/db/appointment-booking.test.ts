import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { APPOINTMENT_WRITE_RATE_LIMIT_MAX } from "@/config/constants";
import {
  bookAppointment,
  cancelAppointment,
} from "@/features/appointments/services/appointment.service";
import { rateLimitKey, resetRateLimit } from "@/lib/rate-limit";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * PRD §5.1'in dört iş kuralı — GERÇEK PostgreSQL'e karşı.
 *
 * NEDEN TAKLİT PRİSMA DEĞİL: bu kuralların üçü koşullu güncelleme, bileşik
 * filtre ve iç içe ilişki sorgusu üzerine kurulu. Bir taklit istemci "koşullu
 * UPDATE sıfır satır etkiledi" davranışını ancak elle yeniden yazarak
 * taklit edebilirdi ve o kod, test ettiği koddan daha karmaşık olurdu.
 * Daha kötüsü: taklit yanlış yazılırsa test YANLIŞ YEŞİL gösterir — bu
 * projede 4b-2'de bir kez yaşandı (`sonraki-adim-prompt.md` tuzaklar).
 *
 * Servis katmanı DOĞRUDAN çağrılıyor, HTTP ucu üzerinden değil: kurallar
 * serviste yaşıyor ve uç yalnızca kapı + zarf işi yapıyor. Ucun kendi işi
 * `tests/integration/appointments-route.test.ts` içinde sınanıyor.
 */

const ACTOR_IP = "203.0.113.10";

/** Sabit bir "şimdi": kurallar bu ana göre değerlendirilir, makine saatine göre değil. */
const NOW = new Date("2026-09-01T06:00:00.000Z"); // İstanbul 09:00

const STAFF_USER = testId("user", "staff");
const OTHER_USER = testId("user", "other");
const SPECIALTY_A = testId("specialty", "a");
const SPECIALTY_B = testId("specialty", "b");
const DOCTOR_A1 = testId("doctor", "a1");
const DOCTOR_A2 = testId("doctor", "a2");
const DOCTOR_B1 = testId("doctor", "b1");

/** Saatler İstanbul saatiyle: 11:00, 11:20, ertesi gün 11:00. */
const SLOT_SOON = testId("slot", "soon");
const SLOT_LATER = testId("slot", "later");
const SLOT_OTHER_DOCTOR = testId("slot", "other-doctor");
const SLOT_OTHER_SPECIALTY = testId("slot", "other-specialty");
const SLOT_NEXT_DAY = testId("slot", "next-day");
const SLOT_PAST = testId("slot", "past");

const SOON_AT = new Date("2026-09-01T08:00:00.000Z"); // İstanbul 11:00, 2 saat sonra
const LATER_AT = new Date("2026-09-01T08:20:00.000Z");
const NEXT_DAY_AT = new Date("2026-09-02T08:00:00.000Z");
const PAST_AT = new Date("2026-09-01T05:00:00.000Z"); // İstanbul 08:00, 1 saat önce

beforeEach(async () => {
  await cleanupTestData();
  await seedFixtures();
  // Hız sınırı sayacı 15 dakikalık pencerede veritabanında yaşıyor; sıfırlanmazsa
  // arka arkaya koşan testler birbirinin bütçesini yer.
  await resetBudgets();
});

afterEach(async () => {
  await cleanupTestData();
  await resetBudgets();
});

describe("randevu oluşturma — mutlu yol", () => {
  it("boş saate randevu yazar, saati dolu işaretler ve denetim kaydı bırakır", async () => {
    const result = await bookAppointment({
      userId: STAFF_USER,
      slotId: SLOT_SOON,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: result.appointmentId },
    });
    const slot = await prisma.doctorSlot.findUnique({ where: { id: SLOT_SOON } });

    expect(appointment?.userId).toBe(STAFF_USER);
    expect(appointment?.status).toBe("booked");
    expect(slot?.isBooked).toBe(true);

    // CLAUDE.md §5.11: kritik işlemler denetim kaydına yazılır.
    const audit = await prisma.auditLog.findFirst({
      where: { userId: STAFF_USER, action: "appointment_create" },
    });

    expect(audit?.entityId).toBe(result.appointmentId);
    // Denetim kaydına düz IP YAZILMAZ, özeti yazılır (05-auth-security.md).
    expect(audit?.ipHash).not.toContain(ACTOR_IP);
  });
});

describe("kural: dolu saat seçilemez", () => {
  it("aynı saate ikinci randevu 409 SLOT_TAKEN ile reddedilir", async () => {
    await bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    await expect(
      bookAppointment({ userId: OTHER_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "SLOT_TAKEN", status: 409 });

    expect(await prisma.appointment.count({ where: { slotId: SLOT_SOON } })).toBe(1);
  });
});

describe("kural: geçmiş tarihe randevu alınamaz", () => {
  it("geçmiş saat 409 SLOT_IN_PAST ile reddedilir", async () => {
    await expect(
      bookAppointment({ userId: STAFF_USER, slotId: SLOT_PAST, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "SLOT_IN_PAST", status: 409 });

    // Reddedilen istek saati kirletmemeli: transaction geri alınmış olmalı.
    const slot = await prisma.doctorSlot.findUnique({ where: { id: SLOT_PAST } });

    expect(slot?.isBooked).toBe(false);
    expect(await prisma.appointment.count({ where: { slotId: SLOT_PAST } })).toBe(0);
  });
});

describe("kural: aynı branşta aktif randevu varken ikinci randevu alınamaz", () => {
  it("aynı branşta ikinci randevuyu reddeder (farklı doktor olsa bile)", async () => {
    await bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: SLOT_OTHER_DOCTOR,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "ACTIVE_SPECIALTY_APPOINTMENT", status: 409 });
  });

  /**
   * KURAL DEĞİŞİKLİĞİNİN ASIL TESTİ (2026-08-03).
   *
   * Eski kural "aynı gün"dü ve bu senaryoya İZİN VERİYORDU. Yeni kuralda
   * bekleyen randevu hangi güne olursa olsun engelliyor — kontrol randevusu
   * önceden alınamıyor, bu bilinçli olarak kabul edilmiş bedel (PRD §5.1).
   */
  it("aynı branşta FARKLI güne randevuyu da reddeder", async () => {
    await bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    await expect(
      bookAppointment({ userId: STAFF_USER, slotId: SLOT_NEXT_DAY, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "ACTIVE_SPECIALTY_APPOINTMENT", status: 409 });
  });

  it("FARKLI branşta randevuya izin verir", async () => {
    await bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: SLOT_OTHER_SPECIALTY,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).resolves.toMatchObject({ appointmentId: expect.any(String) });
  });

  /**
   * Randevunun saati geçince engel kalkmalı: kullanıcı muayenesini olduktan
   * sonra aynı branştan yeni randevu alabilmeli.
   */
  it("saati GEÇMİŞ randevu yeni randevuyu engellemez", async () => {
    await bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    // SOON_AT geçti; NEXT_DAY hâlâ gelecekte.
    const afterVisit = new Date(SOON_AT.getTime() + 60_000);

    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: SLOT_NEXT_DAY,
        actorIp: ACTOR_IP,
        now: afterVisit,
      }),
    ).resolves.toMatchObject({ appointmentId: expect.any(String) });
  });

  it("kural KULLANICIYA ÖZELDİR — başkasının randevusu engel değildir", async () => {
    await bookAppointment({ userId: OTHER_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW });

    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: SLOT_OTHER_DOCTOR,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).resolves.toMatchObject({ appointmentId: expect.any(String) });
  });

  /** İptal bir cezaya dönüşmemeli: hemen yeniden randevu alınabilmeli. */
  it("iptal edilmiş randevu yeniden randevu almayı engellemez", async () => {
    const first = await bookAppointment({
      userId: STAFF_USER,
      slotId: SLOT_SOON,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await cancelAppointment({
      userId: STAFF_USER,
      appointmentId: first.appointmentId,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: SLOT_OTHER_DOCTOR,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).resolves.toMatchObject({ appointmentId: expect.any(String) });
  });
});

describe("kural: iptal en geç randevudan 2 saat önce", () => {
  it("2 saatten fazla varken iptal eder ve saati yeniden satışa açar", async () => {
    const created = await bookAppointment({
      userId: STAFF_USER,
      slotId: SLOT_NEXT_DAY,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await cancelAppointment({
      userId: STAFF_USER,
      appointmentId: created.appointmentId,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: created.appointmentId },
    });
    const slot = await prisma.doctorSlot.findUnique({ where: { id: SLOT_NEXT_DAY } });

    // KAYIT SİLİNMEZ — 3 yıl saklanır (data-model.md).
    expect(appointment).not.toBeNull();
    expect(appointment?.status).toBe("cancelled");
    expect(appointment?.cancelledAt).not.toBeNull();
    expect(slot?.isBooked).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: { userId: STAFF_USER, action: "appointment_cancel" },
    });

    expect(audit).not.toBeNull();
  });

  it("randevuya 2 saatten az kaldığında 409 CANCELLATION_TOO_LATE döner", async () => {
    const created = await bookAppointment({
      userId: STAFF_USER,
      slotId: SLOT_SOON,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    // SOON_AT'e 2 saat vardı; 1 dakika ilerletmek pencereyi kapatır.
    const tooLate = new Date(NOW.getTime() + 60_000);

    await expect(
      cancelAppointment({
        userId: STAFF_USER,
        appointmentId: created.appointmentId,
        actorIp: ACTOR_IP,
        now: tooLate,
      }),
    ).rejects.toMatchObject({ code: "CANCELLATION_TOO_LATE", status: 409 });

    // Reddedilen iptal saati boşaltmamalı.
    const slot = await prisma.doctorSlot.findUnique({ where: { id: SLOT_SOON } });

    expect(slot?.isBooked).toBe(true);
  });

  it("aynı randevu iki kez iptal edilemez", async () => {
    const created = await bookAppointment({
      userId: STAFF_USER,
      slotId: SLOT_NEXT_DAY,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await cancelAppointment({
      userId: STAFF_USER,
      appointmentId: created.appointmentId,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await expect(
      cancelAppointment({
        userId: STAFF_USER,
        appointmentId: created.appointmentId,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "APPOINTMENT_ALREADY_CANCELLED", status: 409 });
  });
});

/**
 * IDOR — 03-api-guidelines.md: "Kayıt sahipliği kontrolü atlanırsa IDOR açığı
 * oluşur; bu bir hata değil, güvenlik ihlalidir."
 */
describe("IDOR: başkasının randevusuna dokunulamaz", () => {
  it("başka kullanıcının randevusunu iptal etmek 404 döner ve kaydı DEĞİŞTİRMEZ", async () => {
    const victim = await bookAppointment({
      userId: OTHER_USER,
      slotId: SLOT_NEXT_DAY,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    await expect(
      cancelAppointment({
        userId: STAFF_USER,
        appointmentId: victim.appointmentId,
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "APPOINTMENT_NOT_FOUND", status: 404 });

    const appointment = await prisma.appointment.findUnique({
      where: { id: victim.appointmentId },
    });
    const slot = await prisma.doctorSlot.findUnique({ where: { id: SLOT_NEXT_DAY } });

    expect(appointment?.status).toBe("booked");
    expect(slot?.isBooked).toBe(true);
  });

  /**
   * "Yok" ile "senin değil" AYNI yanıtı üretmeli; farklı kod dönmek takvimde
   * hangi kayıtların bulunduğunu ele verirdi.
   */
  it("var olmayan randevu ile başkasının randevusu AYNI hatayı döner", async () => {
    const victim = await bookAppointment({
      userId: OTHER_USER,
      slotId: SLOT_NEXT_DAY,
      actorIp: ACTOR_IP,
      now: NOW,
    });

    const foreign = await cancelAppointment({
      userId: STAFF_USER,
      appointmentId: victim.appointmentId,
      actorIp: ACTOR_IP,
      now: NOW,
    }).catch((error: { code: string; status: number }) => error);

    const missing = await cancelAppointment({
      userId: STAFF_USER,
      appointmentId: testId("appointment", "yok"),
      actorIp: ACTOR_IP,
      now: NOW,
    }).catch((error: { code: string; status: number }) => error);

    expect(foreign).toMatchObject({ code: "APPOINTMENT_NOT_FOUND", status: 404 });
    expect(missing).toMatchObject({ code: "APPOINTMENT_NOT_FOUND", status: 404 });
  });
});

describe("var olmayan saat", () => {
  it("404 SLOT_NOT_FOUND döner", async () => {
    await expect(
      bookAppointment({
        userId: STAFF_USER,
        slotId: testId("slot", "yok"),
        actorIp: ACTOR_IP,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "SLOT_NOT_FOUND", status: 404 });
  });
});

describe("hız sınırı", () => {
  it("bütçe dolunca 429 döner ve sayaç KULLANICI başınadır", async () => {
    // Bütçeyi başarısız isteklerle tüket: sayaç denemeyi sayar, sonucu değil.
    for (let attempt = 0; attempt < APPOINTMENT_WRITE_RATE_LIMIT_MAX; attempt += 1) {
      await bookAppointment({
        userId: STAFF_USER,
        slotId: testId("slot", "yok"),
        actorIp: ACTOR_IP,
        now: NOW,
      }).catch(() => undefined);
    }

    await expect(
      bookAppointment({ userId: STAFF_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });

    // Aynı IP'den gelen BAŞKA bir kullanıcı etkilenmemeli: personelin tamamı
    // aynı kurumsal IP'nin arkasından girebilir.
    await expect(
      bookAppointment({ userId: OTHER_USER, slotId: SLOT_SOON, actorIp: ACTOR_IP, now: NOW }),
    ).resolves.toMatchObject({ appointmentId: expect.any(String) });
  });
});

async function seedFixtures(): Promise<void> {
  await prisma.user.createMany({
    data: [STAFF_USER, OTHER_USER].map((id, index) => ({
      id,
      fullName: `Test Personel ${index + 1}`,
      email: `${id}@ornek.test`,
      identityStatus: "kps_verified" as const,
      isStaff: true,
      isSeedData: true,
    })),
  });

  await prisma.specialty.createMany({
    data: [
      { id: SPECIALTY_A, name: testId("branş", "a"), isSeedData: true },
      { id: SPECIALTY_B, name: testId("branş", "b"), isSeedData: true },
    ],
  });

  // `isSeedData` her satıra tek tek yazılıyor, `.map()` ile eklenmiyor:
  // `.map()` içinde unvan `string`'e genişliyor ve Prisma'nın `DoctorTitle`
  // enum'ıyla uyuşmuyor.
  await prisma.doctor.createMany({
    data: [
      {
        id: DOCTOR_A1,
        specialtyId: SPECIALTY_A,
        fullName: "Test Doktor A1",
        title: "specialist",
        isSeedData: true,
      },
      {
        id: DOCTOR_A2,
        specialtyId: SPECIALTY_A,
        fullName: "Test Doktor A2",
        title: "physician",
        isSeedData: true,
      },
      {
        id: DOCTOR_B1,
        specialtyId: SPECIALTY_B,
        fullName: "Test Doktor B1",
        title: "professor",
        isSeedData: true,
      },
    ],
  });

  await prisma.doctorSlot.createMany({
    data: [
      { id: SLOT_SOON, doctorId: DOCTOR_A1, startsAt: SOON_AT },
      { id: SLOT_LATER, doctorId: DOCTOR_A1, startsAt: LATER_AT },
      // Aynı branş, FARKLI doktor, aynı gün → "aynı gün ikinci randevu" kuralı.
      { id: SLOT_OTHER_DOCTOR, doctorId: DOCTOR_A2, startsAt: SOON_AT },
      // Farklı branş, aynı gün → kural tetiklenmemeli.
      { id: SLOT_OTHER_SPECIALTY, doctorId: DOCTOR_B1, startsAt: SOON_AT },
      { id: SLOT_NEXT_DAY, doctorId: DOCTOR_A1, startsAt: NEXT_DAY_AT },
      { id: SLOT_PAST, doctorId: DOCTOR_A1, startsAt: PAST_AT },
    ].map((slot) => ({ ...slot, isSeedData: true })),
  });
}

/** Yazma bütçesi sayaçlarını sıfırlar — testler birbirinin bütçesini yemesin. */
async function resetBudgets(): Promise<void> {
  await Promise.all(
    [STAFF_USER, OTHER_USER].map((userId) =>
      resetRateLimit(rateLimitKey("appointment_write", "user", userId)),
    ),
  );
}
