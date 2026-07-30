import {
  BIRTH_PLACES,
  FAKE_NEIGHBOURHOODS,
  FAKE_STREETS,
  FEMALE_FIRST_NAMES,
  IZMIR_DISTRICTS,
  LAST_NAMES,
  MALE_FIRST_NAMES,
  OTHER_PROVINCES,
} from "../data/people.js";
import { createRng } from "../lib/rng.js";
import { addDays, generateFakeNationalId, seedId } from "../lib/seed-helpers.js";
import type { SeedContext, SeededCitizen } from "../types.js";

/**
 * Sahte KPS havuzu — 200 vatandaş (fake-data-guide.md "Sahte KPS kayıtları").
 *
 * ⚠️ BU KAYITLARIN TAMAMI SENTETİKTİR.
 * Kimlik numaraları kontrol basamağı algoritmasına uyar (doğrulama kodu test
 * edilebilsin diye) ve 9 ile başlar; gerçekte kullanımdaki numaralarla çakışma
 * ihtimalini azaltmak içindir. Hiçbir kayıt gerçek bir kişiyi temsil etmez.
 *
 * Bu tablo taklit edilen DIŞ KURUM veritabanıdır (ADR-003); uygulama buraya
 * doğrudan JOIN atmaz.
 */

export const CITIZEN_COUNT = 200;

/** Kayıt havuzundaki özel indeksler — testler ve dokümantasyon bunlara güvenir. */
export const CITIZEN_INDEX = {
  /** 18 yaşını doldurmamış, kayıt akışının REDDETMESİ gereken kayıtlar. */
  minors: [0, 1, 2, 3, 4],
  /** Tam bugün 18 yaşını dolduruyor — sınır durum, KABUL EDİLMELİ. */
  turnsEighteenToday: 5,
  /** Sorguda zaman aşımı simüle eder. */
  timeout: 6,
  /** Sorguda sunucu hatası simüle eder. */
  serverError: 7,
  /** Personel rehberine giren 100 kişi (fake-data-guide.md: personel de bu havuzdan). */
  staffStart: 100,
  staffEnd: 199,
} as const;

export interface KpsSeedResult {
  readonly citizens: readonly SeededCitizen[];
  /** KPS'te KAYIT YOKTUR — sorgu `not_found` dönmelidir (hata yolu testi). */
  readonly notFoundNationalId: string;
}

export async function seedKpsCitizens(context: SeedContext): Promise<KpsSeedResult> {
  const rng = createRng(20260731);
  const usedNames = new Set<string>();
  const usedNationalIds = new Set<string>();

  const uniqueNationalId = (): string => {
    // Çakışma olasılığı düşüktür ama sıfır değildir; unique index'e çarpmadan burada çözülür.
    for (;;) {
      const candidate = generateFakeNationalId(rng);

      if (!usedNationalIds.has(candidate)) {
        usedNationalIds.add(candidate);

        return candidate;
      }
    }
  };

  const uniqueFullName = (isMale: boolean): { firstName: string; lastName: string } => {
    for (;;) {
      const firstName = rng.pick(isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
      const lastName = rng.pick(LAST_NAMES);
      const key = `${firstName} ${lastName}`;

      if (!usedNames.has(key)) {
        usedNames.add(key);

        return { firstName, lastName };
      }
    }
  };

  const rows = Array.from({ length: CITIZEN_COUNT }, (_unused, index) => {
    const isMale = rng.chance(0.5);
    const { firstName, lastName } = uniqueFullName(isMale);
    const location = pickLocation(rng);

    return {
      id: seedId("kps", index + 1),
      nationalId: uniqueNationalId(),
      firstName,
      lastName,
      birthDate: pickBirthDate(context.today, index, rng),
      birthPlace: rng.pick(BIRTH_PLACES),
      fatherName: rng.pick(MALE_FIRST_NAMES),
      motherName: rng.pick(FEMALE_FIRST_NAMES),
      registeredProvince: location.province,
      registeredDistrict: location.district,
      gender: isMale ? ("male" as const) : ("female" as const),
      maritalStatus: rng.pick(["single", "married", "divorced", "widowed"] as const),
      registeredAddress: buildAddress(rng, location.district),
      simulationBehavior: pickSimulationBehavior(index),
      isSeedData: true,
    };
  });

  const citizens: readonly SeededCitizen[] = rows.map((row, index) => ({
    index,
    id: row.id,
    nationalId: row.nationalId,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: `${row.firstName} ${row.lastName}`,
    birthDate: row.birthDate,
    registeredProvince: row.registeredProvince,
    registeredDistrict: row.registeredDistrict,
  }));

  await context.prisma.kpsCitizen.createMany({ data: rows, skipDuplicates: true });

  // Bu numara ÜRETİLİR ama tabloya YAZILMAZ: sorgulandığında `not_found` dönmeli.
  const notFoundNationalId = uniqueNationalId();

  context.log(`KPS havuzu: ${CITIZEN_COUNT} sahte vatandaş`);

  return { citizens, notFoundNationalId };
}

/**
 * Doğum tarihi kuralları (fake-data-guide.md):
 *  · 5 kayıt 18 yaş altı — kayıt akışı bunları reddetmeli (PRD §5.0 yaş kuralı)
 *  · 1 kayıt tam bugün 18 yaşını dolduruyor — sınır durum, kabul edilmeli
 *  · geri kalanı 1950–2008 arası
 */
function pickBirthDate(today: Date, index: number, rng: ReturnType<typeof createRng>): Date {
  if ((CITIZEN_INDEX.minors as readonly number[]).includes(index)) {
    // 13-17 yaş arası: bugünden 17 yıl öncesi ile 13 yıl öncesi arasında.
    return addDays(today, -rng.int(13 * 365, 17 * 365));
  }

  if (index === CITIZEN_INDEX.turnsEighteenToday) {
    return new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  }

  const year = rng.int(1950, 2008);

  // Gün 28'i geçmiyor: her ayda geçerli olsun diye (artık yıl / 30-31 gün tuzağı).
  return new Date(Date.UTC(year, rng.int(0, 11), rng.int(1, 28)));
}

function pickSimulationBehavior(index: number): "normal" | "timeout" | "error" {
  if (index === CITIZEN_INDEX.timeout) return "timeout";
  if (index === CITIZEN_INDEX.serverError) return "error";

  return "normal";
}

/** Çoğunluk İzmir, bir kısmı diğer illerden (fake-data-guide.md). */
function pickLocation(rng: ReturnType<typeof createRng>): { province: string; district: string } {
  if (rng.chance(0.75)) {
    return { province: "İzmir", district: rng.pick(IZMIR_DISTRICTS) };
  }

  const other = rng.pick(OTHER_PROVINCES);

  return { province: other.province, district: rng.pick(other.districts) };
}

/** İlçe adı gerçek; mahalle, sokak ve numara uydurmadır. */
function buildAddress(rng: ReturnType<typeof createRng>, district: string): string {
  const neighbourhood = rng.pick(FAKE_NEIGHBOURHOODS);
  const street = rng.pick(FAKE_STREETS);

  return `${neighbourhood} Mahallesi, ${street} Sokak No: ${rng.int(1, 120)}, Daire: ${rng.int(1, 20)}, ${district}`;
}
