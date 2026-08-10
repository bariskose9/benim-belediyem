import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IdentityLookupResult } from "@/features/identity/services/identity-lookup.service";

import { cleanupTestData, prisma, testId } from "./helpers.js";

/**
 * ═══ PRD §5.0 — MEVCUT HESABA KPS KİMLİĞİ BAĞLAMA (teknik borç #32) ═══
 *
 * GERÇEK PostgreSQL'e karşı yazıldı çünkü bu dosyanın kritik iddialarını
 * yalnızca veritabanı kanıtlayabilir:
 *   · bir kimlik numarası yalnızca BİR hesaba bağlanabilir — `users
 *     .national_id_hash` üzerindeki benzersizlik kısıtı
 *   · doğrulama TEK KOŞULLU YAZMA ile yapılıyor; ikinci istek satırı
 *     bulamıyor ve reddediliyor (yarış koruması)
 *   · personel eşleşmesi `staff_members` tablosundan geliyor, istemciden değil
 *   · kalıcı tutulmayan KPS alanları (baba/anne adı, doğum yeri, adres)
 *     hiçbir kolona sızmıyor
 * Taklit bir istemci bunların hiçbirini kanıtlayamazdı.
 *
 * KPS SORGUSU VE BOT KAPISI TAKLİT EDİLİYOR: ikisi de ağ çağrısı ve ikisinin
 * kendi testleri var (`tests/integration/identity-lookup.test.ts`,
 * `tests/unit/turnstile.test.ts`). Burada sınanan şey onların SONRASI.
 */

const turnstileOutcome = vi.hoisted(() => ({
  value: "success" as "success" | "failed" | "unavailable",
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: async () => turnstileOutcome.value,
}));

const lookupResult = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/features/identity/services/identity-lookup.service", () => ({
  lookupIdentity: async () => lookupResult.value,
}));

const { verifyIdentity } = await import("@/features/auth/services/identity-verification.service");
const {
  AgeRestrictedError,
  BotCheckFailedError,
  BotCheckUnavailableError,
  IdentityAlreadyRegisteredError,
  IdentityAlreadyVerifiedError,
  IdentityCheckFailedError,
  IdentityRateLimitedError,
  IdentityServiceUnavailableError,
} = await import("@/features/auth/errors");
const { hashNationalId } = await import("@/lib/crypto");

const SALT = process.env.NATIONAL_ID_HASH_SALT!;

const GOOGLE_USER = testId("user", "google-dogrulanmamis");
const SECOND_UNVERIFIED_USER = testId("user", "ikinci-dogrulanmamis");
const VERIFIED_USER = testId("user", "dogrulanmis");
const OWNER_OF_TAKEN_ID = testId("user", "numara-sahibi");
const STAFF_USER = testId("user", "personel-adayi");

const UNIT = testId("unit", "bilgi-islem");
const STAFF_FREE = testId("staff", "bosta");
const STAFF_TAKEN = testId("staff", "baskasina-bagli");

/** Kontrol basamağı geçerli sahte numaralar — biçim doğrulaması route katmanında. */
const FREE_NATIONAL_ID = "10000000146";
const TAKEN_NATIONAL_ID = "10000000260";
const STAFF_NATIONAL_ID = "10000000374";
const STAFF_TAKEN_NATIONAL_ID = "10000000488";

const ACTOR_IP = "203.0.113.42";
const SESSION_ID = testId("session", "1");

/** Kalıcı TUTULMAYAN KPS alanları — hepsi ayırt edilebilir değerler. */
const NOT_STORED = {
  birthPlace: "Kirsehirtest",
  fatherName: "Bahadirhantest",
  motherName: "Gulperitest",
  gender: "female",
  maritalStatus: "married",
  registeredAddress: "Testyurdu Mahallesi 9876 Sokak No 77",
} as const;

