import { encryptNationalId, hashNationalId, maskNationalId } from "../../../src/lib/crypto.js";
import { TEST_CARDS } from "../data/catalog.js";
import { FAKE_NEIGHBOURHOODS, FAKE_STREETS, IZMIR_DISTRICTS } from "../data/people.js";
import { createRng } from "../lib/rng.js";
import { fakeEmail, fakePhone, seedId } from "../lib/seed-helpers.js";
import type { SeedContext, SeededCitizen, SeededStaff, SeededUser } from "../types.js";

/**
 * Üye hesapları (fake-data-guide.md "İnsan verisi").
 *
 * İKİ TÜR HESAP VAR ve ayrım bilinçlidir:
 *  · DEMO hesap (10 adet) — ekranda gezmek için; en az 3'ü personel, 7'si vatandaş.
 *    Adres ve kayıtlı kartlar bunlara bağlanır.
 *  · ARKA PLAN hesabı (80 adet) — satılmış koltuk ve dolu randevu gibi kayıtların
 *    SAHİBİ olsun diye. Böylece her dolu kaydın gerçek bir sahibi olur ama demo
 *    hesapların profili onlarca kayıtla dolmaz.
 *
 * Hepsi sahte KPS havuzundan gelir; kimlik numarası ŞİFRELİ + ÖZETLİ + MASKELİ
 * saklanır, düz metin yazılmaz (05-auth-security.md).
 *
 * ⚠️ `passwordHash` bu adımda BOŞ bırakılır: şifre özetleme kütüphanesi
 * (argon2/bcrypt, cost >= 12) kimlik doğrulama adımında (roadmap 4b) seçilecek.
 * Şimdi rastgele bir algoritmayla yazmak, 4b'de tüm kayıtları geçersiz kılardı.
 */

/** Demo hesaplarda kullanılacak şifre — yalnızca local/preview (fake-data-guide.md). */
export const DEMO_PASSWORD = "Test1234!";

const DEMO_STAFF_CITIZEN_INDEXES = [100, 101, 102] as const;
const DEMO_CITIZEN_INDEXES = [10, 11, 12, 13, 14, 15, 16] as const;
const BACKGROUND_STAFF_RANGE = { start: 103, count: 40 } as const;
const BACKGROUND_CITIZEN_RANGE = { start: 17, count: 40 } as const;

export interface UserSeedResult {
  readonly users: readonly SeededUser[];
  readonly demoUsers: readonly SeededUser[];
  readonly staffUsers: readonly SeededUser[];
  readonly addressCount: number;
  readonly savedCardCount: number;
}

