import { beforeEach, describe, expect, it } from "vitest";

import { TEST_PREFIX, cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ ADIM 17c — PERSONEL YETKİSİ İŞVEREN KONTROLLÜ KANALDAN (ADR-017 ilke 2) ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı çünkü bu dosyanın kritik iddialarını
 * yalnızca veritabanı kanıtlayabilir:
 *   · bir personel kaydı yalnızca BİR hesaba bağlanabilir —
 *     `users.staff_member_id` üzerindeki benzersizlik kısıtı
 *   · bağlama TEK KOŞULLU YAZMA ile yapılıyor; ikinci istek satırı bulamıyor
 *   · hız sınırı sayaçları gerçekten yazılıyor (ADR-006, Postgres'te)
 * Taklit bir istemci bunların hiçbirini kanıtlayamazdı.
 *
 * ⛔ KOD KANALI TAKLİT EDİLMİYOR: local'de `OTP_EMAIL_CHANNEL=mock` olduğu için
 * kod yanıtta `revealedCode` alanıyla geri geliyor. Testin gerçek gönderimi
 * beklemesi gerekmiyor ve kanalın kendi testleri ayrı.
 */

const { requestStaffVerification, confirmStaffVerification } =
  await import("@/features/staff-verification/services/staff-verification.service");
const {
  StaffAlreadyVerifiedError,
  StaffIdentityRequiredError,
  StaffVerificationCodeInvalidError,
  StaffVerificationRateLimitedError,
} = await import("@/features/staff-verification/errors");

const UNIT = testId("unit", "17c-bilgi-islem");

const STAFF_FREE = testId("staff", "17c-bosta");
const STAFF_TAKEN = testId("staff", "17c-bagli");
const STAFF_RESIGNED = testId("staff", "17c-ayrilmis");

const EMAIL_FREE = "bosta.personel17c@test.ornek.test";
const EMAIL_TAKEN = "bagli.personel17c@test.ornek.test";
const EMAIL_RESIGNED = "ayrilmis.personel17c@test.ornek.test";
const EMAIL_UNKNOWN = "hicyok.personel17c@test.ornek.test";

const VERIFIED_USER = testId("user", "17c-dogrulanmis");
const SECOND_VERIFIED_USER = testId("user", "17c-ikinci-dogrulanmis");
const UNVERIFIED_USER = testId("user", "17c-dogrulanmamis");
const OWNER_OF_TAKEN = testId("user", "17c-bagli-sahibi");

const ACTOR_IP = "203.0.113.77";

/**
 * ⚠️ HIZ SINIRI SAYAÇLARI ELLE TEMİZLENİYOR.
 *
 * `cleanupTestData` sayaçları yalnızca KİMLİK önekinden siliyor; oysa satırı
 * uygulama yazıyor ve kimliği `cuid()` oluyor. Anahtar da kullanıcı kimliğinin
 * ÖZETİNİ taşıdığı için önekle yakalanamıyor. Temizlenmezse ikinci koşu
 * "çok fazla kod istediniz" ile düşerdi — tuzak listesindeki "E2E'yi 15 dakika
 * içinde üst üste koşturma" sorununun aynısı, birim seviyesinde.
 *
 * ⚠️ İKİ ÖNEK DE SİLİNİYOR ve bunu test yazarken ÖĞRENDİK: akışın kendi
 * bütçesi (`staff_verification_send`) dışında `issueOtp`'un KENDİ İÇİNDEKİ
 * `otp_send` bütçesi de aynı adrese yazıyor. Yalnızca birincisi temizlenince
 * dosyanın dördüncü testi "kod gelmedi" ile düştü — sebebi kod değil,
 * görünmeyen ikinci sayaçtı.
 */
async function resetRateLimits(): Promise<void> {
  await prisma.rateLimitCounter.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "staff_verification_send:" } },
        { key: { startsWith: "otp_send:" } },
      ],
    },
  });
}

/**
 * Sahte (decoy) kod kayıtları `userId` TAŞIMAZ, dolayısıyla kullanıcı silinince
 * basamaklı olarak gitmezler. Akış kimliğinden yakalanıyorlar.
 */
