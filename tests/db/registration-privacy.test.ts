import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupRegistration, expectUniqueViolation, prisma, testId } from "./helpers";

/**
 * VERİ MİNİMİZASYONUNUN GERÇEK POSTGRES'E KARŞI KANITI.
 *
 * PRD §5.0 ve `14-privacy-and-compliance.md` şunu şart koşuyor:
 *
 *   "KPS'ten hangi alan kalıcı tutulur: yalnızca ad soyad, doğum tarihi,
 *    şifreli kimlik numarası, nüfus il/ilçe ve son senkron tarihi.
 *    KALICI TUTULMAYANLAR: baba adı, anne adı, doğum yeri, medeni hal,
 *    nüfus adresi — bunlar yalnızca kayıt ekranında gösterilir."
 *
 * Bu dosya iddiayı taklit edilmiş bir istemciye değil, VERİTABANININ KENDİSİNE
 * soruyor. Entegrasyon testleri Prisma'yı taklit ediyor; şema seviyesindeki
 * bir kaçağı ancak gerçek tablo yakalar.
 */

const SALT = process.env.NATIONAL_ID_HASH_SALT!;
const KEY = process.env.NATIONAL_ID_ENCRYPTION_KEY!;

/** Kalıcı tutulmaması gereken KPS alanları — hepsi ayırt edilebilir değerler. */
const NOT_STORED = {
  fatherName: "Bahadirhan",
  motherName: "Gulperi",
  birthPlace: "Kirsehirtest",
  maritalStatus: "married",
  gender: "female",
  registeredAddress: "Testyurdu Mahallesi 9876 Sokak No 77",
} as const;

const STORED = {
  firstName: "Zeynepdeneme",
  lastName: "Ozkantest",
  birthDate: "1992-03-11",
  registeredProvince: "Izmirtest",
  registeredDistrict: "Bornovatest",
} as const;

const NATIONAL_ID = "10000000146";
const EMAIL = "kayit.gizlilik@ornek.test";
const PHONE = "05339998877";
const PASSWORD = "gizli-lacivert-77";

/** Uygulama kodunu doğrudan çağırıyoruz: kanıtlanan şey GERÇEK yazma yolu. */
async function runRegistration() {
  const { encryptSecret, hashNationalId, maskNationalId } = await import("@/lib/crypto");
  const { hashPassword } = await import("@/features/auth/services/password.service");
  const { createVerifiedUser } = await import("@/features/auth/repositories/user.repository");
  const { createRegistrationDraft, deleteRegistrationDraft } =
    await import("@/features/auth/repositories/registration-draft.repository");

  const nationalIdHash = hashNationalId(NATIONAL_ID, SALT);
  const identity = { ...STORED, ...NOT_STORED, nationalId: NATIONAL_ID };

  const draftId = await createRegistrationDraft({
    tokenHash: testId("token", Date.now()),
    nationalIdHash,
    kpsPayloadEncrypted: encryptSecret(JSON.stringify(identity), KEY),
    actorIpHash: testId("ip"),
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });

  const created = await createVerifiedUser({
    nationalIdEncrypted: encryptSecret(NATIONAL_ID, KEY),
    nationalIdHash,
    nationalIdMasked: maskNationalId(NATIONAL_ID),
    fullName: `${STORED.firstName} ${STORED.lastName}`,
    birthDate: new Date(`${STORED.birthDate}T00:00:00.000Z`),
    email: EMAIL,
    phone: PHONE,
    passwordHash: await hashPassword(PASSWORD),
    registeredProvince: STORED.registeredProvince,
    registeredDistrict: STORED.registeredDistrict,
    verifiedAt: new Date(),
  });

  await deleteRegistrationDraft(draftId);

  return { userId: created.id, nationalIdHash };
}

async function nationalIdHash(): Promise<string> {
  const { hashNationalId } = await import("@/lib/crypto");

  return hashNationalId(NATIONAL_ID, SALT);
}

beforeEach(async () => {
  await cleanupRegistration(EMAIL, await nationalIdHash());
});

afterEach(async () => {
  await cleanupRegistration(EMAIL, await nationalIdHash());
});

