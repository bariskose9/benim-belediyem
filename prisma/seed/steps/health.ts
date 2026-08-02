import { SPECIALTIES } from "../data/catalog.js";
import { FEMALE_FIRST_NAMES, LAST_NAMES, MALE_FIRST_NAMES } from "../data/people.js";
import { createRng } from "../lib/rng.js";
import { addDays, insertInChunks, seedId, turkeyTimeToUtc } from "../lib/seed-helpers.js";
import type { SeedContext, SeededUser } from "../types.js";

/**
 * Hastane randevu verisi (fake-data-guide.md "Hastane randevu").
 * Ücret yoktur. 8 branş × 3-5 doktor; her doktora önümüzdeki 14 gün için
 * 20 dakikalık slotlar (09:00-12:00 ve 13:30-16:30, Türkiye saati).
 *
 * DOLULUK vs RANDEVU — ikisi aynı şey değildir:
 *  · Slotların %30'u `isBooked = true` yapılır; salon gerçekçi görünsün diye.
 *  · Bunların bir kısmına GERÇEK randevu kaydı bağlanır ve sahibi bir personel
 *    hesabıdır. Geri kalanı "başkasının randevusu"dur — uygulama zaten
 *    başkasının randevusunu göstermez, yalnızca saatin dolu olduğunu bilir.
 *  · Kişi başına randevu sayısı gerçekçi tutulur; aksi hâlde tek kullanıcıya
 *    yüzlerce randevu yazmak gerekirdi ve "aynı branşta aynı gün ikinci randevu
 *    alınamaz" kuralı (PRD §5.1) seed verisinin kendisiyle çelişirdi.
 */

const SLOT_DAYS = 14;
const SLOT_MINUTES = 20;
const MORNING = { startHour: 9, endHour: 12 };
const AFTERNOON = { startHour: 13, startMinute: 30, endHour: 16, endMinute: 30 };
const BOOKED_RATIO = 0.3;
const MAX_APPOINTMENTS_PER_USER = 2;

export interface HealthSeedResult {
  readonly specialtyCount: number;
  readonly doctorCount: number;
  readonly slotCount: number;
  readonly bookedSlotCount: number;
  readonly appointmentCount: number;
}

export async function seedHealth(
  context: SeedContext,
  staffUsers: readonly SeededUser[],
): Promise<HealthSeedResult> {
  const rng = createRng(20260736);

  const specialties = SPECIALTIES.map((name, order) => ({
    id: seedId("specialty", order + 1),
    name,
    isSeedData: true,
  }));

  await context.prisma.specialty.createMany({ data: specialties, skipDuplicates: true });

  const usedDoctorNames = new Set<string>();
  let doctorOrder = 0;

  const doctors = specialties.flatMap((specialty) =>
    Array.from({ length: rng.int(3, 5) }, () => {
      doctorOrder += 1;

      return {
        id: seedId("doctor", doctorOrder),
        specialtyId: specialty.id,
        fullName: uniqueDoctorName(rng, usedDoctorNames),
        title: rng.pick(["professor", "associate_professor", "specialist", "physician"] as const),
        isSeedData: true,
      };
    }),
  );

  await context.prisma.doctor.createMany({ data: doctors, skipDuplicates: true });

  const slots = doctors.flatMap((doctor, index) =>
    buildSlots(context.today, doctor.id, index + 1).map((slot) => ({
      ...slot,
      // Doluluk deterministik: aynı gün ikinci çalıştırmada aynı slotlar dolu çıkar.
      isBooked: rng.chance(BOOKED_RATIO),
      isSeedData: true,
    })),
  );

  await insertInChunks(slots, 1000, (chunk) =>
    context.prisma.doctorSlot.createMany({ data: chunk, skipDuplicates: true }),
  );

  const bookedSlots = slots.filter((slot) => slot.isBooked);
  const appointmentCount = await seedAppointments(context, {
    rng,
    bookedSlots,
    doctors,
    staffUsers,
  });

  context.log(
    `Hastane: ${specialties.length} branş · ${doctors.length} doktor · ${slots.length} slot ` +
      `(${bookedSlots.length} dolu) · ${appointmentCount} randevu`,
  );

  return {
    specialtyCount: specialties.length,
    doctorCount: doctors.length,
    slotCount: slots.length,
    bookedSlotCount: bookedSlots.length,
    appointmentCount,
  };
}

/** Bir doktorun 14 günlük slot takvimi. Slot kimliği tarihe bağlıdır → idempotent. */
function buildSlots(
  today: Date,
  doctorId: string,
  doctorIndex: number,
): { id: string; doctorId: string; startsAt: Date }[] {
  const slots: { id: string; doctorId: string; startsAt: Date }[] = [];

  for (let dayOffset = 0; dayOffset < SLOT_DAYS; dayOffset += 1) {
    const day = addDays(today, dayOffset);

    for (const startsAt of buildDaySlots(day)) {
      slots.push({
        // Kimlik tarih ve saati içerir: aynı gün tekrar tohumlanırsa aynı satır,
        // ertesi gün tohumlanırsa yeni günün slotları eklenir.
        id: seedId("slot", doctorIndex, formatSlotKey(startsAt)),
        doctorId,
        startsAt,
      });
    }
  }

  return slots;
}

