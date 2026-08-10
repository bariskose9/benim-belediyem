import { hashPassword } from "../../../src/features/auth/services/password.service.js";
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
 * ŞİFRE (adım 4b-1'de eklendi, teknik borç #15 kapandı): yalnızca DEMO
 * hesaplara argon2id özeti yazılır. Arka plan hesaplarının şifresi YOKTUR ve
 * bu bilinçlidir — onlar hiç giriş yapmayacak, yalnızca dolu kayıtların sahibi
 * olsunlar diye varlar. 80 gereksiz argon2 özeti tohumlamayı ~8 saniye
 * uzatırdı (argon2 kasıtlı olarak yavaştır, ADR-011).
 */

/**
 * Demo hesapların şifresi.
 *
 * SAHTE VERİDİR ve herkese açıktır — tıpkı `belediye:belediye` veritabanı
 * şifresi gibi. `docs/project/test-hesaplari.md` bu değeri yazar; o dosya
 * tohumlama tarafından üretilir, elle düzenlenmez.
 *
 * Gerçek bir kullanıcı bu şifreyle kayıt OLAMAZ: `checkPasswordPolicy`
 * yaygın şifre listesini uygular ve kayıt akışı ayrıca 8 karakter alt sınırı
 * ile kişisel veri kontrolünden geçer. Bu değer yalnızca tohumlamaya özeldir.
 */
export const DEMO_PASSWORD = "Test1234!";

const DEMO_STAFF_CITIZEN_INDEXES = [100, 101, 102] as const;
const DEMO_CITIZEN_INDEXES = [10, 11, 12, 13, 14, 15, 16] as const;
const BACKGROUND_STAFF_RANGE = { start: 103, count: 40 } as const;
const BACKGROUND_CITIZEN_RANGE = { start: 17, count: 40 } as const;

/**
 * SONRADAN EKLENEN demo personel hesapları (adım 12).
 *
 * ═══ NEDEN LİSTENİN SONUNA EKLENİYOR, ARAYA DEĞİL ═══
 *
 * Hesapların satır kimliği ve e-posta adresi `plan` dizisindeki SIRADAN
 * türetiliyor (`seedId("user", order + 1)`, `fakeEmail(..., order + 1)`).
 * Yeni girdiyi `DEMO_STAFF_CITIZEN_INDEXES` içine koymak kendisinden sonraki
 * her hesabın sırasını bir kaydırırdı: `emre.arslan1` başka birine geçer,
 * E2E testlerindeki ve `test-hesaplari.md`'deki numaralar tutmaz, üstelik
 * mevcut bir veritabanında tohumlama aynı kişileri YENİ kimliklerle bir kez
 * daha yazardı (`skipDuplicates` yalnızca aynı kimliği atlar).
 *
 * Sona eklemek bu risklerin hiçbirini taşımıyor: 1-90 arası her satır
 * olduğu yerde kalıyor, yeni hesaplar 91 ve 92 numarayı alıyor.
 *
 * NEDEN GEREKİYOR: spor salonu üyeliğinde "bir kullanıcıya tek aktif üyelik"
 * kuralı var (PRD §5.6), yani üyelik testi hesap PAYLAŞAMAZ. İki Playwright
 * projesi (masaüstü + 375px) aynı anda koştuğu için her birine ayrı personel
 * hesabı gerekiyor; mevcut üç demo personelin ikisi hastane testine ait.
 *
 * Kimlik havuzu: 143 ve 144 numaralı sahte vatandaşlar teşkilat şemasında
 * personel olarak zaten var ama hiçbir hesaba bağlı değildi (arka plan
 * personeli 103-142 aralığını kullanıyor).
 */
const LATE_DEMO_STAFF_CITIZEN_INDEXES = [143, 144] as const;

/**
 * SONRADAN EKLENEN demo VATANDAŞ hesapları (adım 15).
 *
 * Yukarıdaki "sona ekle, araya ekleme" gerekçesinin aynısı geçerli; bu satırlar
 * da listenin en sonunda duruyor ve 1-92 arası hiçbir hesabı kaydırmıyor.
 *
 * NEDEN GEREKİYOR: profil ekranının uçtan uca testi kullanıcının adreslerini ve
 * kayıtlı kartlarını DEĞİŞTİRİYOR (ekliyor, düzenliyor, siliyor). Bu kayıtlar
 * ödeme ve üyelik testlerinin de kullandığı kayıtlar; hesap paylaşılsaydı
 * paralel koşan iki spec birbirinin verisini bozardı. Mevcut 12 demo hesabın
 * hepsi başka spec dosyalarına ayrılmış durumda.
 *
 * PERSONEL DEĞİL VATANDAŞ: adres ve kart yönetimi `authenticated` kademesinde,
 * personel yetkisi istemiyor (PRD §5.0 erişim tablosu).
 *
 * Kimlik havuzu: arka plan vatandaşları 17-56 aralığını kullanıyor, 57 ve 58
 * boştaydı.
 */
const LATE_DEMO_CITIZEN_INDEXES = [57, 58] as const;

/**
 * SONRADAN EKLENEN demo VATANDAŞ hesapları (adım 15c).
 *
 * Aynı "sona ekle, araya ekleme" gerekçesi; 1-94 arası hiçbir hesap kaymıyor.
 *
 * NEDEN GEREKİYOR: Google bağlantısının uçtan uca testi hesabın GİRİŞ
 * YÖNTEMLERİNİ değiştiriyor (bağlantı ekliyor ve kaldırıyor). Bu, hesabın
 * giriş yapabilirliğini doğrudan etkileyen bir yazma; paylaşılan bir hesapta
 * paralel koşan başka bir spec'in girişini bozabilirdi. İki Playwright projesi
 * (masaüstü + 375px) aynı anda koştuğu için iki ayrı hesap gerekiyor.
 *
 * Kimlik havuzu: arka plan vatandaşları 17-56 aralığını kullanıyor; 57-58
 * adım 15'e gitti, 59 ve 60 boştaydı.
 */
const GOOGLE_LINK_DEMO_CITIZEN_INDEXES = [59, 60] as const;

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
    // Sıra bozulmasın diye EN SONDA (gerekçe yukarıda).
    ...LATE_DEMO_STAFF_CITIZEN_INDEXES.map((index) => ({ index, isDemoAccount: true })),
    ...LATE_DEMO_CITIZEN_INDEXES.map((index) => ({ index, isDemoAccount: true })),
    ...GOOGLE_LINK_DEMO_CITIZEN_INDEXES.map((index) => ({ index, isDemoAccount: true })),
  ];

  // Tek özet üretilip demo hesaplarda paylaşılıyor. Aynı şifre için ayrı ayrı
  // özet üretmek 10 kez ~100 ms CPU harcardı ve sahte veride hiçbir şey
  // kazandırmazdı; argon2'nin tuzu zaten özetin içinde.
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

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
      // Yalnızca demo hesaplar giriş yapabilir (yukarıdaki gerekçe).
      passwordHash: entry.isDemoAccount ? demoPasswordHash : null,
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