export async function seedUsers(
  context: SeedContext,
  citizens: readonly SeededCitizen[],
  staff: readonly SeededStaff[],
): Promise<UserSeedResult> {
  const rng = createRng(20260733);
  const staffByCitizenIndex = new Map(staff.map((member) => [member.citizenIndex, member]));

  const plan = [
    ...DEMO_STAFF_CITIZEN_INDEXES.map((index) => ({ index, isDemoAccount: true })),
    ...DEMO_CITIZEN_INDEXES.map((index) => ({ index, isDemoAccount: true })),
    ...range(BACKGROUND_STAFF_RANGE).map((index) => ({ index, isDemoAccount: false })),
    ...range(BACKGROUND_CITIZEN_RANGE).map((index) => ({ index, isDemoAccount: false })),
  ];

  const rows = plan.map((entry, order) => {
    const citizen = citizens[entry.index];
    const staffMember = staffByCitizenIndex.get(entry.index);

    return {
      id: seedId("user", order + 1),
      // Şifreli değer her çalıştırmada farklıdır (rastgele nonce); satır sabit
      // kimliği sayesinde ikinci tohumlamada hiç yeniden yazılmaz.
      nationalIdEncrypted: encryptNationalId(citizen.nationalId, context.encryptionKey),
      nationalIdHash: hashNationalId(citizen.nationalId, context.hashSalt),
      nationalIdMasked: maskNationalId(citizen.nationalId),
      fullName: citizen.fullName,
      birthDate: citizen.birthDate,
      email: fakeEmail(citizen.firstName, citizen.lastName, order + 1),
      emailVerifiedAt: context.today,
      phone: fakePhone(order + 1),
      phoneVerifiedAt: context.today,
      passwordHash: null,
      role: "user" as const,
      identityStatus: "kps_verified" as const,
      isStaff: staffMember !== undefined,
      staffMemberId: staffMember?.id ?? null,
      registeredProvince: citizen.registeredProvince,
      registeredDistrict: citizen.registeredDistrict,
      kpsSyncedAt: context.today,
      isSeedData: true,
      citizenIndex: entry.index,
      isDemoAccount: entry.isDemoAccount,
    };
  });

  // `citizenIndex` ve `isDemoAccount` tabloya ait değil; yalnızca sonraki
  // adımların kimin kim olduğunu bilmesi için taşınıyor.
  await context.prisma.user.createMany({
    data: rows.map(({ citizenIndex: _citizenIndex, isDemoAccount: _isDemoAccount, ...row }) => row),
    skipDuplicates: true,
  });

  const users: readonly SeededUser[] = rows.map((row) => ({
    id: row.id,
    citizenIndex: row.citizenIndex,
    fullName: row.fullName,
    email: row.email,
    isStaff: row.isStaff,
    isDemoAccount: row.isDemoAccount,
  }));

  const demoUsers = users.filter((user) => user.isDemoAccount);
  const addressCount = await seedAddresses(context, demoUsers, rng);
  const savedCardCount = await seedSavedCards(context, demoUsers);

  context.log(
    `Üyeler: ${users.length} hesap (${demoUsers.length} demo / ${users.length - demoUsers.length} arka plan) · ` +
      `${addressCount} adres · ${savedCardCount} kayıtlı kart`,
  );

  return {
    users,
    demoUsers,
    staffUsers: users.filter((user) => user.isStaff),
    addressCount,
    savedCardCount,
  };
}

/** Teslimat adresi — nüfus adresinden ayrıdır, ilçe gerçek, sokak uydurmadır. */
async function seedAddresses(
  context: SeedContext,
  demoUsers: readonly SeededUser[],
  rng: ReturnType<typeof createRng>,
): Promise<number> {
  const rows = demoUsers.flatMap((user, userOrder) => {
    const titles = rng.chance(0.5) ? (["Ev", "İş"] as const) : (["Ev"] as const);

    return titles.map((title, addressOrder) => ({
      id: seedId("address", userOrder + 1, addressOrder + 1),
      userId: user.id,
      title,
      fullAddress: `${rng.pick(FAKE_NEIGHBOURHOODS)} Mahallesi, ${rng.pick(FAKE_STREETS)} Sokak No: ${rng.int(1, 120)}, Daire: ${rng.int(1, 20)}`,
      district: rng.pick(IZMIR_DISTRICTS),
      isSeedData: true,
    }));
  });

  await context.prisma.address.createMany({ data: rows, skipDuplicates: true });

  return rows.length;
}

/**
 * Test kartları her demo hesaba kayıtlı kart olarak eklenir: başarılı, reddedilen
 * ve yetersiz bakiye yollarının hepsi tek hesapla denenebilsin diye.
 * VERİTABANINA YALNIZCA SON 4 HANE YAZILIR.
 */
async function seedSavedCards(
  context: SeedContext,
  demoUsers: readonly SeededUser[],
): Promise<number> {
  const rows = demoUsers.flatMap((user, userOrder) =>
    TEST_CARDS.map((card, cardOrder) => ({
      id: seedId("card", userOrder + 1, cardOrder + 1),
      userId: user.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      holderName: user.fullName.toLocaleUpperCase("tr-TR"),
      isSeedData: true,
    })),
  );

  await context.prisma.savedCard.createMany({ data: rows, skipDuplicates: true });

  return rows.length;
}

function range({ start, count }: { start: number; count: number }): number[] {
  return Array.from({ length: count }, (_unused, offset) => start + offset);
}