async function resetChallenges(): Promise<void> {
  await prisma.otpChallenge.deleteMany({
    where: { registrationId: { startsWith: `staff:${TEST_PREFIX}` } },
  });
}

beforeEach(async () => {
  await resetChallenges();
  await cleanupTestData();
  await resetRateLimits();

  await prisma.orgUnit.create({
    data: { id: UNIT, name: "Test 17c Bilgi İşlem", unitType: "directorate", sortOrder: 0 },
  });

  await prisma.staffMember.createMany({
    data: [
      {
        id: STAFF_FREE,
        orgUnitId: UNIT,
        fullName: "Bosta Personel",
        title: "branch_manager",
        workEmail: EMAIL_FREE,
        extensionNumber: 77101,
        startYear: 2015,
      },
      {
        id: STAFF_TAKEN,
        orgUnitId: UNIT,
        fullName: "Bagli Personel",
        title: "officer",
        workEmail: EMAIL_TAKEN,
        extensionNumber: 77102,
        startYear: 2016,
      },
      {
        id: STAFF_RESIGNED,
        orgUnitId: UNIT,
        fullName: "Ayrilmis Personel",
        title: "officer",
        workEmail: EMAIL_RESIGNED,
        extensionNumber: 77103,
        startYear: 2014,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: VERIFIED_USER,
        fullName: "Dogrulanmis Kullanici",
        email: "dogrulanmis17c@test.ornek.test",
        identityStatus: "kps_verified",
      },
      {
        id: SECOND_VERIFIED_USER,
        fullName: "Ikinci Dogrulanmis",
        email: "ikinci17c@test.ornek.test",
        identityStatus: "kps_verified",
      },
      {
        id: UNVERIFIED_USER,
        fullName: "Dogrulanmamis Kullanici",
        email: "dogrulanmamis17c@test.ornek.test",
        identityStatus: "unverified",
      },
      {
        id: OWNER_OF_TAKEN,
        fullName: "Bagli Kaydin Sahibi",
        email: "sahip17c@test.ornek.test",
        identityStatus: "kps_verified",
        isStaff: true,
        staffMemberId: STAFF_TAKEN,
      },
    ],
  });
});

async function readUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { isStaff: true, staffMemberId: true, identityStatus: true },
  });

  return user;
}

async function auditActions(userId: string): Promise<string[]> {
  const logs = await prisma.auditLog.findMany({ where: { userId }, select: { action: true } });

  return logs.map((log) => log.action);
}

/** İki adımı tek çağrıda koşar — mutlu yolun kısaltması. */
async function verifyStaff(userId: string, workEmail: string) {
  const requested = await requestStaffVerification({ userId, workEmail });

  expect(requested.revealedCode).toBeTypeOf("string");

  return confirmStaffVerification({
    userId,
    workEmail,
    code: requested.revealedCode!,
    actorIp: ACTOR_IP,
  });
}

