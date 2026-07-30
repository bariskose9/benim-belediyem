import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { startOfUtcDay } from "./lib/seed-helpers.js";
import { seedCatalog } from "./steps/catalog.js";
import { seedEvents } from "./steps/events.js";
import { seedHealth } from "./steps/health.js";
import { seedKpsCitizens } from "./steps/kps-citizens.js";
import { seedOrganization } from "./steps/organization.js";
import { seedOwner } from "./steps/owner.js";
import { writeTestAccountsDoc } from "./steps/test-accounts.js";
import { seedUsers } from "./steps/users.js";
import type { SeedContext } from "./types.js";

/**
 * Tohumlamanın giriş noktası.
 *
 * İDEMPOTENT: her sahte kaydın sabit kimliği vardır ve yazma
 * `createMany({ skipDuplicates: true })` ile yapılır. İkinci çalıştırma çakışan
 * satırları atlar; kayıt sayıları değişmez (04-database.md "Seed").
 *
 * SIRA ÖNEMLİ: yabancı anahtarlar veritabanı seviyesinde zorlanır, üst kayıt
 * yazılmadan alt kayıt yazılamaz.
 *   KPS havuzu → teşkilat + personel → üyeler → katalog → hastane → etkinlik → sahip
 */
export interface SeedSummary {
  readonly [table: string]: number | string;
}

export async function seedAll(
  prisma: PrismaClient,
  options: { readonly log?: (message: string) => void } = {},
): Promise<SeedSummary> {
  const log = options.log ?? (() => {});
  const context: SeedContext = {
    prisma,
    today: startOfUtcDay(),
    now: new Date(),
    hashSalt: requireEnv("NATIONAL_ID_HASH_SALT"),
    encryptionKey: requireEnv("NATIONAL_ID_ENCRYPTION_KEY"),
    log,
  };

  const kps = await seedKpsCitizens(context);
  const organization = await seedOrganization(context, kps.citizens);
  const users = await seedUsers(context, kps.citizens, organization.staff);
  const catalog = await seedCatalog(context);
  const health = await seedHealth(context, users.staffUsers);
  const events = await seedEvents(context, users.users);
  const owner = await seedOwner(context, organization.ownerBranchUnitId);

  await writeTestAccountsDoc(context, {
    citizens: kps.citizens,
    demoUsers: users.demoUsers,
    notFoundNationalId: kps.notFoundNationalId,
  });

  return {
    kps_citizens: kps.citizens.length,
    org_units: organization.orgUnitCount,
    staff_members: organization.staff.length,
    users: users.users.length,
    addresses: users.addressCount,
    saved_cards: users.savedCardCount,
    products: catalog.productCount,
    menu_items: catalog.menuItemCount,
    membership_plans: catalog.planCount,
    specialties: health.specialtyCount,
    doctors: health.doctorCount,
    doctor_slots: health.slotCount,
    appointments: health.appointmentCount,
    venues: events.venueCount,
    venue_seats: events.seatCount,
    events: events.eventCount,
    seat_reservations: events.reservationCount,
    owner_account: owner,
  };
}

/**
 * Zorunlu ortam değişkenini okur.
 *
 * Neden `src/config/env.ts` kullanılmıyor: o dosya içe aktarıldığı anda
 * `NEXT_PUBLIC_*` değişkenlerini de doğruluyor. Tohumlama betiği Next.js
 * çalışma anının dışında koşar ve o değişkenlere ihtiyacı yoktur.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} tanımlı değil — kimlik numarası şifrelenip özetlenemez.\n` +
        "Yapılacak: .env.example dosyasındaki local değeri .env dosyana kopyala.\n" +
        "Preview ve production için değer Vercel panelinden ORTAMA ÖZEL girilir; " +
        "aynı anahtar iki ortamda kullanılmaz (docs/standards/13-environments.md).",
    );
  }

  return value;
}
