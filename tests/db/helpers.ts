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

  /**
   * Randevular ÜÇ ÖLÇÜTLE siliniyor, yalnızca kimlik önekiyle değil.
   *
   * Sebep: servis katmanını çağıran testlerde randevuyu UYGULAMA oluşturuyor
   * ve kimliği `cuid()` oluyor — test öneki taşımıyor. O satırlar kalırsa
   * `doctor_slots` silinemez (`appointments_slot_id_fkey` Restrict) ve
   * temizlik tamamen patlar. Slot ve kullanıcı kimliği ise test önekli
   * olduğu için kaydı oradan yakalıyoruz.
   */
  await prisma.appointment.deleteMany({
    where: { OR: [{ id: startsWith }, { slotId: startsWith }, { userId: startsWith }] },
  });
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

  /**
   * Sepet, sipariş ve ödeme kayıtlarının çoğunu UYGULAMA üretiyor ve kimlikleri
   * `cuid()` oluyor — test öneki taşımıyorlar. Bu yüzden kullanıcı ve sepet
   * bağı üzerinden de siliniyorlar; kalırlarsa yabancı anahtar kısıtları
   * (`Restrict`) tüm temizliği patlatır. Sıra FK zincirini takip ediyor.
   */
  await prisma.orderItem.deleteMany({ where: { order: { userId: startsWith } } });
  await prisma.order.deleteMany({ where: { userId: startsWith } });
  await prisma.cartItem.deleteMany({
    where: { OR: [{ id: startsWith }, { cart: { userId: startsWith } }] },
  });
  await prisma.cart.deleteMany({
    where: { OR: [{ id: startsWith }, { userId: startsWith }, { anonymousId: startsWith }] },
  });
  await prisma.payment.deleteMany({ where: { OR: [{ id: startsWith }, { userId: startsWith }] } });
  await prisma.savedCard.deleteMany({
    where: { OR: [{ id: startsWith }, { userId: startsWith }] },
  });
  await prisma.address.deleteMany({ where: { OR: [{ id: startsWith }, { userId: startsWith }] } });
  await prisma.menuItem.deleteMany({ where: { id: startsWith } });
  await prisma.menuCategory.deleteMany({ where: { id: startsWith } });
  await prisma.product.deleteMany({ where: { id: startsWith } });
  await prisma.productCategory.deleteMany({ where: { id: startsWith } });

  // Kayıt akışı (adım 4b-1). `otpChallenge` ve `auditLog` kullanıcıya bağlı
  // olduğu için ondan ÖNCE silinmeli.
  await prisma.otpChallenge.deleteMany({ where: { id: startsWith } });
  await prisma.auditLog.deleteMany({ where: { id: startsWith } });

  /**
   * UYGULAMANIN ÜRETTİĞİ denetim kayıtları da silinmeli.
   *
   * Yukarıdaki satır yalnızca kimliği test önekiyle başlayanları siliyor; oysa
   * servis katmanını çağıran testlerde denetim kaydını UYGULAMA yazıyor ve
   * kimliği `cuid()` oluyor. `audit_logs.user_id` üzerindeki yabancı anahtar
   * `Restrict` olduğu için bu satırlar kalırsa test kullanıcısı silinemez ve
   * bir sonraki koşu "kullanıcı zaten var" hatasıyla patlar.
   */
  await prisma.auditLog.deleteMany({ where: { userId: startsWith } });

  await prisma.registrationDraft.deleteMany({ where: { id: startsWith } });

  await prisma.user.deleteMany({ where: { id: startsWith } });

  await prisma.kpsQueryLog.deleteMany({ where: { id: startsWith } });
  await prisma.rateLimitCounter.deleteMany({ where: { id: startsWith } });
}

/**
 * Kayıt akışının ürettiği kayıtlar `cuid()` ile kimlik alır, `testId()` önekiyle
 * DEĞİL — çünkü kimlikleri uygulama üretiyor. Bu yüzden onları e-posta ve
 * kimlik özetinden bulup siliyoruz.
 *
 * Tohumlanmış sahte veriye dokunmaz: yalnızca verilen değerlerle eşleşenleri siler.
 */
export async function cleanupRegistration(email: string, nationalIdHash: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { OR: [{ email }, { nationalIdHash }] },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const drafts = await prisma.registrationDraft.findMany({
    where: { nationalIdHash },
    select: { id: true },
  });

  await prisma.otpChallenge.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { registrationId: { in: drafts.map((d) => d.id) } }],
    },
  });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.registrationDraft.deleteMany({ where: { nationalIdHash } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
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