describe("kayıt sonrası users satırı — veri minimizasyonu", () => {
  it("KALICI TUTULMAYAN KPS alanlarının HİÇBİRİ users satırında geçmez", async () => {
    const { userId } = await runRegistration();

    // Kolon adına değil, SATIRIN TAMAMINA bakıyoruz. Böylece ileride biri
    // `fatherName` diye yeni bir kolon eklerse bu test de kırmızıya döner.
    const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM users WHERE id = $1`,
      userId,
    );
    const raw = JSON.stringify(row);

    for (const [field, value] of Object.entries(NOT_STORED)) {
      expect(raw, `${field} alanı users satırına yazılmış`).not.toContain(value);
    }
  });

  it("izin verilen KPS alanları doğru şekilde yazılır", async () => {
    const { userId } = await runRegistration();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(user.fullName).toBe(`${STORED.firstName} ${STORED.lastName}`);
    expect(user.birthDate?.toISOString().slice(0, 10)).toBe(STORED.birthDate);
    expect(user.registeredProvince).toBe(STORED.registeredProvince);
    expect(user.registeredDistrict).toBe(STORED.registeredDistrict);
    expect(user.kpsSyncedAt).not.toBeNull();
    expect(user.identityStatus).toBe("kps_verified");
  });

  it("kimlik numarası DÜZ METİN olarak hiçbir tabloda geçmez", async () => {
    await runRegistration();

    const tables = [
      "users",
      "registration_drafts",
      "otp_challenges",
      "audit_logs",
      "kps_query_logs",
      "rate_limit_counters",
    ];

    for (const table of tables) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM ${table}`,
      );

      expect(JSON.stringify(rows), `${table} tablosunda düz kimlik numarası var`).not.toContain(
        NATIONAL_ID,
      );
    }
  });

  it("düz şifre hiçbir tabloda geçmez ve özet argon2id'dir", async () => {
    const { userId } = await runRegistration();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify(user)).not.toContain(PASSWORD);
  });

  it("kimlik numarası maskeli hâliyle saklanır ve şifreli kolon düz metin değildir", async () => {
    const { userId } = await runRegistration();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(user.nationalIdMasked).toBe("100******46");
    expect(user.nationalIdEncrypted).toMatch(/^v1\./);
    expect(user.nationalIdEncrypted).not.toContain(NATIONAL_ID);
  });

  it("hesap oluşunca taslak satırı silinir — kalıcı tutulmayan alanlar yok olur", async () => {
    const { nationalIdHash: hash } = await runRegistration();

    const drafts = await prisma.registrationDraft.findMany({ where: { nationalIdHash: hash } });

    expect(drafts).toHaveLength(0);
  });

  it("aynı kimlik özetiyle ikinci kullanıcı YAZILAMAZ", async () => {
    const { nationalIdHash: hash } = await runRegistration();

    await expectUniqueViolation(() =>
      prisma.user.create({
        data: { id: testId("ikinci-kullanici"), fullName: "İkinci Kayıt", nationalIdHash: hash },
      }),
    );
  });
});

describe("registration_drafts tablosu", () => {
  it("düz metin taşıyabilecek bir kolon adı yoktur", async () => {
    // `kps_privacy.test.ts` ile aynı disiplin: olmayan kolona yanlışlıkla
    // yazılamaz. Kolon adı seviyesinde bir denetim, kod incelemesinden bağımsız
    // olarak şemayı korur.
    const columns = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'registration_drafts'`,
    );
    const names = columns.map((column) => column.column_name);

    for (const forbidden of [
      "national_id",
      "email",
      "phone",
      "code",
      "password",
      "father_name",
      "mother_name",
      "birth_place",
      "registered_address",
    ]) {
      expect(names, `${forbidden} adında bir kolon var`).not.toContain(forbidden);
    }

    // Şifreli / özetlenmiş karşılıkları ise BULUNMALI.
    for (const expected of [
      "token_hash",
      "national_id_hash",
      "kps_payload_encrypted",
      "contact_encrypted",
      "password_hash",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("aynı jeton özetiyle ikinci taslak YAZILAMAZ", async () => {
    const tokenHash = testId("token", "cakisan");

    await prisma.registrationDraft.create({
      data: {
        id: testId("taslak-1"),
        tokenHash,
        nationalIdHash: testId("hash"),
        kpsPayloadEncrypted: "v1.x.y.z",
        actorIpHash: testId("ip"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await expectUniqueViolation(() =>
      prisma.registrationDraft.create({
        data: {
          id: testId("taslak-2"),
          tokenHash,
          nationalIdHash: testId("hash"),
          kpsPayloadEncrypted: "v1.x.y.z",
          actorIpHash: testId("ip"),
          expiresAt: new Date(Date.now() + 60_000),
        },
      }),
    );

    await prisma.registrationDraft.deleteMany({ where: { tokenHash } });
  });

  it("SÜRESİ DOLMUŞ taslak okuma anında yok sayılır VE silinir", async () => {
    // ADR-007: doğruluk okuma anındaki zaman koşuluna bağlı; temizlik görevi
    // hiç çalışmasa bile süresi geçmiş satır kullanılamaz.
    const { findActiveDraftByTokenHash } =
      await import("@/features/auth/repositories/registration-draft.repository");
    const tokenHash = testId("token", "suresi-dolmus");

    await prisma.registrationDraft.create({
      data: {
        id: testId("taslak-eski"),
        tokenHash,
        nationalIdHash: testId("hash"),
        kpsPayloadEncrypted: "v1.x.y.z",
        actorIpHash: testId("ip"),
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    await expect(findActiveDraftByTokenHash(tokenHash, new Date())).resolves.toBeNull();
    await expect(prisma.registrationDraft.findUnique({ where: { tokenHash } })).resolves.toBeNull();
  });

  it("süresi dolmamış taslak okunabilir", async () => {
    const { findActiveDraftByTokenHash } =
      await import("@/features/auth/repositories/registration-draft.repository");
    const tokenHash = testId("token", "gecerli");

    await prisma.registrationDraft.create({
      data: {
        id: testId("taslak-gecerli"),
        tokenHash,
        nationalIdHash: testId("hash"),
        kpsPayloadEncrypted: "v1.x.y.z",
        actorIpHash: testId("ip"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await expect(findActiveDraftByTokenHash(tokenHash, new Date())).resolves.not.toBeNull();

    await prisma.registrationDraft.deleteMany({ where: { tokenHash } });
  });
});
