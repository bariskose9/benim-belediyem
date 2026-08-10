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

/** Giriş için gereken EN AZ alan. Ad, e-posta ve telefon burada okunmaz. */
export type AuthUserRow = {
  id: string;
  passwordHash: string | null;
};

/**
 * Şifreyle giriş için hesabı bulur.
 *
 * Silinmiş hesap (`deletedAt`) hiç dönmez — filtreyi sorguya koymak, çağıranın
 * kontrolü unutabileceği bir yeri kapatır.
 *
 * `passwordHash` null olabilir ve bu normaldir: tohum verisindeki 80 arka plan
 * hesabının şifresi yok, ileride yalnızca Google ile açılan hesapların da
 * olmayacak (4c). Çağıran bu durumu "şifre yanlış" ile AYNI biçimde ele alır.
 */
export async function findAuthUserByNationalIdHash(
  nationalIdHash: string,
): Promise<AuthUserRow | null> {
  return prisma.user.findFirst({
    where: { nationalIdHash, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
}

/**
 * Girişli kullanıcının şifre özeti — yalnızca "şifreni doğrula" adımı için.
 *
 * Kimlik OTURUMDAN geliyor, istemciden değil; bu yüzden IDOR yüzeyi yok.
 * Ayrı bir fonksiyon çünkü giriş akışı kullanıcıyı kimlik numarasının
 * özetinden buluyor, bu akış ise kullanıcı kimliğinden.
 */
export async function findPasswordHashByUserId(userId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { passwordHash: true },
  });

  return user?.passwordHash ?? null;
}

/** Hesabım ekranının gösterdiği alanlar — kimlik numarası YALNIZCA maskeli. */
export type AccountProfileRow = {
  fullName: string;
  nationalIdMasked: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Hesap özetini döner.
 *
 * Kimliği ÇAĞIRAN VERİR ve çağıran onu yalnızca oturumdan alır; istemciden
 * gelen bir kullanıcı kimliği bu fonksiyona hiç ulaşamaz. IDOR koruması
 * (05-auth-security.md) bu yüzden bir "sahiplik kontrolü" değil, tasarım
 * gereği: başkasının kaydını isteyebileceği bir parametre yok.
 *
 * `nationalIdEncrypted` OKUNMUYOR: ekranın maskeli hâlden fazlasına ihtiyacı
 * yok, çözülmeyen veri sızdırılamaz.
 */
export async function findAccountProfile(userId: string): Promise<AccountProfileRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { fullName: true, nationalIdMasked: true, email: true, phone: true },
  });
}

/** Şifre sıfırlama kodunun gönderileceği hesap — kimlik ve hedef adres. */
export type PasswordResetTargetRow = {
  id: string;
  email: string;
};

/**
 * Şifre sıfırlama için hesabı bulur; yoksa `null`.
 *
 * E-POSTASI OLMAYAN HESAP DA `null` DÖNER ve bu bilinçli: kodun gideceği bir
 * adres yoksa akış zaten tamamlanamaz. Çağıran bu durumu "hesap yok" ile AYNI
 * biçimde ele alır (sahte kod kaydı açar), yani ayrım dışarıya sızmaz.
 *
 * Silinmiş hesap (`deletedAt`) hiç dönmez — filtre sorguda, çağıranın
 * unutabileceği bir yerde değil.
 */
export async function findPasswordResetTargetByNationalIdHash(
  nationalIdHash: string,
): Promise<PasswordResetTargetRow | null> {
  const user = await prisma.user.findFirst({
    where: { nationalIdHash, deletedAt: null, email: { not: null } },
    select: { id: true, email: true },
  });

  if (!user?.email) return null;

  return { id: user.id, email: user.email };
}

/**
 * Şifre politikasının "kendi verini şifre yapma" kontrolü için gereken alanlar.
 *
 * Kimlik numarası ŞİFRELİ dönüyor; çözme işi servis katmanında ve yalnızca
 * karşılaştırma için yapılır, hiçbir yanıta veya log'a girmez.
 */
export type PasswordPolicyProfileRow = {
  fullName: string;
  email: string | null;
  nationalIdEncrypted: string | null;
};

export async function findPasswordPolicyProfile(
  userId: string,
): Promise<PasswordPolicyProfileRow | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { fullName: true, email: true, nationalIdEncrypted: true },
  });
}

/**
 * Şifreyi değiştirir.
 *
 * Kullanıcı kimliğini ÇAĞIRAN VERİR ve çağıran onu yalnızca doğrulanmış
 * sıfırlama kaydından alır; istemciden gelen bir kimlik buraya hiç ulaşamaz
 * (IDOR koruması, 05-auth-security.md).
 *
 * Silinmiş hesabın şifresi güncellenmez: `updateMany` + `deletedAt: null`
 * filtresi, arada silinmiş bir hesap için sessizce 0 satır günceller.
 */
export async function updateUserPassword(userId: string, passwordHash: string): Promise<number> {
  const result = await prisma.user.updateMany({
    where: { id: userId, deletedAt: null },
    data: { passwordHash },
  });

  return result.count;
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
