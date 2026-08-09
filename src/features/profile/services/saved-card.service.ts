import { SavedCardNotFoundError } from "@/features/profile/errors";
import {
  countLiveMembershipsUsingCard,
  listSavedCards,
  softDeleteOwnedSavedCard,
  type SavedCardRow,
} from "@/features/profile/repositories/saved-card.repository";
import { enforceProfileWriteBudget } from "@/features/profile/services/write-budget";
import { recordAuditLog } from "@/lib/audit";
import { hashActorIp } from "@/lib/rate-limit";

/**
 * Kayıtlı kart yönetimi (teknik borç #41 · PRD §6.2).
 *
 * ⛔ KART EKLEME BURADA YOK ve bilerek yok. Kart yalnızca gerçek bir ödeme
 * sırasında "kartımı kaydet" kutusuyla kaydedilir (PRD §6.2 adım 2): kaydetmek
 * için kart numarasının sahte sağlayıcıdan geçmesi, yani Luhn ve son kullanma
 * kontrolünden geçmesi gerekiyor. Profilden "kart ekle" demek, doğrulanmamış
 * bir kartı listeye koymak olurdu.
 *
 * ⛔ BU DOSYA KART NUMARASI GÖRMEZ. Listelenen tek şey marka + son 4 hane +
 * son kullanma; tam numara zaten hiçbir yerde saklanmıyor (data-model.md).
 */

/** Ekranın çizebilmesi için kartın kendisi + "bu kart bir üyelikte kullanılıyor mu". */
export type SavedCardView = SavedCardRow & {
  /**
   * Bu karta bağlı YAŞAYAN üyelik var mı (PRD §5.6 aylık tahsilat).
   *
   * Sayı değil bayrak: ekranın tek ihtiyacı "uyarı göstereyim mi" sorusunun
   * cevabı ve "3 üyelik" demek kullanıcı için anlamsız olurdu — aynı anda tek
   * üyelik kuralı zaten veritabanında zorlanıyor.
   */
  usedByMembership: boolean;
};

/**
 * Kullanıcının kayıtlı kartları + üyelik uyarısı.
 *
 * N+1 SORGU BURADA KABUL EDİLDİ: kart sayısı kullanıcı başına tek haneli
 * (kart yalnızca gerçek ödeme sırasında ekleniyor) ve tek bir `groupBy`
 * yazmak, üyelik tablosunun sahipliğini profil tarafına taşırdı. Ölçüm
 * darboğaz gösterirse tek sorguya indirilir (CLAUDE.md §5.10: önce ölç).
 */
export async function listUserSavedCards(userId: string): Promise<SavedCardView[]> {
  const cards = await listSavedCards(userId);

  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      usedByMembership: (await countLiveMembershipsUsingCard({ savedCardId: card.id, userId })) > 0,
    })),
  );
}

/**
 * Kartı siler — YUMUŞAK silme (`deletedAt`).
 *
 * ÜYELİĞE BAĞLI KART DA SİLİNEBİLİR. Engellemek, kullanıcıyı kendi kartını
 * kaldıramaz duruma sokardı; PRD §5.11'in ruhu bunun tersi. Bunun yerine
 * ekranda ne olacağı AÇIKÇA yazılıyor: bir sonraki aidat tahsilatı bu karttan
 * yapılamaz. Kararı kullanıcı veriyor, sistem gizlemiyor.
 *
 * Satır kalıyor çünkü `payments` ve `memberships` ona bağlı
 * (`onDelete: Restrict`) — geçmiş tahsilatın hangi kartla yapıldığı bilgisi
 * mali kayıttır ve kaybolamaz.
 */
export async function deleteUserSavedCard(input: {
  userId: string;
  savedCardId: string;
  actorIp: string;
  now: Date;
}): Promise<void> {
  await enforceProfileWriteBudget(input.userId, input.now);

  const deleted = await softDeleteOwnedSavedCard({
    savedCardId: input.savedCardId,
    userId: input.userId,
    deletedAt: input.now,
  });

  // 0 satır etkilendi: kart yok, başkasının ya da bu arada silinmiş.
  if (!deleted) throw new SavedCardNotFoundError();

  await recordAuditLog({
    userId: input.userId,
    action: "saved_card_delete",
    entityType: "saved_card",
    entityId: input.savedCardId,
    ipHash: hashActorIp(input.actorIp),
  });
}