describe("personel doğrulaması — mutlu yol", () => {
  it("kurumsal adrese giden kod doğrulanınca hesabı personel yapar", async () => {
    const result = await verifyStaff(VERIFIED_USER, EMAIL_FREE);

    expect(result.isStaff).toBe(true);

    const user = await readUser(VERIFIED_USER);

    expect(user.isStaff).toBe(true);
    expect(user.staffMemberId).toBe(STAFF_FREE);
  });

  /**
   * ⭐ KOD KULLANICININ KENDİ ADRESİNE DEĞİL, KURUMUN ADRESİNE GİDİYOR.
   *
   * ADR-017'nin reddettiği "güvenlik tiyatrosu" ile bu akışı ayıran tek şey
   * bu. Hedef özeti kurumsal adresin özetiyle eşleşmezse kanıtın değeri sıfır.
   */
  it("kodu KURUMSAL adrese gönderir, kullanıcının kendi adresine değil", async () => {
    const { hashDestination } = await import("@/lib/rate-limit");

    await requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_FREE });

    const challenge = await prisma.otpChallenge.findFirstOrThrow({
      where: { registrationId: `staff:${VERIFIED_USER}`, purpose: "staff_verification" },
      orderBy: { createdAt: "desc" },
      select: { destinationHash: true },
    });

    expect(challenge.destinationHash).toBe(hashDestination(EMAIL_FREE));
    expect(challenge.destinationHash).not.toBe(hashDestination("dogrulanmis17c@test.ornek.test"));
  });

  it("yetki değişikliğini denetim kaydına yazar ve kayda adresi girmez", async () => {
    await verifyStaff(VERIFIED_USER, EMAIL_FREE);

    expect(await auditActions(VERIFIED_USER)).toContain("role_change");

    const logs = await prisma.auditLog.findMany({ where: { userId: VERIFIED_USER } });

    expect(JSON.stringify(logs)).not.toContain(EMAIL_FREE);
  });

  it("kod tek kullanımlıktır — aynı kod ikinci kez geçmez", async () => {
    const requested = await requestStaffVerification({
      userId: VERIFIED_USER,
      workEmail: EMAIL_FREE,
    });
    const code = requested.revealedCode!;

    await confirmStaffVerification({
      userId: VERIFIED_USER,
      workEmail: EMAIL_FREE,
      code,
      actorIp: ACTOR_IP,
    });

    // İkinci kullanımda hesap zaten personel — kapı `assertEligible`'da kapanıyor.
    await expect(
      confirmStaffVerification({
        userId: VERIFIED_USER,
        workEmail: EMAIL_FREE,
        code,
        actorIp: ACTOR_IP,
      }),
    ).rejects.toBeInstanceOf(StaffAlreadyVerifiedError);
  });
});

describe("personel doğrulaması — YETKİ SIZDIRMAYAN RET YOLLARI", () => {
  /**
   * ⭐ BU ADIMIN EN KRİTİK TESTİ — GEVŞETİLMEZ.
   *
   * Kullanıcı kendi kurumsal adresine kod alıp, o kodu BAŞKA bir personelin
   * adresiyle gönderirse yetkisini o kişiden ALMAMALI. Bağlama kontrolü
   * (`pendingChallengeMatchesDestination`) kaldırılırsa bu test kırmızıya
   * döner — ve kırmızıya dönmesi "beklenti eskimiş" değil, AÇIK AÇILMIŞ
   * demektir.
   */
  it("kodu BAŞKA bir kurumsal adresle kullanmaya çalışırsa reddeder", async () => {
    const requested = await requestStaffVerification({
      userId: VERIFIED_USER,
      workEmail: EMAIL_FREE,
    });

    await expect(
      confirmStaffVerification({
        userId: VERIFIED_USER,
        // Kod EMAIL_FREE adresine gitti; burada başka bir personelin adresi var.
        workEmail: EMAIL_TAKEN,
        code: requested.revealedCode!,
        actorIp: ACTOR_IP,
      }),
    ).rejects.toBeInstanceOf(StaffVerificationCodeInvalidError);

    const user = await readUser(VERIFIED_USER);

    expect(user.isStaff).toBe(false);
    expect(user.staffMemberId).toBeNull();
  });

  it("kimliği doğrulanmamış hesap kod bile isteyemez", async () => {
    await expect(
      requestStaffVerification({ userId: UNVERIFIED_USER, workEmail: EMAIL_FREE }),
    ).rejects.toBeInstanceOf(StaffIdentityRequiredError);
  });

  it("zaten personel olan hesap akışa hiç giremez", async () => {
    await expect(
      requestStaffVerification({ userId: OWNER_OF_TAKEN, workEmail: EMAIL_FREE }),
    ).rejects.toBeInstanceOf(StaffAlreadyVerifiedError);
  });

  it("yanlış kod hesaba dokunmaz", async () => {
    await requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_FREE });

    await expect(
      confirmStaffVerification({
        userId: VERIFIED_USER,
        workEmail: EMAIL_FREE,
        code: "000000",
        actorIp: ACTOR_IP,
      }),
    ).rejects.toBeInstanceOf(StaffVerificationCodeInvalidError);

    const user = await readUser(VERIFIED_USER);

    expect(user.isStaff).toBe(false);
    expect(await auditActions(VERIFIED_USER)).not.toContain("role_change");
  });
});

