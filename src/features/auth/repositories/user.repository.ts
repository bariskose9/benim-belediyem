import { prisma } from "@/lib/db";

/**
 * `users` tablosuna erişen katman.
 *
 * VERİ MİNİMİZASYONU BURADA UYGULANIYOR (PRD §5.0 · 14-privacy-and-compliance.md):
 * `CreateVerifiedUserInput` tipinde baba adı, anne adı, doğum yeri, cinsiyet,
 * medeni hâl ve nüfus adresi için ALAN YOKTUR. Olmayan alana yanlışlıkla
 * yazılamaz — `kps-query-log.repository.ts` ve `lib/audit.ts` ile aynı disiplin.
 *
 * Kalıcı tutulanlar: ad soyad · doğum tarihi · şifreli + özetli + maskeli
 * kimlik numarası · nüfus il/ilçe · son senkron tarihi.
 */

export type CreateVerifiedUserInput = {
  nationalIdEncrypted: string;
  nationalIdHash: string;
  nationalIdMasked: string;
  fullName: string;
  birthDate: Date;
  email: string;
  phone: string;
  passwordHash: string;
  registeredProvince: string;
  registeredDistrict: string;
  /** Personel rehberinde eşleşen kayıt — SUNUCUDA hesaplanır, istemciden gelmez. */
  staffMemberId: string | null;
  verifiedAt: Date;
};

export type CreatedUser = { id: string; isStaff: boolean };

export async function findUserIdByNationalIdHash(nationalIdHash: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { nationalIdHash },
    select: { id: true },
  });

  return user?.id ?? null;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  return user?.id ?? null;
}

/**
 * Hesabı oluşturur.
 *
 * `identityStatus` KPS doğrulaması tamamlandığı için `kps_verified`,
 * `isStaff` ise personel eşleşmesinden geliyor — ikisi de SUNUCUDA belirlenir.
 * İstemciden gelen bir `role` / `isStaff` / `identityStatus` alanı bu
 * fonksiyona hiç ulaşamaz çünkü girdi tipinde yerleri yok
 * (05-auth-security.md → "Yetki kaynağı").
 *
 * `role` verilmiyor; şema varsayılanı `user`. Yönetici rolü hiçbir kayıt
 * akışından atanamaz.
 */
export async function createVerifiedUser(input: CreateVerifiedUserInput): Promise<CreatedUser> {
  const created = await prisma.user.create({
    data: {
      nationalIdEncrypted: input.nationalIdEncrypted,
      nationalIdHash: input.nationalIdHash,
      nationalIdMasked: input.nationalIdMasked,
      fullName: input.fullName,
      birthDate: input.birthDate,
      email: input.email,
      emailVerifiedAt: input.verifiedAt,
      phone: input.phone,
      phoneVerifiedAt: input.verifiedAt,
      passwordHash: input.passwordHash,
      identityStatus: "kps_verified",
      isStaff: input.staffMemberId !== null,
      staffMemberId: input.staffMemberId,
      registeredProvince: input.registeredProvince,
      registeredDistrict: input.registeredDistrict,
      kpsSyncedAt: input.verifiedAt,
    },
    select: { id: true, isStaff: true },
  });

  return created;
}
