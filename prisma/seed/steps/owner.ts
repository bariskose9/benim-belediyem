import { hashNationalId, isValidNationalId, maskNationalId } from "../../../src/lib/crypto.js";
import { seedId, slugify } from "../lib/seed-helpers.js";
import type { SeedContext } from "../types.js";
import { OWNER_EXTENSION } from "./organization.js";

/**
 * Proje sahibi hesabı — tek gerçek kayıt (PRD §5.0 "Tek gerçek hesap").
 *
 * ⚠️ GERÇEK KİŞİSEL BİLGİ KODA VE DEPOYA YAZILMAZ. Değerler YALNIZCA ortam
 * değişkenlerinden okunur; ne kaynak dosyaya, ne test-hesaplari.md'ye, ne de
 * seed çıktısına düşer. Depo herkese açık olduğu için bu kural esnetilemez.
 *
 * Değişkenler tanımlı değilse bu adım ATLANIR ve tohumlama hatasız tamamlanır —
 * depoyu klonlayan başka biri projeyi sorunsuz kurabilsin diye.
 *
 * Bu adım `User` kaydı OLUŞTURMAZ. Hesap, roadmap adım 4b'de KPS ile kayıt
 * akışından geçilerek açılacak; burada yalnızca o akışın çalışması için gereken
 * iki kayıt hazırlanır:
 *   · KpsCitizen  → sorgulandığında kimlik bilgisi dönsün diye
 *   · StaffMember → kimlik doğrulanınca `isStaff = true` olsun diye
 */

export type OwnerSeedResult = "created" | "skipped";

interface OwnerInput {
  readonly nationalId: string;
  readonly fullName: string;
  readonly birthDate: Date;
}

export async function seedOwner(
  context: SeedContext,
  ownerBranchUnitId: string,
): Promise<OwnerSeedResult> {
  const input = readOwnerInput();

  if (input === null) {
    context.log("Proje sahibi hesabı: atlandı (OWNER_* ortam değişkenleri tanımlı değil)");

    return "skipped";
  }

  const [firstName, ...rest] = input.fullName.split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const citizenId = seedId("kps", "owner");
  const staffId = seedId("staff", "owner");

  // Sahte KPS kaydı: kişisel alanların yalnızca akış için gerekli olanları
  // doldurulur. Doğum yeri, ana-baba adı, medeni hâl gibi alanlar İSTENMEZ ve
  // "Belirtilmedi" olarak geçilir (veri minimizasyonu).
  await context.prisma.kpsCitizen.createMany({
    data: [
      {
        id: citizenId,
        nationalId: input.nationalId,
        firstName,
        lastName,
        birthDate: input.birthDate,
        birthPlace: "Belirtilmedi",
        fatherName: "Belirtilmedi",
        motherName: "Belirtilmedi",
        registeredProvince: "İzmir",
        registeredDistrict: "Konak",
        gender: "unspecified",
        maritalStatus: "unspecified",
        registeredAddress: "Belirtilmedi",
        simulationBehavior: "normal",
        // Sahte veri DEĞİL: bu kayıt gerçek bir kişiye aittir ve temizlik
        // görevlerinin "sahte veriyi sil" filtresine takılmamalıdır.
        isSeedData: false,
      },
    ],
    skipDuplicates: true,
  });

  await context.prisma.staffMember.createMany({
    data: [
      {
        id: staffId,
        orgUnitId: ownerBranchUnitId,
        fullName: input.fullName,
        title: "engineer",
        // Kurumsal e-posta SENTETİKTİR: personel rehberi herkese açık bir
        // ekrandır, oraya gerçek e-posta adresi yazılmaz. Gerçek adres yalnızca
        // hesap ve doğrulama kodu için kullanılır (adım 4b).
        workEmail: `${slugify(firstName)}.${slugify(lastName)}@ornek.test`,
        extensionNumber: OWNER_EXTENSION,
        startYear: new Date().getUTCFullYear(),
        nationalIdHash: hashNationalId(input.nationalId, context.hashSalt),
        isSeedData: false,
      },
    ],
    skipDuplicates: true,
  });

  // Numara ASLA düz basılmaz; maskeli hâli bile yalnızca "doğru kişi mi" teyidi için.
  context.log(
    `Proje sahibi hesabı: hazır (kimlik ${maskNationalId(input.nationalId)}, dahili ${OWNER_EXTENSION})`,
  );

  return "created";
}

/**
 * Ortam değişkenlerini okur. Hiçbiri tanımlı değilse `null` döner (atlanır).
 * Kısmen tanımlıysa veya değer geçersizse AÇIK HATA verir — sessizce yanlış
 * kayıt oluşturmak, adım 4b'de anlaşılmaz bir "bilgiler eşleşmedi" hatasına dönerdi.
 */
function readOwnerInput(): OwnerInput | null {
  const nationalId = process.env.OWNER_TCKN?.trim();
  const fullName = process.env.OWNER_FULL_NAME?.trim();
  const email = process.env.OWNER_EMAIL?.trim();
  const phone = process.env.OWNER_PHONE?.trim();
  const birthDate = process.env.OWNER_BIRTH_DATE?.trim();

  const provided = [nationalId, fullName, email, phone, birthDate].filter(Boolean);

  if (provided.length === 0) return null;

  if (!nationalId || !fullName || !email || !phone || !birthDate) {
    throw new Error(
      "Proje sahibi hesabı için ortam değişkenlerinin TAMAMI gerekli:\n" +
        "  OWNER_TCKN · OWNER_FULL_NAME · OWNER_EMAIL · OWNER_PHONE · OWNER_BIRTH_DATE\n" +
        "Hiçbirini vermezsen bu hesap atlanır ve tohumlama yine başarılı olur.",
    );
  }

  if (!isValidNationalId(nationalId)) {
    throw new Error(
      "OWNER_TCKN geçerli bir kimlik numarası değil (11 hane + kontrol basamağı).\n" +
        "Değeri .env dosyasında düzelt; buraya ASLA gerçek değer yazılmaz.",
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
    throw new Error("OWNER_BIRTH_DATE `YYYY-MM-DD` biçiminde olmalı, örn. 1990-01-31.");
  }

  return { nationalId, fullName, birthDate: new Date(`${birthDate}T00:00:00.000Z`) };
}
