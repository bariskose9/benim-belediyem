import type { OtpChannel, OtpPurpose } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `otp_challenges` tablosuna erişen tek katman.
 *
 * Servis katmanı Prisma'yı doğrudan çağırmaz (01-architecture.md:
 * UI → route → servis → repository → ORM).
 */

export type OtpChallengeRow = {
  id: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attemptCount: number;
  consumedAt: Date | null;
  /**
   * Kodun ait olduğu hesap. Kayıt akışında `null` (hesap henüz yok), şifre
   * sıfırlamada dolu — akışın hangi hesabı sıfırladığı YALNIZCA burada yazar,
   * tarayıcıda değil.
   *
   * Şifre sıfırlamanın sahte (kayıtsız numara) kayıtlarında da `null` olur.
   */
  userId: string | null;
};

export type CreateOtpChallengeInput = {
  registrationId: string;
  purpose: OtpPurpose;
  channel: OtpChannel;
  destinationHash: string;
  codeHash: string;
  expiresAt: Date;
  /** Şifre sıfırlamada hesabın kimliği; kayıt akışında verilmez. */
  userId?: string;
};

export async function createOtpChallenge(input: CreateOtpChallengeInput): Promise<string> {
  const created = await prisma.otpChallenge.create({
    data: { ...input },
    select: { id: true },
  });

  return created.id;
}

/**
 * Aynı kayıt + amaç için bekleyen kodları geçersizleştirir.
 *
 * `05-auth-security.md`: "Kod doğrulanınca aynı anda tüm bekleyen kodlar
 * geçersizleşir." Yeni kod üretilirken de çağrılır — aksi hâlde eski kod
 * hâlâ geçerli kalır ve 3 deneme sınırı üç kod arasında paylaşılarak
 * fiilen 9 denemeye çıkardı.
 *
 * `consumedAt` işaretlenir, satır SİLİNMEZ: gönderim hız sınırı ve denetim
 * izi için kayıt 24 saat yaşamalı (data-model.md saklama süreleri).
 */
export async function invalidatePendingChallenges(
  registrationId: string,
  purpose: OtpPurpose,
  now: Date,
): Promise<void> {
  await prisma.otpChallenge.updateMany({
    where: { registrationId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
}

/**
 * Kullanıcının BEKLEYEN tüm kodlarını geçersizleştirir.
 *
 * Şifre sıfırlama tamamlandığında çağrılır: kullanıcı üst üste iki kez kod
 * istediyse eskisi hâlâ 5 dakika geçerli kalırdı. `05-auth-security.md`
 * "kod doğrulanınca aynı anda tüm bekleyen kodlar geçersizleşir" diyor ve bu
 * kural akış kimliğine değil HESABA bağlı olmalı.
 */
export async function invalidatePendingChallengesForUser(
  userId: string,
  purpose: OtpPurpose,
  now: Date,
): Promise<void> {
  await prisma.otpChallenge.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
}

/** Bekleyen (henüz tüketilmemiş) en yeni kodu getirir. */
export async function findPendingChallenge(
  registrationId: string,
  purpose: OtpPurpose,
): Promise<OtpChallengeRow | null> {
  return prisma.otpChallenge.findFirst({
    where: { registrationId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      purpose: true,
      codeHash: true,
      expiresAt: true,
      attemptCount: true,
      consumedAt: true,
      userId: true,
    },
  });
}

/**
 * Bu akışın EN YENİ kodunu getirir — tüketilmiş olsa bile.
 *
 * "Yeni kod gönder" bunu kullanır: üç kez hatalı deneyip kodunu kilitleyen
 * kullanıcı, ekranda yazdığı gibi yeni bir kod isteyebilmeli. Bekleyen kod
 * aramak yeterli olmazdı, çünkü kilitlenen kod tüketilmiş sayılıyor.
 *
 * `createdAfter` akışın ömrünü sınırlar: eski bir jeton sonsuza kadar yeni kod
 * üretemez.
 */
export async function findLatestChallenge(
  registrationId: string,
  purpose: OtpPurpose,
  createdAfter: Date,
): Promise<OtpChallengeRow | null> {
  return prisma.otpChallenge.findFirst({
    where: { registrationId, purpose, createdAt: { gte: createdAfter } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      purpose: true,
      codeHash: true,
      expiresAt: true,
      attemptCount: true,
      consumedAt: true,
      userId: true,
    },
  });
}

export async function incrementAttemptCount(challengeId: string): Promise<number> {
  const updated = await prisma.otpChallenge.update({
    where: { id: challengeId },
    data: { attemptCount: { increment: 1 } },
    select: { attemptCount: true },
  });

  return updated.attemptCount;
}

export async function markChallengeConsumed(challengeId: string, now: Date): Promise<void> {
  await prisma.otpChallenge.update({
    where: { id: challengeId },
    data: { consumedAt: now },
  });
}

/** Bu kayıt için hangi amaçların doğrulandığını söyler. */
export async function findConsumedPurposes(registrationId: string): Promise<OtpPurpose[]> {
  const rows = await prisma.otpChallenge.findMany({
    where: { registrationId, consumedAt: { not: null } },
    select: { purpose: true },
    distinct: ["purpose"],
  });

  return rows.map((row) => row.purpose);
}
