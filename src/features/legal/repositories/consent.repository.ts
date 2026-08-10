import type { ConsentType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * `consent_records` tablosuna dokunan tek yer (adım 17).
 *
 * ⛔ TABLO EKLEMELİDİR (append-only): hiçbir fonksiyon satır SİLMİYOR ve
 * hiçbir fonksiyon `isGranted` değerini DEĞİŞTİRMİYOR. Rızayı geri almak,
 * eski satırı düzeltmek değil, üzerine `isGranted = false` yazmaktır — yoksa
 * "ne zaman verildi, ne zaman geri alındı" sorusu cevapsız kalır ve kayıt
 * kanıt olma özelliğini kaybeder (14-privacy-and-compliance.md).
 */

export type ConsentSubject = {
  /** Giriş yapmışsa hesabı. */
  readonly userId?: string;
  /** Giriş yapmamışsa çerezdeki rastgele kimliği. */
  readonly anonymousId?: string;
};

export type ConsentRecordRow = {
  readonly id: string;
  readonly consentType: ConsentType;
  readonly isGranted: boolean;
  readonly createdAt: Date;
};

/** Yeni bir rıza satırı ekler. Var olan satır ASLA güncellenmez. */
export async function appendConsentRecord(input: {
  subject: ConsentSubject;
  consentType: ConsentType;
  isGranted: boolean;
}): Promise<ConsentRecordRow> {
  return prisma.consentRecord.create({
    data: {
      userId: input.subject.userId ?? null,
      anonymousId: input.subject.anonymousId ?? null,
      consentType: input.consentType,
      isGranted: input.isGranted,
    },
    select: { id: true, consentType: true, isGranted: true, createdAt: true },
  });
}

/**
 * Öznenin bir rıza türündeki EN SON kaydı; hiç kaydı yoksa `null`.
 *
 * NEDEN "EN SON": tablo eklemeli olduğu için aynı tür için birden çok satır
 * bulunabilir. Yürürlükteki durum her zaman en yenisidir.
 *
 * ⛔ ÖZNE BOŞSA SORGU HİÇ ATILMIYOR: `userId` ve `anonymousId` ikisi de yoksa
 * koşulsuz bir `WHERE` üretilir ve sorgu BAŞKASININ kaydını döndürürdü.
 */
export async function findLatestConsent(
  subject: ConsentSubject,
  consentType: ConsentType,
): Promise<ConsentRecordRow | null> {
  const where = buildSubjectFilter(subject);

  if (!where) return null;

  return prisma.consentRecord.findFirst({
    where: { ...where, consentType },
    orderBy: { createdAt: "desc" },
    select: { id: true, consentType: true, isGranted: true, createdAt: true },
  });
}

/**
 * Ziyaretçiyken verilmiş rızaları hesaba bağlar (PRD §5.10).
 *
 * ⛔ BU BİR İÇERİK DEĞİŞİKLİĞİ DEĞİL, ÖZNE ÇÖZÜMLEMESİDİR: `isGranted` ve
 * `createdAt` alanlarına dokunulmuyor; yalnızca "bu rızayı kim verdi"
 * sorusunun cevabı, o güne kadar bilinmeyen kullanıcıya bağlanıyor. Yeni satır
 * yazılsaydı rızanın tarihi giriş tarihine kayardı ve kayıt yanlış bir şey
 * söylerdi.
 *
 * `anonymousId` KORUNUYOR: aynı tarayıcıdan çıkış yapıp devam eden ziyaretçi
 * bandı yeniden görmesin diye. Kimlik zaten kişisel veri değil (rastgele 32 bayt).
 *
 * @returns bağlanan satır sayısı
 */
export async function linkAnonymousConsentsToUser(input: {
  anonymousId: string;
  userId: string;
}): Promise<number> {
  const result = await prisma.consentRecord.updateMany({
    where: { anonymousId: input.anonymousId, userId: null },
    data: { userId: input.userId },
  });

  return result.count;
}

/**
 * Öznenin `WHERE` koşulu.
 *
 * İki kimlik de varsa ikisi de aranıyor (`OR`): kullanıcı giriş yapmadan önce
 * ziyaretçi olarak verdiği rızayı, henüz bağlanma gerçekleşmemişse bile
 * görebilmeli.
 */
function buildSubjectFilter(
  subject: ConsentSubject,
):
  | { userId: string }
  | { anonymousId: string }
  | { OR: [{ userId: string }, { anonymousId: string }] }
  | null {
  if (subject.userId && subject.anonymousId) {
    return { OR: [{ userId: subject.userId }, { anonymousId: subject.anonymousId }] };
  }

  if (subject.userId) return { userId: subject.userId };
  if (subject.anonymousId) return { anonymousId: subject.anonymousId };

  return null;
}
