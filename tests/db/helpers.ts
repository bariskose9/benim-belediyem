import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../src/generated/prisma/client.js";

/**
 * GERÇEK veritabanına bağlanan testlerin ortak altyapısı.
 *
 * Neden ayrı bir katman: `tests/unit` ve `tests/integration` Prisma'yı taklit
 * eder ve saniyeler içinde çalışır. Ama benzersiz index'in gerçekten çalıştığı
 * ancak PostgreSQL'e sorularak kanıtlanabilir — taklit edilmiş bir istemci
 * "ikinci kayıt yazılamaz" demez, çünkü kısıtı zorlayan veritabanıdır.
 *
 * Bu testler `npm run test:db` ile ve CI'da e2e iş akışında çalışır; oradaki
 * PostgreSQL servisi zaten ayaktadır.
 */

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Veritabanı testleri için DIRECT_URL (veya DATABASE_URL) gerekli.");
}

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Test verisinin kimlik öneki — temizlik yalnızca bu kayıtlara dokunur. */
export const TEST_PREFIX = "test-db";

export function testId(...parts: readonly (string | number)[]): string {
  return [TEST_PREFIX, ...parts].join("-");
}

/**
 * Test kayıtlarını siler. Sıra yabancı anahtar zincirini takip eder: alt kayıt
 * önce, üst kayıt sonra. Tohumlanmış sahte veriye DOKUNMAZ.
 */
export async function cleanupTestData(): Promise<void> {
  const startsWith = { startsWith: TEST_PREFIX };

  await prisma.appointment.deleteMany({ where: { id: startsWith } });
  await prisma.doctorSlot.deleteMany({ where: { id: startsWith } });
  await prisma.doctor.deleteMany({ where: { id: startsWith } });
  await prisma.specialty.deleteMany({ where: { id: startsWith } });

  await prisma.seatReservation.deleteMany({ where: { id: startsWith } });
  await prisma.event.deleteMany({ where: { id: startsWith } });
  await prisma.venueSeat.deleteMany({ where: { id: startsWith } });
  await prisma.venue.deleteMany({ where: { id: startsWith } });

  await prisma.membershipPayment.deleteMany({ where: { id: startsWith } });
  await prisma.membership.deleteMany({ where: { id: startsWith } });
  await prisma.membershipPlan.deleteMany({ where: { id: startsWith } });

  await prisma.payment.deleteMany({ where: { id: startsWith } });
  await prisma.savedCard.deleteMany({ where: { id: startsWith } });
  await prisma.user.deleteMany({ where: { id: startsWith } });
}

/**
 * Bir yazma işleminin benzersizlik kısıtına takıldığını doğrular.
 *
 * Prisma benzersiz kısıt ihlalini `P2002` koduyla bildirir; uygulama katmanı
 * bunu 409'a çevirecek (03-api-guidelines.md). Hata kodunu burada kontrol etmek,
 * "herhangi bir hata aldık" ile "doğru kısıt çalıştı" arasındaki farkı korur.
 */
export async function expectUniqueViolation(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const code = (error as { code?: string }).code;

    if (code !== "P2002") {
      throw new Error(`Benzersizlik hatası (P2002) bekleniyordu, gelen kod: ${code ?? "yok"}`);
    }

    return;
  }

  throw new Error("Kayıt yazılabildi — benzersiz index çalışmıyor.");
}