/**
 * ═══ HESAP SAYIMI KORUMASI ═══
 *
 * Kurumsal adresler `/hakkimizda` rehberinde ZATEN herkese açık; gizlenmesi
 * gereken şey adresin varlığı değil, **o personelin bu sitede hesabı olup
 * olmadığı.** Üç ret sebebinin üçü de dışarıya AYNI davranışı göstermeli.
 */
describe("personel doğrulaması — hesap sayımı koruması", () => {
  it("rehberde olmayan adres için de kod isteği başarıyla döner", async () => {
    await expect(
      requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_UNKNOWN }),
    ).resolves.toBeDefined();
  });

  it("zaten bağlı personel kaydı için de kod isteği başarıyla döner", async () => {
    await expect(
      requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_TAKEN }),
    ).resolves.toBeDefined();
  });

  it("işten ayrılmış personel için de kod isteği başarıyla döner", async () => {
    await expect(
      requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_RESIGNED }),
    ).resolves.toBeDefined();
  });

  /**
   * ⭐ SAHTE AKIŞ HİÇBİR KODLA TAMAMLANAMAZ.
   *
   * Sahte kaydın kod özeti 32 rastgele bayttan üretiliyor; kullanıcının
   * girebileceği hiçbir 6 haneli değer o özete denk gelemez.
   */
  it("sahte akış hiçbir kodla tamamlanamaz ve yetki vermez", async () => {
    await requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_TAKEN });

    await expect(
      confirmStaffVerification({
        userId: VERIFIED_USER,
        workEmail: EMAIL_TAKEN,
        code: "123456",
        actorIp: ACTOR_IP,
      }),
    ).rejects.toBeInstanceOf(StaffVerificationCodeInvalidError);

    const user = await readUser(VERIFIED_USER);

    expect(user.isStaff).toBe(false);

    // Bağlı personel kaydının sahibi DEĞİŞMEDİ.
    const owner = await readUser(OWNER_OF_TAKEN);

    expect(owner.staffMemberId).toBe(STAFF_TAKEN);
  });

  /**
   * ⭐ HIZ SINIRI GERÇEK/SAHTE AYRIMINDAN ÖNCE TÜKENİYOR.
   *
   * Yalnızca gerçek yolda tüketilseydi, dördüncü istekte 429 almak "bu adres
   * rehberde ve boşta" demeye gelirdi. İki yol da aynı sayıda istekten sonra
   * durmalı.
   */
  it("rehberde olmayan adres de aynı sayıda istekten sonra hız sınırına takılır", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_UNKNOWN });
    }

    await expect(
      requestStaffVerification({ userId: VERIFIED_USER, workEmail: EMAIL_UNKNOWN }),
    ).rejects.toBeInstanceOf(StaffVerificationRateLimitedError);
  });
});

describe("personel doğrulaması — yarış koruması", () => {
  /**
   * ⭐ BİR PERSONEL KAYDI YALNIZCA BİR HESABA BAĞLANABİLİR.
   *
   * Kararı VERİTABANI veriyor (`users.staff_member_id` benzersiz). "Önce oku,
   * boşsa yaz" iki adımdır ve bu yarışı çözmez (CLAUDE.md §5.6).
   */
  it("aynı personel kaydını iki hesap aynı anda alamaz", async () => {
    const first = await requestStaffVerification({
      userId: VERIFIED_USER,
      workEmail: EMAIL_FREE,
    });
    const second = await requestStaffVerification({
      userId: SECOND_VERIFIED_USER,
      workEmail: EMAIL_FREE,
    });

    const results = await Promise.allSettled([
      confirmStaffVerification({
        userId: VERIFIED_USER,
        workEmail: EMAIL_FREE,
        code: first.revealedCode!,
        actorIp: ACTOR_IP,
      }),
      confirmStaffVerification({
        userId: SECOND_VERIFIED_USER,
        workEmail: EMAIL_FREE,
        code: second.revealedCode!,
        actorIp: ACTOR_IP,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");

    expect(fulfilled).toHaveLength(1);

    const linked = await prisma.user.findMany({
      where: { staffMemberId: STAFF_FREE },
      select: { id: true },
    });

    expect(linked).toHaveLength(1);
  });
});
