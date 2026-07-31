import { prisma } from "@/lib/db";

/**
 * `registration_drafts` tablosuna erişen tek katman (ADR-012).
 *
 * Süre dolumu OKUMA ANINDA uygulanıyor: süresi geçmiş satır bulunmuş sayılmaz
 * ve aynı anda silinir (ADR-007). Böylece temizlik görevi hiç çalışmasa bile
 * davranış doğru kalır ve terk edilmiş kayıtlardan kişisel veri birikmez.
 */

export type RegistrationDraftRow = {
  id: string;
  nationalIdHash: string;
  kpsPayloadEncrypted: string;
  contactEncrypted: string | null;
  emailHash: string | null;
  phoneHash: string | null;
  passwordHash: string | null;
  actorIpHash: string;
  expiresAt: Date;
};

export type CreateRegistrationDraftInput = {
  tokenHash: string;
  nationalIdHash: string;
  kpsPayloadEncrypted: string;
  actorIpHash: string;
  expiresAt: Date;
};

const DRAFT_FIELDS = {
  id: true,
  nationalIdHash: true,
  kpsPayloadEncrypted: true,
  contactEncrypted: true,
  emailHash: true,
  phoneHash: true,
  passwordHash: true,
  actorIpHash: true,
  expiresAt: true,
} as const;

export async function createRegistrationDraft(
  input: CreateRegistrationDraftInput,
): Promise<string> {
  const created = await prisma.registrationDraft.create({
    data: { ...input },
    select: { id: true },
  });

  return created.id;
}

/**
 * Jeton özetiyle geçerli taslağı bulur.
 *
 * Süresi geçmişse `null` döner VE satırı siler — "yok say ama bırak" davranışı
 * tabloyu şişirir ve süresi dolmuş kişisel veriyi gereksiz yere tutardı.
 */
export async function findActiveDraftByTokenHash(
  tokenHash: string,
  now: Date,
): Promise<RegistrationDraftRow | null> {
  const draft = await prisma.registrationDraft.findUnique({
    where: { tokenHash },
    select: DRAFT_FIELDS,
  });

  if (!draft) return null;

  if (draft.expiresAt.getTime() <= now.getTime()) {
    await deleteRegistrationDraft(draft.id);

    return null;
  }

  return draft;
}

export type UpdateDraftContactInput = {
  contactEncrypted: string;
  emailHash: string;
  phoneHash: string;
  passwordHash: string;
};

export async function updateDraftContact(
  draftId: string,
  input: UpdateDraftContactInput,
): Promise<void> {
  await prisma.registrationDraft.update({ where: { id: draftId }, data: { ...input } });
}

export async function deleteRegistrationDraft(draftId: string): Promise<void> {
  // `deleteMany` kullanılıyor: satır bu arada başka bir istek tarafından
  // silinmişse `delete` "kayıt yok" diye hata fırlatırdı.
  await prisma.registrationDraft.deleteMany({ where: { id: draftId } });
}

/**
 * Aynı kimlik numarasının eski taslaklarını siler.
 *
 * Kullanıcı akışı yarıda bırakıp baştan başladığında çağrılır. Eski satırın
 * kalması, süresi dolana kadar aynı kişi için ikinci bir geçerli jeton
 * bırakmak demekti.
 */
export async function deleteDraftsForNationalIdHash(nationalIdHash: string): Promise<void> {
  await prisma.registrationDraft.deleteMany({ where: { nationalIdHash } });
}