function successLookup(overrides: { birthDate?: string } = {}): IdentityLookupResult {
  return {
    outcome: "success",
    identity: {
      firstName: "Zeynepdeneme",
      lastName: "Ozkantest",
      birthDate: overrides.birthDate ?? "1992-03-11",
      registeredProvince: "Izmirtest",
      registeredDistrict: "Bornovatest",
      ...NOT_STORED,
    },
  } as IdentityLookupResult;
}

async function verify(userId: string, nationalId: string) {
  return verifyIdentity({
    userId,
    payload: { nationalId, birthYear: 1992, turnstileToken: "test-token" },
    actorIp: ACTOR_IP,
    sessionId: SESSION_ID,
  });
}

beforeEach(async () => {
  await cleanupTestData();
  turnstileOutcome.value = "success";
  lookupResult.value = successLookup();

  await prisma.orgUnit.create({
    data: { id: UNIT, name: "Test Bilgi İşlem Dairesi", unitType: "directorate", sortOrder: 0 },
  });

  await prisma.staffMember.createMany({
    data: [
      {
        id: STAFF_FREE,
        orgUnitId: UNIT,
        fullName: "Bosta Personel",
        title: "branch_manager",
        workEmail: "bosta.personel@test.ornek.test",
        extensionNumber: 79101,
        startYear: 2015,
        nationalIdHash: hashNationalId(STAFF_NATIONAL_ID, SALT),
      },
      {
        id: STAFF_TAKEN,
        orgUnitId: UNIT,
        fullName: "Bagli Personel",
        title: "officer",
        workEmail: "bagli.personel@test.ornek.test",
        extensionNumber: 79102,
        startYear: 2016,
        nationalIdHash: hashNationalId(STAFF_TAKEN_NATIONAL_ID, SALT),
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      // Google ile açılmış hesap: kimlik numarası yok, adı e-postadan türetilmiş.
      { id: GOOGLE_USER, fullName: "gecici.ad", email: "gecici@test.ornek.test" },
      { id: SECOND_UNVERIFIED_USER, fullName: "ikinci.ad", email: "ikinci@test.ornek.test" },
      { id: STAFF_USER, fullName: "personel.ad", email: "personel@test.ornek.test" },
      {
        id: VERIFIED_USER,
        fullName: "Doğrulanmış Kullanıcı",
        email: "dogrulanmis@test.ornek.test",
        identityStatus: "kps_verified",
      },
      {
        id: OWNER_OF_TAKEN_ID,
        fullName: "Numara Sahibi",
        email: "sahip@test.ornek.test",
        identityStatus: "kps_verified",
        nationalIdHash: hashNationalId(TAKEN_NATIONAL_ID, SALT),
      },
    ],
  });

  // Personel kaydı ZATEN başka bir hesaba bağlı olsun (işten ayrılma/çakışma dalı).
  await prisma.user.update({
    where: { id: VERIFIED_USER },
    data: { staffMemberId: STAFF_TAKEN, isStaff: true },
  });
});

afterEach(async () => {
  await cleanupTestData();
});

async function readUser(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

async function auditActions(userId: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({ where: { userId }, select: { action: true } });

  return rows.map((row) => row.action);
}

describe("verifyIdentity — mutlu yol", () => {
  it("hesabı doğrular, kimliği bağlar ve adı KPS'ten gelenle değiştirir", async () => {
    const result = await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    expect(result).toEqual({ isStaff: false, fullName: "Zeynepdeneme Ozkantest" });

    const user = await readUser(GOOGLE_USER);

    expect(user.identityStatus).toBe("kps_verified");
    // Google'ın verdiği geçici ad gitti; PRD §5.0 gerçek adı istiyor.
    expect(user.fullName).toBe("Zeynepdeneme Ozkantest");
    expect(user.nationalIdHash).toBe(hashNationalId(FREE_NATIONAL_ID, SALT));
    // Maskede yalnızca ilk üç ve son iki hane var (`maskNationalId`).
    expect(user.nationalIdMasked).toBe("100******46");
    expect(user.registeredProvince).toBe("Izmirtest");
    expect(user.kpsSyncedAt).not.toBeNull();
  });

  /**
   * ⭐ KİMLİK NUMARASI DÜZ METİN YAZILMIYOR: şifreli kolon her seferinde farklı
   * bir nonce ile üretiliyor, yani veritabanı dökümünde numara aranamaz.
   */
  it("kimlik numarasını düz metin yazmaz", async () => {
    await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    const user = await readUser(GOOGLE_USER);

    expect(user.nationalIdEncrypted).not.toBeNull();
    expect(user.nationalIdEncrypted).not.toContain(FREE_NATIONAL_ID);
    expect(JSON.stringify(user)).not.toContain(FREE_NATIONAL_ID);
  });

  /**
   * ⭐ VERİ MİNİMİZASYONU (14-privacy-and-compliance.md): baba adı, anne adı,
   * doğum yeri, medeni hâl ve nüfus adresi KAYIT AKIŞINDA olduğu gibi burada da
   * hiçbir kolona yazılmaz.
   */
  it("kalıcı tutulmayan KPS alanlarını hiçbir kolona yazmaz", async () => {
    await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    const row = JSON.stringify(await readUser(GOOGLE_USER));

    for (const value of Object.values(NOT_STORED)) {
      expect(row).not.toContain(value);
    }
  });

  it("denetim kaydı yazar ve kayda kimlik numarası girmez", async () => {
    await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    expect(await auditActions(GOOGLE_USER)).toContain("identity_verify");

    const logs = await prisma.auditLog.findMany({ where: { userId: GOOGLE_USER } });

    expect(JSON.stringify(logs)).not.toContain(FREE_NATIONAL_ID);
  });
});

describe("verifyIdentity — personel eşleştirme", () => {
  /**
   * ⭐ `isStaff` İSTEMCİDEN GELMEZ: girdi tipinde yeri yok, değer yalnızca
   * `staff_members` tablosundaki eşleşmeden hesaplanıyor (PRD §5.0).
   */
  it("personel rehberinde eşleşme varsa hesabı personel yapar", async () => {
    const result = await verify(STAFF_USER, STAFF_NATIONAL_ID);

    expect(result.isStaff).toBe(true);

    const user = await readUser(STAFF_USER);

    expect(user.isStaff).toBe(true);
    expect(user.staffMemberId).toBe(STAFF_FREE);
  });

  /** Personel kaydı BAŞKA bir hesaba bağlıysa kullanıcı vatandaş olarak doğrulanır. */
  it("personel kaydı başka hesaba bağlıysa vatandaş olarak doğrular", async () => {
    const result = await verify(STAFF_USER, STAFF_TAKEN_NATIONAL_ID);

    expect(result.isStaff).toBe(false);

    const user = await readUser(STAFF_USER);

    expect(user.identityStatus).toBe("kps_verified");
    expect(user.isStaff).toBe(false);
    expect(user.staffMemberId).toBeNull();
  });
});

describe("verifyIdentity — reddedilen denemeler", () => {
  /**
   * ⭐ BİR KİMLİK NUMARASI YALNIZCA BİR HESABA BAĞLANABİLİR (PRD §5.0).
   * Kullanıcı ham kısıt hatası değil, anlaşılır bir cümle görür.
   */
  it("numara başka hesapta ise reddeder ve hiçbir şey yazmaz", async () => {
    await expect(verify(GOOGLE_USER, TAKEN_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityAlreadyRegisteredError,
    );

    const user = await readUser(GOOGLE_USER);

    expect(user.identityStatus).toBe("unverified");
    expect(user.nationalIdHash).toBeNull();
    expect(user.fullName).toBe("gecici.ad");
    expect(await auditActions(GOOGLE_USER)).not.toContain("identity_verify");
  });

  it("zaten doğrulanmış hesapta kimlik değiştirilemez", async () => {
    await expect(verify(VERIFIED_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityAlreadyVerifiedError,
    );

    const user = await readUser(VERIFIED_USER);

    expect(user.fullName).toBe("Doğrulanmış Kullanıcı");
    expect(user.nationalIdHash).toBeNull();
  });

  it("18 yaşından küçük kullanıcı doğrulanamaz", async () => {
    const child = new Date();
    child.setUTCFullYear(child.getUTCFullYear() - 17);
    lookupResult.value = successLookup({ birthDate: child.toISOString().slice(0, 10) });

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(AgeRestrictedError);
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
  });

  it("KPS bilgileri tutmuyorsa doğrulama yapılmaz", async () => {
    lookupResult.value = { outcome: "failed" };

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityCheckFailedError,
    );
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
  });

  /**
   * ⭐ BOT KAPISI KPS SORGUSUNDAN ÖNCE (ADR-004): jeton geçersizse hesapta
   * hiçbir değişiklik olmaz.
   */
  it("bot doğrulaması geçilmeden hesaba dokunulmaz", async () => {
    turnstileOutcome.value = "failed";

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(BotCheckFailedError);
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
  });

  /**
   * ⭐⭐ ADR-004 BEDEL 2 — DIŞ SERVİS ÇÖKÜNCE KAPI AÇILMAZ, KAPANIR.
   *
   * Bu, projenin "dış servis çökerse sayfa ayakta kalır" kuralının BİLİNÇLİ
   * istisnası: Cloudflare'a ulaşılamadığında akış durur. Aksi hâlde saldırganın
   * tek yapması gereken bot doğrulamasını erişilemez kılmak olurdu. Kural
   * `bot-check.ts` içinde yazılı ama bu YENİ çağrı noktasında da ölçülüyor.
   */
  it("bot doğrulamasına ULAŞILAMIYORSA da hesaba dokunulmaz", async () => {
    turnstileOutcome.value = "unavailable";

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(
      BotCheckUnavailableError,
    );
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
  });

  /** Hız sınırına takılan istek KPS'e hiç gitmiyor ve hesabı değiştirmiyor. */
  it("kimlik sorgusu hız sınırındaysa doğrulama yapılmaz", async () => {
    lookupResult.value = { outcome: "rate_limited" };

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityRateLimitedError,
    );
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
  });

  /** KPS çökmüşse hesap YARIM bir durumda kalmaz — hiç dokunulmaz. */
  it("KPS servisine ulaşılamıyorsa doğrulama yapılmaz", async () => {
    lookupResult.value = { outcome: "unavailable" };

    await expect(verify(GOOGLE_USER, FREE_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityServiceUnavailableError,
    );
    expect((await readUser(GOOGLE_USER)).identityStatus).toBe("unverified");
    expect(await auditActions(GOOGLE_USER)).not.toContain("identity_verify");
  });
});

describe("verifyIdentity — yarış koruması", () => {
  /**
   * ⭐ TEK KOŞULLU YAZMA: koşul `WHERE`'de duruyor ve karar etkilenen satır
   * sayısından okunuyor. "Önce oku, sonra yaz" deseni kullanılsaydı ikinci
   * istek birincinin yazdığının üstüne yazardı.
   */
  it("aynı hesap ikinci kez doğrulanamaz", async () => {
    await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    await expect(verify(GOOGLE_USER, STAFF_NATIONAL_ID)).rejects.toBeInstanceOf(
      IdentityAlreadyVerifiedError,
    );

    const user = await readUser(GOOGLE_USER);

    // İlk doğrulamanın sonucu duruyor; ikinci deneme hiçbir şeyi değiştirmedi.
    expect(user.nationalIdHash).toBe(hashNationalId(FREE_NATIONAL_ID, SALT));
    expect(user.isStaff).toBe(false);
  });

  /**
   * ⭐ KOŞULLU YAZMANIN ASIL KANITI — SERVİSİN ÖN KONTROLÜ ATLANARAK ölçülüyor.
   *
   * Servisteki "zaten doğrulanmış mı" okuması ile yazma arasında zaman var;
   * araya giren bir istek o aralıkta hesabı doğrulamış olabilir. Son sözü
   * `UPDATE`'in `WHERE` koşulu söylüyor. Bu yüzden test SERVİSİ DEĞİL
   * REPOSITORY'yi çağırıyor: aksi halde ön kontrol devreye girer ve asıl
   * korumanın çalışıp çalışmadığı hiç ölçülmezdi.
   *
   * ⚠️ ÖLÇÜLDÜ: `identityStatus: "unverified"` koşulu `WHERE`'den geçici olarak
   * kaldırıldığında bu test KIRMIZIYA döndü — ikinci yazma "attached" dönüp
   * birincinin kimliğini ezdi.
   */
  it("doğrulanmış hesaba ikinci kimlik yazılamaz (koşul WHERE'de)", async () => {
    await verify(GOOGLE_USER, FREE_NATIONAL_ID);

    const { attachVerifiedIdentity } = await import("@/features/auth/repositories/user.repository");
    const { encryptSecret, maskNationalId } = await import("@/lib/crypto");

    const outcome = await attachVerifiedIdentity({
      userId: GOOGLE_USER,
      nationalIdEncrypted: encryptSecret(
        STAFF_NATIONAL_ID,
        process.env.NATIONAL_ID_ENCRYPTION_KEY!,
      ),
      nationalIdHash: hashNationalId(STAFF_NATIONAL_ID, SALT),
      nationalIdMasked: maskNationalId(STAFF_NATIONAL_ID),
      fullName: "Ezilmemeli Ad",
      birthDate: new Date("1990-01-01T00:00:00.000Z"),
      registeredProvince: "Ezilmemeli",
      registeredDistrict: "Ezilmemeli",
      staffMemberId: STAFF_FREE,
      verifiedAt: new Date(),
    });

    expect(outcome).toBe("already_verified");

    const user = await readUser(GOOGLE_USER);

    expect(user.nationalIdHash).toBe(hashNationalId(FREE_NATIONAL_ID, SALT));
    expect(user.fullName).toBe("Zeynepdeneme Ozkantest");
    expect(user.isStaff).toBe(false);
  });

  it("aynı hesaba aynı anda iki farklı kimlik bağlanamaz", async () => {
    const results = await Promise.allSettled([
      verify(GOOGLE_USER, FREE_NATIONAL_ID),
      verify(GOOGLE_USER, STAFF_NATIONAL_ID),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      IdentityAlreadyVerifiedError,
    );

    // Hesapta TEK bir kimlik var ve denetim kaydı da tek.
    const audits = await prisma.auditLog.findMany({
      where: { userId: GOOGLE_USER, action: "identity_verify" },
    });

    expect(audits).toHaveLength(1);
  });

  /**
   * ⭐ AYNI NUMARAYI AYNI ANDA İKİ HESAP BAĞLAMAYA ÇALIŞIRSA kararı veritabanı
   * verir: benzersizlik kısıtı ikinciyi reddeder ve uygulama bunu anlaşılır bir
   * hataya çevirir — ham `P2002` ne çağırana ne kullanıcıya gider.
   */
  it("aynı numarayı iki hesap aynı anda bağlayamaz", async () => {
    const results = await Promise.allSettled([
      verify(GOOGLE_USER, FREE_NATIONAL_ID),
      verify(SECOND_UNVERIFIED_USER, FREE_NATIONAL_ID),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      IdentityAlreadyRegisteredError,
    );

    const owners = await prisma.user.count({
      where: { nationalIdHash: hashNationalId(FREE_NATIONAL_ID, SALT) },
    });

    expect(owners).toBe(1);
  });
});