function buildDaySlots(day: Date): Date[] {
  const times: Date[] = [];

  const morningEnd = turkeyTimeToUtc(day, MORNING.endHour, 0);
  for (
    let cursor = turkeyTimeToUtc(day, MORNING.startHour, 0);
    cursor < morningEnd;
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000)
  ) {
    times.push(cursor);
  }

  const afternoonEnd = turkeyTimeToUtc(day, AFTERNOON.endHour, AFTERNOON.endMinute);
  for (
    let cursor = turkeyTimeToUtc(day, AFTERNOON.startHour, AFTERNOON.startMinute);
    cursor < afternoonEnd;
    cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60 * 1000)
  ) {
    times.push(cursor);
  }

  return times;
}

/** `20260731-0900` biçiminde okunabilir ve sıralanabilir slot anahtarı. */
function formatSlotKey(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");

  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
  );
}

/**
 * Dolu slotların bir kısmına gerçek randevu bağlar.
 *
 * PRD §5.1 kuralına uyar: **aynı kullanıcının aynı branşta birden fazla AKTİF
 * randevusu olamaz.** Kural 2026-08-03'te "aynı gün"den "aktif randevu"ya
 * sıkılaştırıldı; tohum da onunla birlikte güncellendi. Aksi hâlde tohumlanmış
 * veri, uygulamanın kendi kuralını çiğniyor olurdu — kullanıcı ekranda iki
 * Dahiliye randevusu görür ama üçüncüsünü alamazdı.
 */
async function seedAppointments(
  context: SeedContext,
  input: {
    rng: ReturnType<typeof createRng>;
    bookedSlots: readonly { id: string; doctorId: string; startsAt: Date }[];
    doctors: readonly { id: string; specialtyId: string }[];
    staffUsers: readonly SeededUser[];
  },
): Promise<number> {
  const { rng, bookedSlots, doctors, staffUsers } = input;

  if (staffUsers.length === 0) return 0;

  const specialtyByDoctor = new Map(doctors.map((doctor) => [doctor.id, doctor.specialtyId]));
  const takenPerUser = new Map<string, number>();
  const usedSlots = new Set<string>();
  /**
   * `kullanıcı:branş` — aynı branşta İKİNCİ AKTİF randevuyu engeller.
   *
   * Anahtarda gün YOK ve bu bilinçli: PRD §5.1 artık aynı branşta bekleyen
   * randevusu olana hiçbir güne yeni randevu vermiyor. Gün anahtara girseydi
   * tohum, uygulamanın reddedeceği bir veri üretirdi.
   */
  const usedSpecialty = new Set<string>();
  const rows: {
    id: string;
    userId: string;
    slotId: string;
    status: "booked";
    isSeedData: boolean;
  }[] = [];

  // Geçmiş saate randevu üretilmez (PRD §5.1: geçmiş tarihe randevu alınamaz).
  // Ölçüt gün başı DEĞİL şu andır: tohumlama öğleden sonra çalıştığında bugünün
  // sabah slotları da geçmiştedir.
  const future = rng.shuffled(bookedSlots.filter((slot) => slot.startsAt > context.now));

  for (const user of staffUsers) {
    for (const slot of future) {
      if ((takenPerUser.get(user.id) ?? 0) >= MAX_APPOINTMENTS_PER_USER) break;
      if (usedSlots.has(slot.id)) continue;

      const guard = `${user.id}:${specialtyByDoctor.get(slot.doctorId)}`;

      if (usedSpecialty.has(guard)) continue;

      usedSlots.add(slot.id);
      usedSpecialty.add(guard);
      takenPerUser.set(user.id, (takenPerUser.get(user.id) ?? 0) + 1);

      rows.push({
        id: seedId("appointment", rows.length + 1),
        userId: user.id,
        slotId: slot.id,
        status: "booked",
        isSeedData: true,
      });
    }
  }

  await context.prisma.appointment.createMany({ data: rows, skipDuplicates: true });

  return rows.length;
}

function uniqueDoctorName(rng: ReturnType<typeof createRng>, used: Set<string>): string {
  for (;;) {
    const firstName = rng.chance(0.5) ? rng.pick(MALE_FIRST_NAMES) : rng.pick(FEMALE_FIRST_NAMES);
    const fullName = `${firstName} ${rng.pick(LAST_NAMES)}`;

    if (!used.has(fullName)) {
      used.add(fullName);

      return fullName;
    }
  }
}
