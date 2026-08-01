import type { IdentityStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `sessions` tablosuna erişen tek katman (ADR-005).
 *
 * SAKLANAN DEĞER JETONUN KENDİSİ DEĞİL, ÖZETİDİR. `session_token` kolonuna
 * çerezdeki ham jeton yazılsaydı, veritabanının okunduğu bir sızıntı doğrudan
 * "herkesin oturumunu ele geçir" anlamına gelirdi. Özet tek yönlü olduğu için
 * tablodan okunan değerle çerez üretilemez. Aynı disiplin
 * `registration-draft.repository.ts` içinde de uygulanıyor (ADR-012).
 *
 * Süre dolumu OKUMA ANINDA uygulanır (ADR-007): süresi geçmiş satır bulunmuş
 * sayılmaz ve aynı anda silinir. Böylece planlı temizlik görevi hiç çalışmasa
 * bile davranış doğru kalır.
 */

/** Oturumun taşıdığı YETKİ alanları — hepsi veritabanından, hiçbiri istemciden. */
export type SessionUserRow = {
  sessionId: string;
  userId: string;
  fullName: string;
  role: UserRole;
  isStaff: boolean;
  identityStatus: IdentityStatus;
  expiresAt: Date;
};

export type CreateSessionInput = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export async function createSession(input: CreateSessionInput): Promise<string> {
  const created = await prisma.session.create({
    data: {
      sessionToken: input.tokenHash,
      userId: input.userId,
      expires: input.expiresAt,
    },
    select: { id: true },
  });

  return created.id;
}

/**
 * Jeton özetiyle geçerli oturumu bulur.
 *
 * `null` dönen üç durum ve hepsi bilinçli:
 *  · satır yok            → çerez sahte veya çıkış yapılmış
 *  · süresi dolmuş        → satır aynı anda silinir (ADR-007)
 *  · hesap silinmiş       → soft-delete edilmiş kullanıcının oturumu geçmez;
 *                           satır da temizlenir, çünkü hesap geri gelmeyecek
 */
export async function findValidSessionByTokenHash(
  tokenHash: string,
  now: Date,
): Promise<SessionUserRow | null> {
  const session = await prisma.session.findUnique({
    where: { sessionToken: tokenHash },
    select: {
      id: true,
      expires: true,
      userId: true,
      user: {
        select: {
          fullName: true,
          role: true,
          isStaff: true,
          identityStatus: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expires.getTime() <= now.getTime() || session.user.deletedAt !== null) {
    await deleteSessionById(session.id);

    return null;
  }

  return {
    sessionId: session.id,
    userId: session.userId,
    fullName: session.user.fullName,
    role: session.user.role,
    isStaff: session.user.isStaff,
    identityStatus: session.user.identityStatus,
    expiresAt: session.expires,
  };
}

/** Kayan yenileme: bitiş anını ileri taşır. */
export async function extendSession(sessionId: string, expiresAt: Date): Promise<void> {
  // `updateMany` kullanılıyor: satır bu arada başka bir istekle (çıkış, şifre
  // değişimi) silinmiş olabilir ve `update` "kayıt yok" diye hata fırlatırdı.
  await prisma.session.updateMany({ where: { id: sessionId }, data: { expires: expiresAt } });
}

export async function deleteSessionById(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/**
 * Jeton özetiyle siler.
 *
 * Çıkış bunu kullanıyor: önce "geçerli mi" diye okuyup sonra silmek iki sorgu
 * eder ve süresi dolmuş bir satırı silmeyi gereksizce dallandırır. Silmek her
 * durumda doğru sonuç.
 */
export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  await prisma.session.deleteMany({ where: { sessionToken: tokenHash } });
}

/**
 * Kullanıcının TÜM oturumlarını siler.
 *
 * ADR-005'in var oluş sebebi bu fonksiyon: şifre değişiminde ve şüpheli
 * durumda oturumlar ANINDA düşmeli. İmzalı bir JWT ile bu teknik olarak
 * yapılamazdı. 4b-3'ün şifre sıfırlama akışı bunu çağıracak.
 *
 * @returns silinen oturum sayısı — denetim ve test için.
 */
export async function deleteSessionsForUser(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });

  return result.count;
}
